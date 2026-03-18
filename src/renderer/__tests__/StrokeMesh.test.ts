import { describe, it, expect } from "vitest";
import { generateTriangleStrip } from "../StrokeMesh";
import type { StrokePoint } from "../StrokeRenderer";

const WHITE: [number, number, number, number] = [1, 1, 1, 1];

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

describe("StrokeMesh.generateTriangleStrip", () => {
  describe("two-point polyline (single segment)", () => {
    const points: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const width = 4;

    it("produces exactly 4 vertices (one quad)", () => {
      const data = generateTriangleStrip(points, width, WHITE);
      expect(data).not.toBeNull();
      // 4 vertices × 6 floats = 24
      expect(data!.length).toBe(24);
    });

    it("offsets vertices perpendicular to segment with magnitude width/2", () => {
      const data = generateTriangleStrip(points, width, WHITE)!;
      const halfW = width / 2;

      // Segment direction is (1, 0), so normal is (0, 1) (perpendicular)
      // First point (0,0): left vertex at (0, +halfW), right at (0, -halfW)
      const [lx0, ly0] = vertexPos(data, 0);
      const [rx0, ry0] = vertexPos(data, 1);
      expect(lx0).toBeCloseTo(0);
      expect(ly0).toBeCloseTo(halfW);
      expect(rx0).toBeCloseTo(0);
      expect(ry0).toBeCloseTo(-halfW);

      // Second point (10,0): left vertex at (10, +halfW), right at (10, -halfW)
      const [lx1, ly1] = vertexPos(data, 2);
      const [rx1, ry1] = vertexPos(data, 3);
      expect(lx1).toBeCloseTo(10);
      expect(ly1).toBeCloseTo(halfW);
      expect(rx1).toBeCloseTo(10);
      expect(ry1).toBeCloseTo(-halfW);
    });

    it("writes the correct color to every vertex", () => {
      const color: [number, number, number, number] = [0.2, 0.4, 0.6, 0.8];
      const data = generateTriangleStrip(points, width, color)!;
      for (let i = 0; i < 4; i++) {
        const c = vertexColor(data, i);
        expect(c[0]).toBeCloseTo(color[0], 5);
        expect(c[1]).toBeCloseTo(color[1], 5);
        expect(c[2]).toBeCloseTo(color[2], 5);
        expect(c[3]).toBeCloseTo(color[3], 5);
      }
    });
  });

  describe("multi-segment polyline with miter joins", () => {
    // L-shaped path: right then up
    const points: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const width = 2;

    it("produces (pointCount × 2) vertices", () => {
      const data = generateTriangleStrip(points, width, WHITE);
      expect(data).not.toBeNull();
      // 3 points × 2 vertices × 6 floats = 36
      expect(data!.length).toBe(36);
    });

    it("interior point uses miter join (shared vertices, not duplicated)", () => {
      const data = generateTriangleStrip(points, width, WHITE)!;
      // The middle point (10,0) should have a miter join.
      // Segment 1 normal: direction (1,0) → normal (0,1)
      // Segment 2 normal: direction (0,1) → normal (-1,0)
      // Averaged miter direction: (-1, 1) normalized = (-0.707, 0.707)
      // dot(miter, n1) = 0.707, so miterScale ≈ 1.414
      // Final offset: (-0.707 * 1.414, 0.707 * 1.414) * halfW = (-1, 1) * 1
      const [lx, ly] = vertexPos(data, 2); // left vertex at middle point
      const [rx, ry] = vertexPos(data, 3); // right vertex at middle point
      // Left should be offset in (+miter) direction, right in (-miter) direction from (10, 0)
      expect(lx).toBeCloseTo(10 + (-1));
      expect(ly).toBeCloseTo(0 + 1);
      expect(rx).toBeCloseTo(10 - (-1));
      expect(ry).toBeCloseTo(0 - 1);
    });
  });

  describe("degenerate cases", () => {
    it("returns null for a single point", () => {
      expect(generateTriangleStrip([{ x: 5, y: 5 }], 2, WHITE)).toBeNull();
    });

    it("returns null for empty array", () => {
      expect(generateTriangleStrip([], 2, WHITE)).toBeNull();
    });

    it("returns null for zero width", () => {
      const points: StrokePoint[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      expect(generateTriangleStrip(points, 0, WHITE)).toBeNull();
    });

    it("returns null for negative width", () => {
      const points: StrokePoint[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      expect(generateTriangleStrip(points, -5, WHITE)).toBeNull();
    });

    it("deduplicates consecutive identical points and returns null if only one unique", () => {
      const points: StrokePoint[] = [
        { x: 3, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 3 },
      ];
      expect(generateTriangleStrip(points, 2, WHITE)).toBeNull();
    });

    it("deduplicates but still produces geometry when enough unique points remain", () => {
      const points: StrokePoint[] = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ];
      const data = generateTriangleStrip(points, 2, WHITE);
      expect(data).not.toBeNull();
      // After dedup: 2 unique points → 4 vertices × 6 floats = 24
      expect(data!.length).toBe(24);
    });
  });

  describe("vertex count formula", () => {
    it("produces exactly pointCount × 2 vertices for various lengths", () => {
      for (const n of [2, 3, 5, 10, 20]) {
        const points: StrokePoint[] = [];
        for (let i = 0; i < n; i++) {
          points.push({ x: i * 10, y: 0 });
        }
        const data = generateTriangleStrip(points, 1, WHITE);
        expect(data).not.toBeNull();
        expect(data!.length).toBe(n * 2 * 6);
      }
    });
  });
});
