import { describe, it, expect } from "vitest";
import { ShapeVertexCache } from "../ShapeVertexCache";
import type { Shape } from "../../model/Shape";

function makeShape(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "shape-1",
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

describe("ShapeVertexCache", () => {
  it("generates and caches vertex data for a shape", () => {
    const cache = new ShapeVertexCache();
    const shape = makeShape();
    const data = cache.get(shape);
    expect(data.outline).not.toBeNull();
    expect(data.fill).toBeNull(); // no fillColor
    expect(cache.size).toBe(1);
  });

  it("returns cached data on second access", () => {
    const cache = new ShapeVertexCache();
    const shape = makeShape();
    const data1 = cache.get(shape);
    const data2 = cache.get(shape);
    expect(data1).toBe(data2); // same reference
  });

  it("caches fill data when fillColor is set", () => {
    const cache = new ShapeVertexCache();
    const shape = makeShape({ fillColor: "#00ff00" });
    const data = cache.get(shape);
    expect(data.outline).not.toBeNull();
    expect(data.fill).not.toBeNull();
  });

  it("invalidates a specific shape", () => {
    const cache = new ShapeVertexCache();
    const shape = makeShape();
    cache.get(shape);
    expect(cache.size).toBe(1);
    cache.invalidate(shape.id);
    expect(cache.size).toBe(0);
  });

  it("clears all entries", () => {
    const cache = new ShapeVertexCache();
    cache.get(makeShape({ id: "a" }));
    cache.get(makeShape({ id: "b" }));
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("caches different shapes independently", () => {
    const cache = new ShapeVertexCache();
    const rect = makeShape({ id: "rect", type: "rectangle" });
    const ellipse = makeShape({ id: "ellipse", type: "ellipse" });
    const rectData = cache.get(rect);
    const ellipseData = cache.get(ellipse);
    expect(rectData).not.toBe(ellipseData);
    expect(cache.size).toBe(2);
  });

  it("regenerates data after invalidation", () => {
    const cache = new ShapeVertexCache();
    const shape = makeShape();
    const data1 = cache.get(shape);
    cache.invalidate(shape.id);
    const data2 = cache.get(shape);
    expect(data2.outline).not.toBeNull();
    expect(data1).not.toBe(data2); // new object
  });
});
