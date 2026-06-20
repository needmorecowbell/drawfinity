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
 * Integration check for the cross-feature selection hit-testing introduced by
 * PR #61 (selection tool) + PR #62 (image item kind). It drives the *real*
 * production pipeline — `SelectionCapture` reads pointer events, builds a
 * `SelectionRegion`, and `CanvasApp` resolves it through
 * `getSelectedItems(doc, region)` in `src/model/Selection.ts`, which now
 * branches across `stroke` / `shape` / `image` (`hitTestStroke`,
 * `hitTestShape`, `hitTestImage`).
 *
 * Rather than re-implementing the hit-test math in the test, we activate the
 * selection tool (keyboard `V` → `switchTool("select")`), drag a marquee with
 * the mouse, then read the app's resolved selection via the
 * `getActiveSelectionItems()` accessor. At camera (0,0) / zoom 1 the
 * world→screen mapping is `screen = world + viewport/2`
 * (see `Camera.screenToWorld`), so a 1280×720 viewport puts world (0,0) at
 * screen (640, 360).
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const VIEWPORT = { width: 1280, height: 720 };

// World→screen at camera (0,0), zoom 1.
function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return { x: wx + VIEWPORT.width / 2, y: wy + VIEWPORT.height / 2 };
}

/**
 * Drags a rectangular marquee across the canvas, expressed in WORLD coordinates,
 * generating real pointerdown/move/up events for SelectionCapture to consume.
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

async function readSelection(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const app = (window as any).__drawfinity.viewManager.getCanvasApp();
    const region = app.getActiveSelectionRegion();
    const items = app.getActiveSelectionItems();
    return {
      region,
      kinds: items.map((it: any) => it.kind),
      ids: items.map((it: any) => it.item.id),
    };
  });
}

test("Selection model hit-tests strokes, shapes, and images together", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // Generate a small, valid PNG in-browser so the image texture decodes and is
  // visible in the screenshot. Hit-testing itself only depends on bounds.
  const imageSrc = await page.evaluate(() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(40,120,220,1)";
    ctx.fillRect(0, 0, 64, 64);
    return cv.toDataURL("image/png");
  });

  // --- Build a known scene: one of each item kind, added in this timestamp
  // order so the documented paint-order contract yields kinds in this order. ---
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

  // Capture the ids so we can assert WHICH item each selection resolved to.
  const scene = await page.evaluate(() => {
    const doc = (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .getInternals().doc;
    return doc.getAllItems().map((it: any) => ({ kind: it.kind, id: it.item.id }));
  });
  expect(scene.map((s: any) => s.kind)).toEqual(["stroke", "shape", "image"]);
  const imageId = scene.find((s: any) => s.kind === "image").id;
  console.log(
    `[verify-selection-hittest] scene = ${scene
      .map((s: any) => s.kind)
      .join(", ")}`,
  );

  // Activate the selection tool through the real keyboard path (V → switchTool).
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

  // --- Marquee 1: cover ONLY the image (world x≈400). The shape sits at x=200
  // with bounds [160,240]; starting at world x=330 excludes it. ---
  await dragMarquee(page, 330, -60, 470, 60);
  const imageOnly = await readSelection(page);
  console.log(
    `[verify-selection-hittest] image-only marquee → kinds=[${imageOnly.kinds.join(
      ", ",
    )}] ids=[${imageOnly.ids.join(", ")}]`,
  );
  expect(imageOnly.region?.type).toBe("rect");
  expect(
    imageOnly.kinds,
    "a marquee over only x≈400 should select exactly the image",
  ).toEqual(["image"]);
  expect(imageOnly.ids).toEqual([imageId]);

  // --- Marquee 2: cover ALL THREE. Start from world (-60,-60), which is OUTSIDE
  // the previous region so this begins a fresh selection rather than a move. ---
  await dragMarquee(page, -60, -60, 470, 60);
  const allThree = await readSelection(page);
  console.log(
    `[verify-selection-hittest] all-three marquee → kinds=[${allThree.kinds.join(
      ", ",
    )}]`,
  );
  expect(
    allThree.kinds,
    "a marquee over all items should select stroke, shape, and image in timestamp order",
  ).toEqual(["stroke", "shape", "image"]);
  expect(allThree.ids).toEqual(scene.map((s: any) => s.id));

  const screenshotPath = path.join(OUT_DIR, "selection-hittest.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-selection-hittest] screenshot: ${screenshotPath}`);
});
