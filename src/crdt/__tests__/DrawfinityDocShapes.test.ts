import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Y from "yjs";
import { DrawfinityDoc } from "../DrawfinityDoc";
import { UndoManager } from "../UndoManager";
import { Stroke } from "../../model/Stroke";
import { Shape } from "../../model/Shape";
import { CanvasImage } from "../../model/Image";
import { getSelectedItems, SelectionRegion } from "../../model/Selection";

function makeStroke(id: string, timestamp = 1000): Stroke {
  return {
    id,
    color: "#ff0000",
    width: 3,
    timestamp,
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 5, y: 5, pressure: 0.7 },
    ],
  };
}

function makeImage(id: string, x: number, y: number, timestamp = 3000): CanvasImage {
  return {
    id,
    src: "data:image/png;base64,iVBORw0KGgo=",
    x,
    y,
    width: 8,
    height: 8,
    rotation: 0,
    opacity: 1,
    timestamp,
  };
}

function makeShape(id: string, type: Shape["type"] = "rectangle", timestamp = 2000): Shape {
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
    timestamp,
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
    it("returns all items in timestamp order", () => {
      doc.addStroke(makeStroke("s1", 1000));
      doc.addShape(makeShape("sh1", "rectangle", 2000));
      doc.addStroke(makeStroke("s2", 3000));
      doc.addShape(makeShape("sh2", "ellipse", 4000));

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

  describe("selection item actions", () => {
    it("removes selected strokes and shapes in one undo step", () => {
      doc.addStroke(makeStroke("s1"));
      doc.addShape(makeShape("sh1"));
      doc.addStroke(makeStroke("s2"));
      const undoManager = new UndoManager(doc.getStrokesArray());
      const selected = doc.getAllItems().filter((entry) => entry.item.id !== "s2");

      expect(doc.removeItems(selected)).toBe(2);
      expect(doc.getAllItems().map((entry) => entry.item.id)).toEqual(["s2"]);
      expect(undoManager.getRawUndoManager().undoStack).toHaveLength(1);

      undoManager.undo();
      // getAllItems() is timestamp-ordered: s1/s2 default to 1000, sh1 to 2000,
      // so the restored order is [s1, s2, sh1] (stable sort keeps s1 before s2).
      expect(doc.getAllItems().map((entry) => entry.item.id)).toEqual(["s1", "s2", "sh1"]);
      expect(undoManager.canUndo()).toBe(false);
    });

    it("deletes ONLY the marquee-selected mixed items, never the unselected ones (RC-FIX-01 data-loss guard)", () => {
      // End-to-end reproduction of the human-reported data-loss path:
      // mixed stroke + shape + image scene, marquee a subset, then run the
      // exact deleteActiveSelection() flow (getSelectedItems -> removeItems).
      // Items left outside the marquee MUST survive.
      const region: SelectionRegion = { type: "rect", bounds: { x: 0, y: 0, width: 20, height: 20 } };

      // Inside the marquee region.
      const strokeIn = makeStroke("stroke-in");
      strokeIn.points = [{ x: 5, y: 5, pressure: 0.5 }];
      const shapeIn = makeShape("shape-in");
      shapeIn.x = 10;
      shapeIn.y = 10;
      shapeIn.width = 4;
      shapeIn.height = 4;
      const imageIn = makeImage("image-in", 10, 10);

      // Far outside the marquee region — these must NOT be deleted.
      const strokeOut = makeStroke("stroke-out");
      strokeOut.points = [{ x: 500, y: 500, pressure: 0.5 }];
      const shapeOut = makeShape("shape-out");
      shapeOut.x = 500;
      shapeOut.y = 500;
      const imageOut = makeImage("image-out", 500, 500);

      doc.addStroke(strokeIn);
      doc.addShape(shapeIn);
      doc.addImage(imageIn);
      doc.addStroke(strokeOut);
      doc.addShape(shapeOut);
      doc.addImage(imageOut);

      const selected = getSelectedItems(doc, region);
      expect(selected.map((entry) => entry.item.id).sort()).toEqual(["image-in", "shape-in", "stroke-in"]);

      expect(doc.removeItems(selected)).toBe(3);

      // The three unselected, out-of-region items survive — no data loss.
      expect(doc.getAllItems().map((entry) => entry.item.id).sort()).toEqual([
        "image-out",
        "shape-out",
        "stroke-out",
      ]);
    });

    it("never mass-deletes items that lack an id when a selected entry has no id (RC-FIX-01 data-loss root cause)", () => {
      // Root-cause class for the human-reported "Delete erases everything
      // outside the selection": removeItems() keys on item.id via a Set. If a
      // selected entry's id is undefined/missing, a naive Set([undefined])
      // matches EVERY id-less item in the document and wipes items the user
      // never selected. Guard: entries without a usable id must match nothing.
      const yDoc = doc.getDoc();
      yDoc.transact(() => {
        const arr = doc.getStrokesArray();
        for (const tag of ["selected-no-id", "bystander-no-id"]) {
          const yMap = new Y.Map<unknown>();
          // Intentionally NO "id" field set — simulates a legacy/peer item.
          yMap.set("marker", tag);
          yMap.set("color", "#000000");
          yMap.set("width", 2);
          yMap.set("timestamp", 500);
          const yPoints = new Y.Array<Y.Map<number>>();
          const pt = new Y.Map<number>();
          pt.set("x", 1);
          pt.set("y", 1);
          pt.set("pressure", 0.5);
          yPoints.push([pt]);
          yMap.set("points", yPoints);
          arr.push([yMap]);
        }
      });

      // Simulate selecting only ONE of the two id-less items (its id reads back
      // as undefined). A correct removeItems must NOT also erase the bystander.
      const selectedWithoutId = { kind: "stroke" as const, item: { id: undefined as unknown as string } as Stroke };

      const removed = doc.removeItems([selectedWithoutId]);

      // The bystander id-less item must still exist — no mass deletion.
      expect(doc.getStrokes()).toHaveLength(2);
      expect(removed).toBe(0);
    });

    it("translates selected stroke points and shape centers", () => {
      doc.addStroke(makeStroke("s1"));
      doc.addShape(makeShape("sh1"));
      const selected = doc.getAllItems();

      expect(doc.translateItems(selected, 10, -5)).toBe(2);

      expect(doc.getStrokes()[0].points).toEqual([
        { x: 10, y: -5, pressure: 0.5 },
        { x: 15, y: 0, pressure: 0.7 },
      ]);
      expect(doc.getShapes()[0]).toEqual(expect.objectContaining({ x: 110, y: 195 }));
    });

    it("duplicates selected items with new ids and offset coordinates", () => {
      doc.addStroke(makeStroke("s1"));
      doc.addShape(makeShape("sh1"));
      const clones = doc.duplicateItems(doc.getAllItems(), 20, 30);

      expect(clones).toHaveLength(2);
      expect(clones[0].kind).toBe("stroke");
      expect(clones[0].item.id).not.toBe("s1");
      expect(clones[1].kind).toBe("shape");
      expect(clones[1].item.id).not.toBe("sh1");

      const items = doc.getAllItems();
      expect(items).toHaveLength(4);
      expect(doc.getStrokes()[1].points).toEqual([
        { x: 20, y: 30, pressure: 0.5 },
        { x: 25, y: 35, pressure: 0.7 },
      ]);
      expect(doc.getShapes()[1]).toEqual(expect.objectContaining({ x: 120, y: 230 }));
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
