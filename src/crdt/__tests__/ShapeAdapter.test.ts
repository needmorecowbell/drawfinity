import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { shapeToYMap, yMapToShape } from "../ShapeAdapter";
import { Shape } from "../../model/Shape";

function makeRectangle(id = "rect-1"): Shape {
  return {
    id,
    type: "rectangle",
    x: 100,
    y: 200,
    width: 50,
    height: 30,
    rotation: 0,
    strokeColor: "#ff0000",
    strokeWidth: 2,
    fillColor: "#00ff00",
    opacity: 0.8,
    timestamp: 1000,
  };
}

function makeStar(id = "star-1"): Shape {
  return {
    id,
    type: "star",
    x: 50,
    y: 50,
    width: 80,
    height: 80,
    rotation: Math.PI / 4,
    strokeColor: "#0000ff",
    strokeWidth: 1,
    fillColor: null,
    opacity: 1.0,
    sides: 5,
    starInnerRadius: 0.4,
    timestamp: 2000,
  };
}

function makePolygon(id = "poly-1"): Shape {
  return {
    id,
    type: "polygon",
    x: 0,
    y: 0,
    width: 60,
    height: 60,
    rotation: 0,
    strokeColor: "#333333",
    strokeWidth: 3,
    fillColor: null,
    opacity: 1.0,
    sides: 6,
    timestamp: 3000,
  };
}

describe("ShapeAdapter", () => {
  describe("shapeToYMap / yMapToShape round-trip", () => {
    it("round-trips a rectangle", () => {
      const shape = makeRectangle();
      const doc = new Y.Doc();
      doc.transact(() => {
        const arr = doc.getArray<Y.Map<unknown>>("test");
        arr.push([shapeToYMap(shape)]);
      });
      const yMap = doc.getArray<Y.Map<unknown>>("test").get(0);
      const result = yMapToShape(yMap);

      expect(result).toEqual(shape);
    });

    it("round-trips a star with optional fields", () => {
      const shape = makeStar();
      const doc = new Y.Doc();
      doc.transact(() => {
        const arr = doc.getArray<Y.Map<unknown>>("test");
        arr.push([shapeToYMap(shape)]);
      });
      const yMap = doc.getArray<Y.Map<unknown>>("test").get(0);
      const result = yMapToShape(yMap);

      expect(result).toEqual(shape);
      expect(result.sides).toBe(5);
      expect(result.starInnerRadius).toBe(0.4);
    });

    it("round-trips an ellipse", () => {
      const shape: Shape = {
        id: "ellipse-1",
        type: "ellipse",
        x: 30,
        y: 40,
        width: 120,
        height: 80,
        rotation: Math.PI / 6,
        strokeColor: "#00ff00",
        strokeWidth: 3,
        fillColor: "#ff00ff",
        opacity: 0.6,
        timestamp: 1500,
      };
      const doc = new Y.Doc();
      doc.transact(() => {
        const arr = doc.getArray<Y.Map<unknown>>("test");
        arr.push([shapeToYMap(shape)]);
      });
      const yMap = doc.getArray<Y.Map<unknown>>("test").get(0);
      const result = yMapToShape(yMap);

      expect(result).toEqual(shape);
    });

    it("round-trips a polygon without starInnerRadius", () => {
      const shape = makePolygon();
      const doc = new Y.Doc();
      doc.transact(() => {
        const arr = doc.getArray<Y.Map<unknown>>("test");
        arr.push([shapeToYMap(shape)]);
      });
      const yMap = doc.getArray<Y.Map<unknown>>("test").get(0);
      const result = yMapToShape(yMap);

      expect(result).toEqual(shape);
      expect(result.sides).toBe(6);
      expect(result.starInnerRadius).toBeUndefined();
    });

    it("preserves null fillColor", () => {
      const shape = makeStar();
      expect(shape.fillColor).toBeNull();

      const doc = new Y.Doc();
      doc.transact(() => {
        const arr = doc.getArray<Y.Map<unknown>>("test");
        arr.push([shapeToYMap(shape)]);
      });
      const yMap = doc.getArray<Y.Map<unknown>>("test").get(0);
      const result = yMapToShape(yMap);

      expect(result.fillColor).toBeNull();
    });

    it("sets type field to 'shape' in Y.Map", () => {
      const shape = makeRectangle();
      const doc = new Y.Doc();
      doc.transact(() => {
        const arr = doc.getArray<Y.Map<unknown>>("test");
        arr.push([shapeToYMap(shape)]);
      });
      const yMap = doc.getArray<Y.Map<unknown>>("test").get(0);

      expect(yMap.get("type")).toBe("shape");
    });
  });
});
