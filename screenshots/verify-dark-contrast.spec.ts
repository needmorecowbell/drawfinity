import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { navigateToCanvas, togglePanel, waitForRender } from "./helpers";

/**
 * RC verification — Dark Mode muted-text contrast (PR #59 post-merge fix).
 *
 * Guards the `--text-muted` contrast bump (`#666` → `#7a7a7a`), which was made
 * specifically to raise the legibility of muted/secondary text on dark panels.
 *
 * In dark mode the test reads the *resolved* `--text-muted` custom property and
 * the dark panel/background colours from `getComputedStyle`, then computes the
 * WCAG 2.x contrast ratio (standard relative-luminance formula, implemented
 * in-test) between the muted text and:
 *   - `--bg-primary` (#1a1a1a) — the app/canvas background, and
 *   - `--card-bg`    (#242424) — the surface the Settings panel paints on
 *                                 (`#settings-panel { background: var(--card-bg) }`).
 *
 * Both ratios must be ≥ 3.0 (WCAG AA for large/incidental text); the assertion
 * fails with the measured ratio if below. A screenshot of the open Settings
 * panel (muted text in context) is captured for the visual record.
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const MIN_CONTRAST = 3.0;

/** Parse a CSS color string (`#rgb`, `#rrggbb`, or `rgb()/rgba()`) to [r,g,b] in 0..255. */
function parseColor(value: string): [number, number, number] {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const [r, g, b] = rgb[1].split(",").map((s) => parseFloat(s.trim()));
    return [r, g, b];
  }
  throw new Error(`unparseable color: "${value}"`);
}

/** WCAG relative luminance for an sRGB color (0..255 channels). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two CSS colors (order-independent). */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(parseColor(a));
  const lb = relativeLuminance(parseColor(b));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Seed the persisted dark-theme preference before any app code runs. */
async function seedDark(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "drawfinity:user-preferences",
      JSON.stringify({ theme: "dark" }),
    );
  });
}

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test("muted text meets WCAG contrast on dark panels", async ({ page }) => {
  await seedDark(page);
  await page.emulateMedia({ colorScheme: "light" }); // OS light must be ignored.
  await page.goto("/");
  await navigateToCanvas(page);

  // Confirm we are actually in the dark palette before measuring.
  const theme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  expect(theme, "dark preference should resolve to data-theme='dark'").toBe(
    "dark",
  );

  // Read the resolved custom properties straight off :root.
  const vars = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const get = (n: string) => cs.getPropertyValue(n).trim();
    return {
      textMuted: get("--text-muted"),
      bgPrimary: get("--bg-primary"),
      cardBg: get("--card-bg"),
    };
  });
  console.log(
    `[verify-dark-contrast] --text-muted=${vars.textMuted}, ` +
      `--bg-primary=${vars.bgPrimary}, --card-bg=${vars.cardBg}`,
  );

  const onPrimary = contrastRatio(vars.textMuted, vars.bgPrimary);
  const onCard = contrastRatio(vars.textMuted, vars.cardBg);
  console.log(
    `[verify-dark-contrast] contrast (muted vs bg-primary) = ${onPrimary.toFixed(2)}:1`,
  );
  console.log(
    `[verify-dark-contrast] contrast (muted vs card-bg)    = ${onCard.toFixed(2)}:1`,
  );

  expect(
    onPrimary,
    `muted text ${vars.textMuted} on bg-primary ${vars.bgPrimary} ` +
      `has contrast ${onPrimary.toFixed(2)}:1, below the ${MIN_CONTRAST}:1 floor`,
  ).toBeGreaterThanOrEqual(MIN_CONTRAST);
  expect(
    onCard,
    `muted text ${vars.textMuted} on card-bg ${vars.cardBg} ` +
      `has contrast ${onCard.toFixed(2)}:1, below the ${MIN_CONTRAST}:1 floor`,
  ).toBeGreaterThanOrEqual(MIN_CONTRAST);

  // Regression guard: the bump was #666 → #7a7a7a. On the lighter panel surface
  // (--card-bg, #242424) the old #666 lands at ~2.70:1 — below the floor — which
  // is precisely the case the bump fixed. Confirm we are no longer at that value.
  const oldOnCard = contrastRatio("#666", vars.cardBg);
  console.log(
    `[verify-dark-contrast] pre-fix #666 vs card-bg = ${oldOnCard.toFixed(2)}:1 (would fail)`,
  );
  expect(
    oldOnCard,
    "sanity: the pre-fix #666 muted color should fail the floor on the card surface",
  ).toBeLessThan(MIN_CONTRAST);

  // Open Settings (muted/secondary text in context) and capture the panel.
  await togglePanel(page, "settings");
  await waitForRender(page);
  const out = path.join(OUT_DIR, "dark-muted-text.png");
  await page.screenshot({ path: out, fullPage: false });
  console.log(`[verify-dark-contrast] screenshot: ${out}`);
});
