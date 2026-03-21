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
}

/** The top-level exchange index structure fetched from index.json. */
export interface ExchangeIndex {
  scripts: ExchangeScriptEntry[];
}

/** A fully loaded exchange script (entry + Lua source code). */
export interface ExchangeScript extends ExchangeScriptEntry {
  /** The raw Lua source code. */
  code: string;
}
