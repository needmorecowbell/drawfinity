import { generateTriangleStrip } from "../renderer/StrokeMesh";
import { generateShapeVertices } from "../renderer/ShapeMesh";
import { ImageRenderer } from "../renderer/ImageRenderer";
import { computeImageBounds } from "../renderer/SpatialIndex";
import type { Stroke } from "../model/Stroke";
import type { Shape } from "../model/Shape";
import type { CanvasImage } from "../model/Image";

/** Export scope: viewport crops to current view, fitAll includes all content. */
export type ExportScope = "viewport" | "fitAll";

/** Export options for rendering to an image. */
export interface ExportOptions {
  scope: ExportScope;
  /** Resolution multiplier (1, 2, or 4). */
  scale: number;
  /** Whether to include the background color. */
  includeBackground: boolean;
  /** Canvas background color hex (e.g. "#FAFAF8"). Defaults to #FAFAF8 if omitted. */
  backgroundColor?: string;
  /** Current viewport bounds (world-space) — required when scope is "viewport". */
  viewportBounds?: { minX: number; minY: number; maxX: number; maxY: number };
  /** Current camera transform matrix — required when scope is "viewport". */
  viewportMatrix?: Float32Array;
  /** Viewport pixel dimensions — required when scope is "viewport". */
  viewportSize?: [number, number];
}

interface BoundsResult {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const PADDING_RATIO = 0.05;

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b, 1.0];
}

export function computeContentBounds(
  strokes: Stroke[],
  shapes: Shape[],
  images: CanvasImage[] = [],
): BoundsResult | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasContent = false;

  for (const stroke of strokes) {
    const hw = stroke.width / 2;
    for (const pt of stroke.points) {
      if (pt.x - hw < minX) minX = pt.x - hw;
      if (pt.y - hw < minY) minY = pt.y - hw;
      if (pt.x + hw > maxX) maxX = pt.x + hw;
      if (pt.y + hw > maxY) maxY = pt.y + hw;
      hasContent = true;
    }
  }

  for (const shape of shapes) {
    const hw = shape.width / 2 + shape.strokeWidth / 2;
    const hh = shape.height / 2 + shape.strokeWidth / 2;
    const cos = Math.abs(Math.cos(shape.rotation));
    const sin = Math.abs(Math.sin(shape.rotation));
    const rotatedHalfW = hw * cos + hh * sin;
    const rotatedHalfH = hw * sin + hh * cos;
    if (shape.x - rotatedHalfW < minX) minX = shape.x - rotatedHalfW;
    if (shape.y - rotatedHalfH < minY) minY = shape.y - rotatedHalfH;
    if (shape.x + rotatedHalfW > maxX) maxX = shape.x + rotatedHalfW;
    if (shape.y + rotatedHalfH > maxY) maxY = shape.y + rotatedHalfH;
    hasContent = true;
  }

  for (const image of images) {
    const bounds = computeImageBounds(image);
    if (bounds.minX < minX) minX = bounds.minX;
    if (bounds.minY < minY) minY = bounds.minY;
    if (bounds.maxX > maxX) maxX = bounds.maxX;
    if (bounds.maxY > maxY) maxY = bounds.maxY;
    hasContent = true;
  }

  if (!hasContent) return null;
  return { minX, minY, maxX, maxY };
}

function computeFitTransform(
  bounds: BoundsResult,
  viewW: number,
  viewH: number,
): Float32Array {
  const contentW = bounds.maxX - bounds.minX;
  const contentH = bounds.maxY - bounds.minY;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const padW = contentW > 0 ? contentW * PADDING_RATIO : 10;
  const padH = contentH > 0 ? contentH * PADDING_RATIO : 10;
  const totalW = contentW + padW * 2;
  const totalH = contentH + padH * 2;

  const scaleX = viewW / totalW;
  const scaleY = viewH / totalH;
  const zoom = Math.min(scaleX, scaleY);

  const sx = (2 * zoom) / viewW;
  const sy = (-2 * zoom) / viewH;
  const tx = -centerX * sx;
  const ty = -centerY * sy;

  return new Float32Array([sx, 0, 0, 0, sy, 0, tx, ty, 1]);
}

/**
 * Render strokes and shapes to a Blob for export/download.
 * Returns null if there is no content to render (fitAll with empty canvas)
 * or if WebGL context creation fails.
 */
export function renderExport(
  strokes: Stroke[],
  shapes: Shape[],
  options: ExportOptions,
  images: CanvasImage[] = [],
): Promise<HTMLCanvasElement | null> {
  return renderExportAsync(strokes, shapes, options, images);
}

async function renderExportAsync(
  strokes: Stroke[],
  shapes: Shape[],
  options: ExportOptions,
  images: CanvasImage[],
): Promise<HTMLCanvasElement | null> {
  let canvasW: number;
  let canvasH: number;
  let cameraMatrix: Float32Array;

  if (options.scope === "viewport") {
    if (!options.viewportSize || !options.viewportMatrix) return null;
    canvasW = Math.round(options.viewportSize[0] * options.scale);
    canvasH = Math.round(options.viewportSize[1] * options.scale);

    // Scale the viewport matrix for higher resolution
    const m = options.viewportMatrix;
    cameraMatrix = new Float32Array([
      m[0], m[1], m[2],
      m[3], m[4], m[5],
      m[6], m[7], m[8],
    ]);
  } else {
    const bounds = computeContentBounds(strokes, shapes, images);
    if (!bounds) return null;

    // Base size: fit content into a reasonable canvas (max 2048 base)
    const contentW = bounds.maxX - bounds.minX;
    const contentH = bounds.maxY - bounds.minY;
    const aspect = contentW / (contentH || 1);
    const maxBase = 2048;
    let baseW: number;
    let baseH: number;
    if (aspect >= 1) {
      baseW = Math.min(maxBase, Math.max(256, Math.ceil(contentW)));
      baseH = Math.round(baseW / aspect);
    } else {
      baseH = Math.min(maxBase, Math.max(256, Math.ceil(contentH)));
      baseW = Math.round(baseH * aspect);
    }
    canvasW = baseW * options.scale;
    canvasH = baseH * options.scale;
    cameraMatrix = computeFitTransform(bounds, canvasW, canvasH);
  }

  if (canvasW <= 0 || canvasH <= 0) return null;

  const offscreen = document.createElement("canvas");
  offscreen.width = canvasW;
  offscreen.height = canvasH;

  const gl = offscreen.getContext("webgl2", {
    antialias: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;

  try {
    await renderToGL(gl, offscreen, strokes, shapes, images, cameraMatrix, options.includeBackground, options.backgroundColor);

    // Copy to a 2D canvas before losing the WebGL context — loseContext()
    // clears the drawing buffer, so toBlob() on the WebGL canvas would
    // produce a blank image.
    const output = document.createElement("canvas");
    output.width = canvasW;
    output.height = canvasH;
    const ctx = output.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(offscreen, 0, 0);
    return output;
  } finally {
    const ext = gl.getExtension("WEBGL_lose_context");
    if (ext) ext.loseContext();
  }
}

function renderToGL(
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  shapes: Shape[],
  images: CanvasImage[],
  cameraMatrix: Float32Array,
  includeBackground: boolean,
  backgroundColor?: string,
): Promise<void> {
  return renderToGLAsync(gl, canvas, strokes, shapes, images, cameraMatrix, includeBackground, backgroundColor);
}

async function renderToGLAsync(
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  shapes: Shape[],
  images: CanvasImage[],
  cameraMatrix: Float32Array,
  includeBackground: boolean,
  backgroundColor?: string,
): Promise<void> {
  gl.viewport(0, 0, canvas.width, canvas.height);

  if (includeBackground) {
    const [r, g, b] = backgroundColor
      ? hexToRgba(backgroundColor)
      : [250 / 255, 250 / 255, 248 / 255, 1.0];
    gl.clearColor(r, g, b, 1.0);
  } else {
    gl.clearColor(0, 0, 0, 0);
  }
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const program = createShaderProgram(gl);
  if (!program) return;

  gl.useProgram(program);
  const uCamera = gl.getUniformLocation(program, "u_camera");
  gl.uniformMatrix3fv(uCamera, false, cameraMatrix);

  const aPosition = gl.getAttribLocation(program, "a_position");
  const aColor = gl.getAttribLocation(program, "a_color");

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const stride = 6 * 4;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(aColor);
  gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, stride, 2 * 4);

  let imageRenderer: ImageRenderer | null = null;
  if (images.length > 0) {
    imageRenderer = new ImageRenderer(gl);
    imageRenderer.setCameraMatrix(cameraMatrix);
    await Promise.all(images.map((image) => imageRenderer!.preloadImage(image)));
  }

  const items = [
    ...strokes.map((item) => ({ kind: "stroke" as const, item })),
    ...shapes.map((item) => ({ kind: "shape" as const, item })),
    ...images.map((item) => ({ kind: "image" as const, item })),
  ].sort((a, b) => a.item.timestamp - b.item.timestamp);

  for (const canvasItem of items) {
    if (canvasItem.kind === "shape") {
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      const vd = generateShapeVertices(canvasItem.item);
      if (vd.fill) {
        gl.bufferData(gl.ARRAY_BUFFER, vd.fill, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, vd.fill.length / 6);
      }
      if (vd.outline) {
        gl.bufferData(gl.ARRAY_BUFFER, vd.outline, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, vd.outline.length / 6);
      }
    } else if (canvasItem.kind === "stroke") {
      const rgba = hexToRgba(canvasItem.item.color);
      rgba[3] = canvasItem.item.opacity ?? 1.0;
      const strip = generateTriangleStrip(canvasItem.item.points, canvasItem.item.width, rgba);
      if (strip) {
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.bufferData(gl.ARRAY_BUFFER, strip, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, strip.length / 6);
      }
    } else {
      imageRenderer?.drawImage(canvasItem.item);
    }
  }

  imageRenderer?.destroy();
  gl.deleteBuffer(buffer);
  gl.deleteVertexArray(vao);
  gl.deleteProgram(program);
}

function createShaderProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vsSource = `#version 300 es
    uniform mat3 u_camera;
    in vec2 a_position;
    in vec4 a_color;
    out vec4 v_color;
    void main() {
      vec3 pos = u_camera * vec3(a_position, 1.0);
      gl_Position = vec4(pos.xy, 0.0, 1.0);
      v_color = a_color;
    }
  `;
  const fsSource = `#version 300 es
    precision mediump float;
    in vec4 v_color;
    out vec4 fragColor;
    void main() {
      fragColor = v_color;
    }
  `;

  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/** Trigger a file download from a canvas element. */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return;

  if ((globalThis as Record<string, unknown>).__TAURI_INTERNALS__) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { downloadDir, join } = await import("@tauri-apps/api/path");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const defaultPath = await join(await downloadDir(), filename);
      const filePath = await save({
        defaultPath,
        filters: [{ name: "PNG Image", extensions: ["png"] }],
      });
      if (!filePath) return; // user cancelled

      const buffer = new Uint8Array(await blob.arrayBuffer());
      await writeFile(filePath, buffer);
      return;
    } catch (e) {
      console.error("Tauri file save failed:", e);
      return;
    }
  }

  // Browser fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  requestAnimationFrame(() => {
    a.remove();
    URL.revokeObjectURL(url);
  });
}
