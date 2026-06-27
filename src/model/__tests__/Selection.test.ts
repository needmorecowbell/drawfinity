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
import type { CanvasImage } from "../Image";

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

function makeImage(id: string, overrides: Partial<CanvasImage> = {}): CanvasImage {
  return {
    id,
    src: "data:image/png;base64,iVBORw0KGgo=",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
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

  it("returns correct document items for each selection mode", () => {
    const strokeHit = makeStroke("stroke-hit", [{ x: 5, y: 5 }]);
    const strokeMiss = makeStroke("stroke-miss", [{ x: 40, y: 40 }]);
    const shapeHit = makeShape("shape-hit", { x: 6, y: 6, width: 2, height: 2 });
    const shapeMiss = makeShape("shape-miss", { x: 40, y: 40, width: 2, height: 2 });
    const doc: SelectionDocumentModel = {
      addStroke: () => undefined,
      getStrokes: () => [strokeHit, strokeMiss],
      getShapes: () => [shapeHit, shapeMiss],
      getAllItems: () => [
        { kind: "stroke", item: strokeHit },
        { kind: "shape", item: shapeHit },
        { kind: "stroke", item: strokeMiss },
        { kind: "shape", item: shapeMiss },
      ],
    };
    const regions: SelectionRegion[] = [
      { type: "rect", bounds: { x: 0, y: 0, width: 12, height: 12 } },
      { type: "ellipse", bounds: { x: 0, y: 0, width: 12, height: 12 } },
      {
        type: "lasso",
        bounds: { x: 0, y: 0, width: 12, height: 12 },
        points: [
          { x: 0, y: 0 },
          { x: 12, y: 0 },
          { x: 12, y: 12 },
          { x: 0, y: 12 },
        ],
      },
    ];

    for (const region of regions) {
      expect(getSelectedItems(doc, region).map((entry) => entry.item.id)).toEqual(["stroke-hit", "shape-hit"]);
    }
  });

  it("selects exactly the mixed items overlapping the region and excludes everything outside (delete data-loss guard)", () => {
    // Reproduces the human-test mixed scene (stroke + shape + image) from
    // RC-FIX-01: marquee a subset, and getSelectedItems must return ONLY the
    // overlapping items so a subsequent removeItems(...) can never touch the
    // items the user left unselected.
    const strokeIn = makeStroke("stroke-in", [{ x: 5, y: 5 }]);
    const shapeIn = makeShape("shape-in", { x: 6, y: 6, width: 4, height: 4 });
    const imageIn = makeImage("image-in", { x: 6, y: 6, width: 4, height: 4 });

    const strokeOut = makeStroke("stroke-out", [{ x: 500, y: 500 }]);
    const shapeOut = makeShape("shape-out", { x: 500, y: 500, width: 4, height: 4 });
    const imageOut = makeImage("image-out", { x: 500, y: 500, width: 4, height: 4 });

    const doc: SelectionDocumentModel = {
      addStroke: () => undefined,
      getStrokes: () => [strokeIn, strokeOut],
      getShapes: () => [shapeIn, shapeOut],
      getAllItems: () => [
        { kind: "stroke", item: strokeIn },
        { kind: "shape", item: shapeIn },
        { kind: "image", item: imageIn },
        { kind: "stroke", item: strokeOut },
        { kind: "shape", item: shapeOut },
        { kind: "image", item: imageOut },
      ],
    };

    const selected = getSelectedItems(doc, { type: "rect", bounds: { x: 0, y: 0, width: 12, height: 12 } });

    expect(selected.map((entry) => `${entry.kind}:${entry.item.id}`)).toEqual([
      "stroke:stroke-in",
      "shape:shape-in",
      "image:image-in",
    ]);
    // Belt-and-suspenders: no out-of-region id leaks into the selection.
    const selectedIds = new Set(selected.map((entry) => entry.item.id));
    for (const id of ["stroke-out", "shape-out", "image-out"]) {
      expect(selectedIds.has(id)).toBe(false);
    }
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
