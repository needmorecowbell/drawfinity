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

- [x] Create `ExchangeCache` class that manages localStorage-based script storage. Key design: store under `drawfinity:exchange:index` (cached index with version) and `drawfinity:exchange:script:{id}` (individual cached scripts with version and code). Implement methods: `getCachedIndex(): CachedExchangeIndex | null`, `setCachedIndex(index: ExchangeIndex): void`, `getCachedScript(id: string): CachedScript | null`, `setCachedScript(script: ExchangeScript): void`, `getAllCachedScripts(): CachedScript[]`, `clearCache(): void`
  - *Already completed: `ExchangeCache` class fully implemented in `src/turtle/exchange/ExchangeCache.ts` with all required methods and `CachedExchangeIndex` interface. Exported via barrel. 12 tests passing in `ExchangeCache.test.ts`.*

### Update Detection (`src/turtle/exchange/ExchangeClient.ts`)

- [x] Extend `ExchangeClient` with update-awareness. Add `checkForUpdates(): Promise<UpdateCheckResult>` that fetches the remote index and compares against the local cache. `UpdateCheckResult` should contain: `hasUpdates: boolean`, `newScripts: ExchangeScriptEntry[]` (scripts in remote but not in cache), `updatedScripts: Array<{ entry: ExchangeScriptEntry, currentVersion: string, newVersion: string }>` (scripts where remote version > cached version), `remoteIndex: ExchangeIndex`. This method should be called on app load (background, non-blocking). Update `fetchScript()` to write through to `ExchangeCache` after fetching
  - *Already completed: `checkForUpdates()` fully implemented with semver comparison via `isNewerVersion()`, cache write-through in `fetchScript()`, and `UpdateCheckResult` interface in `ExchangeTypes.ts`. 17 tests covering empty cache, up-to-date cache, version bumps, mixed new+updated scripts, and error propagation — all passing.*

### Unified Script Browser UI (`src/ui/TurtlePanel.ts`)

- [x] Replace the separate "Examples" dropdown and "Community" button with a single unified script browser. The browser should show all scripts from the exchange (using cached data or snapshot as fallback). Each script entry shows: title, description, author, tags, and status — one of "installed" (in cache, up to date), "update available" (in cache, newer version exists), or "available" (not yet cached). Add an "Updates Available" badge/indicator on the browser toggle button when `checkForUpdates()` finds changes. Do NOT auto-update — user explicitly clicks "Update" per script or "Update All"
  - *Already completed: `TurtlePanel.ts` has unified "Scripts" button with badge, `openExchangeBrowser()` with status badges (installed/update-available/available), Update All, search/tag filtering, and multi-layer fallback (cache → snapshot → network). 37 tests passing across `TurtlePanel.test.ts` and `TurtlePanelExchange.test.ts`.*

- [x] Remove the `TURTLE_EXAMPLES` import and the Examples dropdown `<select>` element from `TurtlePanel.ts`. The unified browser replaces both entry points. Ensure the "Import" action still populates the editor textarea and saves to localStorage as before
  - *Already completed in prior task: `TurtlePanel.ts` has no `TURTLE_EXAMPLES` import and no Examples `<select>`. The unified Scripts browser replaced both. `importExchangeScript()` calls `setScript()` → `saveScript()` which writes to localStorage correctly. 37 TurtlePanel tests passing.*

### Remove Built-in Examples

- [x] Delete `src/turtle/TurtleExamples.ts`. Remove its export from `src/turtle/index.ts`. Remove any imports of `TURTLE_EXAMPLES` across the codebase (likely `TurtlePanel.ts` and any tests that reference it). The exchange snapshot and cache now serve this role entirely
  - *Completed: Deleted `TurtleExamples.ts` and `TurtleExamples.test.ts`. Removed `TurtleExample` type and `TURTLE_EXAMPLES` exports from `src/turtle/index.ts`. No other references existed in `TurtlePanel.ts` (already cleaned up in prior task). All 1331 tests pass.*

### Startup Integration (`src/canvas/CanvasApp.ts` or `src/main.ts`)

- [x] On app startup, call `exchangeClient.checkForUpdates()` in the background (non-blocking, fire-and-forget with error catch). Store the result so the TurtlePanel can display the update indicator when opened. If the check fails (offline), silently fall back to cached data — no error shown to user unless they explicitly open the browser and have zero cached scripts
  - *Completed: Added `checkForUpdatesInBackground()` to `TurtlePanel` constructor — fire-and-forget with silent error catch. The result is passed to `setUpdateResult()` to show the badge. Two new tests in `TurtlePanelExchange.test.ts` verify badge display on update detection and silent failure on network error. All 1333 tests passing.*

### Snapshot Fallback Integration

- [x] In `ExchangeClient` or `ExchangeCache`, add fallback logic: when the cache is empty (first launch, cleared cache) and network is unavailable, load scripts from the bundled `exchange-snapshot.json` (static import or dynamic import). This ensures the app always has the baseline scripts available
  - *Completed: `ExchangeCache` constructor now accepts an optional `ExchangeSnapshot` parameter. When localStorage is empty, `getCachedIndex()`, `getCachedScript()`, and `getAllCachedScripts()` fall back to snapshot data. `TurtlePanel` passes the bundled snapshot to `ExchangeCache`, and snapshot fallback code in `TurtlePanel` was simplified to use the cache layer. 10 new tests in `ExchangeCache.test.ts` cover snapshot fallback scenarios. All 1343 tests passing.*

### Tests

- [x] Test `ExchangeCache`: write/read index and scripts to localStorage, cache miss returns null, `clearCache()` empties all exchange keys, `getAllCachedScripts()` returns all stored scripts
  - *Already completed: 22 tests in `ExchangeCache.test.ts` covering index read/write, script read/write, cache miss returns null, clearCache preserves non-exchange keys, getAllCachedScripts with malformed entries, and 10 snapshot fallback tests. All passing.*
- [x] Test `checkForUpdates()`: mock remote index with newer versions, verify `newScripts` and `updatedScripts` are correctly identified. Test with empty cache (all scripts are "new"). Test with up-to-date cache (no updates)
  - *Already completed: 10 tests in `ExchangeClient.test.ts` `checkForUpdates` describe block covering empty cache (all new), up-to-date cache (no updates), newer versions, mixed new+updated, major version bumps, cache write-through, and error propagation. All passing.*
- [x] Test snapshot fallback: when cache is empty and fetch fails, scripts load from bundled snapshot
  - *Already completed: 10 snapshot fallback tests in `ExchangeCache.test.ts` plus `TurtlePanelExchange.test.ts` "opens exchange overlay and renders scripts from snapshot immediately" test. All passing.*
- [x] Test unified browser UI: verify scripts render with correct status indicators (installed/update available/available), verify update action fetches and caches the new version, verify the old Examples dropdown is gone
  - *Already completed: `TurtlePanelExchange.test.ts` has tests for Scripts button presence (no Community/Examples), status badges (Installed/Update Available), import action, update button, badge display, and snapshot rendering. All 13 tests passing.*
- [x] Update existing `ExchangeClient.test.ts` and `TurtlePanelExchange.test.ts` to reflect the unified model — remove references to `TURTLE_EXAMPLES` and the separate Examples dropdown
  - *Already completed: No references to `TURTLE_EXAMPLES` exist anywhere in `src/`. Tests use exchange-based mock data throughout. Verified with grep — zero matches.*

### Cleanup

- [ ] Remove any remaining references to `TurtleExamples` in `CLAUDE.md`, phase docs, or comments. Update `CLAUDE.md` keyboard shortcuts or architecture sections if they reference built-in examples

## Design Decisions

- **Obsidian-style updates** — users are notified of available updates but never forced to accept them. This respects user agency and avoids breaking scripts mid-session
- **Build-time snapshot for offline** — guarantees first-run experience without network, while keeping the exchange repo as the single source of truth. No dual-maintenance of script content
- **localStorage for cache** — simple, synchronous, works in both Tauri and browser contexts. IndexedDB would be overkill for the expected catalog size (tens to low hundreds of scripts)
- **Per-script versioning** — enables granular update detection so users can see exactly what changed, rather than an opaque "updates available" message
- **Background update check on app load** — non-intrusive, doesn't block startup, results are ready by the time the user opens the turtle panel
- **Unified browser replaces dual UI** — eliminates the confusing split between "Examples" and "Community". All scripts are exchange scripts, some are just already cached locally
