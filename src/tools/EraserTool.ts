import { Stroke, StrokePoint } from "../model/Stroke";

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

export interface EraserConfig {
  radius: number;
}

const DEFAULT_ERASER_CONFIG: EraserConfig = { radius: 10 };

/**
 * Whole-stroke eraser: detects which strokes intersect the eraser's path
 * and removes them from the document.
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
   * Given the eraser position in world coordinates and the current strokes,
   * returns the IDs of strokes that intersect the eraser.
   */
  findIntersectingStrokes(
    worldX: number,
    worldY: number,
    strokes: Stroke[],
  ): string[] {
    const hits: string[] = [];
    for (const stroke of strokes) {
      if (pointIntersectsStroke(worldX, worldY, stroke, this.config.radius)) {
        hits.push(stroke.id);
      }
    }
    return hits;
  }
}

// Export helpers for testing
export { pointToSegmentDistance, strokeBoundingBox, pointIntersectsStroke };
