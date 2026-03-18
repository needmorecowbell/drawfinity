import type { StrokePoint } from "./StrokeRenderer";

/**
 * Generates triangle strip geometry from a polyline for GPU rendering.
 * Replaces deprecated GL_LINE_STRIP + gl.lineWidth() with filled geometry
 * that renders consistently on all GPU drivers.
 */

/**
 * Generates a triangle strip from a polyline and width.
 * Returns an interleaved Float32Array: [x, y, r, g, b, a] per vertex,
 * ready for GL_TRIANGLE_STRIP rendering.
 *
 * @param points - The polyline points
 * @param width - Stroke width in world-space units
 * @param color - RGBA color tuple [0..1]
 * @returns Float32Array of interleaved vertex data, or null if input is degenerate
 */
export function generateTriangleStrip(
  points: readonly StrokePoint[],
  width: number,
  color: [number, number, number, number],
): Float32Array | null {
  if (points.length < 2 || width <= 0) return null;

  // Deduplicate consecutive identical points
  const deduped: StrokePoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (points[i].x !== deduped[deduped.length - 1].x ||
        points[i].y !== deduped[deduped.length - 1].y) {
      deduped.push(points[i]);
    }
  }

  if (deduped.length < 2) return null;

  const vertexCount = deduped.length * 2;
  // 6 floats per vertex: x, y, r, g, b, a
  const data = new Float32Array(vertexCount * 6);

  const [r, g, b, a] = color;

  for (let i = 0; i < deduped.length; i++) {
    let nx: number;
    let ny: number;

    if (i === 0) {
      // First point: use direction to next point
      const dx = deduped[1].x - deduped[0].x;
      const dy = deduped[1].y - deduped[0].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      nx = -dy / len;
      ny = dx / len;
    } else if (i === deduped.length - 1) {
      // Last point: use direction from previous point
      const dx = deduped[i].x - deduped[i - 1].x;
      const dy = deduped[i].y - deduped[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      nx = -dy / len;
      ny = dx / len;
    } else {
      // Interior point: miter join using average of adjacent segment normals
      const dx1 = deduped[i].x - deduped[i - 1].x;
      const dy1 = deduped[i].y - deduped[i - 1].y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const nx1 = -dy1 / len1;
      const ny1 = dx1 / len1;

      const dx2 = deduped[i + 1].x - deduped[i].x;
      const dy2 = deduped[i + 1].y - deduped[i].y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const nx2 = -dy2 / len2;
      const ny2 = dx2 / len2;

      // Average normal
      let mx = (nx1 + nx2) / 2;
      let my = (ny1 + ny2) / 2;
      const mLen = Math.sqrt(mx * mx + my * my);

      if (mLen < 1e-6) {
        // Normals cancel out (180° turn) — fall back to first segment normal
        nx = nx1;
        ny = ny1;
      } else {
        mx /= mLen;
        my /= mLen;

        // Scale miter to maintain correct width at the join
        // miterLength = 1 / cos(halfAngle) = 1 / dot(miter, normal)
        const dot = mx * nx1 + my * ny1;
        const miterScale = dot > 0.1 ? 1 / dot : 1 / 0.1; // Clamp to avoid extreme spikes

        nx = mx * miterScale;
        ny = my * miterScale;
      }
    }

    const px = deduped[i].x;
    const py = deduped[i].y;

    // Per-point pressure-based half-width: ±(width * pressure) / 2
    // Default pressure is 0.5 for mouse input (consistent with StrokeCapture)
    const pressure = deduped[i].pressure ?? 0.5;
    const halfWidth = (width * pressure) / 2;

    // Per-vertex alpha: scale base alpha by pressure for pressure-sensitive opacity
    const vertexAlpha = a * pressure;

    // Left vertex
    const li = (i * 2) * 6;
    data[li] = px + nx * halfWidth;
    data[li + 1] = py + ny * halfWidth;
    data[li + 2] = r;
    data[li + 3] = g;
    data[li + 4] = b;
    data[li + 5] = vertexAlpha;

    // Right vertex
    const ri = (i * 2 + 1) * 6;
    data[ri] = px - nx * halfWidth;
    data[ri + 1] = py - ny * halfWidth;
    data[ri + 2] = r;
    data[ri + 3] = g;
    data[ri + 4] = b;
    data[ri + 5] = vertexAlpha;
  }

  return data;
}
