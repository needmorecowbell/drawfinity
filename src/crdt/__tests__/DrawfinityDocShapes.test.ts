import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Y from "yjs";
import { DrawfinityDoc } from "../DrawfinityDoc";
import { Stroke } from "../../model/Stroke";
import { Shape } from "../../model/Shape";

function makeStroke(id: string): Stroke {
  return {
    id,
    color: "#ff0000",
    width: 3,
    timestamp: 1000,
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 5, y: 5, pressure: 0.7 },
    ],
  };
}

function makeShape(id: string, type: Shape["type"] = "rectangle"): Shape {
  return {
    id,
    type,
    x: 100,
    y: 200,
    width: 50,
    height: 30,
    rotation: 0,
    strokeColor: "#0000ff",
    strokeWidth: 2,
    fillColor: "#00ff00",
    opacity: 0.9,
    timestamp: 2000,
  };
}

describe("DrawfinityDoc — shape support", () => {
  let doc: DrawfinityDoc;

  beforeEach(() => {
    doc = new DrawfinityDoc();
  });

  it("starts with no shapes", () => {
    expect(doc.getShapes()).toEqual([]);
  });

  it("adds and retrieves a shape", () => {
    const shape = makeShape("sh1");
    doc.addShape(shape);

    const shapes = doc.getShapes();
    expect(shapes).toHaveLength(1);
    expect(shapes[0].id).toBe("sh1");
    expect(shapes[0].type).toBe("rectangle");
    expect(shapes[0].fillColor).toBe("#00ff00");
  });

  it("removes a shape by ID", () => {
    doc.addShape(makeShape("sh1"));
    doc.addShape(makeShape("sh2"));

    const removed = doc.removeShape("sh1");
    expect(removed).toBe(true);
    expect(doc.getShapes().map((s) => s.id)).toEqual(["sh2"]);
  });

  it("returns false when removing a non-existent shape", () => {
    expect(doc.removeShape("nonexistent")).toBe(false);
  });

  describe("getStrokes() filters out shapes", () => {
    it("only returns strokes when mixed with shapes", () => {
      doc.addStroke(makeStroke("s1"));
      doc.addShape(makeShape("sh1"));
      doc.addStroke(makeStroke("s2"));

      const strokes = doc.getStrokes();
      expect(strokes).toHaveLength(2);
      expect(strokes.map((s) => s.id)).toEqual(["s1", "s2"]);
    });

    it("returns strokes for items without type field (backward compat)", () => {
      // Simulate a legacy item without a "type" field
      const yDoc = doc.getDoc();
      yDoc.transact(() => {
        const arr = doc.getStrokesArray();
        const yMap = new Y.Map<unknown>();
        yMap.set("id", "legacy-1");
        yMap.set("color", "#000000");
        yMap.set("width", 2);
        yMap.set("opacity", 1.0);
        yMap.set("timestamp", 500);
        const yPoints = new Y.Array<Y.Map<number>>();
        const pt = new Y.Map<number>();
        pt.set("x", 1);
        pt.set("y", 1);
        pt.set("pressure", 0.5);
        yPoints.push([pt]);
        yMap.set("points", yPoints);
        // No "type" field set — should be treated as stroke
        arr.push([yMap]);
      });

      const strokes = doc.getStrokes();
      expect(strokes).toHaveLength(1);
      expect(strokes[0].id).toBe("legacy-1");
    });
  });

  describe("getAllItems()", () => {
    it("returns all items in document order", () => {
      doc.addStroke(makeStroke("s1"));
      doc.addShape(makeShape("sh1"));
      doc.addStroke(makeStroke("s2"));
      doc.addShape(makeShape("sh2", "ellipse"));

      const items = doc.getAllItems();
      expect(items).toHaveLength(4);
      expect(items[0]).toEqual({ kind: "stroke", item: expect.objectContaining({ id: "s1" }) });
      expect(items[1]).toEqual({ kind: "shape", item: expect.objectContaining({ id: "sh1" }) });
      expect(items[2]).toEqual({ kind: "stroke", item: expect.objectContaining({ id: "s2" }) });
      expect(items[3]).toEqual({ kind: "shape", item: expect.objectContaining({ id: "sh2", type: "ellipse" }) });
    });

    it("returns empty array for empty doc", () => {
      expect(doc.getAllItems()).toEqual([]);
    });
  });

  describe("change notifications", () => {
    it("fires onStrokesChanged when a shape is added", () => {
      const callback = vi.fn();
      doc.onStrokesChanged(callback);

      doc.addShape(makeShape("sh1"));
      expect(callback).toHaveBeenCalled();
    });

    it("fires onStrokesChanged when a shape is removed", () => {
      doc.addShape(makeShape("sh1"));
      const callback = vi.fn();
      doc.onStrokesChanged(callback);

      doc.removeShape("sh1");
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("undo/redo with shapes", () => {
    it("undoes shape addition", () => {
      const um = new Y.UndoManager(doc.getStrokesArray());

      doc.addShape(makeShape("sh1"));
      expect(doc.getShapes()).toHaveLength(1);

      um.undo();
      expect(doc.getShapes()).toHaveLength(0);
    });

    it("redoes shape addition after undo", () => {
      const um = new Y.UndoManager(doc.getStrokesArray());

      doc.addShape(makeShape("sh1"));
      um.undo();
      expect(doc.getShapes()).toHaveLength(0);

      um.redo();
      expect(doc.getShapes()).toHaveLength(1);
      expect(doc.getShapes()[0].id).toBe("sh1");
    });

    it("undoes shape removal", () => {
      doc.addShape(makeShape("sh1"));
      doc.addShape(makeShape("sh2"));

      const um = new Y.UndoManager(doc.getStrokesArray());

      doc.removeShape("sh1");
      expect(doc.getShapes().map((s) => s.id)).toEqual(["sh2"]);

      um.undo();
      expect(doc.getShapes().map((s) => s.id)).toEqual(["sh1", "sh2"]);
    });

    it("undo/redo works with mixed strokes and shapes", () => {
      const um = new Y.UndoManager(doc.getStrokesArray(), { captureTimeout: 0 });

      doc.addStroke(makeStroke("s1"));
      doc.addShape(makeShape("sh1"));

      expect(doc.getAllItems()).toHaveLength(2);

      // Yjs may batch rapid operations into one undo step, so undo until empty
      um.undo();
      um.undo();
      expect(doc.getAllItems()).toHaveLength(0);

      // Redo all
      um.redo();
      um.redo();
      expect(doc.getAllItems()).toHaveLength(2);
      expect(doc.getStrokes()).toHaveLength(1);
      expect(doc.getShapes()).toHaveLength(1);
    });
  });

  describe("CRDT sync with shapes", () => {
    it("syncs shapes between two docs", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      doc1.addShape(makeShape("from-doc1"));

      const update = Y.encodeStateAsUpdate(doc1.getDoc());
      Y.applyUpdate(doc2.getDoc(), update);

      expect(doc2.getShapes()).toHaveLength(1);
      expect(doc2.getShapes()[0].id).toBe("from-doc1");
    });

    it("syncs mixed strokes and shapes", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      doc1.addStroke(makeStroke("s1"));
      doc1.addShape(makeShape("sh1"));

      const update = Y.encodeStateAsUpdate(doc1.getDoc());
      Y.applyUpdate(doc2.getDoc(), update);

      expect(doc2.getStrokes()).toHaveLength(1);
      expect(doc2.getShapes()).toHaveLength(1);
      expect(doc2.getAllItems()).toHaveLength(2);
    });
  });
});
