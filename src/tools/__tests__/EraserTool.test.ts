import { describe, it, expect } from "vitest";
import {
  EraserTool,
  pointToSegmentDistance,
  strokeBoundingBox,
  pointIntersectsStroke,
  splitStrokeAroundEraser,
  pointIntersectsShape,
  pointIntersectsRectangle,
  pointIntersectsEllipse,
  pointIntersectsPolygonVertices,
  getPolygonVertices,
  getStarVertices,
  worldToShapeLocal,
} from "../EraserTool";
import { Stroke } from "../../model/Stroke";
import { Shape } from "../../model/Shape";

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

  describe("computeErasureResults", () => {
    it("returns fragments for a stroke erased in the middle", () => {
      const eraser = new EraserTool({ radius: 3 });
      const stroke = makeStroke("s1", [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 30, y: 0 },
        { x: 40, y: 0 },
      ]);
      // Erase near x=20, y=0 — should split into left and right fragments
      const results = eraser.computeErasureResults(20, 0, [stroke]);
      expect(results).toHaveLength(1);
      expect(results[0].strokeId).toBe("s1");
      expect(results[0].fragments.length).toBeGreaterThanOrEqual(1);
      // Fragments should not contain the erased segment
      for (const frag of results[0].fragments) {
        expect(frag.color).toBe("#000000");
        expect(frag.width).toBe(2);
        expect(frag.points.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("returns empty fragments when entire stroke is erased", () => {
      const eraser = new EraserTool({ radius: 50 });
      const stroke = makeStroke("s1", [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ]);
      const results = eraser.computeErasureResults(2.5, 0, [stroke]);
      expect(results).toHaveLength(1);
      expect(results[0].fragments).toEqual([]);
    });

    it("returns no results for strokes that don't intersect", () => {
      const eraser = new EraserTool({ radius: 3 });
      const stroke = makeStroke("far", [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ]);
      const results = eraser.computeErasureResults(0, 0, [stroke]);
      expect(results).toEqual([]);
    });

    it("preserves stroke properties in fragments", () => {
      const eraser = new EraserTool({ radius: 3 });
      const stroke: Stroke = {
        id: "s1",
        points: [
          { x: 0, y: 0, pressure: 0.8 },
          { x: 10, y: 0, pressure: 0.7 },
          { x: 20, y: 0, pressure: 0.6 },
          { x: 30, y: 0, pressure: 0.5 },
          { x: 40, y: 0, pressure: 0.4 },
        ],
        color: "#ff0000",
        width: 4,
        opacity: 0.5,
        timestamp: 12345,
      };
      // Erase near x=20 — should produce fragments preserving color, width, opacity
      const results = eraser.computeErasureResults(20, 0, [stroke]);
      expect(results).toHaveLength(1);
      for (const frag of results[0].fragments) {
        expect(frag.color).toBe("#ff0000");
        expect(frag.width).toBe(4);
        expect(frag.opacity).toBe(0.5);
        expect(frag.timestamp).toBe(12345);
        expect(frag.id).not.toBe("s1"); // New IDs
      }
    });
  });
});

describe("splitStrokeAroundEraser", () => {
  it("returns two fragments when erasing the middle of a long stroke", () => {
    // Stroke along x-axis from 0 to 100 with points every 10 units
    const stroke = makeStroke(
      "s1",
      Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 })),
    );
    // Erase at x=50 with radius 5 — should cut around the middle
    const fragments = splitStrokeAroundEraser(stroke, 50, 0, 5);
    expect(fragments.length).toBe(2);
    // Left fragment should end before the erased zone
    const leftLast = fragments[0].points[fragments[0].points.length - 1];
    expect(leftLast.x).toBeLessThan(50);
    // Right fragment should start after the erased zone
    const rightFirst = fragments[1].points[0];
    expect(rightFirst.x).toBeGreaterThan(50);
  });

  it("returns one fragment when erasing the start of a stroke", () => {
    const stroke = makeStroke(
      "s1",
      Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 })),
    );
    // Erase at the start
    const fragments = splitStrokeAroundEraser(stroke, 0, 0, 5);
    expect(fragments.length).toBe(1);
    expect(fragments[0].points[0].x).toBeGreaterThan(0);
  });

  it("returns one fragment when erasing the end of a stroke", () => {
    const stroke = makeStroke(
      "s1",
      Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 })),
    );
    // Erase at the end
    const fragments = splitStrokeAroundEraser(stroke, 100, 0, 5);
    expect(fragments.length).toBe(1);
    const last = fragments[0].points[fragments[0].points.length - 1];
    expect(last.x).toBeLessThan(100);
  });

  it("returns empty array when entire stroke is within eraser", () => {
    const stroke = makeStroke("s1", [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    const fragments = splitStrokeAroundEraser(stroke, 0.5, 0, 50);
    expect(fragments).toEqual([]);
  });

  it("returns empty array for single-point stroke", () => {
    const stroke = makeStroke("s1", [{ x: 0, y: 0 }]);
    const fragments = splitStrokeAroundEraser(stroke, 0, 0, 5);
    expect(fragments).toEqual([]);
  });

  it("generates new unique IDs for each fragment", () => {
    const stroke = makeStroke(
      "s1",
      Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 })),
    );
    const fragments = splitStrokeAroundEraser(stroke, 50, 0, 5);
    expect(fragments.length).toBe(2);
    expect(fragments[0].id).not.toBe(fragments[1].id);
    expect(fragments[0].id).not.toBe("s1");
    expect(fragments[1].id).not.toBe("s1");
  });
});

// --- Shape eraser tests ---

function makeShape(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "shape-1",
    type: "rectangle",
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    rotation: 0,
    strokeColor: "#000000",
    strokeWidth: 2,
    fillColor: null,
    opacity: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("worldToShapeLocal", () => {
  it("returns offset from center when rotation is 0", () => {
    const shape = makeShape({ x: 10, y: 20, rotation: 0 });
    const { lx, ly } = worldToShapeLocal(15, 25, shape);
    expect(lx).toBeCloseTo(5);
    expect(ly).toBeCloseTo(5);
  });

  it("un-rotates the point for rotated shapes", () => {
    const shape = makeShape({ x: 0, y: 0, rotation: Math.PI / 2 });
    // Point at (1, 0) in world space → should be (0, -1) in local space after un-rotating by -90°
    const { lx, ly } = worldToShapeLocal(1, 0, shape);
    expect(lx).toBeCloseTo(0);
    expect(ly).toBeCloseTo(-1);
  });
});

describe("pointIntersectsRectangle", () => {
  it("returns true for point inside the rectangle", () => {
    const shape = makeShape({ x: 50, y: 50, width: 100, height: 80 });
    expect(pointIntersectsRectangle(50, 50, shape, 0)).toBe(true);
    expect(pointIntersectsRectangle(20, 30, shape, 0)).toBe(true);
  });

  it("returns true for point on the edge", () => {
    const shape = makeShape({ x: 50, y: 50, width: 100, height: 80, strokeWidth: 2 });
    // Right edge at x=100+1=101
    expect(pointIntersectsRectangle(101, 50, shape, 0)).toBe(true);
  });

  it("returns false for point far outside", () => {
    const shape = makeShape({ x: 50, y: 50, width: 100, height: 80 });
    expect(pointIntersectsRectangle(200, 200, shape, 0)).toBe(false);
  });

  it("returns true for point within eraser radius of edge", () => {
    const shape = makeShape({ x: 50, y: 50, width: 100, height: 80, strokeWidth: 0 });
    // Point just outside the right edge (x=100), within radius 5
    expect(pointIntersectsRectangle(103, 50, shape, 5)).toBe(true);
  });

  it("handles rotated rectangles", () => {
    const shape = makeShape({ x: 0, y: 0, width: 100, height: 20, rotation: Math.PI / 2 });
    // Rotated 90°: width becomes vertical. Point at (0, 40) should be inside.
    expect(pointIntersectsRectangle(0, 40, shape, 0)).toBe(true);
    // Point at (40, 0) should be outside (height is only 20, so half-height is 10).
    expect(pointIntersectsRectangle(40, 0, shape, 0)).toBe(false);
  });
});

describe("pointIntersectsEllipse", () => {
  it("returns true for point at center", () => {
    const shape = makeShape({ type: "ellipse", x: 50, y: 50, width: 100, height: 80 });
    expect(pointIntersectsEllipse(50, 50, shape, 0)).toBe(true);
  });

  it("returns true for point inside the ellipse", () => {
    const shape = makeShape({ type: "ellipse", x: 0, y: 0, width: 100, height: 60, strokeWidth: 0 });
    // Point at (30, 20): (30/50)^2 + (20/30)^2 = 0.36 + 0.44 = 0.8 < 1 → inside
    expect(pointIntersectsEllipse(30, 20, shape, 0)).toBe(true);
  });

  it("returns false for point outside the ellipse", () => {
    const shape = makeShape({ type: "ellipse", x: 0, y: 0, width: 100, height: 60, strokeWidth: 0 });
    expect(pointIntersectsEllipse(200, 200, shape, 0)).toBe(false);
  });

  it("returns true for point near ellipse edge within radius", () => {
    const shape = makeShape({ type: "ellipse", x: 0, y: 0, width: 100, height: 100, strokeWidth: 0 });
    // Circle of radius 50. Point at (53, 0) is 3 units outside → radius 5 should hit
    expect(pointIntersectsEllipse(53, 0, shape, 5)).toBe(true);
  });

  it("handles rotated ellipses", () => {
    const shape = makeShape({ type: "ellipse", x: 0, y: 0, width: 100, height: 20, rotation: Math.PI / 2, strokeWidth: 0 });
    // Rotated 90°: major axis is now vertical
    expect(pointIntersectsEllipse(0, 40, shape, 0)).toBe(true);
    expect(pointIntersectsEllipse(40, 0, shape, 0)).toBe(false);
  });
});

describe("getPolygonVertices", () => {
  it("returns correct number of vertices", () => {
    const shape = makeShape({ type: "polygon", sides: 6 });
    const verts = getPolygonVertices(shape);
    expect(verts).toHaveLength(6);
  });

  it("generates vertices on the shape boundary", () => {
    const shape = makeShape({ type: "polygon", x: 0, y: 0, width: 100, height: 100, sides: 4, rotation: 0 });
    const verts = getPolygonVertices(shape);
    // First vertex should be at top (angle = -π/2 → (0, -50))
    expect(verts[0].x).toBeCloseTo(0);
    expect(verts[0].y).toBeCloseTo(-50);
  });
});

describe("getStarVertices", () => {
  it("returns 2*sides vertices", () => {
    const shape = makeShape({ type: "star", sides: 5, starInnerRadius: 0.5 });
    const verts = getStarVertices(shape);
    expect(verts).toHaveLength(10);
  });

  it("alternates outer and inner vertices", () => {
    const shape = makeShape({ type: "star", x: 0, y: 0, width: 100, height: 100, sides: 5, starInnerRadius: 0.5, rotation: 0 });
    const verts = getStarVertices(shape);
    // First vertex (outer) should be further from center than second (inner)
    const dist0 = Math.sqrt(verts[0].x ** 2 + verts[0].y ** 2);
    const dist1 = Math.sqrt(verts[1].x ** 2 + verts[1].y ** 2);
    expect(dist0).toBeGreaterThan(dist1);
  });
});

describe("pointIntersectsPolygonVertices", () => {
  it("returns true for point inside a triangle", () => {
    const verts = [
      { x: 0, y: -50 },
      { x: 50, y: 50 },
      { x: -50, y: 50 },
    ];
    expect(pointIntersectsPolygonVertices(0, 0, verts, 0, 0)).toBe(true);
  });

  it("returns false for point outside a triangle", () => {
    const verts = [
      { x: 0, y: -50 },
      { x: 50, y: 50 },
      { x: -50, y: 50 },
    ];
    expect(pointIntersectsPolygonVertices(200, 200, verts, 0, 0)).toBe(false);
  });

  it("returns true for point near edge within radius", () => {
    const verts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    // Point just outside the top edge, within radius
    expect(pointIntersectsPolygonVertices(50, -3, verts, 0, 5)).toBe(true);
  });

  it("accounts for strokeWidth", () => {
    const verts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    // Point 4 units outside edge, strokeWidth=6 (halfWidth=3), radius=2 → effective=5 → hit
    expect(pointIntersectsPolygonVertices(50, -4, verts, 6, 2)).toBe(true);
  });
});

describe("pointIntersectsShape", () => {
  it("dispatches to rectangle hit test", () => {
    const shape = makeShape({ type: "rectangle", x: 50, y: 50, width: 100, height: 80 });
    expect(pointIntersectsShape(50, 50, shape, 5)).toBe(true);
    expect(pointIntersectsShape(200, 200, shape, 5)).toBe(false);
  });

  it("dispatches to ellipse hit test", () => {
    const shape = makeShape({ type: "ellipse", x: 0, y: 0, width: 100, height: 100, strokeWidth: 0 });
    expect(pointIntersectsShape(0, 0, shape, 0)).toBe(true);
    expect(pointIntersectsShape(200, 0, shape, 0)).toBe(false);
  });

  it("dispatches to polygon hit test", () => {
    const shape = makeShape({ type: "polygon", x: 0, y: 0, width: 100, height: 100, sides: 4 });
    expect(pointIntersectsShape(0, 0, shape, 0)).toBe(true);
    expect(pointIntersectsShape(200, 200, shape, 0)).toBe(false);
  });

  it("dispatches to star hit test", () => {
    const shape = makeShape({ type: "star", x: 0, y: 0, width: 100, height: 100, sides: 5, starInnerRadius: 0.5 });
    expect(pointIntersectsShape(0, 0, shape, 0)).toBe(true);
    expect(pointIntersectsShape(200, 200, shape, 0)).toBe(false);
  });
});

describe("EraserTool zoom-aware radius", () => {
  it("getEffectiveRadius returns config radius at zoom 1", () => {
    const eraser = new EraserTool({ radius: 10 });
    expect(eraser.getEffectiveRadius(1)).toBe(10);
  });

  it("getEffectiveRadius shrinks radius at high zoom", () => {
    const eraser = new EraserTool({ radius: 10 });
    expect(eraser.getEffectiveRadius(10)).toBe(1);
    expect(eraser.getEffectiveRadius(100)).toBeCloseTo(0.1);
  });

  it("getEffectiveRadius grows radius at low zoom", () => {
    const eraser = new EraserTool({ radius: 10 });
    expect(eraser.getEffectiveRadius(0.5)).toBe(20);
  });

  it("getEffectiveRadius defaults to zoom 1 when omitted", () => {
    const eraser = new EraserTool({ radius: 10 });
    expect(eraser.getEffectiveRadius()).toBe(10);
  });

  it("findIntersectingStrokes uses zoom-scaled radius", () => {
    const eraser = new EraserTool({ radius: 10 });
    // Stroke along x-axis from 0 to 100
    const strokes = [
      makeStroke("s1", [{ x: 0, y: 0 }, { x: 100, y: 0 }]),
    ];
    // At zoom 1, radius=10 — point at (50, 8) is 8 units away, within 10+1=11 → hit
    expect(eraser.findIntersectingStrokes(50, 8, strokes, 1)).toEqual(["s1"]);
    // At zoom 100, effective radius=0.1 — point at (50, 8) is way outside → miss
    expect(eraser.findIntersectingStrokes(50, 8, strokes, 100)).toEqual([]);
  });

  it("computeErasureResults uses zoom-scaled radius", () => {
    const eraser = new EraserTool({ radius: 10 });
    // Stroke from 0 to 100 with points every 10 units
    const stroke = makeStroke(
      "s1",
      Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 })),
    );
    // At zoom 1, radius=10 — erasing at x=50 removes center segments, produces 2 fragments
    const resultsZ1 = eraser.computeErasureResults(50, 0, [stroke], 1);
    expect(resultsZ1).toHaveLength(1);
    expect(resultsZ1[0].fragments.length).toBe(2);

    // At zoom 100, effective radius=0.1 — barely touches the segment at x=50
    // Still hits (halfWidth=1 makes effectiveRadius=1.1), but fragments stay larger
    const resultsZ100 = eraser.computeErasureResults(50, 0, [stroke], 100);
    expect(resultsZ100).toHaveLength(1);
    // More fragments survive at high zoom since the eraser is smaller
    const z1Surviving = resultsZ1[0].fragments.reduce((n, f) => n + f.points.length, 0);
    const z100Surviving = resultsZ100[0].fragments.reduce((n, f) => n + f.points.length, 0);
    expect(z100Surviving).toBeGreaterThan(z1Surviving);
  });

  it("findIntersectingShapes uses zoom-scaled radius", () => {
    const eraser = new EraserTool({ radius: 10 });
    const shapes = [
      makeShape({ id: "s1", x: 50, y: 50, width: 100, height: 80, strokeWidth: 0 }),
    ];
    // Point at (106, 50) is 6 units outside the right edge (half-width=50).
    // At zoom 1, radius=10 → hit
    expect(eraser.findIntersectingShapes(106, 50, shapes, 1)).toEqual(["s1"]);
    // At zoom 100, effective radius=0.1 → miss
    expect(eraser.findIntersectingShapes(106, 50, shapes, 100)).toEqual([]);
  });
});

describe("EraserTool.findIntersectingShapes", () => {
  it("returns IDs of shapes that intersect the eraser position", () => {
    const eraser = new EraserTool({ radius: 5 });
    const shapes = [
      makeShape({ id: "hit", x: 50, y: 50, width: 100, height: 80 }),
      makeShape({ id: "miss", x: 500, y: 500, width: 10, height: 10 }),
    ];
    const hits = eraser.findIntersectingShapes(50, 50, shapes);
    expect(hits).toEqual(["hit"]);
  });

  it("returns multiple shape hits", () => {
    const eraser = new EraserTool({ radius: 5 });
    const shapes = [
      makeShape({ id: "a", x: 0, y: 0, width: 20, height: 20 }),
      makeShape({ id: "b", x: 5, y: 5, width: 20, height: 20 }),
      makeShape({ id: "c", x: 500, y: 500, width: 10, height: 10 }),
    ];
    const hits = eraser.findIntersectingShapes(0, 0, shapes);
    expect(hits).toContain("a");
    expect(hits).toContain("b");
    expect(hits).not.toContain("c");
  });

  it("returns empty array when no shapes are hit", () => {
    const eraser = new EraserTool({ radius: 5 });
    const shapes = [makeShape({ id: "far", x: 500, y: 500 })];
    expect(eraser.findIntersectingShapes(0, 0, shapes)).toEqual([]);
  });

  it("returns empty array for empty shapes list", () => {
    const eraser = new EraserTool();
    expect(eraser.findIntersectingShapes(0, 0, [])).toEqual([]);
  });

  it("handles all shape types", () => {
    const eraser = new EraserTool({ radius: 5 });
    const shapes = [
      makeShape({ id: "rect", type: "rectangle", x: 0, y: 0, width: 20, height: 20 }),
      makeShape({ id: "ellipse", type: "ellipse", x: 0, y: 0, width: 20, height: 20 }),
      makeShape({ id: "poly", type: "polygon", x: 0, y: 0, width: 20, height: 20, sides: 5 }),
      makeShape({ id: "star", type: "star", x: 0, y: 0, width: 20, height: 20, sides: 5, starInnerRadius: 0.5 }),
    ];
    const hits = eraser.findIntersectingShapes(0, 0, shapes);
    expect(hits).toContain("rect");
    expect(hits).toContain("ellipse");
    expect(hits).toContain("poly");
    expect(hits).toContain("star");
  });
});
