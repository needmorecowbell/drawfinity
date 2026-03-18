import { describe, it, expect } from "vitest";
import {
  EraserTool,
  pointToSegmentDistance,
  strokeBoundingBox,
  pointIntersectsStroke,
} from "../EraserTool";
import { Stroke } from "../../model/Stroke";

function makeStroke(
  id: string,
  points: Array<{ x: number; y: number }>,
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

describe("pointToSegmentDistance", () => {
  it("returns distance to nearest point on segment", () => {
    // Point above the middle of a horizontal segment
    expect(pointToSegmentDistance(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
  });

  it("returns distance to endpoint when projection is outside segment", () => {
    // Point past the end of the segment
    expect(pointToSegmentDistance(12, 0, 0, 0, 10, 0)).toBeCloseTo(2);
  });

  it("returns distance to the point when segment is zero-length", () => {
    expect(pointToSegmentDistance(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
  });
});

describe("strokeBoundingBox", () => {
  it("computes the bounding box of a stroke", () => {
    const stroke = makeStroke("s1", [
      { x: 1, y: 2 },
      { x: 5, y: -1 },
      { x: 3, y: 8 },
    ]);
    const bb = strokeBoundingBox(stroke);
    expect(bb.minX).toBe(1);
    expect(bb.minY).toBe(-1);
    expect(bb.maxX).toBe(5);
    expect(bb.maxY).toBe(8);
  });
});

describe("pointIntersectsStroke", () => {
  it("returns true when point is on the stroke path", () => {
    const stroke = makeStroke("s1", [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(pointIntersectsStroke(5, 0, stroke, 5)).toBe(true);
  });

  it("returns true when point is within eraser radius + half stroke width", () => {
    const stroke = makeStroke(
      "s1",
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      4,
    ); // halfWidth = 2
    // Point at distance 5 from segment, radius=5, halfWidth=2 → effectiveRadius=7
    expect(pointIntersectsStroke(5, 5, stroke, 5)).toBe(true);
  });

  it("returns false when point is far from the stroke", () => {
    const stroke = makeStroke("s1", [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(pointIntersectsStroke(5, 100, stroke, 5)).toBe(false);
  });

  it("rejects via bounding box for distant points", () => {
    const stroke = makeStroke("s1", [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(pointIntersectsStroke(1000, 1000, stroke, 5)).toBe(false);
  });

  it("handles single-point strokes", () => {
    const stroke = makeStroke("s1", [{ x: 5, y: 5 }]);
    expect(pointIntersectsStroke(5, 5, stroke, 5)).toBe(true);
    expect(pointIntersectsStroke(100, 100, stroke, 5)).toBe(false);
  });
});

describe("EraserTool", () => {
  it("creates with default radius", () => {
    const eraser = new EraserTool();
    expect(eraser.getRadius()).toBe(10);
  });

  it("accepts custom radius", () => {
    const eraser = new EraserTool({ radius: 20 });
    expect(eraser.getRadius()).toBe(20);
  });

  it("allows changing radius", () => {
    const eraser = new EraserTool();
    eraser.setRadius(15);
    expect(eraser.getRadius()).toBe(15);
  });

  describe("findIntersectingStrokes", () => {
    it("returns IDs of strokes that intersect the eraser position", () => {
      const eraser = new EraserTool({ radius: 5 });
      const strokes = [
        makeStroke("hit", [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ]),
        makeStroke("miss", [
          { x: 0, y: 100 },
          { x: 10, y: 100 },
        ]),
      ];

      const hits = eraser.findIntersectingStrokes(5, 0, strokes);
      expect(hits).toEqual(["hit"]);
    });

    it("returns multiple hits when eraser overlaps several strokes", () => {
      const eraser = new EraserTool({ radius: 5 });
      const strokes = [
        makeStroke("a", [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ]),
        makeStroke("b", [
          { x: 0, y: 3 },
          { x: 10, y: 3 },
        ]),
        makeStroke("c", [
          { x: 0, y: 100 },
          { x: 10, y: 100 },
        ]),
      ];

      const hits = eraser.findIntersectingStrokes(5, 1, strokes);
      expect(hits).toContain("a");
      expect(hits).toContain("b");
      expect(hits).not.toContain("c");
    });

    it("returns empty array when no strokes are hit", () => {
      const eraser = new EraserTool({ radius: 5 });
      const strokes = [
        makeStroke("far", [
          { x: 100, y: 100 },
          { x: 200, y: 100 },
        ]),
      ];

      expect(eraser.findIntersectingStrokes(0, 0, strokes)).toEqual([]);
    });

    it("returns empty array for empty strokes list", () => {
      const eraser = new EraserTool();
      expect(eraser.findIntersectingStrokes(0, 0, [])).toEqual([]);
    });
  });
});
