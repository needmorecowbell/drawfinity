import { describe, it, expect } from "vitest";
import { SpatialIndex, computeStrokeBounds, computeShapeBounds } from "../SpatialIndex";
import { Stroke } from "../../model/Stroke";
import type { Shape } from "../../model/Shape";

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

function makeShape(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<Shape> = {},
): Shape {
  return {
    id,
    type: "rectangle",
    x,
    y,
    width,
    height,
    rotation: 0,
    strokeColor: "#000000",
    strokeWidth: 2,
    fillColor: null,
    opacity: 1.0,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("computeShapeBounds", () => {
  it("computes bounding box for unrotated shape", () => {
    const shape = makeShape("s1", 50, 30, 100, 60);
    const bounds = computeShapeBounds(shape);
    // center(50,30), half-size(50,30), stroke half(1)
    expect(bounds.minX).toBe(-1);
    expect(bounds.maxX).toBe(101);
    expect(bounds.minY).toBe(-1);
    expect(bounds.maxY).toBe(61);
  });

  it("accounts for stroke width", () => {
    const shape = makeShape("s1", 0, 0, 100, 100, { strokeWidth: 10 });
    const bounds = computeShapeBounds(shape);
    expect(bounds.minX).toBe(-55); // -50 - 5
    expect(bounds.maxX).toBe(55);
  });

  it("computes larger AABB for rotated shape", () => {
    const shape = makeShape("s1", 0, 0, 100, 0, { rotation: Math.PI / 4, strokeWidth: 0 });
    const bounds = computeShapeBounds(shape);
    // 100×0 rotated 45° → AABB extends by 50*cos(45) in both axes
    const expected = 50 * Math.cos(Math.PI / 4);
    expect(bounds.maxX).toBeCloseTo(expected, 5);
    expect(bounds.maxY).toBeCloseTo(expected, 5);
  });

  it("handles 90° rotation (swaps width/height)", () => {
    const shape = makeShape("s1", 0, 0, 200, 100, { rotation: Math.PI / 2, strokeWidth: 0 });
    const bounds = computeShapeBounds(shape);
    // 200×100 rotated 90° → effective size 100×200
    expect(bounds.maxX).toBeCloseTo(50, 0);
    expect(bounds.maxY).toBeCloseTo(100, 0);
  });
});

describe("SpatialIndex — shapes", () => {
  it("adds and queries shapes within viewport", () => {
    const index = new SpatialIndex(100);
    const s1 = makeShape("sh1", 50, 50, 40, 40);
    const s2 = makeShape("sh2", 500, 500, 40, 40);
    index.addShape(s1);
    index.addShape(s2);

    const result = index.queryShapes({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("sh1");
  });

  it("excludes shapes outside viewport", () => {
    const index = new SpatialIndex(100);
    index.addShape(makeShape("sh1", 500, 500, 20, 20));

    const result = index.queryShapes({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(result).toHaveLength(0);
  });

  it("removes shapes by ID", () => {
    const index = new SpatialIndex(100);
    index.addShape(makeShape("sh1", 50, 50, 20, 20));
    expect(index.shapeSize).toBe(1);
    expect(index.hasShape("sh1")).toBe(true);

    index.removeShape("sh1");
    expect(index.shapeSize).toBe(0);
    expect(index.hasShape("sh1")).toBe(false);
  });

  it("rebuildAll indexes both strokes and shapes", () => {
    const index = new SpatialIndex(100);
    index.add(makeStroke("old", [{ x: 50, y: 50 }]));
    index.addShape(makeShape("old-shape", 50, 50, 20, 20));

    index.rebuildAll(
      [makeStroke("s1", [{ x: 10, y: 10 }])],
      [makeShape("sh1", 50, 50, 20, 20)],
    );

    expect(index.size).toBe(1);
    expect(index.shapeSize).toBe(1);
    expect(index.has("old")).toBe(false);
    expect(index.hasShape("old-shape")).toBe(false);
    expect(index.has("s1")).toBe(true);
    expect(index.hasShape("sh1")).toBe(true);
  });

  it("clear removes shapes too", () => {
    const index = new SpatialIndex(100);
    index.add(makeStroke("s1", [{ x: 10, y: 10 }]));
    index.addShape(makeShape("sh1", 50, 50, 20, 20));
    index.clear();
    expect(index.size).toBe(0);
    expect(index.shapeSize).toBe(0);
  });

  it("deduplicates shapes spanning multiple cells", () => {
    const index = new SpatialIndex(100);
    // Large shape spans multiple cells
    index.addShape(makeShape("sh1", 150, 150, 400, 400));

    const result = index.queryShapes({ minX: 0, minY: 0, maxX: 500, maxY: 500 });
    expect(result).toHaveLength(1);
  });

  it("removing non-existent shape is a no-op", () => {
    const index = new SpatialIndex(100);
    index.removeShape("nonexistent");
    expect(index.shapeSize).toBe(0);
  });
});
