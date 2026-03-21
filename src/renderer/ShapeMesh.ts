import type { Shape } from "../model/Shape";

/**
 * Vertex data output from shape mesh generation, containing separate
 * geometry buffers for the shape's outline and fill. Produced by
 * {@link generateShapeVertices} and consumed by the WebGL renderer.
 *
 * Both buffers use the same interleaved vertex format as StrokeMesh:
 * `[x, y, r, g, b, a]` with a stride of 6 floats per vertex.
 *
 * @property outline - `GL_TRIANGLE_STRIP` vertices for the shape outline
 *   (stroke border). `null` when the shape has no stroke (`strokeWidth <= 0`).
 * @property fill - `GL_TRIANGLES` vertices for the shape interior.
 *   `null` when the shape has no fill color.
 */
export interface ShapeVertexData {
  /** Triangle strip vertices for the shape outline (stroke), or null if strokeWidth <= 0 */
  outline: Float32Array | null;
  /** GL_TRIANGLES vertices for the shape fill, or null if no fillColor */
  fill: Float32Array | null;
}

/** Parse a hex color string like "#ff0000" into [r, g, b] in 0..1 range. */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

/** Rotate a 2D point around the origin by `angle` radians. */
function rotatePoint(x: number, y: number, angle: number): [number, number] {
  if (angle === 0) return [x, y];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - y * sin, x * sin + y * cos];
}

/**
 * Generate perimeter points for a shape in local space (centered at origin).
 * Points are ordered counter-clockwise.
 */
function generatePerimeterPoints(
  shape: Shape,
  segments?: number,
): { x: number; y: number }[] {
  const hw = shape.width / 2;
  const hh = shape.height / 2;
  const points: { x: number; y: number }[] = [];

  switch (shape.type) {
    case "rectangle":
      // CCW from top-right
      points.push({ x: hw, y: -hh });
      points.push({ x: hw, y: hh });
      points.push({ x: -hw, y: hh });
      points.push({ x: -hw, y: -hh });
      break;

    case "ellipse": {
      const n = segments ?? 48;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        points.push({ x: hw * Math.cos(angle), y: hh * Math.sin(angle) });
      }
      break;
    }

    case "polygon": {
      const sides = shape.sides ?? 5;
      for (let i = 0; i < sides; i++) {
        // Start from top (-π/2) so first vertex points up
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        points.push({ x: hw * Math.cos(angle), y: hh * Math.sin(angle) });
      }
      break;
    }

    case "star": {
      const sides = shape.sides ?? 5;
      const innerRatio = shape.starInnerRadius ?? 0.4;
      const totalPoints = sides * 2;
      for (let i = 0; i < totalPoints; i++) {
        const angle = (i / totalPoints) * Math.PI * 2 - Math.PI / 2;
        const isOuter = i % 2 === 0;
        const r = isOuter ? 1 : innerRatio;
        points.push({ x: hw * r * Math.cos(angle), y: hh * r * Math.sin(angle) });
      }
      break;
    }
  }

  return points;
}

/**
 * Transform local-space perimeter points to world space by applying
 * rotation and translation.
 */
function transformPoint(
  lx: number,
  ly: number,
  rotation: number,
  cx: number,
  cy: number,
): [number, number] {
  const [rx, ry] = rotatePoint(lx, ly, rotation);
  return [rx + cx, ry + cy];
}

/**
 * Generate a closed outline as a triangle strip from perimeter points.
 * Each edge of the perimeter becomes a quad (2 triangles) with the given stroke width.
 * The strip closes back to the first vertex pair.
 */
function generateOutlineVertices(
  perimeterPoints: { x: number; y: number }[],
  strokeWidth: number,
  color: [number, number, number, number],
  rotation: number,
  cx: number,
  cy: number,
): Float32Array {
  const n = perimeterPoints.length;
  // n+1 vertex pairs to close the loop (last pair duplicates first)
  const vertexCount = (n + 1) * 2;
  const data = new Float32Array(vertexCount * 6);
  const [r, g, b, a] = color;
  const halfW = strokeWidth / 2;

  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const prev = (idx - 1 + n) % n;
    const next = (idx + 1) % n;

    const p = perimeterPoints[idx];

    // Compute miter normal at this vertex from adjacent segments
    const dx1 = perimeterPoints[idx].x - perimeterPoints[prev].x;
    const dy1 = perimeterPoints[idx].y - perimeterPoints[prev].y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const nx1 = len1 > 0 ? -dy1 / len1 : 0;
    const ny1 = len1 > 0 ? dx1 / len1 : 0;

    const dx2 = perimeterPoints[next].x - perimeterPoints[idx].x;
    const dy2 = perimeterPoints[next].y - perimeterPoints[idx].y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const nx2 = len2 > 0 ? -dy2 / len2 : 0;
    const ny2 = len2 > 0 ? dx2 / len2 : 0;

    let nx: number, ny: number;
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

    // Transform point and normal offset to world space
    const [wx, wy] = transformPoint(p.x, p.y, rotation, cx, cy);
    const [onx, ony] = rotatePoint(nx * halfW, ny * halfW, rotation);

    // Outer vertex
    const li = (i * 2) * 6;
    data[li] = wx + onx;
    data[li + 1] = wy + ony;
    data[li + 2] = r;
    data[li + 3] = g;
    data[li + 4] = b;
    data[li + 5] = a;

    // Inner vertex
    const ri = (i * 2 + 1) * 6;
    data[ri] = wx - onx;
    data[ri + 1] = wy - ony;
    data[ri + 2] = r;
    data[ri + 3] = g;
    data[ri + 4] = b;
    data[ri + 5] = a;
  }

  return data;
}

/**
 * Generate fill geometry as GL_TRIANGLES (not strip) using a center fan.
 * Each triangle is (center, p[i], p[i+1]).
 */
function generateFillVertices(
  perimeterPoints: { x: number; y: number }[],
  color: [number, number, number, number],
  rotation: number,
  cx: number,
  cy: number,
): Float32Array {
  const n = perimeterPoints.length;
  // n triangles, 3 vertices each
  const data = new Float32Array(n * 3 * 6);
  const [r, g, b, a] = color;

  // Center in world space
  const [wcx, wcy] = transformPoint(0, 0, rotation, cx, cy);

  for (let i = 0; i < n; i++) {
    const p0 = perimeterPoints[i];
    const p1 = perimeterPoints[(i + 1) % n];
    const [wx0, wy0] = transformPoint(p0.x, p0.y, rotation, cx, cy);
    const [wx1, wy1] = transformPoint(p1.x, p1.y, rotation, cx, cy);

    const base = i * 3 * 6;

    // Vertex 0: center
    data[base] = wcx;
    data[base + 1] = wcy;
    data[base + 2] = r;
    data[base + 3] = g;
    data[base + 4] = b;
    data[base + 5] = a;

    // Vertex 1: p[i]
    data[base + 6] = wx0;
    data[base + 7] = wy0;
    data[base + 8] = r;
    data[base + 9] = g;
    data[base + 10] = b;
    data[base + 11] = a;

    // Vertex 2: p[i+1]
    data[base + 12] = wx1;
    data[base + 13] = wy1;
    data[base + 14] = r;
    data[base + 15] = g;
    data[base + 16] = b;
    data[base + 17] = a;
  }

  return data;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Generates WebGL vertex data for rendering a rectangle shape.
 *
 * Produces both outline (triangle strip) and fill (triangle list) geometry
 * from the rectangle's four corner vertices. The outline uses miter joins
 * at corners, and the fill uses a center-fan triangulation.
 *
 * @param shape - The rectangle shape to generate vertices for. Uses `x`, `y`
 *   for center position, `width`/`height` for dimensions, `rotation` for
 *   orientation, `strokeColor`/`strokeWidth` for the outline, and `fillColor`
 *   for the interior. Only shapes with `type: "rectangle"` produce correct geometry.
 * @returns Vertex data with interleaved `[x, y, r, g, b, a]` buffers.
 *   `outline` is `null` when `strokeWidth <= 0`; `fill` is `null` when
 *   `fillColor` is `null`.
 */
export function generateRectangleVertices(shape: Shape): ShapeVertexData {
  return generateShapeFromPerimeter(shape, generatePerimeterPoints(shape));
}

/**
 * Generates WebGL vertex data for rendering an ellipse shape.
 *
 * Produces both outline (triangle strip) and fill (triangle fan) geometry
 * by approximating the ellipse as a regular polygon with the given number
 * of segments. Higher segment counts yield smoother curves at the cost of
 * more vertices.
 *
 * @param shape - The ellipse shape to generate vertices for. Uses `x`, `y`
 *   for center position, `width`/`height` for radii, `rotation` for
 *   orientation, `strokeColor`/`strokeWidth` for the outline, and `fillColor`
 *   for the interior. Only shapes with `type: "ellipse"` produce correct geometry.
 * @param segments - Number of line segments used to approximate the ellipse
 *   perimeter (default: 48). Higher values produce smoother curves.
 * @returns Vertex data with interleaved `[x, y, r, g, b, a]` buffers.
 *   `outline` is `null` when `strokeWidth <= 0`; `fill` is `null` when
 *   `fillColor` is `null`.
 */
export function generateEllipseVertices(shape: Shape, segments = 48): ShapeVertexData {
  return generateShapeFromPerimeter(shape, generatePerimeterPoints(shape, segments));
}

/**
 * Generates WebGL vertex data for rendering a regular polygon shape.
 *
 * Produces triangle-strip outline and triangle-list fill geometry for a
 * regular polygon with a configurable number of sides (via {@link Shape.sides},
 * default 5). The first vertex is placed at the top of the shape (−π/2) so
 * that the polygon appears upright. Position, rotation, colors, and stroke
 * width are all read from the shape's properties.
 *
 * @param shape - The polygon shape to generate vertices for. Uses `sides`
 *   (default 5) to determine vertex count, and reads `width`, `height`,
 *   `x`, `y`, `rotation`, `strokeColor`, `strokeWidth`, `fillColor`, and
 *   `opacity` for geometry and color.
 * @returns Vertex data with interleaved `[x, y, r, g, b, a]` buffers.
 *   `outline` is `null` when `strokeWidth <= 0`; `fill` is `null` when
 *   `fillColor` is `null`.
 */
export function generatePolygonVertices(shape: Shape): ShapeVertexData {
  return generateShapeFromPerimeter(shape, generatePerimeterPoints(shape));
}

/**
 * Generates WebGL vertex data for rendering a star shape.
 *
 * Produces triangle-strip outline and triangle-list fill geometry for a star
 * with a configurable number of points (via {@link Shape.sides}, default 5)
 * and inner radius ratio (via {@link Shape.starInnerRadius}, default 0.4).
 * Outer and inner vertices alternate around the perimeter, with the first
 * outer vertex placed at the top of the shape (−π/2) so that the star
 * appears upright. Position, rotation, colors, and stroke width are all
 * read from the shape's properties.
 *
 * @param shape - The star shape to generate vertices for. Uses `sides`
 *   (default 5) to determine the number of points, `starInnerRadius`
 *   (default 0.4) to control the ratio between inner and outer radii, and
 *   reads `width`, `height`, `x`, `y`, `rotation`, `strokeColor`,
 *   `strokeWidth`, `fillColor`, and `opacity` for geometry and color.
 * @returns Vertex data with interleaved `[x, y, r, g, b, a]` buffers.
 *   `outline` is `null` when `strokeWidth <= 0`; `fill` is `null` when
 *   `fillColor` is `null`.
 */
export function generateStarVertices(shape: Shape): ShapeVertexData {
  return generateShapeFromPerimeter(shape, generatePerimeterPoints(shape));
}

/**
 * Generates WebGL vertex data for rendering any supported shape type.
 *
 * Acts as a dispatcher that delegates to shape-specific vertex generators
 * ({@link generateRectangleVertices}, {@link generateEllipseVertices},
 * {@link generatePolygonVertices}, {@link generateStarVertices}) based on
 * {@link Shape.type}. The returned vertex data contains interleaved
 * `[x, y, r, g, b, a]` arrays suitable for direct upload to a WebGL buffer.
 *
 * @param shape - The shape to generate vertices for. The shape's `type` field
 *   determines which geometry generator is used. Position, rotation, colors,
 *   and dimensions are all read from the shape's properties.
 * @param ellipseSegments - Number of line segments used to approximate ellipse
 *   curves. Higher values produce smoother circles at the cost of more vertices.
 *   Only used when `shape.type` is `"ellipse"`. (default: 48)
 * @returns Vertex data containing separate outline (triangle strip) and fill
 *   (triangle list) geometry. Either field may be `null` if the shape has no
 *   stroke width or no fill color, respectively.
 */
export function generateShapeVertices(shape: Shape, ellipseSegments = 48): ShapeVertexData {
  switch (shape.type) {
    case "rectangle":
      return generateRectangleVertices(shape);
    case "ellipse":
      return generateEllipseVertices(shape, ellipseSegments);
    case "polygon":
      return generatePolygonVertices(shape);
    case "star":
      return generateStarVertices(shape);
  }
}

/** Internal: produce ShapeVertexData from precomputed perimeter points. */
function generateShapeFromPerimeter(
  shape: Shape,
  perimeterPoints: { x: number; y: number }[],
): ShapeVertexData {
  const [sr, sg, sb] = parseHex(shape.strokeColor);
  const strokeColor: [number, number, number, number] = [sr, sg, sb, shape.opacity];

  const outline =
    shape.strokeWidth > 0
      ? generateOutlineVertices(
          perimeterPoints,
          shape.strokeWidth,
          strokeColor,
          shape.rotation,
          shape.x,
          shape.y,
        )
      : null;

  let fill: Float32Array | null = null;
  if (shape.fillColor) {
    const [fr, fg, fb] = parseHex(shape.fillColor);
    const fillColorRgba: [number, number, number, number] = [fr, fg, fb, shape.opacity];
    fill = generateFillVertices(
      perimeterPoints,
      fillColorRgba,
      shape.rotation,
      shape.x,
      shape.y,
    );
  }

  return { outline, fill };
}

// Re-export for testing
export { generatePerimeterPoints as _generatePerimeterPoints };
