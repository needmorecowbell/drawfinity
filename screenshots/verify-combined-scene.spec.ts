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
 * RC verification — Phase 5 cross-feature integration (the release gate).
 *
 * A single mixed scene that exercises all four merged RC features together:
 *   - #59 Dark Mode      — the scene is captured in both light and dark palettes.
 *   - #60 Remote turtle  — (covered by its own specs; not re-exercised here).
 *   - #61 Selection      — the whole scene is selected and moved/duplicated.
 *   - #62 Image upload    — an image item participates in every operation.
 *
 * The cross-cutting invariant under test is the **paint-order contract**:
 * `doc.getAllItems()` returns items timestamp-sorted, so building a scene in
 * the order stroke → shape → image must read back as kinds
 * `["stroke", "shape", "image"]` — the order they paint on the canvas.
 *
 * The mutations are driven through the real CRDT doc API in
 * `src/crdt/DrawfinityDoc.ts` (`translateItems`, `duplicateItems`), each of
 * which has a dedicated `image` branch, so an image moving and duplicating
 * alongside strokes/shapes proves the kinds coexist without regression.
 *
 * Dark mode is seeded into `drawfinity:user-preferences` via `addInitScript`
 * (before app load) so ThemeManager applies `data-theme="dark"` at boot,
 * matching the production startup path (no runtime toggle / flicker).
 */

const OUT_DIR = "/tmp/drawfinity-rc";
const VIEWPORT = { width: 1280, height: 720 };

const TRANSLATE = { dx: 60, dy: 30 };
const DUP_OFFSET = 24;

/** A small opaque PNG so the image item actually renders in the screenshot. */
async function makeImageSrc(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(40,120,220,1)";
    ctx.fillRect(0, 0, 64, 64);
    return cv.toDataURL("image/png");
  });
}

/** Read every item's kind/id from the live doc in timestamp (paint) order. */
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

/**
 * Build the canonical mixed scene on the current (already-loaded) canvas in
 * stroke → shape → image timestamp order. Returns nothing — callers snapshot
 * the doc themselves.
 */
async function buildMixedScene(
  page: import("@playwright/test").Page,
  imageSrc: string,
) {
  await setCamera(page, { x: 0, y: 0, zoom: 1 });
  await addStroke(page, {
    points: [
      { x: -120, y: 20 },
      { x: -40, y: -40 },
      { x: 40, y: 20 },
    ],
    color: "#e23b3b",
    width: 8,
  });
  await addShape(page, {
    type: "rectangle",
    x: 200,
    y: 0,
    width: 90,
    height: 90,
    strokeColor: "#2bb24c",
    fillColor: "#bfeccb",
  });
  await addImage(page, {
    src: imageSrc,
    x: 420,
    y: 0,
    width: 100,
    height: 100,
  });
  await waitForTexture(page);
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

test("Combined mixed scene: paint order, group move/duplicate, light+dark capture", async ({
  page,
}) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  // ===================================================================== //
  // LIGHT — build the scene, assert every contract, capture.              //
  // ===================================================================== //
  await page.goto("/");
  await navigateToCanvas(page);
  const imageSrc = await makeImageSrc(page);
  await buildMixedScene(page, imageSrc);

  // (1) PAINT-ORDER CONTRACT: timestamp-sorted stroke → shape → image.     //
  const before = await snapshotItems(page);
  const order = before.map((it: any) => it.kind);
  expect(
    order,
    "doc.getAllItems() must return items in stroke→shape→image paint order",
  ).toEqual(["stroke", "shape", "image"]);
  const originalCount = before.length;
  expect(originalCount).toBe(3);

  const origStroke = before.find((it: any) => it.kind === "stroke");
  const origShape = before.find((it: any) => it.kind === "shape");
  const origImage = before.find((it: any) => it.kind === "image");

  // (2) SELECT ALL + MOVE: translate the whole scene by a delta together.  //
  const moved = await page.evaluate(({ dx, dy }) => {
    const doc = (window as any).__drawfinity.viewManager
      .getCanvasApp()
      .getInternals().doc;
    const items = doc.getAllItems(); // selecting "all three"
    return doc.translateItems(items, dx, dy);
  }, TRANSLATE);
  await waitForRender(page);
  expect(moved, "translateItems should report all 3 items moved").toBe(3);

  const afterMove = await snapshotItems(page);
  const movedStroke = afterMove.find((it: any) => it.kind === "stroke");
  const movedShape = afterMove.find((it: any) => it.kind === "shape");
  const movedImage = afterMove.find((it: any) => it.kind === "image");
  // All three shifted by the same delta — they moved together.
  expect(movedShape.x).toBeCloseTo(origShape.x + TRANSLATE.dx, 5);
  expect(movedShape.y).toBeCloseTo(origShape.y + TRANSLATE.dy, 5);
  expect(movedImage.x).toBeCloseTo(origImage.x + TRANSLATE.dx, 5);
  expect(movedImage.y).toBeCloseTo(origImage.y + TRANSLATE.dy, 5);
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

  // (3) DUPLICATE: clone the whole selection; count doubles, new ids.      //
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
    "duplicating the 3-item selection should double the count to 6",
  ).toBe(originalCount * 2);
  // Every duplicate id is brand new (none collide with the originals).
  const originalIds = new Set(afterMove.map((it: any) => it.id));
  for (const d of dupIds) {
    expect(originalIds.has(d.id), `duplicate id ${d.id} must be new`).toBe(
      false,
    );
  }
  // The duplicated set includes an image (the #62 image branch fires).
  expect(
    dupIds.map((d: any) => d.kind).sort(),
    "duplicates must include one of each kind, image included",
  ).toEqual(["image", "shape", "stroke"]);
  expect(
    afterDup.filter((it: any) => it.kind === "image").length,
    "two images after duplicate (original + clone)",
  ).toBe(2);

  await waitForTexture(page);
  const lightPath = path.join(OUT_DIR, "combined-light.png");
  await page.screenshot({ path: lightPath, fullPage: false });

  // ===================================================================== //
  // DARK — seed the theme before load, rebuild the same scene, capture.   //
  // (Doc state is in-memory, so a fresh load needs the scene rebuilt.)     //
  // ===================================================================== //
  await seedTheme(page, "dark");
  await page.goto("/");
  await navigateToCanvas(page);
  const darkTheme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  expect(darkTheme, "seeded preference should resolve data-theme=dark").toBe(
    "dark",
  );

  const darkImageSrc = await makeImageSrc(page);
  await buildMixedScene(page, darkImageSrc);
  // Match the light capture's mutated layout for an apples-to-apples compare.
  await page.evaluate(
    ({ t, offset }) => {
      const doc = (window as any).__drawfinity.viewManager
        .getCanvasApp()
        .getInternals().doc;
      doc.translateItems(doc.getAllItems(), t.dx, t.dy);
      doc.duplicateItems(doc.getAllItems(), offset, offset);
    },
    { t: TRANSLATE, offset: DUP_OFFSET },
  );
  await waitForTexture(page);

  const darkOrder = (await snapshotItems(page)).map((it: any) => it.kind);
  const darkPath = path.join(OUT_DIR, "combined-dark.png");
  await page.screenshot({ path: darkPath, fullPage: false });

  // ===================================================================== //
  // Report measured values + paths.                                       //
  // ===================================================================== //
  console.log(
    `[verify-combined-scene] paint order (light) = [${order.join(", ")}]`,
  );
  console.log(
    `[verify-combined-scene] item count: ${originalCount} → ${afterDup.length} after duplicate`,
  );
  console.log(
    `[verify-combined-scene] dark scene kinds = [${darkOrder.join(", ")}]`,
  );
  console.log(`[verify-combined-scene] screenshot: ${lightPath}`);
  console.log(`[verify-combined-scene] screenshot: ${darkPath}`);
});
