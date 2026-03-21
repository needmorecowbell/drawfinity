/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExchangeCache } from "../exchange";
import type { ExchangeIndex, ExchangeScript } from "../exchange";

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
});
