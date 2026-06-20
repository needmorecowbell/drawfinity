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
 * Verifies the selection *mutation* pipeline introduced by PR #61 (selection
 * tool) + PR #62 (image item kind): move / duplicate / delete must all operate
 * on a mixed selection that includes an image, and undo must restore a deletion.
 *
 * The mutations are driven through the real CRDT doc API in
 * `src/crdt/DrawfinityDoc.ts` — `translateItems`, `duplicateItems`, and
 * `removeItems` — each of which has a dedicated `image` branch. The selection
 * itself is the full scene built from `doc.getAllItems()` (timestamp-sorted,
 * the documented paint-order contract). Undo is triggered through the real
 * production `Ctrl+Z` keyboard path (`CanvasApp.doUndo` → `UndoManager.undo`),
 * since every `doc.transact` runs with a null origin that the local
 * `Y.UndoManager` tracks and captureTimeout 0 keeps as a discrete undo step.
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const VIEWPORT = { width: 1280, height: 720 };

const TRANSLATE = { dx: 50, dy: 25 };
const DUP_OFFSET = 20;

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

test("Move, duplicate, and delete operate on a mixed selection (with undo)", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // A visible PNG so the image item actually renders in the screenshot. The
  // mutation math only depends on the image's x/y/width/height, not pixels.
  const imageSrc = await page.evaluate(() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(40,120,220,1)";
    ctx.fillRect(0, 0, 64, 64);
    return cv.toDataURL("image/png");
  });

  // --- Build a known mixed scene: one of each kind, in timestamp order. ---
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

  const before = await snapshotItems(page);
  expect(
    before.map((it: any) => it.kind),
    "scene should start as stroke, shape, image in timestamp order",
  ).toEqual(["stroke", "shape", "image"]);
  const originalCount = before.length;
  const origStroke = before.find((it: any) => it.kind === "stroke");
  const origShape = before.find((it: any) => it.kind === "shape");
  const origImage = before.find((it: any) => it.kind === "image");
  console.log(
    `[verify-selection-mutations] scene = [${before
      .map((it: any) => it.kind)
      .join(", ")}], count=${originalCount}`,
  );

  // ===================================================================== //
  // (1) MOVE — translate the full selection by (+50, +25).                //
  // ===================================================================== //
  const translated = await page.evaluate(({ dx, dy }) => {
    const doc = (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .getInternals().doc;
    const items = doc.getAllItems();
    return doc.translateItems(items, dx, dy);
  }, TRANSLATE);
  await waitForRender(page);
  expect(translated, "translateItems should report 3 items moved").toBe(3);

  const afterMove = await snapshotItems(page);
  const movedStroke = afterMove.find((it: any) => it.kind === "stroke");
  const movedShape = afterMove.find((it: any) => it.kind === "shape");
  const movedImage = afterMove.find((it: any) => it.kind === "image");

  // Image: center x/y shifted.
  expect(movedImage.x).toBeCloseTo(origImage.x + TRANSLATE.dx, 5);
  expect(movedImage.y).toBeCloseTo(origImage.y + TRANSLATE.dy, 5);
  // Shape: x/y shifted.
  expect(movedShape.x).toBeCloseTo(origShape.x + TRANSLATE.dx, 5);
  expect(movedShape.y).toBeCloseTo(origShape.y + TRANSLATE.dy, 5);
  // Stroke: every point shifted.
  for (let i = 0; i < origStroke.points.length; i++) {
    expect(movedStroke.points[i].x).toBeCloseTo(
      origStroke.points[i].x + TRANSLATE.dx,
      5,
    );
    expect(movedStroke.points[i].y).toBeCloseTo(
      origStroke.points[i].y + TRANSLATE.dy,
      5,
    );
  }
  console.log(
    `[verify-selection-mutations] move → image=(${movedImage.x},${movedImage.y}), shape=(${movedShape.x},${movedShape.y}), stroke[0]=(${movedStroke.points[0].x},${movedStroke.points[0].y})`,
  );

  // ===================================================================== //
  // (2) DUPLICATE — clone the selection offset by (+20, +20).             //
  // ===================================================================== //
  const dupIds = await page.evaluate((offset) => {
    const doc = (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .getInternals().doc;
    const items = doc.getAllItems();
    const clones = doc.duplicateItems(items, offset, offset);
    return clones.map((c: any) => ({ kind: c.kind, id: c.item.id }));
  }, DUP_OFFSET);
  await waitForRender(page);

  const afterDup = await snapshotItems(page);
  expect(
    afterDup.length,
    "duplicate should add 3 items (one per original)",
  ).toBe(originalCount + 3);

  // Duplicated image: NEW id + offset center; original image untouched.
  const images = afterDup.filter((it: any) => it.kind === "image");
  expect(images.length).toBe(2);
  const stillOriginalImage = images.find((it: any) => it.id === movedImage.id);
  const dupImage = images.find((it: any) => it.id !== movedImage.id);
  expect(stillOriginalImage, "original image must still exist").toBeTruthy();
  expect(dupImage, "duplicate image must have a new id").toBeTruthy();
  expect(dupImage.id).not.toBe(movedImage.id);
  expect(dupImage.x).toBeCloseTo(movedImage.x + DUP_OFFSET, 5);
  expect(dupImage.y).toBeCloseTo(movedImage.y + DUP_OFFSET, 5);
  // Original image is unchanged by the duplicate.
  expect(stillOriginalImage.x).toBeCloseTo(movedImage.x, 5);
  expect(stillOriginalImage.y).toBeCloseTo(movedImage.y, 5);
  console.log(
    `[verify-selection-mutations] duplicate → count=${afterDup.length}, new image id=${dupImage.id} at (${dupImage.x},${dupImage.y}); duplicated kinds=[${dupIds
      .map((d: any) => d.kind)
      .join(", ")}]`,
  );

  // ===================================================================== //
  // (3) DELETE — remove the original selection; count returns to original.//
  // ===================================================================== //
  const deletedIds = await page.evaluate(
    ({ stroke, shape, image }) => {
      const doc = (window as any).__drawfinity.viewManager
        .getCanvasApp()
        .getInternals().doc;
      // Reconstruct the original CanvasItem[] (the items that existed before
      // duplication) from the live doc, then remove exactly those.
      const targets = doc
        .getAllItems()
        .filter((it: any) => [stroke, shape, image].includes(it.item.id));
      doc.removeItems(targets);
      return targets.map((t: any) => t.item.id);
    },
    { stroke: movedStroke.id, shape: movedShape.id, image: movedImage.id },
  );
  await waitForRender(page);

  const afterDelete = await snapshotItems(page);
  expect(
    afterDelete.length,
    "deleting the original 3 leaves only the 3 duplicates",
  ).toBe(originalCount);
  const survivingIds = afterDelete.map((it: any) => it.id);
  for (const id of deletedIds) {
    expect(survivingIds, `deleted id ${id} should be gone`).not.toContain(id);
  }
  console.log(
    `[verify-selection-mutations] delete → count=${afterDelete.length}, removed=[${deletedIds.join(", ")}]`,
  );

  // ===================================================================== //
  // (4) UNDO — Ctrl+Z reverses the deletion; deleted items come back.     //
  // ===================================================================== //
  await page.keyboard.press("Control+z");
  await waitForRender(page);

  const afterUndo = await snapshotItems(page);
  expect(
    afterUndo.length,
    "undo should restore the deleted items",
  ).toBe(originalCount + 3);
  const restoredIds = afterUndo.map((it: any) => it.id);
  for (const id of deletedIds) {
    expect(restoredIds, `undo should restore deleted id ${id}`).toContain(id);
  }
  console.log(
    `[verify-selection-mutations] undo → count=${afterUndo.length}, restored=[${deletedIds.join(", ")}]`,
  );

  await waitForTexture(page);
  const screenshotPath = path.join(OUT_DIR, "selection-mutations.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-selection-mutations] screenshot: ${screenshotPath}`);
});
