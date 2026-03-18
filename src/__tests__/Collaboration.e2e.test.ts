/**
 * End-to-end collaboration tests.
 *
 * Simulates two clients sharing a Yjs document through state updates,
 * mirroring what the Rust WebSocket server does as a relay. This validates
 * that the full CRDT + DrawfinityDoc + UndoManager stack works correctly
 * in a multi-user scenario.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as Y from "yjs";
import { DrawfinityDoc } from "../crdt/DrawfinityDoc";
import { UndoManager } from "../crdt/UndoManager";
import { Stroke } from "../model/Stroke";

/** Helper: create a stroke with distinct data per client. */
function makeStroke(
  id: string,
  overrides?: Partial<Stroke>,
): Stroke {
  return {
    id,
    color: "#000000",
    width: 3,
    opacity: 1.0,
    timestamp: Date.now(),
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 10, pressure: 0.7 },
      { x: 20, y: 20, pressure: 1.0 },
    ],
    ...overrides,
  };
}

/**
 * Sync helper: sends all updates from `src` to `dst`, simulating
 * what the server relay does over WebSocket.
 */
function syncDocs(src: DrawfinityDoc, dst: DrawfinityDoc): void {
  const sv = Y.encodeStateVector(dst.getDoc());
  const update = Y.encodeStateAsUpdate(src.getDoc(), sv);
  Y.applyUpdate(dst.getDoc(), update, "remote");
}

/** Bidirectional sync: both docs exchange all state. */
function syncBoth(a: DrawfinityDoc, b: DrawfinityDoc): void {
  syncDocs(a, b);
  syncDocs(b, a);
}

describe("Real-time collaboration end-to-end", () => {
  let clientA: DrawfinityDoc;
  let clientB: DrawfinityDoc;
  let undoA: UndoManager;
  let undoB: UndoManager;

  beforeEach(() => {
    clientA = new DrawfinityDoc();
    clientB = new DrawfinityDoc();
    undoA = new UndoManager(clientA.getStrokesArray());
    undoB = new UndoManager(clientB.getStrokesArray());
  });

  describe("stroke synchronization", () => {
    it("a stroke drawn on client A appears on client B after sync", () => {
      clientA.addStroke(makeStroke("a1", { color: "#ff0000" }));

      syncDocs(clientA, clientB);

      const bStrokes = clientB.getStrokes();
      expect(bStrokes).toHaveLength(1);
      expect(bStrokes[0].id).toBe("a1");
      expect(bStrokes[0].color).toBe("#ff0000");
      expect(bStrokes[0].points).toHaveLength(3);
    });

    it("strokes drawn on client B appear on client A after sync", () => {
      clientB.addStroke(makeStroke("b1", { color: "#00ff00", width: 5 }));

      syncDocs(clientB, clientA);

      const aStrokes = clientA.getStrokes();
      expect(aStrokes).toHaveLength(1);
      expect(aStrokes[0].id).toBe("b1");
      expect(aStrokes[0].color).toBe("#00ff00");
      expect(aStrokes[0].width).toBe(5);
    });

    it("both users drawing simultaneously converge to the same state", () => {
      // Both clients draw concurrently (before sync)
      clientA.addStroke(makeStroke("a1"));
      clientA.addStroke(makeStroke("a2"));
      clientB.addStroke(makeStroke("b1"));
      clientB.addStroke(makeStroke("b2"));

      // Bidirectional sync
      syncBoth(clientA, clientB);

      // Both should have all 4 strokes
      const idsA = clientA.getStrokes().map((s) => s.id).sort();
      const idsB = clientB.getStrokes().map((s) => s.id).sort();
      expect(idsA).toEqual(["a1", "a2", "b1", "b2"]);
      expect(idsA).toEqual(idsB);
    });

    it("stroke opacity syncs correctly", () => {
      clientA.addStroke(makeStroke("highlight", { opacity: 0.3 }));

      syncDocs(clientA, clientB);

      expect(clientB.getStrokes()[0].opacity).toBe(0.3);
    });

    it("many rapid strokes sync without data loss", () => {
      for (let i = 0; i < 50; i++) {
        clientA.addStroke(makeStroke(`rapid-${i}`));
      }

      syncDocs(clientA, clientB);

      expect(clientB.getStrokes()).toHaveLength(50);
    });
  });

  describe("undo isolation between clients", () => {
    it("undo in client A does not affect strokes drawn by client B", () => {
      // Client A draws
      clientA.addStroke(makeStroke("a1"));
      syncBoth(clientA, clientB);

      // Client B draws
      clientB.addStroke(makeStroke("b1"));
      syncBoth(clientA, clientB);

      // Both see 2 strokes
      expect(clientA.getStrokes()).toHaveLength(2);
      expect(clientB.getStrokes()).toHaveLength(2);

      // Client A undoes — should only remove a1
      undoA.undo();
      syncBoth(clientA, clientB);

      // Client A's undo removed a1, but b1 survives
      const idsA = clientA.getStrokes().map((s) => s.id);
      expect(idsA).toEqual(["b1"]);

      // Client B also sees only b1 after sync
      const idsB = clientB.getStrokes().map((s) => s.id);
      expect(idsB).toEqual(["b1"]);
    });

    it("undo in client B does not affect strokes drawn by client A", () => {
      clientA.addStroke(makeStroke("a1"));
      syncBoth(clientA, clientB);

      clientB.addStroke(makeStroke("b1"));
      syncBoth(clientA, clientB);

      // Client B undoes — removes only b1
      undoB.undo();
      syncBoth(clientA, clientB);

      expect(clientA.getStrokes().map((s) => s.id)).toEqual(["a1"]);
      expect(clientB.getStrokes().map((s) => s.id)).toEqual(["a1"]);
    });

    it("redo after undo restores only local stroke", () => {
      clientA.addStroke(makeStroke("a1"));
      clientB.addStroke(makeStroke("b1"));
      syncBoth(clientA, clientB);

      undoA.undo();
      syncBoth(clientA, clientB);
      expect(clientA.getStrokes().map((s) => s.id)).toEqual(["b1"]);

      undoA.redo();
      syncBoth(clientA, clientB);

      const idsA = clientA.getStrokes().map((s) => s.id).sort();
      expect(idsA).toEqual(["a1", "b1"]);
    });
  });

  describe("eraser collaboration", () => {
    it("erasing a stroke on one client removes it on the other", () => {
      clientA.addStroke(makeStroke("a1"));
      clientA.addStroke(makeStroke("a2"));
      syncBoth(clientA, clientB);

      // Client B erases a1
      clientB.removeStroke("a1");
      syncBoth(clientA, clientB);

      expect(clientA.getStrokes().map((s) => s.id)).toEqual(["a2"]);
      expect(clientB.getStrokes().map((s) => s.id)).toEqual(["a2"]);
    });

    it("concurrent erase and draw converge correctly", () => {
      clientA.addStroke(makeStroke("s1"));
      syncBoth(clientA, clientB);

      // Client A draws a new stroke while client B erases s1
      clientA.addStroke(makeStroke("s2"));
      clientB.removeStroke("s1");

      syncBoth(clientA, clientB);

      // Both should see only s2
      const idsA = clientA.getStrokes().map((s) => s.id);
      const idsB = clientB.getStrokes().map((s) => s.id);
      expect(idsA).toEqual(["s2"]);
      expect(idsA).toEqual(idsB);
    });
  });

  describe("disconnect and reconnect", () => {
    it("state is preserved when a client reconnects", () => {
      // Both clients draw and sync
      clientA.addStroke(makeStroke("a1"));
      clientB.addStroke(makeStroke("b1"));
      syncBoth(clientA, clientB);

      // Client A "disconnects" and draws offline
      clientA.addStroke(makeStroke("a2-offline"));

      // Client B continues drawing
      clientB.addStroke(makeStroke("b2-while-a-offline"));

      // Client A "reconnects" — sync everything
      syncBoth(clientA, clientB);

      // Both should see all 4 strokes
      const idsA = clientA.getStrokes().map((s) => s.id).sort();
      const idsB = clientB.getStrokes().map((s) => s.id).sort();
      expect(idsA).toEqual([
        "a1",
        "a2-offline",
        "b1",
        "b2-while-a-offline",
      ]);
      expect(idsA).toEqual(idsB);
    });

    it("a new client joining gets full document state", () => {
      clientA.addStroke(makeStroke("a1"));
      clientA.addStroke(makeStroke("a2"));

      // Simulate a brand-new client connecting (fresh Y.Doc)
      const clientC = new DrawfinityDoc();
      syncDocs(clientA, clientC);

      expect(clientC.getStrokes()).toHaveLength(2);
      expect(clientC.getStrokes().map((s) => s.id).sort()).toEqual([
        "a1",
        "a2",
      ]);
    });

    it("server restart preserves state via full state snapshot", () => {
      // Simulate: clients draw, server holds state as binary
      clientA.addStroke(makeStroke("a1"));
      clientB.addStroke(makeStroke("b1"));
      syncBoth(clientA, clientB);

      // Server takes a snapshot (what persistence.rs does)
      const serverSnapshot = Y.encodeStateAsUpdate(clientA.getDoc());

      // "Server restarts" — create fresh server-side doc from persisted data
      const serverDoc = new Y.Doc();
      Y.applyUpdate(serverDoc, serverSnapshot);

      // New client connects after restart
      const clientC = new DrawfinityDoc();
      const sv = Y.encodeStateVector(clientC.getDoc());
      const update = Y.encodeStateAsUpdate(serverDoc, sv);
      Y.applyUpdate(clientC.getDoc(), update);

      expect(clientC.getStrokes()).toHaveLength(2);
      expect(clientC.getStrokes().map((s) => s.id).sort()).toEqual([
        "a1",
        "b1",
      ]);
    });
  });

  describe("real-time update stream", () => {
    it("incremental updates sync without full state exchange", () => {
      // Initial sync
      syncBoth(clientA, clientB);

      // Client A draws — capture only the incremental update
      const updates: Uint8Array[] = [];
      clientA.getDoc().on("update", (update: Uint8Array) => {
        updates.push(update);
      });

      clientA.addStroke(makeStroke("inc-1"));

      // Apply only incremental updates to client B (like the WS relay does)
      for (const u of updates) {
        Y.applyUpdate(clientB.getDoc(), u);
      }

      expect(clientB.getStrokes()).toHaveLength(1);
      expect(clientB.getStrokes()[0].id).toBe("inc-1");
    });

    it("observer fires on client B when remote stroke arrives", () => {
      let changeCount = 0;
      clientB.onStrokesChanged(() => {
        changeCount++;
      });

      clientA.addStroke(makeStroke("a1"));
      syncDocs(clientA, clientB);

      expect(changeCount).toBeGreaterThanOrEqual(1);
      expect(clientB.getStrokes()).toHaveLength(1);
    });
  });
});
