import { describe, it, expect, beforeEach } from "vitest";
import {
  douglasPeucker,
  getLODBracket,
  getStrokeLOD,
  clearLODCache,
  invalidateStrokeLOD,
  LOD_BRACKET_COUNT,
} from "../StrokeLOD";
import type { StrokePoint } from "../../model/Stroke";

function pt(x: number, y: number, pressure = 0.5): StrokePoint {
  return { x, y, pressure };
}

describe("douglasPeucker", () => {
  it("returns input unchanged for 0, 1, or 2 points", () => {
    expect(douglasPeucker([], 5)).toEqual([]);
    const single = [pt(1, 2)];
    expect(douglasPeucker(single, 5)).toEqual(single);
    const two = [pt(0, 0), pt(10, 10)];
    expect(douglasPeucker(two, 5)).toEqual(two);
  });

  it("removes collinear points within tolerance", () => {
    // Straight line: all interior points should be removed
    const straight = [pt(0, 0), pt(5, 0), pt(10, 0), pt(15, 0), pt(20, 0)];
    const result = douglasPeucker(straight, 1);
    expect(result).toEqual([pt(0, 0), pt(20, 0)]);
  });

  it("preserves points that deviate beyond tolerance", () => {
    // A zigzag where the middle point deviates significantly
    const zigzag = [pt(0, 0), pt(5, 10), pt(10, 0)];
    const result = douglasPeucker(zigzag, 1);
    // The middle point is 10 units from the line, well above tolerance
    expect(result.length).toBe(3);
    expect(result[1]).toEqual(pt(5, 10));
  });

  it("simplifies to endpoints when all points are within tolerance", () => {
    // Points very close to the line between first and last
    const nearLine = [pt(0, 0), pt(5, 0.1), pt(10, -0.1), pt(15, 0.05), pt(20, 0)];
    const result = douglasPeucker(nearLine, 1);
    expect(result).toEqual([pt(0, 0), pt(20, 0)]);
  });

  it("handles coincident first and last points", () => {
    const loop = [pt(0, 0), pt(10, 10), pt(0, 0)];
    const result = douglasPeucker(loop, 1);
    // Middle point is far from the (degenerate) line, so it's preserved
    expect(result.length).toBe(3);
  });

  it("preserves pressure values through simplification", () => {
    const points = [pt(0, 0, 0.3), pt(5, 0, 0.8), pt(10, 0, 0.6)];
    const result = douglasPeucker(points, 1);
    // Collinear → only endpoints kept
    expect(result).toEqual([pt(0, 0, 0.3), pt(10, 0, 0.6)]);
  });
});

describe("getLODBracket", () => {
  it("returns bracket 0 for very low zoom", () => {
    expect(getLODBracket(0.01)).toBe(0);
  });

  it("returns bracket 1 for low zoom", () => {
    expect(getLODBracket(0.1)).toBe(1);
  });

  it("returns bracket 2 for medium zoom", () => {
    expect(getLODBracket(0.3)).toBe(2);
  });

  it("returns bracket 3 for near-1 zoom", () => {
    expect(getLODBracket(0.8)).toBe(3);
  });

  it("returns -1 (full detail) for zoom > 1", () => {
    expect(getLODBracket(1.5)).toBe(-1);
    expect(getLODBracket(5)).toBe(-1);
  });

  it("returns the correct bracket at exact boundary values", () => {
    expect(getLODBracket(0.05)).toBe(0);
    expect(getLODBracket(0.15)).toBe(1);
    expect(getLODBracket(0.4)).toBe(2);
    expect(getLODBracket(1.0)).toBe(3);
  });
});

describe("getStrokeLOD", () => {
  beforeEach(() => {
    clearLODCache();
  });

  it("returns original points at full detail (zoom > 1)", () => {
    const points = [pt(0, 0), pt(5, 5), pt(10, 0)];
    const result = getStrokeLOD("s1", points, 2.0);
    expect(result).toBe(points); // same reference — no simplification
  });

  it("returns simplified points when zoomed out", () => {
    // Long straight line with many points — should simplify heavily when zoomed out
    const points: StrokePoint[] = [];
    for (let i = 0; i <= 100; i++) {
      points.push(pt(i, 0));
    }
    const result = getStrokeLOD("s2", points, 0.01);
    expect(result.length).toBeLessThan(points.length);
    // Should collapse to just endpoints for a straight line
    expect(result.length).toBe(2);
  });

  it("caches results per stroke per bracket", () => {
    const points = [pt(0, 0), pt(50, 50), pt(100, 0)];
    const first = getStrokeLOD("s3", points, 0.3);
    const second = getStrokeLOD("s3", points, 0.3);
    expect(first).toBe(second); // same cached reference
  });

  it("returns different results for different zoom brackets", () => {
    // Points with significant deviation — LOD 0 may simplify more than LOD 3
    const points: StrokePoint[] = [];
    for (let i = 0; i <= 20; i++) {
      // Zigzag pattern with amplitude 2
      points.push(pt(i * 5, i % 2 === 0 ? 2 : -2));
    }
    const farOut = getStrokeLOD("s4", points, 0.01);
    const nearIn = getStrokeLOD("s4", points, 0.8);
    // Far out uses higher tolerance → fewer points
    expect(farOut.length).toBeLessThanOrEqual(nearIn.length);
  });
});

describe("invalidateStrokeLOD", () => {
  beforeEach(() => {
    clearLODCache();
  });

  it("clears cached LOD for a specific stroke", () => {
    const points = [pt(0, 0), pt(50, 0), pt(100, 0)];
    const first = getStrokeLOD("s5", points, 0.3);
    invalidateStrokeLOD("s5");
    const second = getStrokeLOD("s5", points, 0.3);
    // After invalidation, a new array is computed (not same reference)
    expect(first).not.toBe(second);
    expect(first).toEqual(second); // but same content
  });
});

describe("clearLODCache", () => {
  it("clears all cached LOD data", () => {
    const points = [pt(0, 0), pt(50, 0), pt(100, 0)];
    const first = getStrokeLOD("s6", points, 0.1);
    clearLODCache();
    const second = getStrokeLOD("s6", points, 0.1);
    expect(first).not.toBe(second);
  });
});

describe("LOD_BRACKET_COUNT", () => {
  it("exposes the number of LOD brackets", () => {
    expect(LOD_BRACKET_COUNT).toBe(4);
  });
});
