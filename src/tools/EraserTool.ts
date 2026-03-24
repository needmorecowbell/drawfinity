import { Stroke, StrokePoint, generateStrokeId } from "../model/Stroke";
import { Shape } from "../model/Shape";

/**
 * Computes the axis-aligned bounding box of a stroke's points.
 */
function strokeBoundingBox(
  stroke: Stroke,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of stroke.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Returns the minimum distance from a point to a line segment.
 */
function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    // Segment is a point
    const ex = px - ax;
    const ey = py - ay;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  const ex = px - closestX;
  const ey = py - closestY;
  return Math.sqrt(ex * ex + ey * ey);
}

/**
 * Checks if a point is within `radius` of any segment in the stroke.
 */
function pointIntersectsStroke(
  px: number,
  py: number,
  stroke: Stroke,
  radius: number,
): boolean {
  const halfWidth = stroke.width / 2;
  const effectiveRadius = radius + halfWidth;

  // Quick bounding box rejection
  const bb = strokeBoundingBox(stroke);
  if (
    px < bb.minX - effectiveRadius ||
    px > bb.maxX + effectiveRadius ||
    py < bb.minY - effectiveRadius ||
    py > bb.maxY + effectiveRadius
  ) {
    return false;
  }

  // Point-distance check against each segment
  const pts = stroke.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const dist = pointToSegmentDistance(
      px, py,
      pts[i].x, pts[i].y,
      pts[i + 1].x, pts[i + 1].y,
    );
    if (dist <= effectiveRadius) return true;
  }

  // Single-point stroke: check distance to the point
  if (pts.length === 1) {
    const dx = px - pts[0].x;
    const dy = py - pts[0].y;
    return Math.sqrt(dx * dx + dy * dy) <= effectiveRadius;
  }

  return false;
}

/**
 * Transforms a world-space point into a shape's local coordinate system
 * (centered at shape origin, un-rotated).
 */
function worldToShapeLocal(
  wx: number,
  wy: number,
  shape: Shape,
): { lx: number; ly: number } {
  const dx = wx - shape.x;
  const dy = wy - shape.y;
  if (shape.rotation === 0) {
    return { lx: dx, ly: dy };
  }
  const cos = Math.cos(-shape.rotation);
  const sin = Math.sin(-shape.rotation);
  return {
    lx: dx * cos - dy * sin,
    ly: dx * sin + dy * cos,
  };
}

/**
 * Tests if a point is within `radius` of a rectangle shape.
 * Uses the signed distance field of a rounded rectangle in local space.
 */
function pointIntersectsRectangle(
  wx: number,
  wy: number,
  shape: Shape,
  radius: number,
): boolean {
  const { lx, ly } = worldToShapeLocal(wx, wy, shape);
  const hw = shape.width / 2 + shape.strokeWidth / 2;
  const hh = shape.height / 2 + shape.strokeWidth / 2;

  // Signed distance from point to axis-aligned rectangle centered at origin
  const dx = Math.abs(lx) - hw;
  const dy = Math.abs(ly) - hh;
  const outsideDist = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2);
  const insideDist = Math.min(Math.max(dx, dy), 0);
  const signedDist = outsideDist + insideDist;

  return signedDist <= radius;
}

/**
 * Tests if a point is within `radius` of an ellipse shape.
 */
function pointIntersectsEllipse(
  wx: number,
  wy: number,
  shape: Shape,
  radius: number,
): boolean {
  const { lx, ly } = worldToShapeLocal(wx, wy, shape);
  const a = shape.width / 2 + shape.strokeWidth / 2;
  const b = shape.height / 2 + shape.strokeWidth / 2;

  if (a === 0 || b === 0) return false;

  // Normalized ellipse equation: (lx/a)^2 + (ly/b)^2 <= 1 means inside
  const normalized = (lx * lx) / (a * a) + (ly * ly) / (b * b);

  // Approximate distance: for a point on the boundary, scale factor is ~1.
  // For points near the ellipse, use the gradient-based approximation.
  if (normalized <= 1) {
    // Point is inside the ellipse — always within radius
    return true;
  }

  // Approximate closest distance to ellipse boundary
  // Use the approximation: dist ≈ (sqrt(normalized) - 1) * min(a, b)
  // This is not exact but good enough for eraser hit-testing
  const approxDist = (Math.sqrt(normalized) - 1) * Math.min(a, b);
  return approxDist <= radius;
}

/**
 * Generates vertices of a regular polygon (used for polygon and star outline hit-testing).
 */
function getPolygonVertices(shape: Shape): Array<{ x: number; y: number }> {
  const sides = shape.sides ?? 5;
  const hw = shape.width / 2;
  const hh = shape.height / 2;
  const cos = Math.cos(shape.rotation);
  const sin = Math.sin(shape.rotation);
  const vertices: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    const lx = Math.cos(angle) * hw;
    const ly = Math.sin(angle) * hh;
    vertices.push({
      x: shape.x + lx * cos - ly * sin,
      y: shape.y + lx * sin + ly * cos,
    });
  }
  return vertices;
}

/**
 * Generates vertices of a star shape.
 */
function getStarVertices(shape: Shape): Array<{ x: number; y: number }> {
  const points = shape.sides ?? 5;
  const innerRatio = shape.starInnerRadius ?? 0.5;
  const hw = shape.width / 2;
  const hh = shape.height / 2;
  const cos = Math.cos(shape.rotation);
  const sin = Math.sin(shape.rotation);
  const vertices: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? hw : hw * innerRatio;
    const ry = isOuter ? hh : hh * innerRatio;
    const lx = Math.cos(angle) * rx;
    const ly = Math.sin(angle) * ry;
    vertices.push({
      x: shape.x + lx * cos - ly * sin,
      y: shape.y + lx * sin + ly * cos,
    });
  }
  return vertices;
}

/**
 * Tests if a point is within `radius` of any edge of a polygon (given as vertex list).
 * Also returns true if the point is inside the polygon (using ray casting).
 */
function pointIntersectsPolygonVertices(
  wx: number,
  wy: number,
  vertices: Array<{ x: number; y: number }>,
  strokeWidth: number,
  radius: number,
): boolean {
  const effectiveRadius = radius + strokeWidth / 2;

  // Check distance to each edge
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const dist = pointToSegmentDistance(
      wx, wy,
      vertices[i].x, vertices[i].y,
      vertices[j].x, vertices[j].y,
    );
    if (dist <= effectiveRadius) return true;
  }

  // Check if point is inside the polygon (ray casting)
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    if (
      ((yi > wy) !== (yj > wy)) &&
      (wx < (xj - xi) * (wy - yi) / (yj - yi) + xi)
    ) {
      inside = !inside;
    }
  }
  if (inside) return true;

  return false;
}

/**
 * Tests if a point is within `radius` of a shape (any type).
 */
function pointIntersectsShape(
  wx: number,
  wy: number,
  shape: Shape,
  radius: number,
): boolean {
  switch (shape.type) {
    case "rectangle":
      return pointIntersectsRectangle(wx, wy, shape, radius);
    case "ellipse":
      return pointIntersectsEllipse(wx, wy, shape, radius);
    case "polygon": {
      const verts = getPolygonVertices(shape);
      return pointIntersectsPolygonVertices(wx, wy, verts, shape.strokeWidth, radius);
    }
    case "star": {
      const verts = getStarVertices(shape);
      return pointIntersectsPolygonVertices(wx, wy, verts, shape.strokeWidth, radius);
    }
    default:
      return false;
  }
}

export interface EraserConfig {
  radius: number;
}

const DEFAULT_ERASER_CONFIG: EraserConfig = { radius: 10 };

/**
 * Whole-stroke eraser: detects which strokes intersect the eraser's path
 * and removes them from the document. Also supports whole-shape erasure.
 */
export class EraserTool {
  private config: EraserConfig;

  constructor(config?: Partial<EraserConfig>) {
    this.config = { ...DEFAULT_ERASER_CONFIG, ...config };
  }

  getRadius(): number {
    return this.config.radius;
  }

  setRadius(radius: number): void {
    this.config.radius = radius;
  }

  /**
   * Returns the effective world-space eraser radius for a given zoom level.
   * At zoom 1 the radius equals the configured value; at higher zoom levels
   * the world-space radius shrinks so the eraser feels consistent on screen.
   *
   * @param zoom - Current camera zoom level (defaults to 1).
   */
  getEffectiveRadius(zoom = 1): number {
    return this.config.radius / zoom;
  }

  /**
   * Given the eraser position in world coordinates and the current strokes,
   * returns the IDs of strokes that intersect the eraser.
   *
   * @param zoom - Current camera zoom level. When provided, the eraser radius
   *   is scaled by `1 / zoom` so it feels consistent in screen space.
   */
  findIntersectingStrokes(
    worldX: number,
    worldY: number,
    strokes: Stroke[],
    zoom = 1,
  ): string[] {
    const radius = this.getEffectiveRadius(zoom);
    const hits: string[] = [];
    for (const stroke of strokes) {
      if (pointIntersectsStroke(worldX, worldY, stroke, radius)) {
        hits.push(stroke.id);
      }
    }
    return hits;
  }

  /**
   * Given the eraser position in world coordinates and the current shapes,
   * returns the IDs of shapes that intersect the eraser.
   * Shapes are erased whole (no splitting).
   *
   * @param zoom - Current camera zoom level. When provided, the eraser radius
   *   is scaled by `1 / zoom` so it feels consistent in screen space.
   */
  findIntersectingShapes(
    worldX: number,
    worldY: number,
    shapes: Shape[],
    zoom = 1,
  ): string[] {
    const radius = this.getEffectiveRadius(zoom);
    const hits: string[] = [];
    for (const shape of shapes) {
      if (pointIntersectsShape(worldX, worldY, shape, radius)) {
        hits.push(shape.id);
      }
    }
    return hits;
  }

  /**
   * For each stroke that intersects the eraser, compute the remaining
   * sub-strokes after removing the erased portion.
   * Returns an array of { strokeId, fragments } where fragments are the
   * surviving sub-strokes (may be empty if the entire stroke is erased).
   *
   * @param zoom - Current camera zoom level. When provided, the eraser radius
   *   is scaled by `1 / zoom` so it feels consistent in screen space.
   */
  computeErasureResults(
    worldX: number,
    worldY: number,
    strokes: Stroke[],
    zoom = 1,
  ): Array<{ strokeId: string; fragments: Stroke[] }> {
    const radius = this.getEffectiveRadius(zoom);
    const results: Array<{ strokeId: string; fragments: Stroke[] }> = [];

    for (const stroke of strokes) {
      if (!pointIntersectsStroke(worldX, worldY, stroke, radius)) {
        continue;
      }

      const fragments = splitStrokeAroundEraser(
        stroke,
        worldX,
        worldY,
        radius,
      );
      results.push({ strokeId: stroke.id, fragments });
    }

    return results;
  }
}

/**
 * Splits a stroke into sub-strokes by removing segments that fall within
 * the eraser circle. Returns the surviving fragments (each with >= 2 points).
 */
function splitStrokeAroundEraser(
  stroke: Stroke,
  ex: number,
  ey: number,
  radius: number,
): Stroke[] {
  const pts = stroke.points;
  if (pts.length < 2) return [];

  const effectiveRadius = radius + stroke.width / 2;

  // Mark each segment as erased or not
  const segmentErased: boolean[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dist = pointToSegmentDistance(
      ex,
      ey,
      pts[i].x,
      pts[i].y,
      pts[i + 1].x,
      pts[i + 1].y,
    );
    segmentErased.push(dist <= effectiveRadius);
  }

  // Collect runs of consecutive non-erased segments into sub-strokes
  const fragments: Stroke[] = [];
  let runStart: number | null = null;

  for (let i = 0; i < segmentErased.length; i++) {
    if (!segmentErased[i]) {
      if (runStart === null) runStart = i;
    } else {
      if (runStart !== null) {
        pushFragment(fragments, stroke, pts, runStart, i);
        runStart = null;
      }
    }
  }
  // Final run
  if (runStart !== null) {
    pushFragment(fragments, stroke, pts, runStart, segmentErased.length);
  }

  return fragments;
}

function pushFragment(
  fragments: Stroke[],
  original: Stroke,
  pts: StrokePoint[],
  segStart: number,
  segEnd: number,
): void {
  // Segments [segStart..segEnd) are non-erased.
  // Points covered: pts[segStart] through pts[segEnd].
  const fragmentPoints = pts.slice(segStart, segEnd + 1);
  if (fragmentPoints.length < 2) return;

  fragments.push({
    id: generateStrokeId(),
    points: fragmentPoints,
    color: original.color,
    width: original.width,
    opacity: original.opacity,
    timestamp: original.timestamp,
  });
}

// Export helpers for testing
export {
  pointToSegmentDistance,
  strokeBoundingBox,
  pointIntersectsStroke,
  splitStrokeAroundEraser,
  pointIntersectsShape,
  pointIntersectsRectangle,
  pointIntersectsEllipse,
  pointIntersectsPolygonVertices,
  getPolygonVertices,
  getStarVertices,
  worldToShapeLocal,
};
