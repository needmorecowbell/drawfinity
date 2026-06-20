import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { navigateToCanvas, setCamera, waitForRender } from "./helpers";

/**
 * Multi-peer rendering verification for the "Enhanced Live Presence & Remote
 * Turtle Visualization" feature merged from PR #60 — `RemoteTurtleRenderer`
 * (`src/turtle/RemoteTurtleRenderer.ts`).
 *
 * Where the single-peer spec (`verify-remote-turtle.spec.ts`) proves one peer
 * renders, this spec guards the two failure modes that the post-merge
 * redundant-redraw fix in `redrawAll()` was about:
 *   - **Color bleed** — two peers with different `userColor`s must each draw
 *     their own indicator + trail in their own color, never the other's.
 *   - **Ghost / duplicated trails** — repeated `redrawAll()` (the per-frame
 *     pan/zoom call) must NOT accumulate extra trail segments. The fix removed
 *     a redundant explicit `renderTrail` from `redrawAll`; `renderTrail` itself
 *     `replaceChildren()`s the group and `recordTrailPoint` dedupes identical
 *     positions, so a stable peer should hold a stable segment count across
 *     redraws.
 *
 * Finally we exercise the removal path (`removeClient`) and assert the removed
 * peer's indicator + trail are gone while the surviving peer is untouched.
 *
 * Geometry mirrors the single-peer spec: at camera (0,0) zoom 1 with a
 * 1280×720 viewport, world (wx, wy) maps to screen (wx + 640, wy + 360); the
 * indicator container is offset by -halfSize (REMOTE_SIZE/2 = 9).
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const VIEWPORT = { width: 1280, height: 720 };
const HALF = 9; // REMOTE_SIZE (18) / 2

interface Peer {
  userId: string;
  userName: string;
  userColor: string;
  turtleId: string;
  heading: number;
  trail: Array<{ x: number; y: number }>;
}

const PEER_A: Peer = {
  userId: "peer-A",
  userName: "Ada",
  userColor: "#e11d48", // rose
  turtleId: "main",
  heading: 30,
  trail: [
    { x: 40, y: -40 },
    { x: 60, y: -40 },
    { x: 80, y: -40 },
    { x: 100, y: -40 },
  ],
};

const PEER_B: Peer = {
  userId: "peer-B",
  userName: "Linus",
  userColor: "#2563eb", // blue
  turtleId: "main",
  heading: 200,
  trail: [
    { x: -60, y: 60 },
    { x: -80, y: 60 },
    { x: -100, y: 60 },
    { x: -120, y: 60 },
  ],
};

// World→screen at camera (0,0), zoom 1.
function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return { x: wx + VIEWPORT.width / 2, y: wy + VIEWPORT.height / 2 };
}

/** Parse the two numeric args of a `translate(<x>px, <y>px)` transform token. */
function parseTranslate(transform: string): { x: number; y: number } | null {
  const match = transform.match(
    /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/,
  );
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}

/** Parse the numeric angle of a `rotate(<deg>deg)` transform token. */
function parseRotate(transform: string): number | null {
  const match = transform.match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
  if (!match) return null;
  return Number(match[1]);
}

/** Read a peer's indicator + trail state from the live DOM. */
async function readPeer(page: import("@playwright/test").Page, key: string) {
  return page.evaluate((k) => {
    const container = document.querySelector(
      `.turtle-indicator--remote[data-turtle-id="${k}"]`,
    ) as HTMLElement | null;
    const glyph = container?.querySelector(
      ".turtle-indicator__glyph",
    ) as HTMLElement | null;
    const segments = Array.from(
      document.querySelectorAll(`[data-turtle-trail-id="${k}"] polyline`),
    );
    return {
      exists: container !== null,
      containerTransform: container?.style.transform ?? "",
      glyphTransform: glyph?.style.transform ?? "",
      color: container?.style.color ?? "",
      trailCount: segments.length,
      trailStrokes: segments.map((s) => s.getAttribute("stroke")),
    };
  }, key);
}

test("renders two distinct remote peers, then removes one cleanly", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // Inject both peers through the renderer's real entry point. Replaying a
  // sequence of awareness snapshots accumulates each trail exactly as live
  // peers' moving turtles would. Then call redrawAll() repeatedly (the
  // per-frame pan/zoom call) to prove it does NOT duplicate trail segments.
  await page.evaluate(
    ({ a, b }) => {
      const app = (window as any).__drawfinity.viewManager.getCanvasApp();
      const renderer = app.getInternals().remoteTurtleRenderer;
      renderer.show();
      const steps = Math.max(a.trail.length, b.trail.length);
      for (let i = 0; i < steps; i++) {
        const pa = a.trail[Math.min(i, a.trail.length - 1)];
        const pb = b.trail[Math.min(i, b.trail.length - 1)];
        renderer.syncFromAwareness([
          {
            userId: a.userId,
            userName: a.userName,
            userColor: a.userColor,
            turtles: [
              {
                id: a.turtleId,
                x: pa.x,
                y: pa.y,
                heading: a.heading,
                color: a.userColor,
                visible: true,
              },
            ],
          },
          {
            userId: b.userId,
            userName: b.userName,
            userColor: b.userColor,
            turtles: [
              {
                id: b.turtleId,
                x: pb.x,
                y: pb.y,
                heading: b.heading,
                color: b.userColor,
                visible: true,
              },
            ],
          },
        ]);
      }
      // Redundant-redraw guard: stable peers, many frames, no new geometry.
      for (let i = 0; i < 5; i++) renderer.redrawAll();
    },
    { a: PEER_A, b: PEER_B },
  );
  await waitForRender(page);

  const keyA = `${PEER_A.userId}:${PEER_A.turtleId}`;
  const keyB = `${PEER_B.userId}:${PEER_B.turtleId}`;

  // --- Both peers render, each with its own position, heading, and color. ---
  const a1 = await readPeer(page, keyA);
  const b1 = await readPeer(page, keyB);

  expect(a1.exists, "peer A indicator should exist").toBe(true);
  expect(b1.exists, "peer B indicator should exist").toBe(true);

  // Positions: each indicator sits at its own final world point.
  const expectA = worldToScreen(100, -40); // → (740, 320)
  const tA = parseTranslate(a1.containerTransform);
  expect(tA, "peer A should carry a translate()").not.toBeNull();
  expect(tA!.x).toBeCloseTo(expectA.x - HALF, 0); // 731
  expect(tA!.y).toBeCloseTo(expectA.y - HALF, 0); // 311

  const expectB = worldToScreen(-120, 60); // → (520, 420)
  const tB = parseTranslate(b1.containerTransform);
  expect(tB, "peer B should carry a translate()").not.toBeNull();
  expect(tB!.x).toBeCloseTo(expectB.x - HALF, 0); // 511
  expect(tB!.y).toBeCloseTo(expectB.y - HALF, 0); // 411

  // Distinct headings on the glyphs.
  expect(parseRotate(a1.glyphTransform)!).toBeCloseTo(PEER_A.heading, 0);
  expect(parseRotate(b1.glyphTransform)!).toBeCloseTo(PEER_B.heading, 0);

  // --- No color bleed: every trail segment uses its own peer's color. ---
  expect(a1.trailCount, "peer A trail should have segments").toBeGreaterThan(0);
  expect(b1.trailCount, "peer B trail should have segments").toBeGreaterThan(0);
  expect(
    a1.trailStrokes.every((s) => s === PEER_A.userColor),
    `every peer-A trail segment should be ${PEER_A.userColor}`,
  ).toBe(true);
  expect(
    b1.trailStrokes.every((s) => s === PEER_B.userColor),
    `every peer-B trail segment should be ${PEER_B.userColor}`,
  ).toBe(true);
  // Cross-check: neither trail leaks the other's color.
  expect(a1.trailStrokes.includes(PEER_B.userColor)).toBe(false);
  expect(b1.trailStrokes.includes(PEER_A.userColor)).toBe(false);

  // --- Ghost/duplicate guard: redrawAll() above did not inflate segment counts.
  // A 4-point trail yields exactly 3 segments regardless of redraw count.
  expect(a1.trailCount, "peer A trail should not duplicate across redraws").toBe(
    PEER_A.trail.length - 1,
  );
  expect(b1.trailCount, "peer B trail should not duplicate across redraws").toBe(
    PEER_B.trail.length - 1,
  );

  console.log(
    `[verify-remote-turtle-multi] A translate=(${tA!.x},${tA!.y}) ` +
      `trail=${a1.trailCount}x${PEER_A.userColor} | ` +
      `B translate=(${tB!.x},${tB!.y}) trail=${b1.trailCount}x${PEER_B.userColor}`,
  );

  const beforePath = path.join(OUT_DIR, "remote-turtle-multi.png");
  await page.screenshot({ path: beforePath, fullPage: false });
  console.log(`[verify-remote-turtle-multi] screenshot: ${beforePath}`);

  // --- Remove peer B via the renderer's removal path; A must be untouched. ---
  await page.evaluate((removeId) => {
    const app = (window as any).__drawfinity.viewManager.getCanvasApp();
    const renderer = app.getInternals().remoteTurtleRenderer;
    renderer.removeClient(removeId);
    renderer.redrawAll();
  }, PEER_B.userId);
  await waitForRender(page);

  const a2 = await readPeer(page, keyA);
  const b2 = await readPeer(page, keyB);

  // Peer B fully gone: no indicator, no trail segments.
  expect(b2.exists, "removed peer B indicator should be gone").toBe(false);
  expect(b2.trailCount, "removed peer B trail should be gone").toBe(0);

  // Peer A survives intact, still its own color, same segment count.
  expect(a2.exists, "surviving peer A indicator should remain").toBe(true);
  expect(a2.trailCount, "surviving peer A trail should be unchanged").toBe(
    PEER_A.trail.length - 1,
  );
  expect(
    a2.trailStrokes.every((s) => s === PEER_A.userColor),
    "surviving peer A trail should still be its own color",
  ).toBe(true);

  console.log(
    `[verify-remote-turtle-multi] after removeClient(${PEER_B.userId}): ` +
      `B exists=${b2.exists} B trail=${b2.trailCount} | ` +
      `A exists=${a2.exists} A trail=${a2.trailCount}`,
  );
});
