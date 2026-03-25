import { describe, it, expect, beforeEach } from "vitest";
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

describe("Corruption Detection", () => {
  async function importBrowserStorage() {
    return await import("../BrowserStorage");
  }

  describe("validateYjsState", () => {
    it("returns valid for correct Yjs state", async () => {
      const { validateYjsState } = await importBrowserStorage();
      const doc = new Y.Doc();
      doc.getMap("test").set("key", "value");
      const state = Y.encodeStateAsUpdate(doc);

      const result = validateYjsState(state);
      expect(result.valid).toBe(true);
      expect(result.doc).not.toBeNull();
      expect(result.error).toBeNull();
      expect(result.doc!.getMap("test").get("key")).toBe("value");
    });

    it("returns invalid for random garbage bytes", async () => {
      const { validateYjsState } = await importBrowserStorage();
      const garbage = new Uint8Array([255, 254, 253, 0, 1, 2, 3, 99, 100]);

      const result = validateYjsState(garbage);
      expect(result.valid).toBe(false);
      expect(result.doc).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it("returns invalid for truncated Yjs state", async () => {
      const { validateYjsState } = await importBrowserStorage();
      const doc = new Y.Doc();
      doc.getMap("test").set("key", "value");
      const state = Y.encodeStateAsUpdate(doc);
      // Truncate the state to corrupt it
      const truncated = state.slice(0, Math.floor(state.length / 2));

      const result = validateYjsState(truncated);
      expect(result.valid).toBe(false);
      expect(result.doc).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it("returns valid for empty document state", async () => {
      const { validateYjsState } = await importBrowserStorage();
      const doc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(doc);

      const result = validateYjsState(state);
      expect(result.valid).toBe(true);
      expect(result.doc).not.toBeNull();
    });
  });

  describe("backup mechanism", () => {
    it("creates a backup when saving over existing state", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      // Save initial state
      const doc1 = new Y.Doc();
      doc1.getMap("test").set("version", "1");
      const state1 = Y.encodeStateAsUpdate(doc1);
      await storage.saveDocState("d1", state1);

      // Save updated state (should create backup of state1)
      const doc2 = new Y.Doc();
      doc2.getMap("test").set("version", "2");
      const state2 = Y.encodeStateAsUpdate(doc2);
      await storage.saveDocState("d1", state2);

      // Verify backup contains the first version
      const backup = await storage.loadBackupState("d1");
      expect(backup).not.toBeNull();
      const restored = new Y.Doc();
      Y.applyUpdate(restored, backup!);
      expect(restored.getMap("test").get("version")).toBe("1");
    });

    it("returns null when no backup exists", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      const backup = await storage.loadBackupState("nonexistent");
      expect(backup).toBeNull();
    });

    it("deletes backup when deleting document state", async () => {
      const { createBrowserStorage } = await importBrowserStorage();
      const storage = await createBrowserStorage();

      // Save twice to create a backup
      await storage.saveDocState("d1", new Uint8Array([1, 2, 3]));
      const doc = new Y.Doc();
      doc.getMap("test").set("key", "val");
      await storage.saveDocState("d1", Y.encodeStateAsUpdate(doc));

      // Backup should exist
      expect(await storage.loadBackupState("d1")).not.toBeNull();

      // Delete document should also delete backup
      await storage.deleteDocState("d1");
      expect(await storage.loadBackupState("d1")).toBeNull();
    });
  });
});
