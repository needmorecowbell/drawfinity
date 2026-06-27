import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  navigateToCanvas,
  setCamera,
  addImage,
  waitForTexture,
  waitForRender,
} from "./helpers";

/**
 * REGRESSION REPRO for the human-test defect found 2026-06-27 on PR #62
 * ("images are persistent, but it seems I can't erase or move them").
 *
 * This spec exercises the **real pointer → eraser tool → model** path the human
 * tester used, which the existing image specs never touched:
 *
 *   - press `e` to activate the eraser tool (real keyboard),
 *   - drag the eraser across the image's center with `page.mouse` (real pointer
 *     events StrokeCapture sees),
 *   - assert via `getInternals().doc` that the image item was removed.
 *
 * On current code the eraser ignores image items (StrokeCapture.eraseAt only
 * considers strokes and shapes), so the drag passes straight through the image
 * and the final assertion FAILS — that is the intended red state for RC-FIX-02.
 *
 * At camera (0,0) / zoom 1 the world→screen mapping is `screen = world +
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
 * Drags the eraser from one WORLD point to another using real pointer events so
 * StrokeCapture's eraser path (pointerdown → pointermove → pointerup) runs.
 */
async function dragEraser(
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

/** Reads every item from the doc as a flat, assertion-friendly snapshot. */
async function snapshotItems(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .getInternals().doc;
    return doc.getAllItems().map((it: any) => ({
      kind: it.kind,
      id: it.item.id,
    }));
  });
}

async function activateEraserTool(page: import("@playwright/test").Page) {
  await page.keyboard.press("e");
  await waitForRender(page);
  const toolName = await page.evaluate(
    () =>
      (window as any).__drawfinity.viewManager
        .getCanvasApp()
        .getInternals()
        .toolManager.getTool(),
  );
  expect(toolName, "keyboard E should activate the eraser tool").toBe("eraser");
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

/**
 * Drags a rectangular marquee across the canvas, expressed in WORLD coordinates,
 * so SelectionCapture builds a real SelectionRegion the way the human tester did.
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

/** Reads the app's resolved active selection (kinds + ids). */
async function readSelection(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const app = (window as any).__drawfinity.viewManager.getCanvasApp();
    const items = app.getActiveSelectionItems();
    return {
      kinds: items.map((it: any) => it.kind),
      ids: items.map((it: any) => it.item.id),
    };
  });
}

test("ERASE: dragging the eraser across an image removes it", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // A visible PNG so the image item renders; erasure only needs its bounds.
  const imageSrc = await page.evaluate(() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(40,120,220,1)";
    ctx.fillRect(0, 0, 64, 64);
    return cv.toDataURL("image/png");
  });

  // Image centered at the origin, box world x∈[-50,50], y∈[-50,50].
  await addImage(page, {
    src: imageSrc,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  await waitForTexture(page);

  const before = await snapshotItems(page);
  expect(
    before.filter((it) => it.kind === "image").length,
    "scene should contain exactly one image before erasing",
  ).toBe(1);

  await activateEraserTool(page);

  // Drag the eraser straight across the image's center (world -40,0 → 40,0).
  await dragEraser(page, -40, 0, 40, 0);

  const after = await snapshotItems(page);
  console.log(
    `[verify-image-erase] items before=${before.length} after=${after.length}`,
  );

  const screenshotPath = path.join(OUT_DIR, "image-erase.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-image-erase] screenshot: ${screenshotPath}`);

  // The image must be gone after the eraser pass over its center.
  expect(
    after.filter((it) => it.kind === "image").length,
    "dragging the eraser across the image should remove the image item",
  ).toBe(0);
});

test("SELECT: marquee over an image reports it in the active selection", async ({
  page,
}) => {
  // Companion to the erase repro: confirms images are first-class *selectable*
  // objects through the real pointer → selection tool → model path, so Phase 1's
  // move/duplicate/delete fixes apply to images (RC-FIX-02, checklist §#62).
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  const imageSrc = await page.evaluate(() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(40,120,220,1)";
    ctx.fillRect(0, 0, 64, 64);
    return cv.toDataURL("image/png");
  });

  // Image centered at the origin, box world x∈[-50,50], y∈[-50,50].
  await addImage(page, {
    src: imageSrc,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  await waitForTexture(page);

  const scene = await snapshotItems(page);
  const imageId = scene.find((it) => it.kind === "image")?.id;
  expect(imageId, "scene should contain one image to select").toBeTruthy();

  await activateSelectionTool(page);

  // Marquee fully enclosing the image (world -70,-70 → 70,70).
  await dragMarquee(page, -70, -70, 70, 70);
  const selection = await readSelection(page);
  console.log(
    `[verify-image-erase] selection kinds=[${selection.kinds.join(
      ", ",
    )}] ids=[${selection.ids.join(", ")}]`,
  );

  const screenshotPath = path.join(OUT_DIR, "image-select.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-image-erase] screenshot: ${screenshotPath}`);

  expect(
    selection.kinds,
    "a marquee over the image should select exactly the image",
  ).toEqual(["image"]);
  expect(selection.ids).toEqual([imageId]);
});
