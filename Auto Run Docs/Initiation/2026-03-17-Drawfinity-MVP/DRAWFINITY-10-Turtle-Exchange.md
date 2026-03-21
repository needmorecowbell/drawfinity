# Phase 10: Turtle Script Exchange (GitHub-based)

Add a community turtle script exchange to Drawfinity, powered by a static GitHub repository. Users can browse and import shared turtle scripts directly from the exchange repo. Contributors submit new scripts via pull requests.

## Architecture

The exchange is a **static GitHub repository** (`needmorecowbell/drawfinity_turtle_exchange`) containing Lua turtle scripts with metadata. No server or API is needed — Drawfinity fetches raw files directly from GitHub.

### Exchange Repo Structure
```
drawfinity_turtle_exchange/
├── index.json                    # Master index of all scripts (client fetches this)
├── CONTRIBUTING.md               # How to submit a script via PR
├── scripts/
│   ├── spiral/
│   │   ├── script.lua            # Lua source code
│   │   └── metadata.json         # { title, description, author, tags }
│   ├── star/
│   │   ├── script.lua
│   │   └── metadata.json
│   ├── koch-curve/
│   │   ├── script.lua
│   │   └── metadata.json
│   ├── tree/
│   │   ├── script.lua
│   │   └── metadata.json
│   └── sierpinski-triangle/
│       ├── script.lua
│       └── metadata.json
```

### index.json Format
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

### metadata.json Format (per script)
```json
{
  "title": "Koch Curve",
  "description": "Recursive Koch snowflake fractal",
  "author": "drawfinity",
  "tags": ["fractal", "recursive", "math"]
}
```

## Tasks

### Client-side Integration (Drawfinity)

- [ ] Create `src/turtle/exchange/ExchangeTypes.ts` — TypeScript types for the exchange:
  - `ExchangeScriptEntry` — entry from `index.json` (id, title, description, author, tags, path)
  - `ExchangeIndex` — the full `index.json` shape (`{ scripts: ExchangeScriptEntry[] }`)
  - `ExchangeScript` — full script with code loaded (extends entry with `code: string`)

- [ ] Create `src/turtle/exchange/ExchangeClient.ts` — GitHub-based script fetcher:
  - Base URL: `https://raw.githubusercontent.com/needmorecowbell/drawfinity_turtle_exchange/main/`
  - `fetchIndex()` — fetch and parse `index.json`, cache result in memory with a TTL (e.g., 5 minutes)
  - `fetchScript(entry)` — fetch the `.lua` file from `{base}/{entry.path}/script.lua`
  - `searchScripts(query?)` — filter the cached index by title/description/tags (client-side filtering)
  - Handle fetch failures gracefully (offline, rate-limited, etc.)

- [ ] Create `src/turtle/exchange/index.ts` — barrel exports, re-export from `src/turtle/index.ts`

- [ ] Add Exchange UI to TurtlePanel (`src/ui/TurtlePanel.ts`):
  - Add an "Exchange" button/tab alongside the existing "Examples" dropdown
  - Show a browsable list of community scripts fetched from the exchange
  - Each entry shows: title, description, author, tags
  - Optional search/filter by text or tags
  - "Import" button on each script that loads the Lua code into the editor
  - Loading states and error handling for network failures

- [ ] Write tests for the exchange client (mock fetch, verify URL construction, caching behavior, error handling)

### Exchange Repository Setup (drawfinity_turtle_exchange)

- [ ] Remove existing Rust/Axum code (src/, Cargo.toml, Cargo.lock, etc.)
- [ ] Create `scripts/` directory structure with folders per script
- [ ] Seed with 5 built-in examples from Drawfinity: Spiral, Star, Koch Curve, Tree, Sierpinski Triangle
- [ ] Create `index.json` at repo root listing all scripts
- [ ] Add `CONTRIBUTING.md` with instructions for submitting scripts via PR
- [ ] Commit and push

## Design Decisions

- **No server needed** — GitHub's raw content hosting serves as the "API"
- **PR-based contributions** — community scripts are submitted as pull requests, reviewed, and merged
- **Client-side filtering** — since the script count will be manageable, search/filter happens in the browser
- **Graceful degradation** — if GitHub is unreachable, the exchange UI shows an error but the rest of the turtle system works fine
- **index.json as manifest** — single fetch to get the full catalog, individual fetches only when a user wants to import a specific script
