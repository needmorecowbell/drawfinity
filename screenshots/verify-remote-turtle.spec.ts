import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { navigateToCanvas, setCamera, waitForRender } from "./helpers";

/**
 * Rendering verification for the "Enhanced Live Presence & Remote Turtle
 * Visualization" feature merged from PR #60 — specifically the
 * `RemoteTurtleRenderer` (`src/turtle/RemoteTurtleRenderer.ts`).
 *
 * The real presence path needs two connected clients and the Rust collab
 * server, so that is covered by the manual checklist. What we CAN automate is
 * the *rendering* of a remote peer's turtle + trail given injected awareness
 * state — which is exactly where the visual bugs (and the post-merge
 * redundant-redraw fix) live.
 *
 * `CanvasApp` constructs a live `RemoteTurtleRenderer` (attached to the canvas
 * overlay and the shared camera) and exposes it through
 * `getInternals().remoteTurtleRenderer`. We drive that same instance directly:
 * `syncFromAwareness([...])` is the entry point the SyncManager subscription
 * calls, so feeding it a synthetic peer exercises the production render code.
 *
 * Geometry: at camera (0,0) zoom 1 with a 1280×720 viewport, world (wx, wy)
 * maps to screen (wx + 640, wy + 360) (see `Camera`). The indicator container
 * is additionally offset by -halfSize (REMOTE_SIZE/2 = 9) so its top-left
 * lands at (screen - 9). Trail polyline points use the un-offset world→screen
 * mapping.
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const VIEWPORT = { width: 1280, height: 720 };
const HALF = 9; // REMOTE_SIZE (18) / 2

// World→screen at camera (0,0), zoom 1.
function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return { x: wx + VIEWPORT.width / 2, y: wy + VIEWPORT.height / 2 };
}

/**
 * Parse the two numeric arguments of a `translate(<x>px, <y>px)` token from a
 * transform string. Mirrors the unit test's tolerant approach so jsdom/chromium
 * normalization (whitespace, token reordering) does not break the assertion.
 */
function parseTranslate(transform: string): { x: number; y: number } | null {
  const match = transform.match(
    /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/,
  );
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}

/** Parse the numeric angle of a `rotate(<deg>deg)` token from a transform string. */
function parseRotate(transform: string): number | null {
  const match = transform.match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
  if (!match) return null;
  return Number(match[1]);
}

test("renders a synthetic remote peer's turtle indicator + colored trail", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  const PEER = {
    userId: "peer-A",
    userName: "Ada",
    userColor: "#e11d48",
    turtleId: "main",
    heading: 30,
    // A short trail of world-space points, ending at the final turtle position.
    trail: [
      { x: 40, y: -40 },
      { x: 60, y: -40 },
      { x: 80, y: -40 },
      { x: 100, y: -40 },
    ] as Array<{ x: number; y: number }>,
  };

  // Inject the peer through the renderer's real entry point. Replaying a
  // sequence of awareness snapshots accumulates the trail exactly as a live
  // peer's moving turtle would.
  await page.evaluate((peer) => {
    const app = (window as any).__drawfinity.viewManager.getCanvasApp();
    const renderer = app.getInternals().remoteTurtleRenderer;
    renderer.show();
    for (const p of peer.trail) {
      renderer.syncFromAwareness([
        {
          userId: peer.userId,
          userName: peer.userName,
          userColor: peer.userColor,
          turtles: [
            {
              id: peer.turtleId,
              x: p.x,
              y: p.y,
              heading: peer.heading,
              color: peer.userColor,
              visible: true,
            },
          ],
        },
      ]);
    }
  }, PEER);
  await waitForRender(page);

  const key = `${PEER.userId}:${PEER.turtleId}`;

  // (1) Turtle indicator exists with the expected translate + rotate.
  const indicator = await page.evaluate((k) => {
    const container = document.querySelector(
      `.turtle-indicator--remote[data-turtle-id="${k}"]`,
    ) as HTMLElement | null;
    if (!container) return null;
    const glyph = container.querySelector(
      ".turtle-indicator__glyph",
    ) as HTMLElement | null;
    return {
      containerTransform: container.style.transform,
      glyphTransform: glyph?.style.transform ?? "",
      color: container.style.color,
    };
  }, key);

  expect(indicator, "remote turtle indicator element should exist").not.toBeNull();

  const expectedScreen = worldToScreen(100, -40); // final position → (740, 320)
  const translate = parseTranslate(indicator!.containerTransform);
  expect(translate, "indicator should carry a translate() transform").not.toBeNull();
  expect(translate!.x).toBeCloseTo(expectedScreen.x - HALF, 0); // 731
  expect(translate!.y).toBeCloseTo(expectedScreen.y - HALF, 0); // 311

  const rotate = parseRotate(indicator!.glyphTransform);
  expect(rotate, "glyph should carry a rotate() transform").not.toBeNull();
  expect(rotate!).toBeCloseTo(PEER.heading, 0);

  // (2) A trail exists, drawn in the peer's userColor.
  const trail = await page.evaluate((k) => {
    const segments = Array.from(
      document.querySelectorAll(`[data-turtle-trail-id="${k}"] polyline`),
    );
    return {
      count: segments.length,
      strokes: segments.map((s) => s.getAttribute("stroke")),
    };
  }, key);

  expect(trail.count, "trail should render at least one segment").toBeGreaterThan(0);
  expect(
    trail.strokes.every((s) => s === PEER.userColor),
    `every trail segment should use the peer color ${PEER.userColor}`,
  ).toBe(true);

  console.log(
    `[verify-remote-turtle] indicator translate=(${translate!.x},${translate!.y}) ` +
      `rotate=${rotate}deg, trail segments=${trail.count} color=${PEER.userColor}`,
  );

  const screenshotPath = path.join(OUT_DIR, "remote-turtle.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-remote-turtle] screenshot: ${screenshotPath}`);
});
