import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { navigateToCanvas, setCamera, waitForTexture } from "./helpers";

/**
 * End-to-end verification of the hidden-file-input image insertion path
 * (PR #62). `setupImageFileInput` in `src/canvas/CanvasApp.ts` appends a hidden
 * `<input type="file" class="image-file-input">` to the document body; choosing
 * a file fires `change`, which runs `insertImageFile` → decodes the file and
 * calls `doc.addImage`.
 *
 * We drive that path with Playwright's `setInputFiles` (which sets the files and
 * dispatches the `change` event), pointing at a small PNG written to a temp
 * path, then assert the CRDT document ends up with exactly one image item.
 */
test("File-input path inserts an image into the document", async ({ page }) => {
  const outDir = "/tmp/drawfinity-rc";
  fs.mkdirSync(outDir, { recursive: true });

  await page.goto("/");
  await navigateToCanvas(page);
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // Generate a small, valid solid-color PNG in-browser (toBlob → base64) so the
  // file the browser decodes is guaranteed well-formed, then write it to disk
  // for `setInputFiles`.
  const base64 = await page.evaluate(async () => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(220,80,40,1)";
    ctx.fillRect(0, 0, 64, 64);
    const blob: Blob = await new Promise((resolve) =>
      cv.toBlob((b) => resolve(b!), "image/png"),
    );
    const buf = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  });

  const fixturePath = path.join(outDir, "fixture.png");
  fs.writeFileSync(fixturePath, Buffer.from(base64, "base64"));
  console.log(`[verify-image-insertion] fixture PNG: ${fixturePath}`);

  // Sanity: the document starts empty.
  const before = await page.evaluate(() => {
    const vm = (window as any).__drawfinity.viewManager;
    return vm.getCanvasApp().getInternals().doc.getAllItems().length;
  });
  expect(before, "canvas should start empty").toBe(0);

  // Locate the hidden file input created by setupImageFileInput and set the
  // file. setInputFiles dispatches the `change` event, triggering insertion.
  const input = page.locator("input.image-file-input");
  await expect(input).toHaveCount(1);
  await input.setInputFiles(fixturePath);

  // insertImageFile is async (FileReader + image decode), so poll until the
  // image item appears in the document.
  await page.waitForFunction(
    () => {
      const vm = (window as any).__drawfinity.viewManager;
      const items = vm.getCanvasApp().getInternals().doc.getAllItems();
      return items.some((it: any) => it.kind === "image");
    },
    null,
    { timeout: 5000 },
  );
  await waitForTexture(page);

  // Assert exactly one image item is present.
  const summary = await page.evaluate(() => {
    const vm = (window as any).__drawfinity.viewManager;
    const items = vm.getCanvasApp().getInternals().doc.getAllItems();
    const images = items.filter((it: any) => it.kind === "image");
    return {
      total: items.length,
      imageCount: images.length,
      firstSrcPrefix: images[0]?.item?.src?.slice(0, 16) ?? null,
    };
  });

  console.log(
    `[verify-image-insertion] items=${summary.total} images=${summary.imageCount} src="${summary.firstSrcPrefix}..."`,
  );

  expect(
    summary.imageCount,
    `expected exactly one image item after file-input insertion, got ${summary.imageCount} (total items: ${summary.total})`,
  ).toBe(1);
  expect(summary.total).toBe(1);
  expect(summary.firstSrcPrefix).toContain("data:image/png");

  const screenshotPath = path.join(outDir, "image-inserted.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-image-insertion] screenshot: ${screenshotPath}`);
});
