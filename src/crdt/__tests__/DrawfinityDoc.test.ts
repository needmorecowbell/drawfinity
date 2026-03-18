import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Y from "yjs";
import { DrawfinityDoc } from "../DrawfinityDoc";
import { Stroke } from "../../model/Stroke";

function makeStroke(id: string): Stroke {
  return {
    id,
    color: "#ff0000",
    width: 3,
    timestamp: 1000,
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 5, y: 5, pressure: 0.7 },
      { x: 10, y: 10, pressure: 1.0 },
    ],
  };
}

describe("DrawfinityDoc", () => {
  let drawDoc: DrawfinityDoc;

  beforeEach(() => {
    drawDoc = new DrawfinityDoc();
  });

  it("starts with no strokes", () => {
    expect(drawDoc.getStrokes()).toEqual([]);
  });

  it("adds a stroke and reads it back", () => {
    const stroke = makeStroke("s1");
    drawDoc.addStroke(stroke);

    const strokes = drawDoc.getStrokes();
    expect(strokes).toHaveLength(1);
    expect(strokes[0].id).toBe("s1");
    expect(strokes[0].color).toBe("#ff0000");
    expect(strokes[0].width).toBe(3);
    expect(strokes[0].timestamp).toBe(1000);
    expect(strokes[0].points).toHaveLength(3);
    expect(strokes[0].points[2]).toEqual({ x: 10, y: 10, pressure: 1.0 });
  });

  it("adds multiple strokes and reads them back in order", () => {
    drawDoc.addStroke(makeStroke("s1"));
    drawDoc.addStroke(makeStroke("s2"));
    drawDoc.addStroke(makeStroke("s3"));

    const strokes = drawDoc.getStrokes();
    expect(strokes).toHaveLength(3);
    expect(strokes.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("onStrokesChanged fires when a stroke is added", () => {
    const callback = vi.fn();
    drawDoc.onStrokesChanged(callback);

    drawDoc.addStroke(makeStroke("s1"));
    expect(callback).toHaveBeenCalled();
  });

  it("onStrokesChanged fires when strokes are modified via CRDT", () => {
    const callback = vi.fn();
    drawDoc.onStrokesChanged(callback);

    // Add two strokes — should fire for each
    drawDoc.addStroke(makeStroke("s1"));
    drawDoc.addStroke(makeStroke("s2"));
    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("exposes the underlying Y.Doc via getDoc()", () => {
    const doc = drawDoc.getDoc();
    expect(doc).toBeInstanceOf(Y.Doc);
  });

  it("exposes the strokes Y.Array via getStrokesArray()", () => {
    drawDoc.addStroke(makeStroke("s1"));
    const arr = drawDoc.getStrokesArray();
    expect(arr.length).toBe(1);
  });

  it("accepts an existing Y.Doc in the constructor", () => {
    const doc = new Y.Doc();
    // Pre-populate via a separate DrawfinityDoc
    const other = new DrawfinityDoc(doc);
    other.addStroke(makeStroke("pre-existing"));

    // New DrawfinityDoc wrapping same Y.Doc sees existing data
    const drawDoc2 = new DrawfinityDoc(doc);
    expect(drawDoc2.getStrokes()).toHaveLength(1);
    expect(drawDoc2.getStrokes()[0].id).toBe("pre-existing");
  });

  describe("two independent Y.Docs syncing via state updates", () => {
    it("syncs strokes between two docs", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      // Doc1 adds a stroke
      doc1.addStroke(makeStroke("from-doc1"));

      // Sync doc1 → doc2
      const update1 = Y.encodeStateAsUpdate(doc1.getDoc());
      Y.applyUpdate(doc2.getDoc(), update1);

      expect(doc2.getStrokes()).toHaveLength(1);
      expect(doc2.getStrokes()[0].id).toBe("from-doc1");

      // Doc2 adds a stroke
      doc2.addStroke(makeStroke("from-doc2"));

      // Sync doc2 → doc1
      const update2 = Y.encodeStateAsUpdate(doc2.getDoc());
      Y.applyUpdate(doc1.getDoc(), update2);

      // Both docs should have both strokes
      expect(doc1.getStrokes()).toHaveLength(2);
      expect(doc2.getStrokes()).toHaveLength(2);

      const ids1 = doc1.getStrokes().map((s) => s.id).sort();
      const ids2 = doc2.getStrokes().map((s) => s.id).sort();
      expect(ids1).toEqual(["from-doc1", "from-doc2"]);
      expect(ids2).toEqual(["from-doc1", "from-doc2"]);
    });

    it("handles concurrent additions from both docs", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      // Both add strokes before any sync
      doc1.addStroke(makeStroke("concurrent-1"));
      doc2.addStroke(makeStroke("concurrent-2"));

      // Cross-sync
      const update1 = Y.encodeStateAsUpdate(doc1.getDoc());
      const update2 = Y.encodeStateAsUpdate(doc2.getDoc());
      Y.applyUpdate(doc2.getDoc(), update1);
      Y.applyUpdate(doc1.getDoc(), update2);

      // Both should converge to the same set
      expect(doc1.getStrokes()).toHaveLength(2);
      expect(doc2.getStrokes()).toHaveLength(2);

      const ids1 = doc1.getStrokes().map((s) => s.id).sort();
      const ids2 = doc2.getStrokes().map((s) => s.id).sort();
      expect(ids1).toEqual(ids2);
    });

    it("incremental updates sync correctly", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      // Initial sync (empty)
      const sv = Y.encodeStateVector(doc2.getDoc());

      doc1.addStroke(makeStroke("inc-1"));

      // Use incremental diff
      const diff = Y.encodeStateAsUpdate(doc1.getDoc(), sv);
      Y.applyUpdate(doc2.getDoc(), diff);

      expect(doc2.getStrokes()).toHaveLength(1);
      expect(doc2.getStrokes()[0].id).toBe("inc-1");
    });
  });
});
