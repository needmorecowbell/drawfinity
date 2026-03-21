import type {
  ExchangeIndex,
  ExchangeScript,
  CachedScript,
} from "./ExchangeTypes";

const KEY_PREFIX = "drawfinity:exchange:";
const INDEX_KEY = `${KEY_PREFIX}index`;
const SCRIPT_KEY_PREFIX = `${KEY_PREFIX}script:`;

/** Cached index stored in localStorage — includes the version for staleness checks. */
export interface CachedExchangeIndex extends ExchangeIndex {
  /** Unix millisecond timestamp of when this index was cached. */
  cachedAt: number;
}

/**
 * Manages localStorage-based caching of exchange scripts and index data.
 * Provides offline access to previously fetched scripts and enables
 * version-based update detection.
 */
export class ExchangeCache {
  /** Retrieve the cached exchange index, or null if not cached. */
  getCachedIndex(): CachedExchangeIndex | null {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedExchangeIndex;
    } catch {
      return null;
    }
  }

  /** Store the exchange index in the local cache. */
  setCachedIndex(index: ExchangeIndex): void {
    const cached: CachedExchangeIndex = {
      ...index,
      cachedAt: Date.now(),
    };
    localStorage.setItem(INDEX_KEY, JSON.stringify(cached));
  }

  /** Retrieve a cached script by id, or null if not cached. */
  getCachedScript(id: string): CachedScript | null {
    const raw = localStorage.getItem(`${SCRIPT_KEY_PREFIX}${id}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedScript;
    } catch {
      return null;
    }
  }

  /** Store a script in the local cache. */
  setCachedScript(script: ExchangeScript): void {
    const cached: CachedScript = {
      ...script,
      cachedAt: Date.now(),
    };
    localStorage.setItem(
      `${SCRIPT_KEY_PREFIX}${script.id}`,
      JSON.stringify(cached),
    );
  }

  /** Retrieve all cached scripts. */
  getAllCachedScripts(): CachedScript[] {
    const scripts: CachedScript[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SCRIPT_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            scripts.push(JSON.parse(raw) as CachedScript);
          } catch {
            // Skip malformed entries
          }
        }
      }
    }
    return scripts;
  }

  /** Remove all exchange-related data from localStorage. */
  clearCache(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }
}
