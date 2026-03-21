# Phase 10: Turtle Script Exchange (GitHub-based)

Add a community turtle script exchange to Drawfinity, powered by a static GitHub repository. Users can browse and import shared turtle scripts directly from the exchange repo. Contributors submit new scripts via pull requests.

## Architecture

The exchange is a **static GitHub repository** (`needmorecowbell/drawfinity_turtle_exchange`) containing Lua turtle scripts with metadata. No server or API is needed — Drawfinity fetches raw files directly from GitHub.

### Exchange Repo Structure
```
drawfinity_turtle_exchange/
├── index.json                    # Master index of all scripts (client fetches this)
├── README.md                     # Repo overview with script table
├── CONTRIBUTING.md               # How to submit a script via PR
├── scripts/
│   ├── spiral/
│   │   ├── spiral.lua            # Lua source code (named after the script id)
│   │   └── metadata.json         # { title, description, author, tags }
│   ├── star/
│   │   ├── star.lua
│   │   └── metadata.json
│   ├── koch-curve/
│   │   ├── koch-curve.lua
│   │   └── metadata.json
│   ├── tree/
│   │   ├── tree.lua
│   │   └── metadata.json
│   └── sierpinski-triangle/
│       ├── sierpinski-triangle.lua
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

### Client-side Integration (Drawfinity) — See Phase 11

Client-side implementation is documented in detail in **DRAWFINITY-11-Turtle-Exchange-Client-Integration.md**.

### Exchange Repository Setup (drawfinity_turtle_exchange) — COMPLETE

- [x] Remove existing Rust/Axum code (src/, Cargo.toml, Cargo.lock, etc.)
- [x] Create `scripts/` directory structure with folders per script (each has `{id}.lua` + `metadata.json`)
- [x] Seed with 5 built-in examples from Drawfinity: Spiral, Star, Koch Curve, Tree, Sierpinski Triangle
- [x] Verify Lua logic exactly matches Drawfinity's built-in `TurtleExamples.ts`
- [x] Create `index.json` at repo root listing all scripts
- [x] Add `CONTRIBUTING.md` with instructions for submitting scripts via PR
- [x] Add `README.md` with script overview table
- [x] Commit and push

## Design Decisions

- **No server needed** — GitHub's raw content hosting serves as the "API"
- **PR-based contributions** — community scripts are submitted as pull requests, reviewed, and merged
- **Client-side filtering** — since the script count will be manageable, search/filter happens in the browser
- **Graceful degradation** — if GitHub is unreachable, the exchange UI shows an error but the rest of the turtle system works fine
- **index.json as manifest** — single fetch to get the full catalog, individual fetches only when a user wants to import a specific script
