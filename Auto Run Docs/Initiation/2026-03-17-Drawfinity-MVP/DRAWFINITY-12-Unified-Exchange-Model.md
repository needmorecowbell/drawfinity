# Phase 12: Unified Exchange Model (Obsidian-style)

Redesign the turtle script system so the exchange repo (`needmorecowbell/drawfinity_turtle_exchange`) is the **single source of truth** for all turtle scripts — including the original 5 examples currently hardcoded in `TurtleExamples.ts`. This eliminates dual-maintenance and adopts an Obsidian-style model: build-time snapshot for offline/first-run, background update checks on app load, and user-driven opt-in updates.

## Prerequisites

- Phase 10 (exchange repo with 5 seeded scripts) is complete
- Phase 11 (exchange client + UI) is complete

## Architecture

### Script Lifecycle

```
Exchange Repo (GitHub)
        │
        ▼
  Build-time: generate snapshot JSON from repo ──► Bundled in app as fallback
        │
        ▼
  App loads ──► Background fetch of remote index.json
        │
        ▼
  Compare remote index vs local cache (version field)
        │
        ▼
  Updates available? ──► Show indicator (badge/dot), NOT auto-update
        │
        ▼
  User opens script browser ──► See installed/updatable/new scripts
        │
        ▼
  User chooses to update ──► Fetch new .lua files ──► Update local cache
```

### Offline Fallback Chain

1. **Local cache** (localStorage) — scripts the user has fetched or updated
2. **Bundled snapshot** — build-time JSON asset generated from the exchange repo

The app always has scripts available, even on first launch with no network.

### Exchange Repo Contract Update

The `index.json` needs a `version` field for cache invalidation:

```json
{
  "version": "2026-03-21T00:00:00Z",
  "scripts": [
    {
      "id": "koch-curve",
      "title": "Koch Curve",
      "description": "Recursive Koch snowflake fractal",
      "author": "drawfinity",
      "tags": ["fractal", "recursive", "math"],
      "path": "scripts/koch-curve",
      "version": "1.0.0"
    }
  ]
}
```

Per-script `version` fields enable granular update detection (user can see which specific scripts have updates).

## Tasks

### Exchange Repo Updates

- [x] Add top-level `version` field (ISO timestamp) to `index.json` in the exchange repo — bumped whenever any script changes
- [x] Add per-script `version` field (semver string, e.g., `"1.0.0"`) to each entry in `index.json` and each `metadata.json`
  - *Completed: Added `"version": "2026-03-21T00:00:00Z"` top-level field and `"version": "1.0.0"` to all 5 script entries in `index.json` and all 5 `metadata.json` files. Committed and pushed to `needmorecowbell/drawfinity_turtle_exchange`.*

### Type Updates (`src/turtle/exchange/ExchangeTypes.ts`)

- [x] Add `version` field to `ExchangeScriptEntry` interface. Add `ExchangeIndex.version` (string, ISO timestamp). Add `CachedScript` interface to represent a locally stored script: extends `ExchangeScript` with `cachedAt: number` (Unix ms timestamp) and `version: string`. Add `ExchangeSnapshot` type alias for the bundled build-time data (same shape as `ExchangeIndex` but with `code` included per entry)
  - *Completed: All types already implemented in `src/turtle/exchange/ExchangeTypes.ts` — `ExchangeScriptEntry.version`, `ExchangeIndex.version`, `CachedScript` (extends `ExchangeScript` with `cachedAt`), `ExchangeSnapshot` type alias, and `UpdateCheckResult` interface. Exported via barrel in `src/turtle/exchange/index.ts`.*

### Build-time Snapshot Generator

- [x] Create `scripts/generate-exchange-snapshot.ts` (or `.mjs`) — a Node script that fetches the current exchange repo `index.json` and all `.lua` files, then writes a single `src/turtle/exchange/exchange-snapshot.json` containing the full index with inline script code. Add an `exchange:snapshot` npm script in `package.json` that runs this generator. The snapshot file should be `.gitignore`d if we want fresh builds to always pull latest, OR committed if we want reproducible offline builds — default to committed for reliability
  - *Already completed: `scripts/generate-exchange-snapshot.mjs` exists with remote (GitHub) and `--local` modes, `exchange:snapshot` npm script in `package.json`, and committed `exchange-snapshot.json` with 5 bundled scripts.*

### Local Cache Layer (`src/turtle/exchange/ExchangeCache.ts`)

- [ ] Create `ExchangeCache` class that manages localStorage-based script storage. Key design: store under `drawfinity:exchange:index` (cached index with version) and `drawfinity:exchange:script:{id}` (individual cached scripts with version and code). Implement methods: `getCachedIndex(): CachedExchangeIndex | null`, `setCachedIndex(index: ExchangeIndex): void`, `getCachedScript(id: string): CachedScript | null`, `setCachedScript(script: ExchangeScript): void`, `getAllCachedScripts(): CachedScript[]`, `clearCache(): void`

### Update Detection (`src/turtle/exchange/ExchangeClient.ts`)

- [ ] Extend `ExchangeClient` with update-awareness. Add `checkForUpdates(): Promise<UpdateCheckResult>` that fetches the remote index and compares against the local cache. `UpdateCheckResult` should contain: `hasUpdates: boolean`, `newScripts: ExchangeScriptEntry[]` (scripts in remote but not in cache), `updatedScripts: Array<{ entry: ExchangeScriptEntry, currentVersion: string, newVersion: string }>` (scripts where remote version > cached version), `remoteIndex: ExchangeIndex`. This method should be called on app load (background, non-blocking). Update `fetchScript()` to write through to `ExchangeCache` after fetching

### Unified Script Browser UI (`src/ui/TurtlePanel.ts`)

- [ ] Replace the separate "Examples" dropdown and "Community" button with a single unified script browser. The browser should show all scripts from the exchange (using cached data or snapshot as fallback). Each script entry shows: title, description, author, tags, and status — one of "installed" (in cache, up to date), "update available" (in cache, newer version exists), or "available" (not yet cached). Add an "Updates Available" badge/indicator on the browser toggle button when `checkForUpdates()` finds changes. Do NOT auto-update — user explicitly clicks "Update" per script or "Update All"

- [ ] Remove the `TURTLE_EXAMPLES` import and the Examples dropdown `<select>` element from `TurtlePanel.ts`. The unified browser replaces both entry points. Ensure the "Import" action still populates the editor textarea and saves to localStorage as before

### Remove Built-in Examples

- [ ] Delete `src/turtle/TurtleExamples.ts`. Remove its export from `src/turtle/index.ts`. Remove any imports of `TURTLE_EXAMPLES` across the codebase (likely `TurtlePanel.ts` and any tests that reference it). The exchange snapshot and cache now serve this role entirely

### Startup Integration (`src/canvas/CanvasApp.ts` or `src/main.ts`)

- [ ] On app startup, call `exchangeClient.checkForUpdates()` in the background (non-blocking, fire-and-forget with error catch). Store the result so the TurtlePanel can display the update indicator when opened. If the check fails (offline), silently fall back to cached data — no error shown to user unless they explicitly open the browser and have zero cached scripts

### Snapshot Fallback Integration

- [ ] In `ExchangeClient` or `ExchangeCache`, add fallback logic: when the cache is empty (first launch, cleared cache) and network is unavailable, load scripts from the bundled `exchange-snapshot.json` (static import or dynamic import). This ensures the app always has the baseline scripts available

### Tests

- [ ] Test `ExchangeCache`: write/read index and scripts to localStorage, cache miss returns null, `clearCache()` empties all exchange keys, `getAllCachedScripts()` returns all stored scripts
- [ ] Test `checkForUpdates()`: mock remote index with newer versions, verify `newScripts` and `updatedScripts` are correctly identified. Test with empty cache (all scripts are "new"). Test with up-to-date cache (no updates)
- [ ] Test snapshot fallback: when cache is empty and fetch fails, scripts load from bundled snapshot
- [ ] Test unified browser UI: verify scripts render with correct status indicators (installed/update available/available), verify update action fetches and caches the new version, verify the old Examples dropdown is gone
- [ ] Update existing `ExchangeClient.test.ts` and `TurtlePanelExchange.test.ts` to reflect the unified model — remove references to `TURTLE_EXAMPLES` and the separate Examples dropdown

### Cleanup

- [ ] Remove any remaining references to `TurtleExamples` in `CLAUDE.md`, phase docs, or comments. Update `CLAUDE.md` keyboard shortcuts or architecture sections if they reference built-in examples

## Design Decisions

- **Obsidian-style updates** — users are notified of available updates but never forced to accept them. This respects user agency and avoids breaking scripts mid-session
- **Build-time snapshot for offline** — guarantees first-run experience without network, while keeping the exchange repo as the single source of truth. No dual-maintenance of script content
- **localStorage for cache** — simple, synchronous, works in both Tauri and browser contexts. IndexedDB would be overkill for the expected catalog size (tens to low hundreds of scripts)
- **Per-script versioning** — enables granular update detection so users can see exactly what changed, rather than an opaque "updates available" message
- **Background update check on app load** — non-intrusive, doesn't block startup, results are ready by the time the user opens the turtle panel
- **Unified browser replaces dual UI** — eliminates the confusing split between "Examples" and "Community". All scripts are exchange scripts, some are just already cached locally
