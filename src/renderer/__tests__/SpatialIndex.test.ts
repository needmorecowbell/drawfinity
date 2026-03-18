import { describe, it, expect } from "vitest";
import { SpatialIndex, computeStrokeBounds } from "../SpatialIndex";
import { Stroke } from "../../model/Stroke";

function makeStroke(
  id: string,
  points: { x: number; y: number }[],
  width = 2,
): Stroke {
  return {
    id,
    points: points.map((p) => ({ ...p, pressure: 0.5 })),
    color: "#000000",
    width,
    timestamp: Date.now(),
  };
}

describe("computeStrokeBounds", () => {
  it("computes bounding box including stroke width", () => {
    const stroke = makeStroke("s1", [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ], 4);
    const bounds = computeStrokeBounds(stroke);
    expect(bounds.minX).toBe(8);  // 10 - 2
    expect(bounds.minY).toBe(18); // 20 - 2
    expect(bounds.maxX).toBe(32); // 30 + 2
    expect(bounds.maxY).toBe(42); // 40 + 2
  });

  it("handles single-point stroke", () => {
    const stroke = makeStroke("s1", [{ x: 5, y: 5 }], 2);
    const bounds = computeStrokeBounds(stroke);
    expect(bounds.minX).toBe(4);
    expect(bounds.minY).toBe(4);
    expect(bounds.maxX).toBe(6);
    expect(bounds.maxY).toBe(6);
  });
});

describe("SpatialIndex", () => {
  it("adds and queries strokes within viewport", () => {
    const index = new SpatialIndex(100);
    const s1 = makeStroke("s1", [{ x: 50, y: 50 }, { x: 80, y: 80 }]);
    const s2 = makeStroke("s2", [{ x: 500, y: 500 }, { x: 520, y: 520 }]);
    index.add(s1);
    index.add(s2);

    // Query around s1 — should only find s1
    const result = index.query({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("returns strokes that overlap viewport edge", () => {
    const index = new SpatialIndex(100);
    // Stroke spans from x=90 to x=110, crossing viewport boundary at 100
    const s1 = makeStroke("s1", [{ x: 90, y: 50 }, { x: 110, y: 50 }]);
    index.add(s1);

    const result = index.query({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(result).toHaveLength(1);
  });

  it("excludes strokes entirely outside viewport", () => {
    const index = new SpatialIndex(100);
    const s1 = makeStroke("s1", [{ x: 300, y: 300 }, { x: 350, y: 350 }]);
    index.add(s1);

    const result = index.query({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(result).toHaveLength(0);
  });

  it("removes strokes by ID", () => {
    const index = new SpatialIndex(100);
    const s1 = makeStroke("s1", [{ x: 50, y: 50 }]);
    index.add(s1);
    expect(index.size).toBe(1);
    expect(index.has("s1")).toBe(true);

    index.remove("s1");
    expect(index.size).toBe(0);
    expect(index.has("s1")).toBe(false);

    const result = index.query({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(result).toHaveLength(0);
  });

  it("rebuilds index from scratch", () => {
    const index = new SpatialIndex(100);
    index.add(makeStroke("old", [{ x: 50, y: 50 }]));

    const newStrokes = [
      makeStroke("a", [{ x: 10, y: 10 }]),
      makeStroke("b", [{ x: 200, y: 200 }]),
    ];
    index.rebuild(newStrokes);

    expect(index.size).toBe(2);
    expect(index.has("old")).toBe(false);
    expect(index.has("a")).toBe(true);
    expect(index.has("b")).toBe(true);
  });

  it("deduplicates strokes spanning multiple cells", () => {
    const index = new SpatialIndex(100);
    // Stroke crosses cell boundaries
    const s1 = makeStroke("s1", [{ x: 50, y: 50 }, { x: 250, y: 250 }]);
    index.add(s1);

    // Query broad viewport covering multiple cells
    const result = index.query({ minX: 0, minY: 0, maxX: 300, maxY: 300 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("handles negative coordinates", () => {
    const index = new SpatialIndex(100);
    const s1 = makeStroke("s1", [{ x: -50, y: -50 }, { x: -30, y: -30 }]);
    index.add(s1);

    const result = index.query({ minX: -100, minY: -100, maxX: 0, maxY: 0 });
    expect(result).toHaveLength(1);

    const noResult = index.query({ minX: 100, minY: 100, maxX: 200, maxY: 200 });
    expect(noResult).toHaveLength(0);
  });

  it("clears all entries", () => {
    const index = new SpatialIndex(100);
    index.add(makeStroke("s1", [{ x: 10, y: 10 }]));
    index.add(makeStroke("s2", [{ x: 20, y: 20 }]));
    index.clear();
    expect(index.size).toBe(0);
  });

  it("removing non-existent stroke is a no-op", () => {
    const index = new SpatialIndex(100);
    index.remove("nonexistent");
    expect(index.size).toBe(0);
  });
});
