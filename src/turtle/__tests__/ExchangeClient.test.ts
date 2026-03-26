/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExchangeClient, ExchangeError, ExchangeCache } from "../exchange";
import type { ExchangeIndex, ExchangeScriptEntry } from "../exchange";

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
    {
      id: "tree",
      title: "Fractal Tree",
      description: "Recursive branching tree",
      author: "drawfinity",
      tags: ["fractal", "recursive", "nature"],
      path: "scripts/tree",
      version: "1.0.0",
    },
  ],
};

const MOCK_SCRIPT = `-- Koch Curve\nforward(100)\nturnLeft(60)`;

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () =>
      Promise.resolve(
        typeof body === "string" ? body : JSON.stringify(body),
      ),
  } as unknown as Response);
}

function mockFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.reject(new Error("not ok")),
    text: () => Promise.resolve("error"),
  } as unknown as Response);
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
}

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
  };
}

describe("ExchangeClient", () => {
  let client: ExchangeClient;
  const baseUrl = "https://test.example.com/repo/main/";

  beforeEach(() => {
    client = new ExchangeClient(baseUrl);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("fetchIndex", () => {
    it("fetches and returns parsed index from correct URL", async () => {
      const fetchMock = mockFetchOk(MOCK_INDEX);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.fetchIndex();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://test.example.com/repo/main/index.json",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(result).toEqual(MOCK_INDEX);
    });

    it("returns cached result within TTL without re-fetching", async () => {
      const fetchMock = mockFetchOk(MOCK_INDEX);
      vi.stubGlobal("fetch", fetchMock);

      await client.fetchIndex();
      await client.fetchIndex();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("re-fetches after TTL expires", async () => {
      const fetchMock = mockFetchOk(MOCK_INDEX);
      vi.stubGlobal("fetch", fetchMock);

      await client.fetchIndex();
      // Advance past 5 minute TTL
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      await client.fetchIndex();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("throws ExchangeError on non-200 response", async () => {
      vi.stubGlobal("fetch", mockFetchError(403));

      await expect(client.fetchIndex()).rejects.toThrow(ExchangeError);
      await expect(client.fetchIndex()).rejects.toThrow("HTTP 403");
    });

    it("throws ExchangeError on network failure", async () => {
      vi.stubGlobal("fetch", mockFetchNetworkError());

      await expect(client.fetchIndex()).rejects.toThrow(ExchangeError);
      await expect(client.fetchIndex()).rejects.toThrow("Network error");
    });

    it("passes an AbortSignal to fetch for timeout protection", async () => {
      const fetchMock = mockFetchOk(MOCK_INDEX);
      vi.stubGlobal("fetch", fetchMock);

      await client.fetchIndex();

      const signal = fetchMock.mock.calls[0][1]?.signal;
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    it("throws ExchangeError with 'timed out' message when fetch is aborted", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

      await expect(client.fetchIndex()).rejects.toThrow(ExchangeError);
      await expect(client.fetchIndex()).rejects.toThrow("timed out");
    });

    it("throws ExchangeError on malformed JSON", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      } as unknown as Response);
      vi.stubGlobal("fetch", fetchMock);

      await expect(client.fetchIndex()).rejects.toThrow("malformed JSON");
    });
  });

  describe("fetchScript", () => {
    it("constructs correct URL from entry path and id", async () => {
      const fetchMock = mockFetchOk(MOCK_SCRIPT);
      vi.stubGlobal("fetch", fetchMock);

      const entry: ExchangeScriptEntry = MOCK_INDEX.scripts[0];
      const code = await client.fetchScript(entry);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://test.example.com/repo/main/scripts/koch-curve/koch-curve.lua",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(code).toBe(MOCK_SCRIPT);
    });

    it("returns cached script on second call", async () => {
      const fetchMock = mockFetchOk(MOCK_SCRIPT);
      vi.stubGlobal("fetch", fetchMock);

      const entry = MOCK_INDEX.scripts[0];
      await client.fetchScript(entry);
      await client.fetchScript(entry);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws ExchangeError on fetch failure", async () => {
      vi.stubGlobal("fetch", mockFetchError(404));

      await expect(client.fetchScript(MOCK_INDEX.scripts[0])).rejects.toThrow(
        ExchangeError,
      );
    });

    it("throws ExchangeError on network failure", async () => {
      vi.stubGlobal("fetch", mockFetchNetworkError());

      await expect(client.fetchScript(MOCK_INDEX.scripts[0])).rejects.toThrow(
        "Network error",
      );
    });

    it("passes an AbortSignal to fetch for timeout protection", async () => {
      const fetchMock = mockFetchOk(MOCK_SCRIPT);
      vi.stubGlobal("fetch", fetchMock);

      await client.fetchScript(MOCK_INDEX.scripts[0]);

      const signal = fetchMock.mock.calls[0][1]?.signal;
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    it("throws ExchangeError with 'timed out' message when fetch is aborted", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

      await expect(client.fetchScript(MOCK_INDEX.scripts[0])).rejects.toThrow(
        ExchangeError,
      );
      await expect(client.fetchScript(MOCK_INDEX.scripts[1])).rejects.toThrow(
        "timed out",
      );
    });

    it("writes through to ExchangeCache after fetching", async () => {
      const mockStorage = createMockStorage();
      vi.stubGlobal("localStorage", mockStorage);

      const cache = new ExchangeCache();
      const clientWithCache = new ExchangeClient(baseUrl, cache);
      vi.stubGlobal("fetch", mockFetchOk(MOCK_SCRIPT));

      const entry = MOCK_INDEX.scripts[0];
      await clientWithCache.fetchScript(entry);

      const cachedScript = cache.getCachedScript(entry.id);
      expect(cachedScript).not.toBeNull();
      expect(cachedScript!.code).toBe(MOCK_SCRIPT);
      expect(cachedScript!.id).toBe(entry.id);
      expect(cachedScript!.version).toBe(entry.version);
    });

    it("does not write through when no cache is provided", async () => {
      vi.stubGlobal("fetch", mockFetchOk(MOCK_SCRIPT));

      const code = await client.fetchScript(MOCK_INDEX.scripts[0]);
      expect(code).toBe(MOCK_SCRIPT);
    });
  });

  describe("searchScripts", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", mockFetchOk(MOCK_INDEX));
    });

    it("returns all scripts when no filters provided", async () => {
      const results = await client.searchScripts();
      expect(results).toHaveLength(3);
    });

    it("filters by text query case-insensitively", async () => {
      const results = await client.searchScripts("koch");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("koch-curve");
    });

    it("matches query against description", async () => {
      const results = await client.searchScripts("spiral");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("spiral");
    });

    it("filters by tags (any match)", async () => {
      const results = await client.searchScripts(undefined, ["nature"]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("tree");
    });

    it("filters by multiple tags (OR logic)", async () => {
      const results = await client.searchScripts(undefined, [
        "color",
        "nature",
      ]);
      expect(results).toHaveLength(2);
    });

    it("applies both query and tag filters (AND logic)", async () => {
      const results = await client.searchScripts("fractal", ["nature"]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("tree");
    });

    it("returns empty array when nothing matches", async () => {
      const results = await client.searchScripts("nonexistent");
      expect(results).toHaveLength(0);
    });
  });

  describe("checkForUpdates", () => {
    let cache: ExchangeCache;
    let clientWithCache: ExchangeClient;
    let mockStorage: ReturnType<typeof createMockStorage>;

    beforeEach(() => {
      mockStorage = createMockStorage();
      vi.stubGlobal("localStorage", mockStorage);
      cache = new ExchangeCache();
      clientWithCache = new ExchangeClient(baseUrl, cache);
    });

    it("reports all scripts as new when cache is empty", async () => {
      vi.stubGlobal("fetch", mockFetchOk(MOCK_INDEX));

      const result = await clientWithCache.checkForUpdates();

      expect(result.hasUpdates).toBe(true);
      expect(result.newScripts).toHaveLength(3);
      expect(result.updatedScripts).toHaveLength(0);
      expect(result.remoteIndex).toEqual(MOCK_INDEX);
    });

    it("reports no updates when cache is up to date", async () => {
      for (const entry of MOCK_INDEX.scripts) {
        cache.setCachedScript({ ...entry, code: "-- cached" });
      }
      vi.stubGlobal("fetch", mockFetchOk(MOCK_INDEX));

      const result = await clientWithCache.checkForUpdates();

      expect(result.hasUpdates).toBe(false);
      expect(result.newScripts).toHaveLength(0);
      expect(result.updatedScripts).toHaveLength(0);
    });

    it("identifies updated scripts when remote has newer versions", async () => {
      for (const entry of MOCK_INDEX.scripts) {
        cache.setCachedScript({ ...entry, code: "-- cached" });
      }

      const updatedIndex: ExchangeIndex = {
        version: "2026-03-22T00:00:00Z",
        scripts: MOCK_INDEX.scripts.map((s) =>
          s.id === "koch-curve" ? { ...s, version: "1.1.0" } : s,
        ),
      };
      vi.stubGlobal("fetch", mockFetchOk(updatedIndex));

      const result = await clientWithCache.checkForUpdates();

      expect(result.hasUpdates).toBe(true);
      expect(result.newScripts).toHaveLength(0);
      expect(result.updatedScripts).toHaveLength(1);
      expect(result.updatedScripts[0]).toEqual({
        entry: { ...MOCK_INDEX.scripts[0], version: "1.1.0" },
        currentVersion: "1.0.0",
        newVersion: "1.1.0",
      });
    });

    it("identifies both new and updated scripts simultaneously", async () => {
      cache.setCachedScript({ ...MOCK_INDEX.scripts[0], code: "-- cached" });

      const updatedIndex: ExchangeIndex = {
        version: "2026-03-22T00:00:00Z",
        scripts: MOCK_INDEX.scripts.map((s) =>
          s.id === "koch-curve" ? { ...s, version: "2.0.0" } : s,
        ),
      };
      vi.stubGlobal("fetch", mockFetchOk(updatedIndex));

      const result = await clientWithCache.checkForUpdates();

      expect(result.hasUpdates).toBe(true);
      expect(result.newScripts).toHaveLength(2);
      expect(result.newScripts.map((s) => s.id)).toEqual(["spiral", "tree"]);
      expect(result.updatedScripts).toHaveLength(1);
      expect(result.updatedScripts[0].currentVersion).toBe("1.0.0");
      expect(result.updatedScripts[0].newVersion).toBe("2.0.0");
    });

    it("updates the cached index after checking", async () => {
      vi.stubGlobal("fetch", mockFetchOk(MOCK_INDEX));

      await clientWithCache.checkForUpdates();

      const cachedIndex = cache.getCachedIndex();
      expect(cachedIndex).not.toBeNull();
      expect(cachedIndex!.version).toBe(MOCK_INDEX.version);
    });

    it("treats all scripts as new when no cache is provided", async () => {
      const clientNoCache = new ExchangeClient(baseUrl);
      vi.stubGlobal("fetch", mockFetchOk(MOCK_INDEX));

      const result = await clientNoCache.checkForUpdates();

      expect(result.hasUpdates).toBe(true);
      expect(result.newScripts).toHaveLength(3);
      expect(result.updatedScripts).toHaveLength(0);
    });

    it("does not report updates when remote version equals cached version", async () => {
      for (const entry of MOCK_INDEX.scripts) {
        cache.setCachedScript({ ...entry, code: "-- cached" });
      }
      vi.stubGlobal("fetch", mockFetchOk(MOCK_INDEX));

      const result = await clientWithCache.checkForUpdates();

      expect(result.hasUpdates).toBe(false);
    });

    it("handles major version bumps correctly", async () => {
      cache.setCachedScript({
        ...MOCK_INDEX.scripts[0],
        code: "-- cached",
        version: "1.9.9",
      });

      const updatedIndex: ExchangeIndex = {
        version: "2026-03-22T00:00:00Z",
        scripts: [{ ...MOCK_INDEX.scripts[0], version: "2.0.0" }],
      };
      vi.stubGlobal("fetch", mockFetchOk(updatedIndex));

      const result = await clientWithCache.checkForUpdates();

      expect(result.updatedScripts).toHaveLength(1);
      expect(result.updatedScripts[0].currentVersion).toBe("1.9.9");
      expect(result.updatedScripts[0].newVersion).toBe("2.0.0");
    });

    it("propagates fetch errors from checkForUpdates", async () => {
      vi.stubGlobal("fetch", mockFetchNetworkError());

      await expect(clientWithCache.checkForUpdates()).rejects.toThrow(
        ExchangeError,
      );
    });
  });

  describe("base URL handling", () => {
    it("appends trailing slash if missing", async () => {
      const noSlash = new ExchangeClient("https://example.com/repo");
      const fetchMock = mockFetchOk(MOCK_INDEX);
      vi.stubGlobal("fetch", fetchMock);

      await noSlash.fetchIndex();
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.com/repo/index.json",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
