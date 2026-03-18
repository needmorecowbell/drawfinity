import { describe, it, expect } from "vitest";
import {
  generateRectangleVertices,
  generateEllipseVertices,
  generatePolygonVertices,
  generateStarVertices,
  generateShapeVertices,
  _generatePerimeterPoints,
} from "../ShapeMesh";
import type { Shape } from "../../model/Shape";

/** Extract the (x, y) position of the Nth vertex from interleaved data (stride 6). */
function vertexPos(data: Float32Array, index: number): [number, number] {
  const offset = index * 6;
  return [data[offset], data[offset + 1]];
}

/** Extract the (r, g, b, a) color of the Nth vertex. */
function vertexColor(data: Float32Array, index: number): [number, number, number, number] {
  const offset = index * 6;
  return [data[offset + 2], data[offset + 3], data[offset + 4], data[offset + 5]];
}

/** Compute axis-aligned bounding box from vertex data. */
function computeAABB(data: Float32Array): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const vertexCount = data.length / 6;
  for (let i = 0; i < vertexCount; i++) {
    const [x, y] = vertexPos(data, i);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function makeShape(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "test-shape",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    rotation: 0,
    strokeColor: "#ff0000",
    strokeWidth: 2,
    fillColor: null,
    opacity: 1.0,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("ShapeMesh", () => {
  describe("generateRectangleVertices", () => {
    it("produces correct outline vertex count for a rectangle", () => {
      const shape = makeShape();
      const { outline } = generateRectangleVertices(shape);
      expect(outline).not.toBeNull();
      // 4 perimeter points → (4+1) * 2 = 10 vertices, 10 * 6 = 60 floats
      expect(outline!.length).toBe(60);
    });

    it("outline bounding box matches shape dimensions plus stroke width", () => {
      const shape = makeShape({ x: 50, y: 30, width: 100, height: 60, strokeWidth: 4 });
      const { outline } = generateRectangleVertices(shape);
      const bb = computeAABB(outline!);
      // Shape extends ±50 in x, ±30 in y from center (50, 30)
      // Plus stroke width/2 = 2 on each side
      expect(bb.minX).toBeCloseTo(50 - 50 - 2, 0);
      expect(bb.maxX).toBeCloseTo(50 + 50 + 2, 0);
      expect(bb.minY).toBeCloseTo(30 - 30 - 2, 0);
      expect(bb.maxY).toBeCloseTo(30 + 30 + 2, 0);
    });

    it("returns null outline when strokeWidth is 0", () => {
      const shape = makeShape({ strokeWidth: 0 });
      const { outline } = generateRectangleVertices(shape);
      expect(outline).toBeNull();
    });

    it("generates fill when fillColor is set", () => {
      const shape = makeShape({ fillColor: "#00ff00" });
      const { fill } = generateRectangleVertices(shape);
      expect(fill).not.toBeNull();
      // 4 perimeter points → 4 triangles → 12 vertices → 72 floats
      expect(fill!.length).toBe(72);
    });

    it("fill vertices use fillColor, not strokeColor", () => {
      const shape = makeShape({ strokeColor: "#ff0000", fillColor: "#00ff00", opacity: 1.0 });
      const { fill } = generateRectangleVertices(shape);
      // Green fill: r=0, g=1, b=0, a=1
      const c = vertexColor(fill!, 0);
      expect(c[0]).toBeCloseTo(0);
      expect(c[1]).toBeCloseTo(1);
      expect(c[2]).toBeCloseTo(0);
      expect(c[3]).toBeCloseTo(1);
    });

    it("returns null fill when fillColor is null", () => {
      const shape = makeShape({ fillColor: null });
      const { fill } = generateRectangleVertices(shape);
      expect(fill).toBeNull();
    });

    it("applies opacity to vertex alpha", () => {
      const shape = makeShape({ opacity: 0.5, fillColor: "#ffffff" });
      const { outline, fill } = generateRectangleVertices(shape);
      const outlineAlpha = vertexColor(outline!, 0)[3];
      expect(outlineAlpha).toBeCloseTo(0.5);
      const fillAlpha = vertexColor(fill!, 0)[3];
      expect(fillAlpha).toBeCloseTo(0.5);
    });

    it("outline vertices form a closed loop (last pair matches first)", () => {
      const shape = makeShape();
      const { outline } = generateRectangleVertices(shape);
      const vertexCount = outline!.length / 6;
      // First pair
      const [x0, y0] = vertexPos(outline!, 0);
      const [x1, y1] = vertexPos(outline!, 1);
      // Last pair (should close back to first)
      const [xLast0, yLast0] = vertexPos(outline!, vertexCount - 2);
      const [xLast1, yLast1] = vertexPos(outline!, vertexCount - 1);
      expect(xLast0).toBeCloseTo(x0);
      expect(yLast0).toBeCloseTo(y0);
      expect(xLast1).toBeCloseTo(x1);
      expect(yLast1).toBeCloseTo(y1);
    });
  });

  describe("generateEllipseVertices", () => {
    it("produces correct outline vertex count for given segment count", () => {
      const shape = makeShape({ type: "ellipse" });
      const { outline } = generateEllipseVertices(shape, 32);
      expect(outline).not.toBeNull();
      // 32 perimeter points → (32+1) * 2 = 66 vertices → 396 floats
      expect(outline!.length).toBe(396);
    });

    it("defaults to 48 segments", () => {
      const shape = makeShape({ type: "ellipse" });
      const { outline } = generateEllipseVertices(shape);
      // (48+1)*2 = 98 vertices → 588 floats
      expect(outline!.length).toBe(588);
    });

    it("outline bounding box approximately matches ellipse dimensions plus stroke", () => {
      const shape = makeShape({ type: "ellipse", width: 200, height: 100, strokeWidth: 2 });
      const { outline } = generateEllipseVertices(shape, 64);
      const bb = computeAABB(outline!);
      // Should be approximately ±101 in x, ±51 in y (with stroke)
      expect(bb.maxX).toBeCloseTo(101, 0);
      expect(bb.minX).toBeCloseTo(-101, 0);
      expect(bb.maxY).toBeCloseTo(51, 0);
      expect(bb.minY).toBeCloseTo(-51, 0);
    });

    it("fill vertex count matches segment count", () => {
      const shape = makeShape({ type: "ellipse", fillColor: "#0000ff" });
      const { fill } = generateEllipseVertices(shape, 32);
      // 32 triangles × 3 vertices × 6 floats = 576
      expect(fill!.length).toBe(576);
    });
  });

  describe("generatePolygonVertices", () => {
    it("generates correct vertex count for a triangle (3 sides)", () => {
      const shape = makeShape({ type: "polygon", sides: 3 });
      const { outline } = generatePolygonVertices(shape);
      // (3+1)*2 = 8 vertices → 48 floats
      expect(outline!.length).toBe(48);
    });

    it("generates correct vertex count for a hexagon (6 sides)", () => {
      const shape = makeShape({ type: "polygon", sides: 6 });
      const { outline } = generatePolygonVertices(shape);
      // (6+1)*2 = 14 vertices → 84 floats
      expect(outline!.length).toBe(84);
    });

    it("defaults to 5 sides (pentagon)", () => {
      const shape = makeShape({ type: "polygon" });
      const { outline } = generatePolygonVertices(shape);
      // (5+1)*2 = 12 vertices → 72 floats
      expect(outline!.length).toBe(72);
    });

    it("first vertex of pentagon points upward (top of shape)", () => {
      const shape = makeShape({ type: "polygon", sides: 5, width: 100, height: 100 });
      const perimeterPoints = _generatePerimeterPoints(shape);
      // First point should be at top: angle = -π/2 → (0, -50)
      expect(perimeterPoints[0].x).toBeCloseTo(0);
      expect(perimeterPoints[0].y).toBeCloseTo(-50);
    });

    it("fill triangles equal number of sides", () => {
      const shape = makeShape({ type: "polygon", sides: 6, fillColor: "#00ff00" });
      const { fill } = generatePolygonVertices(shape);
      // 6 triangles × 3 vertices × 6 floats = 108
      expect(fill!.length).toBe(108);
    });
  });

  describe("generateStarVertices", () => {
    it("generates correct vertex count for a 5-pointed star", () => {
      const shape = makeShape({ type: "star", sides: 5 });
      const { outline } = generateStarVertices(shape);
      // 5 points × 2 (inner+outer) = 10 perimeter points → (10+1)*2 = 22 vertices → 132 floats
      expect(outline!.length).toBe(132);
    });

    it("outer vertices are farther from center than inner vertices", () => {
      const shape = makeShape({ type: "star", sides: 5, width: 100, height: 100, starInnerRadius: 0.4 });
      const perimeterPoints = _generatePerimeterPoints(shape);
      // Even indices are outer, odd indices are inner
      const outerDist = Math.sqrt(perimeterPoints[0].x ** 2 + perimeterPoints[0].y ** 2);
      const innerDist = Math.sqrt(perimeterPoints[1].x ** 2 + perimeterPoints[1].y ** 2);
      expect(outerDist).toBeGreaterThan(innerDist);
      expect(innerDist / outerDist).toBeCloseTo(0.4, 1);
    });

    it("defaults to 5 sides and 0.4 inner radius", () => {
      const shape = makeShape({ type: "star" });
      const perimeterPoints = _generatePerimeterPoints(shape);
      // 5 sides × 2 = 10 perimeter points
      expect(perimeterPoints.length).toBe(10);
    });

    it("fill covers all star triangles", () => {
      const shape = makeShape({ type: "star", sides: 5, fillColor: "#ff0000" });
      const { fill } = generateStarVertices(shape);
      // 10 perimeter points → 10 triangles → 30 vertices → 180 floats
      expect(fill!.length).toBe(180);
    });
  });

  describe("generateShapeVertices (dispatcher)", () => {
    it("dispatches rectangle type correctly", () => {
      const shape = makeShape({ type: "rectangle" });
      const result = generateShapeVertices(shape);
      const expected = generateRectangleVertices(shape);
      expect(result.outline!.length).toBe(expected.outline!.length);
    });

    it("dispatches ellipse type correctly", () => {
      const shape = makeShape({ type: "ellipse" });
      const result = generateShapeVertices(shape);
      const expected = generateEllipseVertices(shape);
      expect(result.outline!.length).toBe(expected.outline!.length);
    });

    it("dispatches polygon type correctly", () => {
      const shape = makeShape({ type: "polygon", sides: 6 });
      const result = generateShapeVertices(shape);
      const expected = generatePolygonVertices(shape);
      expect(result.outline!.length).toBe(expected.outline!.length);
    });

    it("dispatches star type correctly", () => {
      const shape = makeShape({ type: "star", sides: 5 });
      const result = generateShapeVertices(shape);
      const expected = generateStarVertices(shape);
      expect(result.outline!.length).toBe(expected.outline!.length);
    });
  });

  describe("rotation", () => {
    it("rotates rectangle vertices by shape rotation angle", () => {
      const shape = makeShape({ type: "rectangle", width: 100, height: 0, strokeWidth: 0, fillColor: "#ff0000", rotation: Math.PI / 2 });
      const { fill } = generateRectangleVertices(shape);
      // A 100×0 rectangle rotated 90° should have vertices along the Y axis
      const bb = computeAABB(fill!);
      expect(bb.maxX).toBeCloseTo(0, 0);
      expect(bb.minX).toBeCloseTo(0, 0);
      expect(bb.maxY).toBeCloseTo(50, 0);
      expect(bb.minY).toBeCloseTo(-50, 0);
    });

    it("maintains bounding box size after 45° rotation", () => {
      // A square rotated 45° should have a larger AABB
      const shape0 = makeShape({ type: "rectangle", width: 100, height: 100, strokeWidth: 0, fillColor: "#ff0000", rotation: 0 });
      const shape45 = makeShape({ type: "rectangle", width: 100, height: 100, strokeWidth: 0, fillColor: "#ff0000", rotation: Math.PI / 4 });
      const bb0 = computeAABB(generateRectangleVertices(shape0).fill!);
      const bb45 = computeAABB(generateRectangleVertices(shape45).fill!);
      // Rotated AABB should be wider: 100/√2 * 2 ≈ 141
      expect(bb45.maxX - bb45.minX).toBeGreaterThan(bb0.maxX - bb0.minX);
    });
  });

  describe("winding order", () => {
    it("outline vertex pairs are offset from each other by stroke width", () => {
      const shape = makeShape({ type: "rectangle", width: 100, height: 60, strokeWidth: 4 });
      const { outline } = generateRectangleVertices(shape);
      // Each vertex pair (2i, 2i+1) should be separated by approximately strokeWidth
      // (exact distance depends on miter angle)
      const [x0, y0] = vertexPos(outline!, 0);
      const [x1, y1] = vertexPos(outline!, 1);
      const dist = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
      // At corners, miter extends the distance, so it should be >= strokeWidth
      expect(dist).toBeGreaterThanOrEqual(shape.strokeWidth - 0.01);
    });

    it("fill triangles wind consistently (all same sign cross product)", () => {
      const shape = makeShape({ type: "rectangle", fillColor: "#ff0000" });
      const { fill } = generateRectangleVertices(shape);
      const triCount = fill!.length / 18; // 3 vertices × 6 floats per triangle
      let positiveCount = 0;
      let negativeCount = 0;
      for (let t = 0; t < triCount; t++) {
        const [x0, y0] = vertexPos(fill!, t * 3);
        const [x1, y1] = vertexPos(fill!, t * 3 + 1);
        const [x2, y2] = vertexPos(fill!, t * 3 + 2);
        const cross = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
        if (cross > 0) positiveCount++;
        else if (cross < 0) negativeCount++;
      }
      // All triangles should wind the same way
      expect(positiveCount === 0 || negativeCount === 0).toBe(true);
    });
  });

  describe("color handling", () => {
    it("parses hex stroke color correctly", () => {
      const shape = makeShape({ strokeColor: "#ff8040", opacity: 1.0 });
      const { outline } = generateRectangleVertices(shape);
      const c = vertexColor(outline!, 0);
      expect(c[0]).toBeCloseTo(1.0, 1);     // 0xff = 255
      expect(c[1]).toBeCloseTo(0.502, 1);   // 0x80 = 128
      expect(c[2]).toBeCloseTo(0.251, 1);   // 0x40 = 64
      expect(c[3]).toBeCloseTo(1.0);
    });
  });
});
