import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExchangeClient, ExchangeError } from "../exchange";
import type { ExchangeIndex, ExchangeScriptEntry } from "../exchange";

const MOCK_INDEX: ExchangeIndex = {
  scripts: [
    {
      id: "koch-curve",
      title: "Koch Curve",
      description: "Recursive Koch snowflake fractal",
      author: "drawfinity",
      tags: ["fractal", "recursive", "math"],
      path: "scripts/koch-curve",
    },
    {
      id: "spiral",
      title: "Rainbow Spiral",
      description: "Colorful angular spiral pattern",
      author: "community",
      tags: ["pattern", "color"],
      path: "scripts/spiral",
    },
    {
      id: "tree",
      title: "Fractal Tree",
      description: "Recursive branching tree",
      author: "drawfinity",
      tags: ["fractal", "recursive", "nature"],
      path: "scripts/tree",
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

describe("ExchangeClient", () => {
  let client: ExchangeClient;
  const baseUrl = "https://test.example.com/repo/main/";

  beforeEach(() => {
    client = new ExchangeClient(baseUrl);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("fetchIndex", () => {
    it("fetches and returns parsed index from correct URL", async () => {
      const fetchMock = mockFetchOk(MOCK_INDEX);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.fetchIndex();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://test.example.com/repo/main/index.json",
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
      // "fractal" matches koch-curve and tree by description, but only tree has "nature" tag
      const results = await client.searchScripts("fractal", ["nature"]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("tree");
    });

    it("returns empty array when nothing matches", async () => {
      const results = await client.searchScripts("nonexistent");
      expect(results).toHaveLength(0);
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
      );
    });
  });
});
