import type { StrokePoint } from "../model/Stroke";

/**
 * Level-of-detail simplification for strokes based on zoom level.
 * Uses the Douglas-Peucker algorithm to reduce point count when zoomed out,
 * preserving visual fidelity while improving rendering performance.
 */

/** LOD zoom brackets — each defines a max zoom and the tolerance used for simplification. */
const LOD_BRACKETS: { maxZoom: number; tolerance: number }[] = [
  { maxZoom: 0.05, tolerance: 20 },   // LOD 0: very far out
  { maxZoom: 0.15, tolerance: 8 },    // LOD 1: far out
  { maxZoom: 0.4, tolerance: 3 },     // LOD 2: medium distance
  { maxZoom: 1.0, tolerance: 1 },     // LOD 3: close, slight simplification
  // zoom > 1.0 → full detail, no simplification
];

/**
 * Returns the LOD bracket index for a given zoom level.
 * Returns -1 for full detail (no simplification needed).
 */
export function getLODBracket(zoom: number): number {
  for (let i = 0; i < LOD_BRACKETS.length; i++) {
    if (zoom <= LOD_BRACKETS[i].maxZoom) return i;
  }
  return -1; // full detail
}

/**
 * Douglas-Peucker polyline simplification.
 * Reduces the number of points in a polyline while preserving shape.
 *
 * @param points - Input polyline
 * @param tolerance - Maximum perpendicular distance for a point to be discarded
 * @returns Simplified point array (always includes first and last points)
 */
export function douglasPeucker(
  points: readonly StrokePoint[],
  tolerance: number,
): StrokePoint[] {
  if (points.length <= 2) return points.slice() as StrokePoint[];

  // Find the point with the maximum distance from the line between first and last
  let maxDist = 0;
  let maxIndex = 0;

  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const lineLenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    let dist: number;
    if (lineLenSq === 0) {
      // First and last are the same point — distance is just euclidean
      const ex = points[i].x - first.x;
      const ey = points[i].y - first.y;
      dist = Math.sqrt(ex * ex + ey * ey);
    } else {
      // Perpendicular distance from point to line
      const t = ((points[i].x - first.x) * dx + (points[i].y - first.y) * dy) / lineLenSq;
      const projX = first.x + t * dx;
      const projY = first.y + t * dy;
      const ex = points[i].x - projX;
      const ey = points[i].y - projY;
      dist = Math.sqrt(ex * ex + ey * ey);
    }

    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    // Recursively simplify both halves
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    // Concatenate, removing duplicate junction point
    return left.slice(0, -1).concat(right);
  } else {
    // All points are within tolerance — keep only endpoints
    return [first, last] as StrokePoint[];
  }
}

/**
 * Cache for LOD-simplified stroke points.
 * Keyed by stroke ID, stores an array indexed by LOD bracket.
 */
const lodCache = new Map<string, (StrokePoint[] | undefined)[]>();

/**
 * Returns simplified points for a stroke at the given zoom level.
 * Results are cached per stroke per LOD bracket.
 *
 * @param strokeId - Unique stroke identifier for caching
 * @param points - Original stroke points
 * @param zoom - Current camera zoom level
 * @returns Simplified (or original) point array
 */
export function getStrokeLOD(
  strokeId: string,
  points: readonly StrokePoint[],
  zoom: number,
): readonly StrokePoint[] {
  const bracket = getLODBracket(zoom);

  // Full detail — no simplification needed
  if (bracket === -1) return points;

  // Check cache
  let cached = lodCache.get(strokeId);
  if (cached && cached[bracket]) {
    return cached[bracket]!;
  }

  // Compute simplified points
  const tolerance = LOD_BRACKETS[bracket].tolerance;
  const simplified = douglasPeucker(points, tolerance);

  // Store in cache
  if (!cached) {
    cached = new Array(LOD_BRACKETS.length);
    lodCache.set(strokeId, cached);
  }
  cached[bracket] = simplified;

  return simplified;
}

/**
 * Invalidate the LOD cache for a specific stroke (e.g., when it's modified).
 */
export function invalidateStrokeLOD(strokeId: string): void {
  lodCache.delete(strokeId);
}

/**
 * Clear the entire LOD cache.
 */
export function clearLODCache(): void {
  lodCache.clear();
}

/** Exposed for testing. */
export const LOD_BRACKET_COUNT = LOD_BRACKETS.length;
