import type { StrokePoint } from "../model/Stroke";

/**
 * Applies moving-average smoothing to a polyline of stroke points.
 * Reduces jaggedness from fast mouse/stylus movement while preserving
 * the overall stroke shape and per-point pressure values.
 *
 * @param points - Raw input points
 * @param windowSize - Number of points in the averaging window (must be odd, ≥ 1).
 *                     Higher values produce smoother results. Clamped to [1, points.length].
 * @returns New array of smoothed points (same length as input)
 */
export function smoothStroke(
  points: readonly StrokePoint[],
  windowSize: number,
): StrokePoint[] {
  if (points.length <= 2 || windowSize <= 1) {
    return points.map((p) => ({ ...p }));
  }

  // Ensure window is odd and within bounds
  let win = Math.max(1, Math.min(Math.round(windowSize), points.length));
  if (win % 2 === 0) win = Math.max(1, win - 1);

  const halfWin = Math.floor(win / 2);
  const result: StrokePoint[] = new Array(points.length);

  // Preserve first and last points exactly (anchors)
  result[0] = { ...points[0] };
  result[points.length - 1] = { ...points[points.length - 1] };

  for (let i = 1; i < points.length - 1; i++) {
    const lo = Math.max(0, i - halfWin);
    const hi = Math.min(points.length - 1, i + halfWin);
    const count = hi - lo + 1;

    let sx = 0;
    let sy = 0;
    for (let j = lo; j <= hi; j++) {
      sx += points[j].x;
      sy += points[j].y;
    }

    result[i] = {
      x: sx / count,
      y: sy / count,
      pressure: points[i].pressure, // Preserve original pressure
    };
  }

  return result;
}
