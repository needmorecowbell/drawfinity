import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { navigateToCanvas, setCamera, waitForRender } from "./helpers";

/**
 * Regression coverage for the remote-turtle *indicator* defect found in
 * two-client human testing (2026-06-27, PR #60): a remote peer's turtle trail
 * renders live and correctly, but the **indicator glyph itself does not appear
 * / does not move**.
 *
 * `verify-remote-turtle.spec.ts` already asserts the indicator *exists in the
 * DOM* and carries the right transform tokens. That is necessary but NOT
 * sufficient — the human-observed bug is that the glyph is present yet has no
 * intrinsic size, so it is invisible / mispositioned even though its
 * container's translate is correct (and the trail, rendered separately in
 * world→screen space, is unaffected — exactly the observed symptom).
 *
 * This spec strengthens the assertions to what a human actually sees:
 *   1. the indicator container has non-zero rendered size and sits within the
 *      viewport at the expected screen point;
 *   2. the **glyph** (the rotated wrapper that carries the SVG arrow) has
 *      non-zero rendered size AND non-zero computed width/height — this is the
 *      assertion that targets the zero-intrinsic-size root cause;
 *   3. the glyph's rotation reflects the peer heading.
 *
 * Geometry: at camera (0,0) zoom 1 with a 1280×720 viewport, world (wx, wy)
 * maps to screen (wx + 640, wy + 360). The indicator container is offset by
 * -halfSize (REMOTE_SIZE/2 = 9) so its top-left lands at (screen - 9).
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const VIEWPORT = { width: 1280, height: 720 };
const HALF = 9; // REMOTE_SIZE (18) / 2
const REMOTE_SIZE = 18;

function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return { x: wx + VIEWPORT.width / 2, y: wy + VIEWPORT.height / 2 };
}

function parseRotate(transform: string): number | null {
  const match = transform.match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
  if (!match) return null;
  return Number(match[1]);
}

test("remote turtle indicator is actually visible, sized, and oriented", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  const PEER = {
    userId: "peer-B",
    userName: "Grace",
    userColor: "#2563eb",
    turtleId: "main",
    heading: 45,
    // World-space position the turtle ends at.
    x: 120,
    y: 60,
  };

  await page.evaluate((peer) => {
    const app = (window as any).__drawfinity.viewManager.getCanvasApp();
    const renderer = app.getInternals().remoteTurtleRenderer;
    renderer.show();
    renderer.syncFromAwareness([
      {
        userId: peer.userId,
        userName: peer.userName,
        userColor: peer.userColor,
        turtles: [
          {
            id: peer.turtleId,
            x: peer.x,
            y: peer.y,
            heading: peer.heading,
            color: peer.userColor,
            visible: true,
          },
        ],
      },
    ]);
  }, PEER);
  await waitForRender(page);

  const key = `${PEER.userId}:${PEER.turtleId}`;

  const measured = await page.evaluate((k) => {
    const container = document.querySelector(
      `.turtle-indicator--remote[data-turtle-id="${k}"]`,
    ) as HTMLElement | null;
    if (!container) return null;
    const glyph = container.querySelector(
      ".turtle-indicator__glyph",
    ) as HTMLElement | null;
    if (!glyph) return null;

    const cRect = container.getBoundingClientRect();
    const gRect = glyph.getBoundingClientRect();
    const gComputed = getComputedStyle(glyph);

    return {
      containerVisible: getComputedStyle(container).display !== "none",
      containerRect: { x: cRect.x, y: cRect.y, w: cRect.width, h: cRect.height },
      glyphRect: { x: gRect.x, y: gRect.y, w: gRect.width, h: gRect.height },
      glyphComputed: {
        width: parseFloat(gComputed.width),
        height: parseFloat(gComputed.height),
      },
      glyphTransform: glyph.style.transform,
    };
  }, key);

  expect(measured, "remote turtle indicator element should exist").not.toBeNull();
  expect(measured!.containerVisible, "container should not be display:none").toBe(true);

  // (1) Container has non-zero rendered size and sits within the viewport at the
  // expected screen point.
  expect(
    measured!.containerRect.w,
    "indicator container should have non-zero rendered width",
  ).toBeGreaterThan(0);
  expect(
    measured!.containerRect.h,
    "indicator container should have non-zero rendered height",
  ).toBeGreaterThan(0);

  const expectedScreen = worldToScreen(PEER.x, PEER.y); // (760, 420)
  const expectedLeft = expectedScreen.x - HALF; // 751
  const expectedTop = expectedScreen.y - HALF; // 411
  expect(measured!.containerRect.x).toBeCloseTo(expectedLeft, 0);
  expect(measured!.containerRect.y).toBeCloseTo(expectedTop, 0);
  expect(expectedLeft).toBeGreaterThanOrEqual(0);
  expect(expectedLeft).toBeLessThan(VIEWPORT.width);
  expect(expectedTop).toBeGreaterThanOrEqual(0);
  expect(expectedTop).toBeLessThan(VIEWPORT.height);

  // (2) The glyph — the wrapper that carries the rotated SVG arrow — must have
  // non-zero intrinsic size. This is the assertion that targets the observed
  // "glyph invisible" root cause (a zero-size wrapper makes the rotated arrow
  // unreliable / invisible even when the container translate is correct).
  expect(
    measured!.glyphRect.w,
    "glyph should have non-zero rendered width (else the arrow is invisible)",
  ).toBeGreaterThan(0);
  expect(
    measured!.glyphRect.h,
    "glyph should have non-zero rendered height (else the arrow is invisible)",
  ).toBeGreaterThan(0);
  expect(
    measured!.glyphComputed.width,
    "glyph computed width should be non-zero (intrinsic size present)",
  ).toBeGreaterThan(0);
  expect(
    measured!.glyphComputed.height,
    "glyph computed height should be non-zero (intrinsic size present)",
  ).toBeGreaterThan(0);
  // The glyph's layout box (rotation-independent computed style) should match the
  // 18×18 SVG it wraps. This is the rotation-free size check; glyphRect is the
  // axis-aligned bounding box of the *rotated* glyph and is therefore larger
  // (an 18×18 box rotated 45° spans ~25.5px), so we don't assert exact-18 on it.
  expect(measured!.glyphComputed.width).toBeCloseTo(REMOTE_SIZE, 0);
  expect(measured!.glyphComputed.height).toBeCloseTo(REMOTE_SIZE, 0);

  // (3) The glyph rotation reflects the peer heading.
  const rotate = parseRotate(measured!.glyphTransform);
  expect(rotate, "glyph should carry a rotate() transform").not.toBeNull();
  expect(rotate!).toBeCloseTo(PEER.heading, 0);

  console.log(
    `[verify-remote-turtle-indicator] container=${JSON.stringify(measured!.containerRect)} ` +
      `glyph=${JSON.stringify(measured!.glyphRect)} ` +
      `glyphComputed=${JSON.stringify(measured!.glyphComputed)} rotate=${rotate}deg`,
  );

  const screenshotPath = path.join(OUT_DIR, "remote-turtle-indicator.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-remote-turtle-indicator] screenshot: ${screenshotPath}`);
});
