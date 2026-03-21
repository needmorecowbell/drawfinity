# Phase 11: Turtle Exchange Client Integration

Implement client-side integration in Drawfinity to browse, search, and import community turtle scripts from the `drawfinity_turtle_exchange` GitHub repository. This phase builds on Phase 10, which established the exchange repo as a static GitHub-hosted script library with PR-based contributions.

## Prerequisites

- Phase 10 (exchange repo setup) is complete — the repo at `needmorecowbell/drawfinity_turtle_exchange` contains `index.json`, `scripts/` folders with `.lua` and `metadata.json` files, and `CONTRIBUTING.md`

## Architecture

The client fetches data directly from GitHub raw content URLs. No API server is involved.

### Data Flow

```
GitHub Raw Content (CDN)
  │
  ├── GET index.json ──────────────► Client caches in memory (TTL: 5 min)
  │                                    └── Browse/search/filter happens client-side
  │
  └── GET scripts/{id}/{id}.lua ───► Loaded into turtle editor on user request
```

### GitHub Raw Content URLs

- **Index**: `https://raw.githubusercontent.com/needmorecowbell/drawfinity_turtle_exchange/main/index.json`
- **Script code**: `https://raw.githubusercontent.com/needmorecowbell/drawfinity_turtle_exchange/main/scripts/{id}/{id}.lua`
- **Metadata**: `https://raw.githubusercontent.com/needmorecowbell/drawfinity_turtle_exchange/main/scripts/{id}/metadata.json`

### Exchange Repo Contract

The client depends on the following structure in the exchange repo:

**`index.json`** — master catalog fetched on exchange panel open:
```json
{
  "scripts": [
    {
      "id": "koch-curve",
      "title": "Koch Curve",
      "description": "Recursive Koch snowflake fractal",
      "author": "drawfinity",
      "tags": ["fractal", "recursive", "math"],
      "path": "scripts/koch-curve"
    }
  ]
}
```

**`scripts/{id}/metadata.json`** — per-script metadata (same fields as index entry, minus `id` and `path`):
```json
{
  "title": "Koch Curve",
  "description": "Recursive Koch snowflake fractal",
  "author": "drawfinity",
  "tags": ["fractal", "recursive", "math"]
}
```

**`scripts/{id}/{id}.lua`** — the Lua source code, using Drawfinity's turtle API commands.

## Tasks

### Types (`src/turtle/exchange/ExchangeTypes.ts`)

- [ ] Define `ExchangeScriptEntry` interface matching `index.json` entries:
  - `id: string` — unique script identifier (matches folder name)
  - `title: string` — display name
  - `description: string` — brief description
  - `author: string` — contributor name
  - `tags: string[]` — categorization tags
  - `path: string` — relative path to script folder (e.g., `"scripts/koch-curve"`)

- [ ] Define `ExchangeIndex` interface: `{ scripts: ExchangeScriptEntry[] }`

- [ ] Define `ExchangeScript` interface extending `ExchangeScriptEntry` with `code: string` for the loaded Lua source

### GitHub Fetcher (`src/turtle/exchange/ExchangeClient.ts`)

- [ ] Create `ExchangeClient` class with configurable base URL:
  - Default: `https://raw.githubusercontent.com/needmorecowbell/drawfinity_turtle_exchange/main/`
  - Constructor accepts override for testing

- [ ] Implement `fetchIndex(): Promise<ExchangeIndex>`:
  - Fetch and parse `index.json` from GitHub raw content
  - Cache result in memory with a TTL (5 minutes recommended)
  - Return cached version if within TTL window
  - On cache miss or expiry, re-fetch from GitHub

- [ ] Implement `fetchScript(entry: ExchangeScriptEntry): Promise<string>`:
  - Fetch the `.lua` file from `{baseUrl}/{entry.path}/{entry.id}.lua`
  - Return the raw Lua source code as a string
  - Cache loaded scripts in memory (scripts are immutable between index refreshes)

- [ ] Implement `searchScripts(query?: string, tags?: string[]): Promise<ExchangeScriptEntry[]>`:
  - Filter the cached index client-side
  - Text search matches against title and description (case-insensitive)
  - Tag filter matches entries that include any of the specified tags
  - If both query and tags are provided, both must match

- [ ] Handle error cases gracefully:
  - Network offline: show user-friendly error in UI, don't crash
  - GitHub rate limiting (rare for raw content, but handle 403/429)
  - Malformed JSON: log error, show fallback message
  - Individual script fetch failure: show error for that script, don't block browsing

- [ ] Export `ExchangeError` class with descriptive messages

### Barrel Exports (`src/turtle/exchange/index.ts`)

- [ ] Create barrel re-exporting all types and `ExchangeClient`
- [ ] Re-export from `src/turtle/index.ts`

### Exchange UI in TurtlePanel (`src/ui/TurtlePanel.ts`)

- [ ] Add "Community Scripts" button in the turtle panel control bar (alongside existing Examples dropdown):
  - Button opens an exchange browse overlay/panel within the turtle panel area
  - Uses a browse icon or label like "Community" or "Exchange"

- [ ] Build the exchange browse view:
  - On open, fetch `index.json` via `ExchangeClient.fetchIndex()`
  - Show loading spinner while fetching
  - Display scripts as a scrollable list with: title, description, author, tags
  - Tags displayed as small badges/pills

- [ ] Add search/filter controls:
  - Text input for searching by title/description
  - Tag filter buttons (populated from available tags across all scripts)
  - Filtering happens client-side against the cached index

- [ ] Add "Import" action per script:
  - Button on each script entry
  - On click, fetch the `.lua` source via `ExchangeClient.fetchScript()`
  - Show loading state on the button while fetching
  - On success, populate the turtle editor textarea with the fetched code
  - Auto-save to localStorage per existing behavior
  - Close the exchange browse view after import

- [ ] Handle error and empty states:
  - Network error: show message with retry button
  - No results for search: "No scripts match your search"
  - Loading: spinner or skeleton placeholders

- [ ] Add CSS styles for the exchange browse view in `src/styles.css`:
  - Script list items with hover states
  - Tag badges
  - Search input styling consistent with existing UI
  - Loading and error state styling

### Tests

- [ ] Test `ExchangeClient`:
  - Mock `fetch` globally in tests
  - Test `fetchIndex()` returns parsed index, verify URL construction
  - Test caching: second call within TTL returns cached result without re-fetching
  - Test cache expiry: call after TTL triggers new fetch
  - Test `fetchScript()` constructs correct URL from entry path and id
  - Test `searchScripts()` filters by text query (case-insensitive)
  - Test `searchScripts()` filters by tags
  - Test combined text + tag filtering
  - Test error handling: non-200 responses throw `ExchangeError`
  - Test error handling: network failure throws descriptive error

- [ ] Test Exchange UI (if adding DOM tests):
  - Verify exchange button appears in turtle panel
  - Verify script list renders from mock index data
  - Verify import action populates the editor

## Design Decisions

- **No server needed** — GitHub raw content CDN serves as the read-only data source, eliminating hosting and maintenance costs
- **PR-based contributions** — community scripts are submitted as pull requests to the exchange repo, providing natural code review and curation
- **Client-side filtering** — the script catalog will be small enough (tens to low hundreds) that filtering in the browser is simpler and faster than any server-side solution
- **In-memory caching with TTL** — avoids hammering GitHub on every panel open, while ensuring new scripts appear within minutes of being merged
- **Graceful degradation** — if GitHub is unreachable, the exchange UI shows an error but the existing turtle system (local scripts, built-in examples) works perfectly fine
- **Single index fetch** — one request gets the full catalog; individual `.lua` files are fetched only when the user explicitly imports a script
- **Separate from built-in examples** — the exchange supplements the existing Examples dropdown, not replace it. Built-in examples remain bundled in the app for offline availability
