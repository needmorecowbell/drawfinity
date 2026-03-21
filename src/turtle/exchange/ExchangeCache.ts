import type {
  ExchangeIndex,
  ExchangeScript,
  ExchangeSnapshot,
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
 *
 * When a snapshot is provided, it serves as the bottom-layer fallback:
 * if the localStorage cache is empty (first launch, cleared cache),
 * scripts and index data are resolved from the bundled snapshot.
 */
export class ExchangeCache {
  private readonly snapshot: ExchangeSnapshot | null;

  constructor(snapshot?: ExchangeSnapshot) {
    this.snapshot = snapshot ?? null;
  }

  /** Retrieve the cached exchange index, or null if not cached (falls back to snapshot). */
  getCachedIndex(): CachedExchangeIndex | null {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as CachedExchangeIndex;
      } catch {
        // fall through to snapshot
      }
    }
    if (this.snapshot) {
      return {
        version: this.snapshot.version,
        scripts: this.snapshot.scripts.map(
          ({ id, title, description, author, tags, path, version }) =>
            ({ id, title, description, author, tags, path, version }),
        ),
        cachedAt: 0,
      };
    }
    return null;
  }

  /** Store the exchange index in the local cache. */
  setCachedIndex(index: ExchangeIndex): void {
    const cached: CachedExchangeIndex = {
      ...index,
      cachedAt: Date.now(),
    };
    localStorage.setItem(INDEX_KEY, JSON.stringify(cached));
  }

  /** Retrieve a cached script by id, or null if not cached (falls back to snapshot). */
  getCachedScript(id: string): CachedScript | null {
    const raw = localStorage.getItem(`${SCRIPT_KEY_PREFIX}${id}`);
    if (raw) {
      try {
        return JSON.parse(raw) as CachedScript;
      } catch {
        // fall through to snapshot
      }
    }
    if (this.snapshot) {
      const snapshotScript = this.snapshot.scripts.find((s) => s.id === id);
      if (snapshotScript) {
        return { ...snapshotScript, cachedAt: 0 };
      }
    }
    return null;
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

  /** Retrieve all cached scripts. Falls back to snapshot for scripts not in localStorage. */
  getAllCachedScripts(): CachedScript[] {
    const scripts: CachedScript[] = [];
    const seenIds = new Set<string>();

    // First, collect all scripts from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SCRIPT_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const script = JSON.parse(raw) as CachedScript;
            scripts.push(script);
            seenIds.add(script.id);
          } catch {
            // Skip malformed entries
          }
        }
      }
    }

    // Then, add any snapshot scripts not already in localStorage
    if (this.snapshot) {
      for (const snapshotScript of this.snapshot.scripts) {
        if (!seenIds.has(snapshotScript.id)) {
          scripts.push({ ...snapshotScript, cachedAt: 0 });
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
