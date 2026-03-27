import type { Stroke, StrokePoint } from "../model/Stroke";
import type { Shape } from "../model/Shape";
import type { CanvasItem } from "../model/Shape";
import type { ExportOptions } from "./ExportRenderer";
import { computeContentBounds } from "./ExportRenderer";

/** Default SVG output width in pixels. */
const DEFAULT_SVG_WIDTH = 1920;

/**
 * Generates a complete SVG document string from an array of canvas items.
 *
 * Strokes are converted to filled outline paths that preserve pressure-varying
 * width (matching the WebGL triangle-strip rendering). Shapes are converted to
 * their natural SVG element equivalents.
 *
 * @param items - All canvas items in document order (strokes and shapes).
 * @param options - Export options controlling scope, background, and viewport.
 * @returns SVG markup string, or `null` if there is no content to export.
 */
export function exportSVG(
  items: CanvasItem[],
  options: ExportOptions,
): string | null {
  const strokes = items
    .filter((i): i is { kind: "stroke"; item: Stroke } => i.kind === "stroke")
    .map((i) => i.item);
  const shapes = items
    .filter((i): i is { kind: "shape"; item: Shape } => i.kind === "shape")
    .map((i) => i.item);

  let viewBox: { minX: number; minY: number; maxX: number; maxY: number };

  if (options.scope === "viewport") {
    if (!options.viewportBounds) return null;
    viewBox = options.viewportBounds;
  } else {
    const bounds = computeContentBounds(strokes, shapes);
    if (!bounds) return null;
    // Add 5% padding like the raster export
    const contentW = bounds.maxX - bounds.minX;
    const contentH = bounds.maxY - bounds.minY;
    const padW = contentW > 0 ? contentW * 0.05 : 10;
    const padH = contentH > 0 ? contentH * 0.05 : 10;
    viewBox = {
      minX: bounds.minX - padW,
      minY: bounds.minY - padH,
      maxX: bounds.maxX + padW,
      maxY: bounds.maxY + padH,
    };
  }

  const vbW = viewBox.maxX - viewBox.minX;
  const vbH = viewBox.maxY - viewBox.minY;
  const aspect = vbW / (vbH || 1);
  const svgW = DEFAULT_SVG_WIDTH;
  const svgH = Math.round(svgW / aspect);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="${viewBox.minX} ${viewBox.minY} ${vbW} ${vbH}">`,
  );

  if (options.includeBackground) {
    const bg = options.backgroundColor ?? "#FAFAF8";
    parts.push(
      `<rect x="${viewBox.minX}" y="${viewBox.minY}" width="${vbW}" height="${vbH}" fill="${bg}" />`,
    );
  }

  // Sort by timestamp to match WebGL rendering order (painter's model)
  const sorted = [...items].sort(
    (a, b) => a.item.timestamp - b.item.timestamp,
  );

  // Emit elements in timestamp order (earlier items underneath, later on top)
  for (const item of sorted) {
    if (item.kind === "stroke") {
      parts.push(strokeToSVG(item.item));
    } else {
      parts.push(shapeToSVG(item.item));
    }
  }

  parts.push("</svg>");
  return parts.join("\n");
}

/**
 * Triggers a browser download of SVG content as a `.svg` file.
 */
export async function downloadSVG(
  svgContent: string,
  filename: string,
): Promise<void> {
  if ((globalThis as Record<string, unknown>).__TAURI_INTERNALS__) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { downloadDir, join } = await import("@tauri-apps/api/path");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const defaultPath = await join(await downloadDir(), filename);
      const filePath = await save({
        defaultPath,
        filters: [{ name: "SVG Image", extensions: ["svg"] }],
      });
      if (!filePath) return;

      const encoder = new TextEncoder();
      await writeFile(filePath, encoder.encode(svgContent));
      return;
    } catch (e) {
      console.error("Tauri file save failed:", e);
      return;
    }
  }

  const blob = new Blob([svgContent], { type: "image/svg+xml" });
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

// ── Stroke → SVG ──────────────────────────────────────────────────

/**
 * Converts a stroke to an SVG element string. Multi-point strokes become
 * a filled closed `<path>` whose outline matches the WebGL triangle-strip
 * rendering (normal-offset with miter joins). Single-point strokes become
 * a `<circle>`.
 */
export function strokeToSVG(stroke: Stroke): string {
  const opacity = stroke.opacity ?? 1;
  const fillColor = stroke.color;

  // Deduplicate consecutive identical points
  const deduped: StrokePoint[] = [stroke.points[0]];
  for (let i = 1; i < stroke.points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (stroke.points[i].x !== prev.x || stroke.points[i].y !== prev.y) {
      deduped.push(stroke.points[i]);
    }
  }

  if (deduped.length === 0) {
    return "";
  }

  // Single-point stroke → circle
  if (deduped.length === 1) {
    const pt = deduped[0];
    const pressure = pt.pressure ?? 0.5;
    const r = Math.max((stroke.width * pressure) / 2, stroke.width / 4);
    return `<circle cx="${fmt(pt.x)}" cy="${fmt(pt.y)}" r="${fmt(r)}" fill="${fillColor}"${opacity < 1 ? ` opacity="${fmt(opacity)}"` : ""} />`;
  }

  // Multi-point stroke → outline path
  const { left, right } = computeStrokeOutline(deduped, stroke.width);

  // Build path: left edge forward, right edge backward, close
  const d: string[] = [];
  d.push(`M ${fmt(left[0].x)} ${fmt(left[0].y)}`);
  for (let i = 1; i < left.length; i++) {
    d.push(`L ${fmt(left[i].x)} ${fmt(left[i].y)}`);
  }
  // Connect to right edge end, traverse backward
  d.push(`L ${fmt(right[right.length - 1].x)} ${fmt(right[right.length - 1].y)}`);
  for (let i = right.length - 2; i >= 0; i--) {
    d.push(`L ${fmt(right[i].x)} ${fmt(right[i].y)}`);
  }
  d.push("Z");

  return `<path d="${d.join(" ")}" fill="${fillColor}"${opacity < 1 ? ` opacity="${fmt(opacity)}"` : ""} />`;
}

/**
 * Computes left and right edge polylines for a stroke using the same
 * normal-offset + miter-join algorithm as StrokeMesh.generateTriangleStrip().
 */
export function computeStrokeOutline(
  points: readonly StrokePoint[],
  width: number,
): { left: { x: number; y: number }[]; right: { x: number; y: number }[] } {
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    let nx: number;
    let ny: number;

    if (i === 0) {
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      nx = -dy / len;
      ny = dx / len;
    } else if (i === points.length - 1) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      nx = -dy / len;
      ny = dx / len;
    } else {
      // Miter join
      const dx1 = points[i].x - points[i - 1].x;
      const dy1 = points[i].y - points[i - 1].y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const nx1 = -dy1 / len1;
      const ny1 = dx1 / len1;

      const dx2 = points[i + 1].x - points[i].x;
      const dy2 = points[i + 1].y - points[i].y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const nx2 = -dy2 / len2;
      const ny2 = dx2 / len2;

      let mx = (nx1 + nx2) / 2;
      let my = (ny1 + ny2) / 2;
      const mLen = Math.sqrt(mx * mx + my * my);

      if (mLen < 1e-6) {
        nx = nx1;
        ny = ny1;
      } else {
        mx /= mLen;
        my /= mLen;
        const dot = mx * nx1 + my * ny1;
        const miterScale = dot > 0.1 ? 1 / dot : 1 / 0.1;
        nx = mx * miterScale;
        ny = my * miterScale;
      }
    }

    const pressure = points[i].pressure ?? 0.5;
    const halfWidth = (width * pressure) / 2;

    left.push({ x: points[i].x + nx * halfWidth, y: points[i].y + ny * halfWidth });
    right.push({ x: points[i].x - nx * halfWidth, y: points[i].y - ny * halfWidth });
  }

  return { left, right };
}

// ── Shape → SVG ───────────────────────────────────────────────────

/**
 * Converts a shape to an SVG element string.
 */
export function shapeToSVG(shape: Shape): string {
  const attrs = shapeStyleAttrs(shape);
  const rotDeg = (shape.rotation * 180) / Math.PI;
  const transform = shape.rotation !== 0
    ? ` transform="rotate(${fmt(rotDeg)}, ${fmt(shape.x)}, ${fmt(shape.y)})"`
    : "";

  switch (shape.type) {
    case "rectangle": {
      const x = shape.x - shape.width / 2;
      const y = shape.y - shape.height / 2;
      return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(shape.width)}" height="${fmt(shape.height)}"${transform}${attrs} />`;
    }
    case "ellipse": {
      return `<ellipse cx="${fmt(shape.x)}" cy="${fmt(shape.y)}" rx="${fmt(shape.width / 2)}" ry="${fmt(shape.height / 2)}"${transform}${attrs} />`;
    }
    case "polygon": {
      const pts = polygonPoints(shape);
      return `<polygon points="${pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ")}"${attrs} />`;
    }
    case "star": {
      const pts = starPoints(shape);
      return `<polygon points="${pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ")}"${attrs} />`;
    }
  }
}

function shapeStyleAttrs(shape: Shape): string {
  const parts: string[] = [];
  if (shape.fillColor) {
    parts.push(` fill="${shape.fillColor}"`);
  } else {
    parts.push(` fill="none"`);
  }
  if (shape.strokeWidth > 0) {
    parts.push(` stroke="${shape.strokeColor}" stroke-width="${fmt(shape.strokeWidth)}"`);
  }
  if (shape.opacity < 1) {
    parts.push(` opacity="${fmt(shape.opacity)}"`);
  }
  return parts.join("");
}

/**
 * Computes world-space polygon vertices matching ShapeMesh logic.
 */
function polygonPoints(shape: Shape): { x: number; y: number }[] {
  const sides = shape.sides ?? 5;
  const hw = shape.width / 2;
  const hh = shape.height / 2;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const lx = hw * Math.cos(angle);
    const ly = hh * Math.sin(angle);
    const [wx, wy] = rotateAndTranslate(lx, ly, shape.rotation, shape.x, shape.y);
    points.push({ x: wx, y: wy });
  }
  return points;
}

/**
 * Computes world-space star vertices matching ShapeMesh logic.
 */
function starPoints(shape: Shape): { x: number; y: number }[] {
  const sides = shape.sides ?? 5;
  const innerRatio = shape.starInnerRadius ?? 0.4;
  const hw = shape.width / 2;
  const hh = shape.height / 2;
  const totalPoints = sides * 2;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < totalPoints; i++) {
    const angle = (i / totalPoints) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : innerRatio;
    const lx = hw * r * Math.cos(angle);
    const ly = hh * r * Math.sin(angle);
    const [wx, wy] = rotateAndTranslate(lx, ly, shape.rotation, shape.x, shape.y);
    points.push({ x: wx, y: wy });
  }
  return points;
}

function rotateAndTranslate(
  lx: number,
  ly: number,
  rotation: number,
  cx: number,
  cy: number,
): [number, number] {
  if (rotation === 0) return [lx + cx, ly + cy];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [lx * cos - ly * sin + cx, lx * sin + ly * cos + cy];
}

/** Format a number to reasonable precision for SVG attributes. */
function fmt(n: number): string {
  return Number(n.toFixed(4)).toString();
}
