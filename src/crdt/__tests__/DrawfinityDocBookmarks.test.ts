import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Y from "yjs";
import { DrawfinityDoc } from "../DrawfinityDoc";
import { CameraBookmark } from "../../model/Bookmark";

function makeBookmark(overrides: Partial<CameraBookmark> = {}): CameraBookmark {
  return {
    id: "bm-1",
    label: "Bookmark 1",
    x: 100,
    y: 200,
    zoom: 1.5,
    createdBy: "user-1",
    createdAt: 1710000000000,
    ...overrides,
  };
}

describe("DrawfinityDoc bookmarks", () => {
  let doc: DrawfinityDoc;

  beforeEach(() => {
    doc = new DrawfinityDoc();
  });

  describe("addBookmark / getBookmarks", () => {
    it("returns empty array initially", () => {
      expect(doc.getBookmarks()).toEqual([]);
    });

    it("adds and retrieves a bookmark", () => {
      const bm = makeBookmark();
      doc.addBookmark(bm);
      const bookmarks = doc.getBookmarks();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0]).toEqual(bm);
    });

    it("adds multiple bookmarks in order", () => {
      doc.addBookmark(makeBookmark({ id: "bm-1", label: "First" }));
      doc.addBookmark(makeBookmark({ id: "bm-2", label: "Second" }));
      doc.addBookmark(makeBookmark({ id: "bm-3", label: "Third" }));
      const bookmarks = doc.getBookmarks();
      expect(bookmarks).toHaveLength(3);
      expect(bookmarks.map((b) => b.label)).toEqual(["First", "Second", "Third"]);
    });
  });

  describe("removeBookmark", () => {
    it("removes an existing bookmark and returns true", () => {
      doc.addBookmark(makeBookmark({ id: "bm-1" }));
      doc.addBookmark(makeBookmark({ id: "bm-2" }));
      const removed = doc.removeBookmark("bm-1");
      expect(removed).toBe(true);
      expect(doc.getBookmarks()).toHaveLength(1);
      expect(doc.getBookmarks()[0].id).toBe("bm-2");
    });

    it("returns false for non-existent bookmark", () => {
      doc.addBookmark(makeBookmark({ id: "bm-1" }));
      expect(doc.removeBookmark("bm-999")).toBe(false);
      expect(doc.getBookmarks()).toHaveLength(1);
    });
  });

  describe("updateBookmark", () => {
    it("updates the label of a bookmark", () => {
      doc.addBookmark(makeBookmark({ id: "bm-1", label: "Old Label" }));
      const updated = doc.updateBookmark("bm-1", { label: "New Label" });
      expect(updated).toBe(true);
      expect(doc.getBookmarks()[0].label).toBe("New Label");
    });

    it("updates multiple fields at once", () => {
      doc.addBookmark(makeBookmark({ id: "bm-1", x: 0, y: 0, zoom: 1 }));
      doc.updateBookmark("bm-1", { x: 500, y: -300, zoom: 4.0 });
      const bm = doc.getBookmarks()[0];
      expect(bm.x).toBe(500);
      expect(bm.y).toBe(-300);
      expect(bm.zoom).toBe(4.0);
    });

    it("returns false for non-existent bookmark", () => {
      expect(doc.updateBookmark("bm-999", { label: "Nope" })).toBe(false);
    });

    it("does not affect other bookmarks", () => {
      doc.addBookmark(makeBookmark({ id: "bm-1", label: "One" }));
      doc.addBookmark(makeBookmark({ id: "bm-2", label: "Two" }));
      doc.updateBookmark("bm-1", { label: "Updated" });
      expect(doc.getBookmarks()[1].label).toBe("Two");
    });
  });

  describe("onBookmarksChanged", () => {
    it("fires when a bookmark is added", () => {
      const callback = vi.fn();
      doc.onBookmarksChanged(callback);
      doc.addBookmark(makeBookmark());
      expect(callback).toHaveBeenCalled();
    });

    it("fires when a bookmark is removed", () => {
      doc.addBookmark(makeBookmark({ id: "bm-1" }));
      const callback = vi.fn();
      doc.onBookmarksChanged(callback);
      doc.removeBookmark("bm-1");
      expect(callback).toHaveBeenCalled();
    });

    it("fires when a bookmark is updated", () => {
      doc.addBookmark(makeBookmark({ id: "bm-1" }));
      const callback = vi.fn();
      doc.onBookmarksChanged(callback);
      doc.updateBookmark("bm-1", { label: "Changed" });
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("collaboration sync", () => {
    it("syncs bookmarks between two docs via state updates", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      doc1.addBookmark(makeBookmark({ id: "bm-1", label: "Shared" }));

      const update = Y.encodeStateAsUpdate(doc1.getDoc());
      Y.applyUpdate(doc2.getDoc(), update);

      const bookmarks = doc2.getBookmarks();
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].label).toBe("Shared");
    });

    it("fires onBookmarksChanged on remote update", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      const callback = vi.fn();
      doc2.onBookmarksChanged(callback);

      doc1.addBookmark(makeBookmark({ id: "bm-1" }));
      Y.applyUpdate(doc2.getDoc(), Y.encodeStateAsUpdate(doc1.getDoc()));

      expect(callback).toHaveBeenCalled();
      expect(doc2.getBookmarks()).toHaveLength(1);
    });

    it("real-time bidirectional sync", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      doc1.getDoc().on("update", (update: Uint8Array) => {
        Y.applyUpdate(doc2.getDoc(), update);
      });
      doc2.getDoc().on("update", (update: Uint8Array) => {
        Y.applyUpdate(doc1.getDoc(), update);
      });

      doc1.addBookmark(makeBookmark({ id: "bm-1", label: "From Doc1" }));
      expect(doc2.getBookmarks()).toHaveLength(1);
      expect(doc2.getBookmarks()[0].label).toBe("From Doc1");

      doc2.addBookmark(makeBookmark({ id: "bm-2", label: "From Doc2" }));
      expect(doc1.getBookmarks()).toHaveLength(2);
    });
  });

  describe("bookmarks are independent of strokes", () => {
    it("undo on strokes does not affect bookmarks", () => {
      const um = new Y.UndoManager(doc.getStrokesArray());

      doc.addBookmark(makeBookmark({ id: "bm-1" }));
      doc.addStroke({
        id: "s1",
        color: "#ff0000",
        width: 3,
        timestamp: 1000,
        points: [{ x: 0, y: 0, pressure: 0.5 }],
      });

      um.undo();
      expect(doc.getStrokes()).toHaveLength(0);
      expect(doc.getBookmarks()).toHaveLength(1);
    });
  });
});
