import type { ExchangeIndex, ExchangeScriptEntry } from "./ExchangeTypes";

const DEFAULT_BASE_URL =
  "https://raw.githubusercontent.com/needmorecowbell/drawfinity_turtle_exchange/main/";

const INDEX_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Descriptive error for exchange fetch failures. */
export class ExchangeError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "ExchangeError";
  }
}

/**
 * Client for the Drawfinity Turtle Exchange — fetches community scripts
 * from the GitHub-hosted exchange repository via raw content URLs.
 */
export class ExchangeClient {
  private readonly baseUrl: string;
  private indexCache: ExchangeIndex | null = null;
  private indexCacheTime = 0;
  private readonly scriptCache = new Map<string, string>();

  constructor(baseUrl?: string) {
    const url = baseUrl ?? DEFAULT_BASE_URL;
    this.baseUrl = url.endsWith("/") ? url : url + "/";
  }

  /** Fetch the exchange index, using an in-memory cache with a 5-minute TTL. */
  async fetchIndex(): Promise<ExchangeIndex> {
    const now = Date.now();
    if (this.indexCache && now - this.indexCacheTime < INDEX_TTL_MS) {
      return this.indexCache;
    }

    const url = `${this.baseUrl}index.json`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new ExchangeError(
        `Network error fetching exchange index: ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      throw new ExchangeError(
        `Failed to fetch exchange index (HTTP ${response.status})`,
        response.status,
      );
    }

    let data: ExchangeIndex;
    try {
      data = (await response.json()) as ExchangeIndex;
    } catch {
      throw new ExchangeError("Exchange index contains malformed JSON");
    }

    this.indexCache = data;
    this.indexCacheTime = now;
    // Clear script cache on index refresh — scripts may have changed
    this.scriptCache.clear();
    return data;
  }

  /** Fetch the Lua source for a specific script. Results are cached in memory. */
  async fetchScript(entry: ExchangeScriptEntry): Promise<string> {
    const cached = this.scriptCache.get(entry.id);
    if (cached !== undefined) return cached;

    const url = `${this.baseUrl}${entry.path}/${entry.id}.lua`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new ExchangeError(
        `Network error fetching script "${entry.title}": ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      throw new ExchangeError(
        `Failed to fetch script "${entry.title}" (HTTP ${response.status})`,
        response.status,
      );
    }

    const code = await response.text();
    this.scriptCache.set(entry.id, code);
    return code;
  }

  /**
   * Search/filter the cached index client-side.
   * - `query` matches title and description (case-insensitive substring).
   * - `tags` matches entries containing any of the specified tags.
   * - If both are provided, both must match.
   */
  async searchScripts(
    query?: string,
    tags?: string[],
  ): Promise<ExchangeScriptEntry[]> {
    const index = await this.fetchIndex();
    let results = index.scripts;

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }

    if (tags && tags.length > 0) {
      results = results.filter((s) => tags.some((t) => s.tags.includes(t)));
    }

    return results;
  }
}
