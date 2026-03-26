import { Stroke } from "../model/Stroke";

/**
 * Minimum distance from point (px,py) to line segment (ax,ay)→(bx,by).
 */
function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
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
 * Tests whether two line segments intersect (cross each other).
 */
function segmentsIntersect(
  a0x: number, a0y: number, a1x: number, a1y: number,
  b0x: number, b0y: number, b1x: number, b1y: number,
): boolean {
  const d1x = a1x - a0x;
  const d1y = a1y - a0y;
  const d2x = b1x - b0x;
  const d2y = b1y - b0y;

  const cross = d1x * d2y - d1y * d2x;
  if (cross === 0) return false; // parallel

  const dx = b0x - a0x;
  const dy = b0y - a0y;
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Minimum distance between two line segments (A0→A1) and (B0→B1).
 */
export function segmentToSegmentDistance(
  a0x: number, a0y: number, a1x: number, a1y: number,
  b0x: number, b0y: number, b1x: number, b1y: number,
): number {
  // If segments intersect, distance is 0
  if (segmentsIntersect(a0x, a0y, a1x, a1y, b0x, b0y, b1x, b1y)) {
    return 0;
  }

  // Otherwise, minimum distance is the smallest of all point-to-segment distances
  return Math.min(
    pointToSegmentDist(a0x, a0y, b0x, b0y, b1x, b1y),
    pointToSegmentDist(a1x, a1y, b0x, b0y, b1x, b1y),
    pointToSegmentDist(b0x, b0y, a0x, a0y, a1x, a1y),
    pointToSegmentDist(b1x, b1y, a0x, a0y, a1x, a1y),
  );
}

/**
 * Tests if a line segment (the turtle's erase path) passes within
 * `radius` of any segment in the given stroke.
 */
export function lineIntersectsStroke(
  fromX: number, fromY: number,
  toX: number, toY: number,
  stroke: Stroke,
  radius: number,
): boolean {
  const halfWidth = stroke.width / 2;
  const effectiveRadius = radius + halfWidth;
  const pts = stroke.points;

  if (pts.length === 0) return false;

  // Single-point stroke: check distance from point to the erase line
  if (pts.length === 1) {
    const dist = pointToSegmentDist(pts[0].x, pts[0].y, fromX, fromY, toX, toY);
    return dist <= effectiveRadius;
  }

  // Check segment-to-segment distance for each stroke segment
  for (let i = 0; i < pts.length - 1; i++) {
    const dist = segmentToSegmentDistance(
      fromX, fromY, toX, toY,
      pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y,
    );
    if (dist <= effectiveRadius) return true;
  }

  return false;
}
