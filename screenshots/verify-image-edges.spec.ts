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
 * Regression test for dark edge fringing on an opaque image over a light
 * background (PR #62 integration / alpha double-multiply fix).
 *
 * A fully opaque solid-color image must render with crisp edges: the pixels
 * just inside the image boundary must match the image's interior color, with
 * no dark seam bleeding in from the (transparent) texture border. The old
 * alpha handling caused a darkened fringe one step inside the edge.
 *
 * We add a fully opaque solid blue image (40,120,220, a=1) over an opaque
 * white backing rect, then sample a column crossing the image's left edge and
 * assert no channel of the inner-edge band dips more than 30 below the
 * interior color.
 */
test("Opaque image has no dark edge fringing over light background", async ({
  page,
}) => {
  await page.goto("/");
  await navigateToCanvas(page);

  // Known camera frame: world origin centered, 1:1 zoom.
  await setCamera(page, { x: 0, y: 0, zoom: 1 });

  // Opaque white backing rectangle, added FIRST so it paints behind. Larger
  // than the image so the area around the image edge is light.
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

  // Build a fully opaque solid blue straight-alpha data-URI in-browser.
  const INTERIOR = { r: 40, g: 120, b: 220 };
  const src = await page.evaluate((c) => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},1)`;
    ctx.fillRect(0, 0, 64, 64);
    return cv.toDataURL("image/png");
  }, INTERIOR);

  // Opaque image on top of the white rect, same center.
  const IMAGE_W = 200;
  const IMAGE_H = 200;
  await addImage(page, {
    src,
    x: 0,
    y: 0,
    width: IMAGE_W,
    height: IMAGE_H,
    opacity: 1,
  });
  await waitForTexture(page);

  // Sample a horizontal column of pixels crossing the image's LEFT edge.
  // Map world coordinates to backing-store pixels using the live camera so the
  // sample points are independent of viewport size / devicePixelRatio.
  const sample = await page.evaluate(
    async (args) => {
      const gl = document.getElementById(
        "drawfinity-canvas"
      ) as HTMLCanvasElement;
      const vm = (window as any).__drawfinity.viewManager;
      const app = vm.getCanvasApp();
      const { camera } = app.getInternals();
      const [vw, vh] = camera.getViewportSize();
      const dprX = gl.width / vw;
      const dprY = gl.height / vh;

      // world -> backing-store pixel (inverse of Camera.screenToWorld, then DPR)
      const worldToBacking = (wx: number, wy: number) => ({
        x: ((wx - camera.x) * camera.zoom + vw / 2) * dprX,
        y: ((wy - camera.y) * camera.zoom + vh / 2) * dprY,
      });

      return await new Promise<{
        interior: { r: number; g: number; b: number };
        innerBandMin: { r: number; g: number; b: number };
        outside: { r: number; g: number; b: number };
        leftEdgeWorld: number;
      }>((resolve) => {
        requestAnimationFrame(() => {
          const read = document.createElement("canvas");
          read.width = gl.width;
          read.height = gl.height;
          const ctx = read.getContext("2d")!;
          ctx.drawImage(gl, 0, 0);

          const avgAt = (
            bx: number,
            by: number,
            half: number
          ): { r: number; g: number; b: number } => {
            const x0 = Math.round(bx - half);
            const y0 = Math.round(by - half);
            const data = ctx.getImageData(x0, y0, half * 2, half * 2).data;
            let r = 0;
            let g = 0;
            let b = 0;
            const n = data.length / 4;
            for (let i = 0; i < data.length; i += 4) {
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
            }
            return { r: r / n, g: g / n, b: b / n };
          };

          const cy = 0; // world y center row
          const leftEdgeWorld = -args.imageW / 2;

          // Interior: well inside the image (world origin).
          const ic = worldToBacking(0, cy);
          const interior = avgAt(ic.x, ic.y, 6);

          // Inner-edge band: scan several world-units just inside the left edge
          // and take the per-channel MINIMUM (darkest), to catch a thin seam.
          let minR = 255;
          let minG = 255;
          let minB = 255;
          for (let d = 1; d <= 6; d++) {
            const p = worldToBacking(leftEdgeWorld + d, cy);
            const s = avgAt(p.x, p.y, 1);
            minR = Math.min(minR, s.r);
            minG = Math.min(minG, s.g);
            minB = Math.min(minB, s.b);
          }

          // Outside: just left of the edge (over the white backing).
          const op = worldToBacking(leftEdgeWorld - 8, cy);
          const outside = avgAt(op.x, op.y, 3);

          resolve({
            interior,
            innerBandMin: { r: minR, g: minG, b: minB },
            outside,
            leftEdgeWorld,
          });
        });
      });
    },
    { imageW: IMAGE_W }
  );

  // Capture a screenshot for human review.
  const screenshotPath = path.join("/tmp/drawfinity-rc", "image-edges.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify-image-edges] screenshot: ${screenshotPath}`);
  console.log(
    `[verify-image-edges] interior RGB = (${sample.interior.r.toFixed(
      1
    )}, ${sample.interior.g.toFixed(1)}, ${sample.interior.b.toFixed(1)})`
  );
  console.log(
    `[verify-image-edges] inner-edge band min RGB = (${sample.innerBandMin.r.toFixed(
      1
    )}, ${sample.innerBandMin.g.toFixed(1)}, ${sample.innerBandMin.b.toFixed(1)})`
  );
  console.log(
    `[verify-image-edges] outside (backing) RGB = (${sample.outside.r.toFixed(
      1
    )}, ${sample.outside.g.toFixed(1)}, ${sample.outside.b.toFixed(1)})`
  );

  // The inner-edge band must not be substantially darker than the interior on
  // any channel (no dark seam). Allow a small tolerance for AA on the boundary.
  const TOL = 30;
  const msg = (channel: string, inner: number, interior: number) =>
    `${channel} channel one step inside the edge was ${inner.toFixed(
      1
    )}, which is more than ${TOL} below the interior value ${interior.toFixed(
      1
    )} — indicates dark edge fringing on the opaque image.`;

  expect(
    sample.innerBandMin.r,
    msg("Red", sample.innerBandMin.r, sample.interior.r)
  ).toBeGreaterThanOrEqual(sample.interior.r - TOL);
  expect(
    sample.innerBandMin.g,
    msg("Green", sample.innerBandMin.g, sample.interior.g)
  ).toBeGreaterThanOrEqual(sample.interior.g - TOL);
  expect(
    sample.innerBandMin.b,
    msg("Blue", sample.innerBandMin.b, sample.interior.b)
  ).toBeGreaterThanOrEqual(sample.interior.b - TOL);
});
