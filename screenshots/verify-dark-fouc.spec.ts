import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { navigateToHome } from "./helpers";

/**
 * RC verification — Dark Mode FOUC guard (PR #59 + post-merge fix).
 *
 * Proves there is no flash-of-unstyled-content when the persisted theme is
 * "dark": the inline `<script>` in the `<head>` of index.html parses
 * `drawfinity:user-preferences` and sets `data-theme` SYNCHRONOUSLY, before the
 * stylesheet loads and long before the deferred `main.ts` module (and
 * ThemeManager) runs. The first paint is therefore already dark.
 *
 * The test does not trust the app to have set the attribute. It first loads the
 * page with the `main.ts` module request ABORTED, so neither the app nor
 * ThemeManager ever runs. If `data-theme` is still "dark" in that load, the
 * only code that could have set it is the inline `<head>` guard — a definitive
 * proof. It also confirms the value is already "dark" at `DOMContentLoaded`.
 * A second, normal load then renders the real dark home screen for the capture.
 */

const OUT_DIR = "/tmp/drawfinity-rc";

function avgChannel(rgb: string): number {
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`unparseable color: ${rgb}`);
  const [r, g, b] = m[1].split(",").map((s) => parseFloat(s.trim()));
  return (r + g + b) / 3;
}

test("dark theme is applied synchronously by the FOUC head script (no flash)", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Seed the persisted dark preference and record the theme at DOMContentLoaded.
  await page.addInitScript(() => {
    localStorage.setItem(
      "drawfinity:user-preferences",
      JSON.stringify({ theme: "dark" }),
    );
    (window as any).__themeAtDCL = null;
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        (window as any).__themeAtDCL =
          document.documentElement.dataset.theme ?? null;
      },
      { once: true },
    );
  });

  // --- Load 1: abort the app module so NEITHER the app nor ThemeManager runs.
  // Any dark theme present can only have come from the inline <head> guard. ---
  await page.route("**/src/main.ts**", (route) => route.abort());
  await page.goto("/");

  const themeAtDCL = await page.evaluate(() => (window as any).__themeAtDCL);
  const appBooted = await page.evaluate(() => !!(window as any).__drawfinity);
  const liveTheme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  console.log(
    `[verify-dark-fouc] (app module blocked) theme at DOMContentLoaded = ` +
      `${themeAtDCL}, live data-theme = ${liveTheme}, app booted = ${appBooted}`,
  );
  expect(
    appBooted,
    "main.ts was aborted, so the app must NOT have bootstrapped",
  ).toBe(false);
  expect(
    liveTheme,
    "with the app blocked, only the inline <head> FOUC guard could set data-theme to dark",
  ).toBe("dark");
  expect(
    themeAtDCL,
    "data-theme is already dark by DOMContentLoaded — no flash of light content",
  ).toBe("dark");

  // The stylesheet still loaded, so the body already paints a dark background.
  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  const avg = avgChannel(bodyBg);
  console.log(
    `[verify-dark-fouc] body background = ${bodyBg} (avg channel ${avg.toFixed(1)})`,
  );
  expect(
    avg,
    `body background ${bodyBg} should be a dark color (avg channel < 60)`,
  ).toBeLessThan(60);

  // --- Load 2: normal boot, render the real dark home screen, capture it. ---
  await page.unroute("**/src/main.ts**");
  await page.goto("/");
  await navigateToHome(page);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(
    "dark",
  );

  const screenshotPath = path.join(OUT_DIR, "dark-home.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-dark-fouc] screenshot: ${screenshotPath}`);
});
