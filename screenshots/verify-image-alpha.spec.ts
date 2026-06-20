import { test, expect } from "@playwright/test";
import * as path from "path";
import {
  navigateToCanvas,
  addShape,
  addImage,
  setCamera,
  waitForTexture,
} from "./helpers";

/**
 * Regression test for the alpha double-multiply fix (PR #62 integration).
 *
 * The WebGL context uses `premultipliedAlpha: false` and `TextureCache`
 * uploads with `UNPACK_PREMULTIPLY_ALPHA_WEBGL = false`, so straight-alpha
 * image pixels must blend correctly over an opaque backing.
 *
 * A 50%-transparent gray image (128,128,128, a=0.5) painted over a fully
 * opaque white rectangle should yield a center red channel of ~191
 * (128*0.5 + 255*0.5). The old double-multiply bug produced ~159. We assert
 * the sampled red channel is >= 180 to catch a regression.
 */
test("Image alpha blends as straight-alpha (no double-multiply)", async ({
  page,
}) => {
  await page.goto("/");
  await navigateToCanvas(page);

  // Known camera frame: world origin centered, 1:1 zoom.
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // Opaque white backing rectangle, added FIRST so it paints behind.
  await addShape(page, {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 400,
    height: 400,
    strokeColor: "#ffffff",
    strokeWidth: 0,
    fillColor: "#ffffff",
  });

  // Build a semi-transparent gray straight-alpha data-URI in-browser.
  const src = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(128,128,128,0.5)";
    ctx.fillRect(0, 0, 64, 64);
    return c.toDataURL("image/png");
  });

  // Semi-transparent gray image on top of the white rect, same center.
  await addImage(page, {
    src,
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    opacity: 1,
  });
  await waitForTexture(page);

  // Read back the average RGB of the center overlap region from the WebGL
  // canvas by compositing it onto a 2D readback canvas inside a fresh frame.
  const sample = await page.evaluate(async () => {
    const gl = document.getElementById(
      "drawfinity-canvas"
    ) as HTMLCanvasElement;

    // Composite the current WebGL frame into a 2D canvas for pixel readback.
    const px = await new Promise<{ r: number; g: number; b: number }>(
      (resolve) => {
        requestAnimationFrame(() => {
          const read = document.createElement("canvas");
          read.width = gl.width;
          read.height = gl.height;
          const ctx = read.getContext("2d")!;
          ctx.drawImage(gl, 0, 0);

          const cx = Math.floor(gl.width / 2);
          const cy = Math.floor(gl.height / 2);
          const half = 6;
          const data = ctx.getImageData(
            cx - half,
            cy - half,
            half * 2,
            half * 2
          ).data;

          let r = 0;
          let g = 0;
          let b = 0;
          const n = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          resolve({ r: r / n, g: g / n, b: b / n });
        });
      }
    );
    return px;
  });

  // Capture a screenshot for human review.
  const screenshotPath = path.join("/tmp/drawfinity-rc", "image-alpha.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-image-alpha] screenshot: ${screenshotPath}`);
  console.log(
    `[verify-image-alpha] center RGB = (${sample.r.toFixed(
      1
    )}, ${sample.g.toFixed(1)}, ${sample.b.toFixed(1)})`
  );

  expect(
    sample.r,
    `Center red channel was ${sample.r.toFixed(
      1
    )} (expected >= 180 for correct straight-alpha blend; ~159 indicates the ` +
      `alpha double-multiply regression)`
  ).toBeGreaterThanOrEqual(180);
});
