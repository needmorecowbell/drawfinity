import { test, expect } from "@playwright/test";
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
 * REGRESSION REPRO for the human-test defects found 2026-06-27 on the Selection
 * tool (PR #61). Unlike `verify-selection-mutations.spec.ts` (which drives the
 * model API `translateItems`/`removeItems` directly via `page.evaluate`), this
 * spec exercises the **real pointer → tool → model** path that the human tester
 * actually used and that the previous specs never touched:
 *
 *   - press `v` to activate the selection tool (real keyboard),
 *   - drag a marquee with `page.mouse` (real pointer events SelectionCapture sees),
 *   - press-drag from inside the selection to move it (real pointer events),
 *   - press `Delete` to delete the selection (real keyboard).
 *
 * The two defects under test:
 *   (1) MOVE — dragging a selection should translate the selected items and must
 *       NOT pan the camera.
 *   (2) DELETE — pressing Delete with a subset selected must remove ONLY the
 *       selected items, never strokes outside the marquee (reported data loss).
 *
 * Outcomes are asserted by reading the live `camera` and `doc` state through
 * `getInternals()`, never by re-implementing the math in the test.
 *
 * At camera (0,0) / zoom 1, the world→screen mapping is `screen = world +
 * viewport/2` (see `Camera.screenToWorld`), so world (0,0) sits at screen
 * (640, 360) for a 1280×720 viewport.
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const VIEWPORT = { width: 1280, height: 720 };

// World→screen at camera (0,0), zoom 1.
function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return { x: wx + VIEWPORT.width / 2, y: wy + VIEWPORT.height / 2 };
}

/**
 * Drags a rectangular marquee (WORLD coordinates) using real pointer events so
 * SelectionCapture builds a SelectionRegion and CanvasApp resolves the items.
 */
async function dragMarquee(
  page: import("@playwright/test").Page,
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
 * Press-drag from one WORLD point to another using real pointer events. Used to
 * grab an existing selection from *inside* its region and move it.
 */
async function dragMove(
  page: import("@playwright/test").Page,
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

/** Reads the live camera position. */
async function readCamera(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const { camera } = (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .getInternals();
    return { x: camera.x, y: camera.y, zoom: camera.zoom };
  });
}

/** Reads every item from the doc as a flat, assertion-friendly snapshot. */
async function snapshotItems(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .getInternals().doc;
    return doc.getAllItems().map((it: any) => ({
      kind: it.kind,
      id: it.item.id,
      x: it.item.x ?? null,
      y: it.item.y ?? null,
      points: it.item.points
        ? it.item.points.map((p: any) => ({ x: p.x, y: p.y }))
        : null,
    }));
  });
}

async function activateSelectionTool(page: import("@playwright/test").Page) {
  await page.keyboard.press("v");
  await waitForRender(page);
  const toolName = await page.evaluate(
    () =>
      (window as any).__drawfinity.viewManager
        .getCanvasApp()
        .getInternals()
        .toolManager.getTool(),
  );
  expect(toolName, "keyboard V should activate the selection tool").toBe(
    "select",
  );
}

test("MOVE: dragging a selection translates items without panning the camera", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // A visible PNG so the image item renders; the move math only uses its bounds.
  const imageSrc = await page.evaluate(() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(40,120,220,1)";
    ctx.fillRect(0, 0, 64, 64);
    return cv.toDataURL("image/png");
  });

  // Mixed scene: stroke + shape + image, all near the origin so a single marquee
  // covers them and the move stays inside the viewport.
  await addStroke(page, {
    points: [
      { x: -12, y: 0 },
      { x: 12, y: 0 },
    ],
    color: "#e23b3b",
    width: 6,
  });
  await addShape(page, {
    type: "rectangle",
    x: 200,
    y: 0,
    width: 80,
    height: 80,
    strokeColor: "#2bb24c",
    fillColor: "#bfeccb",
  });
  await addImage(page, {
    src: imageSrc,
    x: 400,
    y: 0,
    width: 100,
    height: 100,
  });
  await waitForTexture(page);

  await activateSelectionTool(page);

  // Marquee over all three items (world x from -60 to 470).
  await dragMarquee(page, -60, -60, 470, 60);
  const selection = await page.evaluate(() => {
    const app = (window as any).__drawfinity.viewManager.getCanvasApp();
    return {
      region: app.getActiveSelectionRegion(),
      kinds: app.getActiveSelectionItems().map((it: any) => it.kind),
    };
  });
  expect(
    selection.kinds,
    "marquee over all items should select stroke, shape, and image",
  ).toEqual(["stroke", "shape", "image"]);

  const before = await snapshotItems(page);
  const cameraBefore = await readCamera(page);
  const origStroke = before.find((it: any) => it.kind === "stroke");
  const origShape = before.find((it: any) => it.kind === "shape");
  const origImage = before.find((it: any) => it.kind === "image");

  // Press-drag from INSIDE the selection region (world ~200,0 — the shape center
  // sits inside the marquee bounds) to a point offset by (+90, +45).
  const DELTA = { dx: 90, dy: 45 };
  await dragMove(page, 200, 0, 200 + DELTA.dx, 0 + DELTA.dy);

  const after = await snapshotItems(page);
  const cameraAfter = await readCamera(page);
  const movedStroke = after.find((it: any) => it.kind === "stroke");
  const movedShape = after.find((it: any) => it.kind === "shape");
  const movedImage = after.find((it: any) => it.kind === "image");

  console.log(
    `[verify-selection-interaction] MOVE camera before=(${cameraBefore.x},${cameraBefore.y}) after=(${cameraAfter.x},${cameraAfter.y})`,
  );
  console.log(
    `[verify-selection-interaction] MOVE shape before=(${origShape.x},${origShape.y}) after=(${movedShape.x},${movedShape.y})`,
  );

  // (a) The camera must NOT have panned.
  expect(
    cameraAfter.x,
    "dragging a selection must NOT pan the camera horizontally",
  ).toBeCloseTo(cameraBefore.x, 3);
  expect(
    cameraAfter.y,
    "dragging a selection must NOT pan the camera vertically",
  ).toBeCloseTo(cameraBefore.y, 3);

  // (b) Every selected item must have translated by the drag delta.
  expect(movedShape.x).toBeCloseTo(origShape.x + DELTA.dx, 3);
  expect(movedShape.y).toBeCloseTo(origShape.y + DELTA.dy, 3);
  expect(movedImage.x).toBeCloseTo(origImage.x + DELTA.dx, 3);
  expect(movedImage.y).toBeCloseTo(origImage.y + DELTA.dy, 3);
  for (let i = 0; i < origStroke.points.length; i++) {
    expect(movedStroke.points[i].x).toBeCloseTo(
      origStroke.points[i].x + DELTA.dx,
      3,
    );
    expect(movedStroke.points[i].y).toBeCloseTo(
      origStroke.points[i].y + DELTA.dy,
      3,
    );
  }

  const screenshotPath = path.join(OUT_DIR, "selection-interaction-move.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-selection-interaction] MOVE screenshot: ${screenshotPath}`);
});

test("DELETE: pressing Delete removes only the marquee-selected items", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // Five horizontally-spaced strokes. We will marquee only the first two and
  // assert the other three survive a Delete press (the reported data-loss bug
  // erased strokes outside the selection too).
  const STROKE_XS = [-300, -150, 0, 150, 300];
  for (const cx of STROKE_XS) {
    await addStroke(page, {
      points: [
        { x: cx - 10, y: 0 },
        { x: cx + 10, y: 0 },
      ],
      color: "#e23b3b",
      width: 6,
    });
  }
  await waitForRender(page);

  const before = await snapshotItems(page);
  expect(before.length, "scene should contain five strokes").toBe(5);
  const allIds: string[] = before.map((it: any) => it.id);

  await activateSelectionTool(page);

  // Marquee over only the two leftmost strokes (world x from -320 to -130).
  await dragMarquee(page, -320, -40, -130, 40);
  const selectedIds: string[] = await page.evaluate(() => {
    const app = (window as any).__drawfinity.viewManager.getCanvasApp();
    return app.getActiveSelectionItems().map((it: any) => it.item.id);
  });
  console.log(
    `[verify-selection-interaction] DELETE selected ${selectedIds.length} of ${allIds.length} strokes`,
  );
  expect(
    selectedIds.length,
    "marquee over the two leftmost strokes should select exactly two",
  ).toBe(2);

  const expectedSurvivors = allIds.filter((id) => !selectedIds.includes(id));

  // Real keyboard delete via the production key handler.
  await page.keyboard.press("Delete");
  await waitForRender(page);

  const after = await snapshotItems(page);
  const survivingIds: string[] = after.map((it: any) => it.id);
  console.log(
    `[verify-selection-interaction] DELETE survivors=${survivingIds.length} (expected ${expectedSurvivors.length})`,
  );

  // Every selected id must be gone.
  for (const id of selectedIds) {
    expect(survivingIds, `selected id ${id} should be deleted`).not.toContain(
      id,
    );
  }
  // Every UNSELECTED id must still exist — this is the data-loss guard.
  for (const id of expectedSurvivors) {
    expect(
      survivingIds,
      `unselected id ${id} must NOT be deleted (data-loss bug)`,
    ).toContain(id);
  }
  expect(
    after.length,
    "exactly the three unselected strokes should remain",
  ).toBe(expectedSurvivors.length);

  const screenshotPath = path.join(OUT_DIR, "selection-interaction-delete.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(
    `[verify-selection-interaction] DELETE screenshot: ${screenshotPath}`,
  );
});
