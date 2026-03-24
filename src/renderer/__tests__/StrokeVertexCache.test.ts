import { describe, it, expect } from "vitest";
import { StrokeVertexCache } from "../StrokeVertexCache";
import type { StrokePoint } from "../StrokeRenderer";

const WHITE: [number, number, number, number] = [1, 1, 1, 1];

const twoPointLine: StrokePoint[] = [
  { x: 0, y: 0, pressure: 1.0 },
  { x: 10, y: 0, pressure: 1.0 },
];

describe("StrokeVertexCache", () => {
  it("returns generated data on first call", () => {
    const cache = new StrokeVertexCache();
    const data = cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    expect(data).not.toBeNull();
    expect(data!.length).toBe(4 * 6); // 2 points × 2 vertices × 6 floats
  });

  it("returns cached data on subsequent call with same zoom bracket", () => {
    const cache = new StrokeVertexCache();
    const data1 = cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    const data2 = cache.get("s1", twoPointLine, WHITE, 2, 0.9);
    // Same LOD bracket (0.4-1.0), should return exact same reference
    expect(data1).toBe(data2);
  });

  it("regenerates when zoom crosses LOD bracket boundary", () => {
    const cache = new StrokeVertexCache();
    const data1 = cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    const data2 = cache.get("s1", twoPointLine, WHITE, 2, 2.0);
    // Different LOD brackets, should regenerate
    expect(data1).not.toBe(data2);
  });

  it("invalidates a specific stroke", () => {
    const cache = new StrokeVertexCache();
    cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    expect(cache.size).toBe(1);
    cache.invalidate("s1");
    expect(cache.size).toBe(0);
  });

  it("clears entire cache", () => {
    const cache = new StrokeVertexCache();
    cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    cache.get("s2", twoPointLine, WHITE, 2, 1.0);
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("returns null for degenerate input", () => {
    const cache = new StrokeVertexCache();
    const data = cache.get("s1", [{ x: 0, y: 0 }], WHITE, 2, 1.0);
    expect(data).toBeNull();
  });

  it("regenerates when width changes", () => {
    const cache = new StrokeVertexCache();
    const data1 = cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    const data2 = cache.get("s1", twoPointLine, WHITE, 5, 1.0);
    expect(data1).not.toBe(data2);
  });

  it("regenerates when color changes", () => {
    const cache = new StrokeVertexCache();
    const RED: [number, number, number, number] = [1, 0, 0, 1];
    const data1 = cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    const data2 = cache.get("s1", twoPointLine, RED, 2, 1.0);
    expect(data1).not.toBe(data2);
  });

  it("returns cached data when width and color are unchanged", () => {
    const cache = new StrokeVertexCache();
    const data1 = cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    const data2 = cache.get("s1", twoPointLine, WHITE, 2, 1.0);
    expect(data1).toBe(data2);
  });
});
