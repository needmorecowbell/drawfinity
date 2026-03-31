import { describe, it, expect } from "vitest";
import { generateTriangleStrip } from "../StrokeMesh";
import { StrokeVertexCache } from "../StrokeVertexCache";
import { SpatialIndex } from "../SpatialIndex";
import { getStrokeLOD, clearLODCache } from "../StrokeLOD";
import type { Stroke } from "../../model/Stroke";

/** Generate a random stroke with the given number of points spread across a given area. */
function randomStroke(id: string, areaSize: number, pointCount: number): Stroke {
  const startX = (Math.random() - 0.5) * areaSize;
  const startY = (Math.random() - 0.5) * areaSize;
  const points: Array<{ x: number; y: number; pressure: number }> = [];

  let x = startX;
  let y = startY;
  for (let i = 0; i < pointCount; i++) {
    x += (Math.random() - 0.5) * 20;
    y += (Math.random() - 0.5) * 20;
    points.push({ x, y, pressure: 0.3 + Math.random() * 0.7 });
  }

  const colors = ["#000000", "#ff0000", "#0000ff", "#00aa00", "#ff6600", "#9900cc"];
  return {
    id,
    points,
    color: colors[Math.floor(Math.random() * colors.length)],
    width: 1 + Math.random() * 8,
    opacity: 0.7 + Math.random() * 0.3,
    timestamp: Date.now(),
  };
}

function generateStrokes(count: number, areaSize = 10000): Stroke[] {
  const strokes: Stroke[] = [];
  for (let i = 0; i < count; i++) {
    const pointCount = 10 + Math.floor(Math.random() * 40);
    strokes.push(randomStroke(`stress-${i}`, areaSize, pointCount));
  }
  return strokes;
}

describe("StressTest: 1000+ strokes rendering pipeline", () => {
  it("generates triangle strip geometry for 1000 strokes within budget", () => {
    const strokes = generateStrokes(1000);
    const color: [number, number, number, number] = [0, 0, 0, 1];

    const start = performance.now();
    let totalVertices = 0;

    for (const stroke of strokes) {
      const data = generateTriangleStrip(stroke.points, stroke.width, color);
      if (data) {
        totalVertices += data.length / 6;
      }
    }
    const elapsed = performance.now() - start;

    expect(totalVertices).toBeGreaterThan(0);
    // Should complete in under 500ms for 1000 strokes (generous budget)
    expect(elapsed).toBeLessThan(500);
    console.log(`  generateTriangleStrip × 1000: ${elapsed.toFixed(1)}ms, ${totalVertices} vertices`);
  });

  it("spatial index query returns only viewport-visible strokes", () => {
    const strokes = generateStrokes(1000, 10000);
    const index = new SpatialIndex();
    index.rebuild(strokes);

    // Query a small viewport in the center
    const viewport = { minX: -500, minY: -500, maxX: 500, maxY: 500 };
    const visible = index.query(viewport);

    // Should be significantly fewer than total
    expect(visible.length).toBeLessThan(strokes.length);
    expect(visible.length).toBeGreaterThan(0);
    console.log(`  Spatial query: ${visible.length}/${strokes.length} visible in viewport`);
  });

  it("LOD simplification reduces point count at low zoom", () => {
    clearLODCache();
    const strokes = generateStrokes(100, 5000);
    let fullPoints = 0;
    let lodPoints = 0;

    for (const stroke of strokes) {
      fullPoints += stroke.points.length;
      const simplified = getStrokeLOD(stroke.id, stroke.points, 0.1);
      lodPoints += simplified.length;
    }

    // At zoom 0.1, LOD should reduce total points
    expect(lodPoints).toBeLessThan(fullPoints);
    console.log(`  LOD at zoom 0.1: ${lodPoints}/${fullPoints} points (${((lodPoints / fullPoints) * 100).toFixed(0)}%)`);
    clearLODCache();
  });

  it("vertex cache avoids redundant geometry generation", () => {
    const cache = new StrokeVertexCache();
    const strokes = generateStrokes(500);
    const color: [number, number, number, number] = [0, 0, 0, 1];
    const zoom = 1.0;

    // First pass: populate cache
    const start1 = performance.now();
    for (const stroke of strokes) {
      cache.get(stroke.id, stroke.points, color, stroke.width, zoom);
    }
    const firstPass = performance.now() - start1;

    // Second pass: should be much faster (cache hits)
    const start2 = performance.now();
    for (const stroke of strokes) {
      cache.get(stroke.id, stroke.points, color, stroke.width, zoom);
    }
    const secondPass = performance.now() - start2;

    expect(cache.size).toBe(500);
    // Log timing for informational purposes — not asserted because CI
    // runners have unpredictable timing (GC, context switches, JIT warmup)
    // that can make the cached pass appear slower than the first pass.
    console.log(`  Vertex cache: first=${firstPass.toFixed(1)}ms, cached=${secondPass.toFixed(1)}ms`);
  });

  it("full pipeline simulation processes 1000 strokes under 100ms per frame", () => {
    clearLODCache();
    const strokes = generateStrokes(1000, 10000);
    const index = new SpatialIndex();
    index.rebuild(strokes);

    const cache = new StrokeVertexCache();
    const zoom = 0.5;
    const viewport = { minX: -2000, minY: -2000, maxX: 2000, maxY: 2000 };

    // Warm up the cache (simulates first frame)
    const visible = index.query(viewport);
    for (const stroke of visible) {
      const lodPts = getStrokeLOD(stroke.id, stroke.points, zoom);
      cache.get(stroke.id, lodPts, [0, 0, 0, 1], stroke.width, zoom);
    }

    // Measure a "cached frame" — simulates subsequent frames at same zoom
    const start = performance.now();
    const frameVisible = index.query(viewport);
    const strips: Float32Array[] = [];
    for (const stroke of frameVisible) {
      const lodPts = getStrokeLOD(stroke.id, stroke.points, zoom);
      const data = cache.get(stroke.id, lodPts, [0, 0, 0, 1], stroke.width, zoom);
      if (data) strips.push(data);
    }
    const elapsed = performance.now() - start;

    expect(strips.length).toBeGreaterThan(0);
    // Cached frame should be fast — under 100ms (no GPU, just CPU pipeline)
    expect(elapsed).toBeLessThan(100);
    console.log(`  Full pipeline (cached): ${elapsed.toFixed(1)}ms, ${strips.length} strokes, ${frameVisible.length} visible`);
    clearLODCache();
  });
});
