import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Y from "yjs";
import { UndoManager } from "../UndoManager";
import { strokeToYMap, yMapToStroke } from "../StrokeAdapter";
import { Stroke } from "../../model/Stroke";

function makeStroke(id: string): Stroke {
  return {
    id,
    color: "#000000",
    width: 2,
    timestamp: Date.now(),
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 10, pressure: 0.5 },
    ],
  };
}

describe("UndoManager", () => {
  let doc: Y.Doc;
  let strokes: Y.Array<Y.Map<unknown>>;
  let undoManager: UndoManager;

  beforeEach(() => {
    doc = new Y.Doc();
    strokes = doc.getArray<Y.Map<unknown>>("strokes");
    undoManager = new UndoManager(strokes);
  });

  it("reports canUndo/canRedo correctly when empty", () => {
    expect(undoManager.canUndo()).toBe(false);
    expect(undoManager.canRedo()).toBe(false);
  });

  it("undo reverts the last local stroke", () => {
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });
    expect(strokes.length).toBe(1);
    expect(undoManager.canUndo()).toBe(true);

    undoManager.undo();
    expect(strokes.length).toBe(0);
    expect(undoManager.canUndo()).toBe(false);
  });

  it("redo restores an undone stroke", () => {
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });

    undoManager.undo();
    expect(strokes.length).toBe(0);
    expect(undoManager.canRedo()).toBe(true);

    undoManager.redo();
    expect(strokes.length).toBe(1);
    expect(yMapToStroke(strokes.get(0)).id).toBe("s1");
  });

  it("multiple undos revert in reverse order", () => {
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s2"))]);
    });
    expect(strokes.length).toBe(2);

    undoManager.undo();
    expect(strokes.length).toBe(1);
    expect(yMapToStroke(strokes.get(0)).id).toBe("s1");

    undoManager.undo();
    expect(strokes.length).toBe(0);
  });

  it("undo does not affect strokes from a different origin", () => {
    // Simulate a remote user adding a stroke via a separate doc
    const remoteDoc = new Y.Doc();
    const remoteStrokes = remoteDoc.getArray<Y.Map<unknown>>("strokes");

    // Remote user adds a stroke
    remoteDoc.transact(() => {
      remoteStrokes.push([strokeToYMap(makeStroke("remote-1"))]);
    });

    // Sync remote → local (use 'remote' origin so UndoManager ignores it)
    const remoteUpdate = Y.encodeStateAsUpdate(remoteDoc);
    Y.applyUpdate(doc, remoteUpdate, "remote");
    expect(strokes.length).toBe(1);

    // Local user adds a stroke
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("local-1"))]);
    });
    expect(strokes.length).toBe(2);

    // Undo should only revert the local stroke
    undoManager.undo();
    expect(strokes.length).toBe(1);
    expect(yMapToStroke(strokes.get(0)).id).toBe("remote-1");

    // Undo again — nothing local left to undo
    undoManager.undo();
    expect(strokes.length).toBe(1); // remote stroke persists
  });

  it("clear removes all undo/redo history", () => {
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });
    expect(undoManager.canUndo()).toBe(true);

    undoManager.clear();
    expect(undoManager.canUndo()).toBe(false);
    expect(undoManager.canRedo()).toBe(false);
  });

  it("onStackChange fires when stack changes", () => {
    const callback = vi.fn();
    undoManager.onStackChange(callback);

    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });

    // Stack-item-added should have fired
    expect(callback).toHaveBeenCalled();
  });

  describe("beginBatch / endBatch", () => {
    it("merges multiple transactions into a single undo step", () => {
      undoManager.beginBatch();

      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s1"))]);
      });
      doc.transact(() => {
        strokes.delete(0, 1);
      });
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s2"))]);
      });

      undoManager.endBatch();

      expect(strokes.length).toBe(1);
      expect(yMapToStroke(strokes.get(0)).id).toBe("s2");

      // Single undo should revert all three operations
      undoManager.undo();
      expect(strokes.length).toBe(0);
      expect(undoManager.canUndo()).toBe(false);
    });

    it("erase 3 strokes in one gesture, undo once restores all 3", () => {
      // Add 3 strokes individually (each is its own undo step)
      for (const id of ["s1", "s2", "s3"]) {
        doc.transact(() => {
          strokes.push([strokeToYMap(makeStroke(id))]);
        });
      }
      expect(strokes.length).toBe(3);

      // Simulate eraser gesture: batch removal of all 3
      undoManager.beginBatch();
      for (let i = strokes.length - 1; i >= 0; i--) {
        doc.transact(() => {
          strokes.delete(i, 1);
        });
      }
      undoManager.endBatch();

      expect(strokes.length).toBe(0);

      // Single undo restores all 3 strokes
      undoManager.undo();
      expect(strokes.length).toBe(3);
    });

    it("does not merge operations after endBatch", () => {
      undoManager.beginBatch();
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s1"))]);
      });
      undoManager.endBatch();

      // This should be a separate undo step
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s2"))]);
      });

      expect(strokes.length).toBe(2);

      undoManager.undo();
      expect(strokes.length).toBe(1);
      expect(yMapToStroke(strokes.get(0)).id).toBe("s1");
    });

    it("supports nested batches — only outermost takes effect", () => {
      undoManager.beginBatch();
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s1"))]);
      });

      undoManager.beginBatch(); // nested
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s2"))]);
      });
      undoManager.endBatch(); // inner — should NOT restore captureTimeout yet

      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s3"))]);
      });
      undoManager.endBatch(); // outer — now batch ends

      expect(strokes.length).toBe(3);

      // All 3 should be one undo step
      undoManager.undo();
      expect(strokes.length).toBe(0);
    });

    it("endBatch without beginBatch is a no-op", () => {
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s1"))]);
      });
      // Should not throw
      undoManager.endBatch();
      expect(strokes.length).toBe(1);
    });
  });
});
