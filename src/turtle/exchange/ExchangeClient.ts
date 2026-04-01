import type {
  ExchangeIndex,
  ExchangeScriptEntry,
  UpdateCheckResult,
} from "./ExchangeTypes";
import type { ExchangeCache } from "./ExchangeCache";

const DEFAULT_BASE_URL =
  "https://raw.githubusercontent.com/needmorecowbell/drawfinity_turtle_exchange/main/";

const INDEX_TTL_MS = 5 * 60 * 1000; // 5 minutes
const INDEX_TIMEOUT_MS = 8000;
const SCRIPT_TIMEOUT_MS = 5000;

/**
 * Attempt a fetch via the Tauri HTTP plugin (Rust-side networking).
 * Returns null if the plugin is unavailable (e.g. running in browser).
 * Accepts an optional timeout to prevent unbounded waits.
 */
async function tauriFetch(
  url: string,
  timeoutMs?: number,
): Promise<Response | null> {
  try {
    const { fetch: tFetch } = await import("@tauri-apps/plugin-http");
    if (timeoutMs != null) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await tFetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    }
    return await tFetch(url);
  } catch {
    return null; // Not running in Tauri, or plugin not available
  }
}

/**
 * Fetch with an AbortController-based timeout.
 * Tries standard fetch first; if it fails for any reason (including timeout),
 * retries once via Tauri HTTP plugin (which bypasses WebView2's network stack
 * on Windows where standard fetch may hang).
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    // Always try Tauri HTTP fallback — handles both immediate failures
    // (e.g. WebView2 cross-origin TypeError) and timeouts (e.g. WebView2 hang).
    const tauriResponse = await tauriFetch(url, timeoutMs);
    if (tauriResponse) return tauriResponse;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Descriptive error for exchange fetch failures. */
export class ExchangeError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "ExchangeError";
  }
}

/**
 * Compare two semver-like version strings.
 * Returns true if `remote` is newer than `local`.
 */
function isNewerVersion(local: string, remote: string): boolean {
  const parseParts = (v: string) => v.split(".").map((n) => parseInt(n, 10));
  const localParts = parseParts(local);
  const remoteParts = parseParts(remote);
  const len = Math.max(localParts.length, remoteParts.length);
  for (let i = 0; i < len; i++) {
    const l = localParts[i] ?? 0;
    const r = remoteParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
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
  private readonly cache: ExchangeCache | null;

  constructor(baseUrl?: string, cache?: ExchangeCache) {
    const url = baseUrl ?? DEFAULT_BASE_URL;
    this.baseUrl = url.endsWith("/") ? url : url + "/";
    this.cache = cache ?? null;
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
      response = await fetchWithTimeout(url, INDEX_TIMEOUT_MS);
    } catch (err) {
      const e = err as Error;
      console.warn("[Exchange] fetch failed for index", {
        url,
        name: e.name,
        message: e.message,
      });
      if (e.name === "AbortError") {
        throw new ExchangeError("Request timed out fetching exchange index");
      }
      throw new ExchangeError(
        `Network error fetching exchange index: ${e.message}`,
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

  /** Fetch the Lua source for a specific script. Results are cached in memory and written through to ExchangeCache. */
  async fetchScript(entry: ExchangeScriptEntry): Promise<string> {
    const cached = this.scriptCache.get(entry.id);
    if (cached !== undefined) return cached;

    const url = `${this.baseUrl}${entry.path}/${entry.id}.lua`;
    let response: Response;
    try {
      response = await fetchWithTimeout(url, SCRIPT_TIMEOUT_MS);
    } catch (err) {
      const e = err as Error;
      console.warn("[Exchange] fetch failed for script", {
        url,
        script: entry.title,
        name: e.name,
        message: e.message,
      });
      if (e.name === "AbortError") {
        throw new ExchangeError(
          `Request timed out fetching script "${entry.title}"`,
        );
      }
      throw new ExchangeError(
        `Network error fetching script "${entry.title}": ${e.message}`,
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

    // Write through to persistent cache
    if (this.cache) {
      this.cache.setCachedScript({ ...entry, code });
    }

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

  /**
   * Fetch the remote index and compare against the local cache to detect
   * new and updated scripts. Designed to be called on app load (background,
   * non-blocking). Also updates the cached index in ExchangeCache.
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const remoteIndex = await this.fetchIndex();

    const newScripts: ExchangeScriptEntry[] = [];
    const updatedScripts: UpdateCheckResult["updatedScripts"] = [];

    if (this.cache) {
      // Update the cached index
      this.cache.setCachedIndex(remoteIndex);

      for (const entry of remoteIndex.scripts) {
        const cachedScript = this.cache.getCachedScript(entry.id);
        if (!cachedScript) {
          newScripts.push(entry);
        } else if (isNewerVersion(cachedScript.version, entry.version)) {
          updatedScripts.push({
            entry,
            currentVersion: cachedScript.version,
            newVersion: entry.version,
          });
        }
      }
    } else {
      // Without a cache, all scripts are considered new
      newScripts.push(...remoteIndex.scripts);
    }

    return {
      hasUpdates: newScripts.length > 0 || updatedScripts.length > 0,
      newScripts,
      updatedScripts,
      remoteIndex,
    };
  }
}
