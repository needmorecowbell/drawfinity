import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  isAvailable,
  saveDocument,
  loadDocument,
  deleteDocument,
  loadManifestFromIDB,
  saveManifestToIDB,
  clearAll,
} from "../IndexedDBStorage";
import type { DrawingMetadata } from "../DrawingManifest";

// Reset IndexedDB between tests to avoid cross-contamination
beforeEach(async () => {
  // Delete the database between tests
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("drawfinity");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
});

describe("IndexedDBStorage", () => {
  describe("isAvailable", () => {
    it("returns true when IndexedDB is available", async () => {
      expect(await isAvailable()).toBe(true);
    });
  });

  describe("saveDocument / loadDocument", () => {
    it("saves and loads a Uint8Array document", async () => {
      const state = new Uint8Array([1, 2, 3, 4, 5, 0, 255]);
      await saveDocument("drawing-1", state);
      const loaded = await loadDocument("drawing-1");
      expect(loaded).toEqual(state);
    });

    it("returns null for a non-existent document", async () => {
      const result = await loadDocument("nonexistent");
      expect(result).toBeNull();
    });

    it("overwrites an existing document", async () => {
      await saveDocument("d1", new Uint8Array([1, 2, 3]));
      await saveDocument("d1", new Uint8Array([4, 5, 6]));
      const loaded = await loadDocument("d1");
      expect(loaded).toEqual(new Uint8Array([4, 5, 6]));
    });

    it("stores binary data without base64 overhead", async () => {
      // A large-ish buffer that would be ~33% bigger as base64
      const state = new Uint8Array(1024);
      for (let i = 0; i < state.length; i++) state[i] = i % 256;
      await saveDocument("big", state);
      const loaded = await loadDocument("big");
      expect(loaded).toEqual(state);
    });
  });

  describe("deleteDocument", () => {
    it("deletes a stored document", async () => {
      await saveDocument("d1", new Uint8Array([1, 2, 3]));
      await deleteDocument("d1");
      const result = await loadDocument("d1");
      expect(result).toBeNull();
    });

    it("does not throw when deleting a non-existent document", async () => {
      await expect(deleteDocument("nonexistent")).resolves.not.toThrow();
    });
  });

  describe("manifest operations", () => {
    it("returns an empty array when no manifest exists", async () => {
      const drawings = await loadManifestFromIDB();
      expect(drawings).toEqual([]);
    });

    it("saves and loads a manifest", async () => {
      const manifest: DrawingMetadata[] = [
        {
          id: "d1",
          name: "Test Drawing",
          createdAt: "2026-01-01T00:00:00Z",
          modifiedAt: "2026-01-02T00:00:00Z",
          fileName: "d1.drawfinity",
        },
      ];
      await saveManifestToIDB(manifest);
      const loaded = await loadManifestFromIDB();
      expect(loaded).toEqual(manifest);
    });

    it("overwrites manifest on subsequent save", async () => {
      await saveManifestToIDB([
        { id: "a", name: "A", createdAt: "", modifiedAt: "", fileName: "" },
      ]);
      await saveManifestToIDB([
        { id: "b", name: "B", createdAt: "", modifiedAt: "", fileName: "" },
      ]);
      const loaded = await loadManifestFromIDB();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("b");
    });
  });

  describe("clearAll", () => {
    it("removes all documents and manifest", async () => {
      await saveDocument("d1", new Uint8Array([1]));
      await saveDocument("d2", new Uint8Array([2]));
      await saveManifestToIDB([
        { id: "d1", name: "D1", createdAt: "", modifiedAt: "", fileName: "" },
      ]);

      await clearAll();

      expect(await loadDocument("d1")).toBeNull();
      expect(await loadDocument("d2")).toBeNull();
      expect(await loadManifestFromIDB()).toEqual([]);
    });
  });
});
