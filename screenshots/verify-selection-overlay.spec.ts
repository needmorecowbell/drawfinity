import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  navigateToCanvas,
  setCamera,
  addStroke,
  addShape,
  addImage,
  waitForTexture,
  waitForRender,
} from "./helpers";

/**
 * Verifies the selection marquee OVERLAY renders for the PR #61 selection tool
 * across all three marquee modes the tool exposes (rectangle / ellipse / lasso).
 *
 * The dashed marquee is drawn by `Renderer.drawSelectionOverlay` onto a separate
 * fixed-screen 2D canvas (`.selection-overlay-canvas`). We drive the *real*
 * production input pipeline: activate the tool via keyboard `V`
 * (→ `switchTool("select")`), switch modes via `CanvasApp.setSelectionMode`
 * (mirrors the toolbar's `onSelectionModeChange`), then generate real pointer
 * events through `SelectionCapture`. After the gesture we assert the overlay
 * canvas exists, the app reports the expected finalized region type, and the
 * active selection is non-empty.
 *
 * At camera (0,0) / zoom 1 the world→screen mapping is `screen = world +
 * viewport/2` (see `Camera.screenToWorld`), so a 1280×720 viewport puts world
 * (0,0) at screen (640, 360).
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const VIEWPORT = { width: 1280, height: 720 };

// World→screen at camera (0,0), zoom 1.
function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return { x: wx + VIEWPORT.width / 2, y: wy + VIEWPORT.height / 2 };
}

/**
 * Drags a rectangular/elliptical marquee (expressed in WORLD coords), generating
 * real pointerdown/move/up events for SelectionCapture's drag gesture.
 */
async function dragMarquee(
  page: Page,
  worldX0: number,
  worldY0: number,
  worldX1: number,
  worldY1: number,
) {
  const a = worldToScreen(worldX0, worldY0);
  const b = worldToScreen(worldX1, worldY1);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
  await waitForRender(page);
}

/**
 * Drives the lasso click gesture: one click per vertex (expressed in WORLD
 * coords) plus a closing click near the first vertex. SelectionCapture closes
 * the path once there are >= 3 vertices and the final click lands within the
 * close threshold (10 screen px / zoom) of the first.
 */
async function clickLasso(page: Page, vertices: Array<[number, number]>) {
  for (const [wx, wy] of vertices) {
    const s = worldToScreen(wx, wy);
    await page.mouse.click(s.x, s.y);
  }
  // Closing click near the first vertex (within the 10-world-unit threshold).
  const first = worldToScreen(vertices[0][0] + 2, vertices[0][1] + 2);
  await page.mouse.click(first.x, first.y);
  await waitForRender(page);
}

async function readSelection(page: Page) {
  return page.evaluate(() => {
    const app = (window as any).__drawfinity.viewManager.getCanvasApp();
    const region = app.getActiveSelectionRegion();
    const items = app.getActiveSelectionItems();
    return {
      regionType: region?.type ?? null,
      kinds: items.map((it: any) => it.kind),
      count: items.length,
    };
  });
}

/**
 * Builds a known mixed-kind scene (stroke + shape + image) centered near the
 * origin so a single marquee can cover all three. Returns the data-URL src used
 * for the image so callers may reuse it.
 */
async function buildScene(page: Page): Promise<void> {
  const imageSrc = await page.evaluate(() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(220,120,40,1)";
    ctx.fillRect(0, 0, 64, 64);
    return cv.toDataURL("image/png");
  });

  await addStroke(page, {
    points: [
      { x: -70, y: -10 },
      { x: -40, y: 10 },
    ],
    color: "#e23b3b",
    width: 6,
  });
  await addShape(page, {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 60,
    height: 60,
    strokeColor: "#2bb24c",
    fillColor: "#bfeccb",
  });
  await addImage(page, {
    src: imageSrc,
    x: 70,
    y: 0,
    width: 60,
    height: 60,
  });
  await waitForTexture(page);
}

async function setup(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });
  await buildScene(page);

  // Activate the selection tool through the real keyboard path.
  await page.keyboard.press("v");
  await waitForRender(page);
  const toolName = await page.evaluate(() =>
    (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .getInternals()
      .toolManager.getTool(),
  );
  expect(toolName, "keyboard V should activate the selection tool").toBe(
    "select",
  );
}

async function expectOverlayCanvas(page: Page): Promise<void> {
  const overlayCount = await page
    .locator(".selection-overlay-canvas")
    .count();
  expect(
    overlayCount,
    "the dashed-marquee overlay canvas should exist in the DOM",
  ).toBeGreaterThan(0);
}

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test("rectangle marquee renders the overlay and selects items", async ({
  page,
}) => {
  await setup(page);

  // Cover all three items: stroke (~ -55,0), shape [-30,30], image [40,100].
  await dragMarquee(page, -90, -45, 110, 45);

  await expectOverlayCanvas(page);
  const sel = await readSelection(page);
  console.log(
    `[verify-selection-overlay] rectangle → region=${sel.regionType} count=${sel.count} kinds=[${sel.kinds.join(", ")}]`,
  );
  expect(sel.regionType).toBe("rect");
  expect(sel.count, "rectangle marquee should select the scene items").toBeGreaterThan(0);

  const out = path.join(OUT_DIR, "selection-overlay.png");
  await page.screenshot({ path: out, fullPage: false });
  console.log(`[verify-selection-overlay] screenshot: ${out}`);
});

test("ellipse marquee renders the overlay and selects items", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() =>
    (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .setSelectionMode("ellipse"),
  );

  // Large ellipse comfortably enclosing all three item centers.
  await dragMarquee(page, -110, -70, 130, 70);

  await expectOverlayCanvas(page);
  const sel = await readSelection(page);
  console.log(
    `[verify-selection-overlay] ellipse → region=${sel.regionType} count=${sel.count} kinds=[${sel.kinds.join(", ")}]`,
  );
  expect(sel.regionType).toBe("ellipse");
  expect(sel.count, "ellipse marquee should select the scene items").toBeGreaterThan(0);

  const out = path.join(OUT_DIR, "selection-overlay-ellipse.png");
  await page.screenshot({ path: out, fullPage: false });
  console.log(`[verify-selection-overlay] screenshot: ${out}`);
});

test("lasso marquee renders the overlay and selects items", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() =>
    (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .setSelectionMode("lasso"),
  );

  // Click a quad enclosing all three items, then close near the first vertex.
  await clickLasso(page, [
    [-95, -55],
    [115, -55],
    [115, 55],
    [-95, 55],
  ]);

  await expectOverlayCanvas(page);
  const sel = await readSelection(page);
  console.log(
    `[verify-selection-overlay] lasso → region=${sel.regionType} count=${sel.count} kinds=[${sel.kinds.join(", ")}]`,
  );
  expect(sel.regionType).toBe("lasso");
  expect(sel.count, "lasso marquee should select the scene items").toBeGreaterThan(0);

  const out = path.join(OUT_DIR, "selection-overlay-lasso.png");
  await page.screenshot({ path: out, fullPage: false });
  console.log(`[verify-selection-overlay] screenshot: ${out}`);
});
