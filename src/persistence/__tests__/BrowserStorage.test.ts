import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import * as Y from "yjs";

// Provide a minimal localStorage shim for Node
const lsStore = new Map<string, string>();
const localStorageShim = {
  getItem: (key: string) => lsStore.get(key) ?? null,
  setItem: (key: string, value: string) => { lsStore.set(key, value); },
  removeItem: (key: string) => { lsStore.delete(key); },
  clear: () => { lsStore.clear(); },
  get length() { return lsStore.size; },
  key: (i: number) => [...lsStore.keys()][i] ?? null,
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageShim, writable: true });

// Reset IndexedDB and localStorage between tests
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("drawfinity");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  lsStore.clear();
});

describe("BrowserStorage", () => {
  async function importBrowserStorage() {
    // Dynamic import to get fresh module state
    const mod = await import("../BrowserStorage");
    return mod;
  }

  describe("createBrowserStorage (IndexedDB available)", () => {
    it("creates a storage adapter using IndexedDB", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();
      expect(storage.useIDB).toBe(true);
      expect(storage.storageLabel).toBe("IndexedDB");
    });

    it("saves and loads document state as Uint8Array", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      const doc = new Y.Doc();
      doc.getMap("test").set("key", "value");
      const state = Y.encodeStateAsUpdate(doc);

      await storage.saveDocState("d1", state);
      const loaded = await storage.loadDocState("d1");
      expect(loaded).toBeTruthy();
      expect(loaded).toBeInstanceOf(Uint8Array);

      // Verify the loaded state restores the document
      const restored = new Y.Doc();
      Y.applyUpdate(restored, loaded!);
      expect(restored.getMap("test").get("key")).toBe("value");
    });

    it("deletes document state", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      await storage.saveDocState("d1", new Uint8Array([1, 2, 3]));
      await storage.deleteDocState("d1");
      expect(await storage.loadDocState("d1")).toBeNull();
    });

    it("persists and loads manifest", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      storage.memDrawings.push({
        id: "d1",
        name: "Test",
        createdAt: "2026-01-01T00:00:00Z",
        modifiedAt: "2026-01-01T00:00:00Z",
        fileName: "",
      });
      await storage.persistManifest();

      // Create a new storage instance and verify manifest was persisted
      const storage2 = await createBrowserStorage();
      expect(storage2.memDrawings).toHaveLength(1);
      expect(storage2.memDrawings[0].name).toBe("Test");
    });
  });

  describe("localStorage migration", () => {
    it("migrates localStorage data to IndexedDB on first use", async () => {
      // Seed localStorage with legacy data
      const drawings = [
        { id: "legacy1", name: "Legacy Drawing", createdAt: "2026-01-01", modifiedAt: "2026-01-01", fileName: "" },
      ];
      localStorage.setItem("drawfinity:drawings", JSON.stringify(drawings));

      // Seed a document as base64
      const doc = new Y.Doc();
      doc.getMap("test").set("hello", "world");
      const state = Y.encodeStateAsUpdate(doc);
      let binary = "";
      for (let i = 0; i < state.length; i++) binary += String.fromCharCode(state[i]);
      localStorage.setItem("drawfinity:doc:legacy1", btoa(binary));

      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      // Manifest should have migrated
      expect(storage.memDrawings).toHaveLength(1);
      expect(storage.memDrawings[0].id).toBe("legacy1");

      // Document state should be loadable from IndexedDB
      const loaded = await storage.loadDocState("legacy1");
      expect(loaded).toBeTruthy();
      const restored = new Y.Doc();
      Y.applyUpdate(restored, loaded!);
      expect(restored.getMap("test").get("hello")).toBe("world");

      // localStorage should be cleaned up
      expect(localStorage.getItem("drawfinity:drawings")).toBeNull();
      expect(localStorage.getItem("drawfinity:doc:legacy1")).toBeNull();
    });
  });

  describe("localStorage fallback", () => {
    it("falls back to localStorage when IndexedDB is unavailable", async () => {
      // Make indexedDB.open throw
      const originalOpen = indexedDB.open;
      vi.spyOn(indexedDB, "open").mockImplementation(() => {
        throw new Error("IndexedDB disabled");
      });

      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      expect(storage.useIDB).toBe(false);
      expect(storage.storageLabel).toBe("localStorage");

      // Save and load should work via localStorage
      await storage.saveDocState("d1", new Uint8Array([10, 20, 30]));
      const loaded = await storage.loadDocState("d1");
      expect(loaded).toEqual(new Uint8Array([10, 20, 30]));

      // Restore original
      vi.mocked(indexedDB.open).mockImplementation(originalOpen);
    });
  });

  describe("clearAllData", () => {
    it("clears IndexedDB documents, localStorage keys, and memDrawings", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      // Populate storage with multiple drawings
      storage.memDrawings.push(
        { id: "d1", name: "Drawing 1", createdAt: "2026-01-01", modifiedAt: "2026-01-01", fileName: "" },
        { id: "d2", name: "Drawing 2", createdAt: "2026-01-02", modifiedAt: "2026-01-02", fileName: "" },
      );
      await storage.persistManifest();
      await storage.saveDocState("d1", new Uint8Array([1, 2, 3]));
      await storage.saveDocState("d2", new Uint8Array([4, 5, 6]));

      // Also seed some drawfinity-prefixed localStorage keys
      localStorage.setItem("drawfinity:settings", "test");
      localStorage.setItem("drawfinity:other", "data");
      // Non-drawfinity key should survive
      localStorage.setItem("unrelated-key", "keep");

      await storage.clearAllData();

      // memDrawings should be empty
      expect(storage.memDrawings).toHaveLength(0);

      // Documents should be gone from IndexedDB
      expect(await storage.loadDocState("d1")).toBeNull();
      expect(await storage.loadDocState("d2")).toBeNull();

      // drawfinity localStorage keys should be gone
      expect(localStorage.getItem("drawfinity:settings")).toBeNull();
      expect(localStorage.getItem("drawfinity:other")).toBeNull();

      // Non-drawfinity key should be untouched
      expect(localStorage.getItem("unrelated-key")).toBe("keep");
    });

    it("clears localStorage-backed storage when IndexedDB is unavailable", async () => {
      const originalOpen = indexedDB.open;
      vi.spyOn(indexedDB, "open").mockImplementation(() => {
        throw new Error("IndexedDB disabled");
      });

      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();
      expect(storage.useIDB).toBe(false);

      vi.mocked(indexedDB.open).mockImplementation(originalOpen);

      // Populate
      storage.memDrawings.push(
        { id: "d1", name: "Drawing 1", createdAt: "2026-01-01", modifiedAt: "2026-01-01", fileName: "" },
      );
      await storage.saveDocState("d1", new Uint8Array([10, 20]));

      await storage.clearAllData();

      expect(storage.memDrawings).toHaveLength(0);
      expect(await storage.loadDocState("d1")).toBeNull();
    });

    it("is idempotent on empty storage", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      // Should not throw when nothing to clear
      await storage.clearAllData();
      expect(storage.memDrawings).toHaveLength(0);
    });
  });

  describe("base64 helpers", () => {
    it("round-trips Uint8Array through base64", async () => {
      const { uint8ToBase64, base64ToUint8 } = await importBrowserStorage();
      const original = new Uint8Array([0, 1, 127, 128, 255]);
      const b64 = uint8ToBase64(original);
      expect(typeof b64).toBe("string");
      const decoded = base64ToUint8(b64);
      expect(decoded).toEqual(original);
    });
  });
});
