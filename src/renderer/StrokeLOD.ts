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
 *
 * Maps a camera zoom level to one of the predefined LOD brackets, each
 * associated with a simplification tolerance. Lower brackets (0) correspond
 * to far-out zoom levels with aggressive simplification, while higher
 * brackets use finer tolerances.
 *
 * @param zoom - Current camera zoom level (e.g., 0.1 = zoomed out, 1.0 = 100%)
 * @returns The bracket index (0–{@link LOD_BRACKET_COUNT}-1), or -1 if the
 *   zoom level exceeds all brackets (full detail, no simplification needed)
 */
export function getLODBracket(zoom: number): number {
  for (let i = 0; i < LOD_BRACKETS.length; i++) {
    if (zoom <= LOD_BRACKETS[i].maxZoom) return i;
  }
  return -1; // full detail
}

/**
 * Simplifies a polyline using the Douglas-Peucker algorithm, reducing point
 * count while preserving the overall shape within a specified tolerance.
 *
 * Recursively finds the point farthest from the line between the first and
 * last points. If that distance exceeds `tolerance`, the polyline is split
 * at that point and each half is simplified independently. Otherwise, all
 * interior points are discarded and only the endpoints are kept.
 *
 * @param points - The input polyline as an array of {@link StrokePoint}.
 *   Arrays with 2 or fewer points are returned as-is (shallow copy).
 * @param tolerance - Maximum perpendicular distance (in canvas units) a
 *   point may deviate from the simplified line before it is retained.
 *   Larger values produce more aggressive simplification.
 * @returns A new array containing the simplified points. The first and last
 *   points of the input are always preserved.
 *
 * @see {@link getStrokeLOD} — higher-level entry point that selects tolerance
 *   from the current zoom level and caches results per stroke.
 * @see {@link getLODBracket} — maps zoom to an LOD bracket / tolerance.
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

  // Full detail — no simplification or subdivision needed
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
 * Cache for subdivided stroke points at high zoom.
 * Keyed by stroke ID, stores subdivided points per zoom bracket.
 */
const subdivCache = new Map<string, { bracket: number; points: StrokePoint[] }>();

function getSubdivBracket(zoom: number): number {
  if (zoom <= 6) return 0;   // 1 subdivision pass
  if (zoom <= 15) return 1;  // 2 passes
  return 2;                  // 3 passes
}

function getSubdividedPoints(
  strokeId: string,
  points: readonly StrokePoint[],
  zoom: number,
): StrokePoint[] {
  const bracket = getSubdivBracket(zoom);
  const cached = subdivCache.get(strokeId);
  if (cached && cached.bracket === bracket) return cached.points;

  let result: StrokePoint[] = points.slice() as StrokePoint[];
  const passes = bracket + 1;
  for (let p = 0; p < passes; p++) {
    result = catmullRomSubdivide(result);
  }

  subdivCache.set(strokeId, { bracket, points: result });
  return result;
}

/**
 * Catmull-Rom subdivision: inserts an interpolated midpoint between each
 * pair of consecutive points using the surrounding points as control points.
 */
function catmullRomSubdivide(points: StrokePoint[]): StrokePoint[] {
  if (points.length < 2) return points;
  const result: StrokePoint[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    // Catmull-Rom at t=0.5
    const t = 0.5;
    const t2 = t * t;
    const t3 = t2 * t;

    const mx = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    const my = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    const mp = (p1.pressure + p2.pressure) / 2;

    result.push({ x: mx, y: my, pressure: mp });
    result.push(p2);
  }

  return result;
}

/**
 * Invalidate the LOD cache for a specific stroke (e.g., when it's modified).
 */
export function invalidateStrokeLOD(strokeId: string): void {
  lodCache.delete(strokeId);
  subdivCache.delete(strokeId);
}

/**
 * Clear the entire LOD cache.
 */
export function clearLODCache(): void {
  lodCache.clear();
  subdivCache.clear();
}

/** Exposed for testing. */
export const LOD_BRACKET_COUNT = LOD_BRACKETS.length;
