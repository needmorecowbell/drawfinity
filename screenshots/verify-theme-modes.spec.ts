import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { navigateToHome } from "./helpers";

/**
 * RC verification — Dark Mode, all three theme modes (PR #59).
 *
 * Validates that each persisted `theme` preference resolves to the correct
 * palette on the home screen:
 *   - "light"  → always the light `:root` palette.
 *   - "dark"   → always the `[data-theme="dark"]` palette.
 *   - "auto"   → follows the OS `prefers-color-scheme`; the
 *                `@media (prefers-color-scheme: dark) [data-theme="auto"]`
 *                block flips it to dark, otherwise it stays light.
 *
 * The preference is seeded into `drawfinity:user-preferences` via
 * `addInitScript` (before app load), the app boots, ThemeManager applies
 * `data-theme`, and the test asserts both the attribute and the resolved body
 * background colour direction. The OS scheme for "auto" is emulated with
 * Playwright's `page.emulateMedia({ colorScheme })`.
 */

const OUT_DIR = "/tmp/drawfinity-rc";

function avgChannel(rgb: string): number {
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`unparseable color: ${rgb}`);
  const [r, g, b] = m[1].split(",").map((s) => parseFloat(s.trim()));
  return (r + g + b) / 3;
}

/** Seed the persisted theme preference before any app code runs. */
async function seedTheme(page: import("@playwright/test").Page, theme: string) {
  await page.addInitScript((t) => {
    localStorage.setItem(
      "drawfinity:user-preferences",
      JSON.stringify({ theme: t }),
    );
  }, theme);
}

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test("light mode resolves to the light palette", async ({ page }) => {
  await seedTheme(page, "light");
  await page.emulateMedia({ colorScheme: "dark" }); // OS dark must be ignored.
  await page.goto("/");
  await navigateToHome(page);

  const theme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  const avg = avgChannel(bodyBg);
  console.log(
    `[verify-theme-modes] light: data-theme=${theme}, body bg=${bodyBg} (avg ${avg.toFixed(1)})`,
  );
  expect(theme).toBe("light");
  expect(
    avg,
    `light body background ${bodyBg} should be a light color (avg channel > 200)`,
  ).toBeGreaterThan(200);

  const out = path.join(OUT_DIR, "theme-light.png");
  await page.screenshot({ path: out, fullPage: false });
  console.log(`[verify-theme-modes] screenshot: ${out}`);
});

test("dark mode resolves to the dark palette", async ({ page }) => {
  await seedTheme(page, "dark");
  await page.emulateMedia({ colorScheme: "light" }); // OS light must be ignored.
  await page.goto("/");
  await navigateToHome(page);

  const theme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  const avg = avgChannel(bodyBg);
  console.log(
    `[verify-theme-modes] dark: data-theme=${theme}, body bg=${bodyBg} (avg ${avg.toFixed(1)})`,
  );
  expect(theme).toBe("dark");
  expect(
    avg,
    `dark body background ${bodyBg} should be a dark color (avg channel < 60)`,
  ).toBeLessThan(60);

  const out = path.join(OUT_DIR, "theme-dark.png");
  await page.screenshot({ path: out, fullPage: false });
  console.log(`[verify-theme-modes] screenshot: ${out}`);
});

test("auto mode follows the emulated OS color scheme", async ({ page }) => {
  await seedTheme(page, "auto");

  // --- OS dark → auto resolves dark. ---
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await navigateToHome(page);

  let theme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  let bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  let avg = avgChannel(bodyBg);
  console.log(
    `[verify-theme-modes] auto+OSdark: data-theme=${theme}, body bg=${bodyBg} (avg ${avg.toFixed(1)})`,
  );
  expect(theme).toBe("auto");
  expect(
    avg,
    `auto under OS dark: body background ${bodyBg} should be dark (avg channel < 60)`,
  ).toBeLessThan(60);

  // Capture the auto/dark-resolved home screen.
  const out = path.join(OUT_DIR, "theme-auto.png");
  await page.screenshot({ path: out, fullPage: false });
  console.log(`[verify-theme-modes] screenshot: ${out}`);

  // --- OS light → auto resolves light (live media re-evaluation). ---
  await page.emulateMedia({ colorScheme: "light" });
  theme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  avg = avgChannel(bodyBg);
  console.log(
    `[verify-theme-modes] auto+OSlight: data-theme=${theme}, body bg=${bodyBg} (avg ${avg.toFixed(1)})`,
  );
  expect(theme, "data-theme stays 'auto'; only the resolved palette flips").toBe(
    "auto",
  );
  expect(
    avg,
    `auto under OS light: body background ${bodyBg} should be light (avg channel > 200)`,
  ).toBeGreaterThan(200);
});
