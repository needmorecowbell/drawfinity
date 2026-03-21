/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExchangeCache } from "../exchange";
import type { ExchangeIndex, ExchangeScript, ExchangeSnapshot } from "../exchange";

const MOCK_INDEX: ExchangeIndex = {
  version: "2026-03-21T00:00:00Z",
  scripts: [
    {
      id: "koch-curve",
      title: "Koch Curve",
      description: "Recursive Koch snowflake fractal",
      author: "drawfinity",
      tags: ["fractal", "recursive", "math"],
      path: "scripts/koch-curve",
      version: "1.0.0",
    },
    {
      id: "spiral",
      title: "Rainbow Spiral",
      description: "Colorful angular spiral pattern",
      author: "community",
      tags: ["pattern", "color"],
      path: "scripts/spiral",
      version: "1.0.0",
    },
  ],
};

const MOCK_SCRIPT: ExchangeScript = {
  id: "koch-curve",
  title: "Koch Curve",
  description: "Recursive Koch snowflake fractal",
  author: "drawfinity",
  tags: ["fractal", "recursive", "math"],
  path: "scripts/koch-curve",
  version: "1.0.0",
  code: "forward(100)\nturnLeft(60)",
};

const MOCK_SCRIPT_2: ExchangeScript = {
  id: "spiral",
  title: "Rainbow Spiral",
  description: "Colorful angular spiral pattern",
  author: "community",
  tags: ["pattern", "color"],
  path: "scripts/spiral",
  version: "1.0.0",
  code: "for i = 1, 100 do\n  forward(i)\n  turnRight(91)\nend",
};

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    _store: store,
  };
}

describe("ExchangeCache", () => {
  let cache: ExchangeCache;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    vi.stubGlobal("localStorage", mockStorage);
    cache = new ExchangeCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("getCachedIndex / setCachedIndex", () => {
    it("returns null when no index is cached", () => {
      expect(cache.getCachedIndex()).toBeNull();
    });

    it("stores and retrieves the index with cachedAt timestamp", () => {
      cache.setCachedIndex(MOCK_INDEX);
      const result = cache.getCachedIndex();

      expect(result).not.toBeNull();
      expect(result!.version).toBe(MOCK_INDEX.version);
      expect(result!.scripts).toEqual(MOCK_INDEX.scripts);
      expect(result!.cachedAt).toBe(Date.now());
    });

    it("returns null for malformed JSON in localStorage", () => {
      localStorage.setItem("drawfinity:exchange:index", "not json");
      expect(cache.getCachedIndex()).toBeNull();
    });
  });

  describe("getCachedScript / setCachedScript", () => {
    it("returns null for uncached script", () => {
      expect(cache.getCachedScript("nonexistent")).toBeNull();
    });

    it("stores and retrieves a script with cachedAt timestamp", () => {
      cache.setCachedScript(MOCK_SCRIPT);
      const result = cache.getCachedScript("koch-curve");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("koch-curve");
      expect(result!.code).toBe(MOCK_SCRIPT.code);
      expect(result!.version).toBe("1.0.0");
      expect(result!.cachedAt).toBe(Date.now());
    });

    it("returns null for malformed JSON in localStorage", () => {
      localStorage.setItem(
        "drawfinity:exchange:script:koch-curve",
        "bad data",
      );
      expect(cache.getCachedScript("koch-curve")).toBeNull();
    });
  });

  describe("getAllCachedScripts", () => {
    it("returns empty array when no scripts are cached", () => {
      expect(cache.getAllCachedScripts()).toEqual([]);
    });

    it("returns all cached scripts", () => {
      cache.setCachedScript(MOCK_SCRIPT);
      cache.setCachedScript(MOCK_SCRIPT_2);

      const scripts = cache.getAllCachedScripts();
      expect(scripts).toHaveLength(2);

      const ids = scripts.map((s) => s.id).sort();
      expect(ids).toEqual(["koch-curve", "spiral"]);
    });

    it("skips malformed entries", () => {
      cache.setCachedScript(MOCK_SCRIPT);
      localStorage.setItem("drawfinity:exchange:script:broken", "not json");

      const scripts = cache.getAllCachedScripts();
      expect(scripts).toHaveLength(1);
      expect(scripts[0].id).toBe("koch-curve");
    });

    it("does not include index or non-script exchange keys", () => {
      cache.setCachedIndex(MOCK_INDEX);
      cache.setCachedScript(MOCK_SCRIPT);

      const scripts = cache.getAllCachedScripts();
      expect(scripts).toHaveLength(1);
      expect(scripts[0].id).toBe("koch-curve");
    });
  });

  describe("clearCache", () => {
    it("removes all exchange keys from localStorage", () => {
      cache.setCachedIndex(MOCK_INDEX);
      cache.setCachedScript(MOCK_SCRIPT);
      cache.setCachedScript(MOCK_SCRIPT_2);

      // Add a non-exchange key that should survive
      localStorage.setItem("other:key", "keep me");

      cache.clearCache();

      expect(cache.getCachedIndex()).toBeNull();
      expect(cache.getCachedScript("koch-curve")).toBeNull();
      expect(cache.getCachedScript("spiral")).toBeNull();
      expect(cache.getAllCachedScripts()).toEqual([]);
      expect(localStorage.getItem("other:key")).toBe("keep me");
    });

    it("is a no-op when cache is already empty", () => {
      expect(() => cache.clearCache()).not.toThrow();
    });
  });

  describe("snapshot fallback", () => {
    const MOCK_SNAPSHOT: ExchangeSnapshot = {
      version: "2026-03-20T00:00:00Z",
      scripts: [
        {
          id: "snapshot-script",
          title: "Snapshot Script",
          description: "A bundled script",
          author: "drawfinity",
          tags: ["bundled"],
          path: "scripts/snapshot-script",
          version: "1.0.0",
          code: "forward(50)\nright(90)",
        },
        {
          id: "another-snapshot",
          title: "Another Snapshot",
          description: "Another bundled script",
          author: "drawfinity",
          tags: ["bundled"],
          path: "scripts/another-snapshot",
          version: "1.0.0",
          code: "pencolor(255, 0, 0)\nforward(100)",
        },
      ],
    };

    let snapshotCache: ExchangeCache;

    beforeEach(() => {
      snapshotCache = new ExchangeCache(MOCK_SNAPSHOT);
    });

    it("getCachedIndex returns snapshot index when localStorage is empty", () => {
      const index = snapshotCache.getCachedIndex();
      expect(index).not.toBeNull();
      expect(index!.version).toBe("2026-03-20T00:00:00Z");
      expect(index!.scripts).toHaveLength(2);
      expect(index!.cachedAt).toBe(0);
      // Should not include code field in script entries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((index!.scripts[0] as any).code).toBeUndefined();
    });

    it("getCachedIndex prefers localStorage over snapshot", () => {
      snapshotCache.setCachedIndex(MOCK_INDEX);
      const index = snapshotCache.getCachedIndex();
      expect(index!.version).toBe(MOCK_INDEX.version);
      expect(index!.cachedAt).not.toBe(0);
    });

    it("getCachedScript returns snapshot script when not in localStorage", () => {
      const script = snapshotCache.getCachedScript("snapshot-script");
      expect(script).not.toBeNull();
      expect(script!.id).toBe("snapshot-script");
      expect(script!.code).toBe("forward(50)\nright(90)");
      expect(script!.cachedAt).toBe(0);
    });

    it("getCachedScript prefers localStorage over snapshot", () => {
      const localScript: ExchangeScript = {
        id: "snapshot-script",
        title: "Updated Script",
        description: "Updated",
        author: "drawfinity",
        tags: ["bundled"],
        path: "scripts/snapshot-script",
        version: "2.0.0",
        code: "forward(200)",
      };
      snapshotCache.setCachedScript(localScript);
      const script = snapshotCache.getCachedScript("snapshot-script");
      expect(script!.code).toBe("forward(200)");
      expect(script!.version).toBe("2.0.0");
      expect(script!.cachedAt).not.toBe(0);
    });

    it("getCachedScript returns null for script not in snapshot or cache", () => {
      expect(snapshotCache.getCachedScript("nonexistent")).toBeNull();
    });

    it("getAllCachedScripts returns snapshot scripts when localStorage is empty", () => {
      const scripts = snapshotCache.getAllCachedScripts();
      expect(scripts).toHaveLength(2);
      const ids = scripts.map((s) => s.id).sort();
      expect(ids).toEqual(["another-snapshot", "snapshot-script"]);
    });

    it("getAllCachedScripts merges localStorage and snapshot scripts", () => {
      // Cache one script that's also in snapshot (should not duplicate)
      snapshotCache.setCachedScript({
        id: "snapshot-script",
        title: "Snapshot Script",
        description: "A bundled script",
        author: "drawfinity",
        tags: ["bundled"],
        path: "scripts/snapshot-script",
        version: "1.0.0",
        code: "forward(50)\nright(90)",
      });
      // Cache one script not in snapshot
      snapshotCache.setCachedScript(MOCK_SCRIPT);

      const scripts = snapshotCache.getAllCachedScripts();
      expect(scripts).toHaveLength(3);
      const ids = scripts.map((s) => s.id).sort();
      expect(ids).toEqual(["another-snapshot", "koch-curve", "snapshot-script"]);
    });

    it("clearCache still works and snapshot fallback remains after clear", () => {
      snapshotCache.setCachedScript(MOCK_SCRIPT);
      snapshotCache.clearCache();

      // localStorage scripts are gone
      expect(localStorage.getItem("drawfinity:exchange:script:koch-curve")).toBeNull();

      // But snapshot scripts are still accessible
      const script = snapshotCache.getCachedScript("snapshot-script");
      expect(script).not.toBeNull();
      expect(script!.code).toBe("forward(50)\nright(90)");
    });

    it("getCachedIndex falls back to snapshot when localStorage has malformed JSON", () => {
      localStorage.setItem("drawfinity:exchange:index", "corrupted");
      const index = snapshotCache.getCachedIndex();
      expect(index).not.toBeNull();
      expect(index!.version).toBe("2026-03-20T00:00:00Z");
    });

    it("getCachedScript falls back to snapshot when localStorage has malformed JSON", () => {
      localStorage.setItem("drawfinity:exchange:script:snapshot-script", "bad");
      const script = snapshotCache.getCachedScript("snapshot-script");
      expect(script).not.toBeNull();
      expect(script!.code).toBe("forward(50)\nright(90)");
    });
  });
});
