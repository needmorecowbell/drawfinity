/** A single script entry from the exchange index.json catalog. */
export interface ExchangeScriptEntry {
  /** Unique script identifier (matches folder name). */
  id: string;
  /** Display name. */
  title: string;
  /** Brief description. */
  description: string;
  /** Contributor name. */
  author: string;
  /** Categorization tags. */
  tags: string[];
  /** Relative path to script folder (e.g., "scripts/koch-curve"). */
  path: string;
  /** Semver version string (e.g., "1.0.0") for granular update detection. */
  version: string;
}

/** The top-level exchange index structure fetched from index.json. */
export interface ExchangeIndex {
  /** ISO timestamp bumped whenever any script changes (e.g., "2026-03-21T00:00:00Z"). */
  version: string;
  scripts: ExchangeScriptEntry[];
}

/** A fully loaded exchange script (entry + Lua source code). */
export interface ExchangeScript extends ExchangeScriptEntry {
  /** The raw Lua source code. */
  code: string;
}

/** A script stored in the local cache with metadata for staleness detection. */
export interface CachedScript extends ExchangeScript {
  /** Unix millisecond timestamp of when this script was cached. */
  cachedAt: number;
}

/** Build-time snapshot bundled with the app — same as ExchangeIndex but with inline code per entry. */
export type ExchangeSnapshot = {
  version: string;
  scripts: Array<ExchangeScriptEntry & { code: string }>;
};

/** Result of comparing the remote exchange index against the local cache. */
export interface UpdateCheckResult {
  /** Whether any new or updated scripts were found. */
  hasUpdates: boolean;
  /** Scripts present in the remote index but not in the local cache. */
  newScripts: ExchangeScriptEntry[];
  /** Scripts where the remote version is newer than the cached version. */
  updatedScripts: Array<{
    entry: ExchangeScriptEntry;
    currentVersion: string;
    newVersion: string;
  }>;
  /** The remote index that was fetched for comparison. */
  remoteIndex: ExchangeIndex;
}
