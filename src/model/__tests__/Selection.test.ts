import { describe, expect, it } from "vitest";
import {
  getSelectedItems,
  hitTestShape,
  hitTestStroke,
  pointInRegion,
  SelectionDocumentModel,
  SelectionRegion,
} from "../Selection";
import type { Shape } from "../Shape";
import type { Stroke } from "../Stroke";

function makeStroke(id: string, points: Array<{ x: number; y: number }>): Stroke {
  return {
    id,
    points: points.map((point) => ({ ...point, pressure: 0.5 })),
    color: "#000000",
    width: 2,
    timestamp: Date.now(),
  };
}

function makeShape(id: string, overrides: Partial<Shape> = {}): Shape {
  return {
    id,
    type: "rectangle",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    strokeColor: "#000000",
    strokeWidth: 0,
    fillColor: null,
    opacity: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("selection hit testing", () => {
  it("tests points against rectangle selections including edges", () => {
    const region: SelectionRegion = { type: "rect", bounds: { x: 0, y: 0, width: 10, height: 10 } };

    expect(pointInRegion({ x: 5, y: 5 }, region)).toBe(true);
    expect(pointInRegion({ x: 0, y: 10 }, region)).toBe(true);
    expect(pointInRegion({ x: 11, y: 5 }, region)).toBe(false);
  });

  it("tests points against ellipse selections", () => {
    const region: SelectionRegion = { type: "ellipse", bounds: { x: 0, y: 0, width: 20, height: 10 } };

    expect(pointInRegion({ x: 10, y: 5 }, region)).toBe(true);
    expect(pointInRegion({ x: 20, y: 5 }, region)).toBe(true);
    expect(pointInRegion({ x: 20, y: 10 }, region)).toBe(false);
  });

  it("tests points against convex and concave lasso selections", () => {
    const square: SelectionRegion = {
      type: "lasso",
      bounds: { x: 0, y: 0, width: 10, height: 10 },
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    };
    const concave: SelectionRegion = {
      type: "lasso",
      bounds: { x: 0, y: 0, width: 10, height: 10 },
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 5, y: 5 },
        { x: 0, y: 10 },
      ],
    };

    expect(pointInRegion({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInRegion({ x: 0, y: 5 }, square)).toBe(true);
    expect(pointInRegion({ x: 11, y: 5 }, square)).toBe(false);
    expect(pointInRegion({ x: 8, y: 4 }, concave)).toBe(true);
    expect(pointInRegion({ x: 5, y: 8 }, concave)).toBe(false);
  });

  it("selects strokes when any sampled point is inside the region", () => {
    const stroke = makeStroke("stroke", [
      { x: -10, y: -10 },
      { x: 4, y: 4 },
      { x: 20, y: 20 },
    ]);
    const region: SelectionRegion = { type: "rect", bounds: { x: 0, y: 0, width: 10, height: 10 } };

    expect(hitTestStroke(stroke, region)).toBe(true);
    expect(hitTestStroke(makeStroke("miss", [{ x: -1, y: -1 }]), region)).toBe(false);
  });

  it("selects shapes whose bounding boxes intersect each selection type", () => {
    const shape = makeShape("shape", { x: 10, y: 10, width: 10, height: 10 });
    const rect: SelectionRegion = { type: "rect", bounds: { x: 0, y: 0, width: 5, height: 20 } };
    const ellipse: SelectionRegion = { type: "ellipse", bounds: { x: 0, y: 0, width: 20, height: 20 } };
    const lasso: SelectionRegion = {
      type: "lasso",
      bounds: { x: 0, y: 0, width: 20, height: 20 },
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 },
      ],
    };

    expect(hitTestShape(shape, rect)).toBe(true);
    expect(hitTestShape(shape, ellipse)).toBe(true);
    expect(hitTestShape(shape, lasso)).toBe(true);
    expect(hitTestShape(shape, { type: "rect", bounds: { x: -20, y: -20, width: 5, height: 5 } })).toBe(false);
  });

  it("accounts for shape rotation and stroke width when testing bounds", () => {
    const rotatedShape = makeShape("rotated", {
      x: 0,
      y: 0,
      width: 10,
      height: 20,
      rotation: Math.PI / 4,
      strokeWidth: 4,
    });

    expect(hitTestShape(rotatedShape, { type: "rect", bounds: { x: 10, y: 10, width: 2, height: 2 } })).toBe(true);
  });

  it("returns selected document items in document order", () => {
    const strokeHit = makeStroke("stroke-hit", [{ x: 2, y: 2 }]);
    const strokeMiss = makeStroke("stroke-miss", [{ x: 20, y: 20 }]);
    const shapeHit = makeShape("shape-hit", { x: 4, y: 4, width: 2, height: 2 });
    const shapeMiss = makeShape("shape-miss", { x: 30, y: 30, width: 2, height: 2 });
    const doc: SelectionDocumentModel = {
      addStroke: () => undefined,
      getStrokes: () => [strokeHit, strokeMiss],
      getShapes: () => [shapeHit, shapeMiss],
      getAllItems: () => [
        { kind: "shape", item: shapeHit },
        { kind: "stroke", item: strokeMiss },
        { kind: "stroke", item: strokeHit },
        { kind: "shape", item: shapeMiss },
      ],
    };

    const selected = getSelectedItems(doc, { type: "rect", bounds: { x: 0, y: 0, width: 10, height: 10 } });

    expect(selected.map((entry) => `${entry.kind}:${entry.item.id}`)).toEqual([
      "shape:shape-hit",
      "stroke:stroke-hit",
    ]);
  });

  it("falls back to strokes and optional shapes when getAllItems is unavailable", () => {
    const stroke = makeStroke("stroke", [{ x: 2, y: 2 }]);
    const shape = makeShape("shape", { x: 4, y: 4, width: 2, height: 2 });
    const doc: SelectionDocumentModel = {
      addStroke: () => undefined,
      getStrokes: () => [stroke],
      getShapes: () => [shape],
    };

    const selected = getSelectedItems(doc, { type: "rect", bounds: { x: 0, y: 0, width: 10, height: 10 } });

    expect(selected.map((entry) => `${entry.kind}:${entry.item.id}`)).toEqual(["stroke:stroke", "shape:shape"]);
  });
});
