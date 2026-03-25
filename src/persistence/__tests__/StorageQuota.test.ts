import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { checkStorageQuota, isStorageLow, createBrowserStorage } from "../BrowserStorage";

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

// Reset between tests
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("drawfinity");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  lsStore.clear();
});

describe("Storage Quota Detection", () => {
  describe("checkStorageQuota", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns quota info when navigator.storage.estimate is available", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 50_000_000 }),
        },
      });

      const info = await checkStorageQuota();
      expect(info).not.toBeNull();
      expect(info!.usage).toBe(1000);
      expect(info!.quota).toBe(50_000_000);
      expect(info!.available).toBe(50_000_000 - 1000);
    });

    it("returns null when navigator.storage.estimate is unavailable", async () => {
      vi.stubGlobal("navigator", {});
      const info = await checkStorageQuota();
      expect(info).toBeNull();
    });

    it("returns null when estimate throws", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockRejectedValue(new Error("denied")),
        },
      });

      const info = await checkStorageQuota();
      expect(info).toBeNull();
    });
  });

  describe("isStorageLow", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns true when available space is below 1 MB", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            usage: 49_500_000,
            quota: 50_000_000,
          }),
        },
      });

      expect(await isStorageLow()).toBe(true);
    });

    it("returns false when available space is above 1 MB", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            usage: 1_000_000,
            quota: 50_000_000,
          }),
        },
      });

      expect(await isStorageLow()).toBe(false);
    });

    it("returns false when quota API is unavailable", async () => {
      vi.stubGlobal("navigator", {});
      expect(await isStorageLow()).toBe(false);
    });
  });

  describe("BrowserStorage quota callbacks", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("calls onStorageLow when available space drops below threshold", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            usage: 49_500_000,
            quota: 50_000_000,
          }),
        },
      });

      const storage = await createBrowserStorage();
      const lowHandler = vi.fn();
      storage.onStorageLow = lowHandler;

      await storage.saveDocState("test-id", new Uint8Array([1, 2, 3]));

      expect(lowHandler).toHaveBeenCalledOnce();
      expect(lowHandler).toHaveBeenCalledWith(500_000);
    });

    it("does not call onStorageLow when there is plenty of space", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            usage: 1_000_000,
            quota: 50_000_000,
          }),
        },
      });

      const storage = await createBrowserStorage();
      const lowHandler = vi.fn();
      storage.onStorageLow = lowHandler;

      await storage.saveDocState("test-id", new Uint8Array([1, 2, 3]));

      expect(lowHandler).not.toHaveBeenCalled();
    });

    it("calls onSaveError when a save fails", async () => {
      // Make IndexedDB unavailable so it falls back to localStorage
      const originalOpen = indexedDB.open;
      vi.spyOn(indexedDB, "open").mockImplementation(() => {
        throw new Error("IndexedDB disabled");
      });

      vi.stubGlobal("navigator", {});

      const storage = await createBrowserStorage();
      expect(storage.useIDB).toBe(false);

      // Restore IDB for cleanup
      vi.mocked(indexedDB.open).mockImplementation(originalOpen);

      // Now make localStorage.setItem throw to simulate quota exceeded
      const originalSetItem = localStorageShim.setItem;
      localStorageShim.setItem = () => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      };

      const errorHandler = vi.fn();
      storage.onSaveError = errorHandler;

      await expect(
        storage.saveDocState("test-id", new Uint8Array([1, 2, 3])),
      ).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledOnce();
      expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);

      // Restore
      localStorageShim.setItem = originalSetItem;
    });

    it("calls onSaveError when localStorage fills up from accumulated writes", async () => {
      // Make IndexedDB unavailable so it falls back to localStorage
      const originalOpen = indexedDB.open;
      vi.spyOn(indexedDB, "open").mockImplementation(() => {
        throw new Error("IndexedDB disabled");
      });

      vi.stubGlobal("navigator", {});

      const storage = await createBrowserStorage();
      expect(storage.useIDB).toBe(false);

      vi.mocked(indexedDB.open).mockImplementation(originalOpen);

      // Simulate accumulated saves: allow first few setItem calls, then throw
      // Save same doc repeatedly so backup writes kick in on second+ saves.
      // First save: 1 setItem (no backup, no existing state)
      // Second save: 2 setItems (backup existing + actual write)
      // Third save: backup write will be call #4 which exceeds limit
      const originalSetItem = localStorageShim.setItem;
      let saveCount = 0;
      localStorageShim.setItem = (key: string, value: string) => {
        saveCount++;
        if (saveCount > 3) {
          throw new DOMException("QuotaExceededError", "QuotaExceededError");
        }
        originalSetItem.call(localStorageShim, key, value);
      };

      const errorHandler = vi.fn();
      storage.onSaveError = errorHandler;

      // First save (1 setItem: no existing state to backup)
      await storage.saveDocState("doc-a", new Uint8Array([1, 2, 3]));
      expect(errorHandler).not.toHaveBeenCalled();

      // Second save of same doc (2 setItems: backup + actual)
      await storage.saveDocState("doc-a", new Uint8Array([4, 5, 6]));
      expect(errorHandler).not.toHaveBeenCalled();

      // Third save: backup write is call #4, exceeds limit.
      // Backup failure is caught (warn only), but actual write is call #5 → throws
      await expect(
        storage.saveDocState("doc-a", new Uint8Array([7, 8, 9])),
      ).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledOnce();

      // Restore
      localStorageShim.setItem = originalSetItem;
    });
  });
});
