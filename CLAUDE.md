# CLAUDE.md — Agent Guide for Drawfinity

## What is this project?

Drawfinity is an infinite canvas drawing application built with **Tauri v2** (Rust desktop shell) + **TypeScript/Vite** (frontend) + **WebGL2** (rendering). It supports pressure-sensitive brushes, real-time collaboration via WebSocket/Yjs CRDT sync, and local file persistence. There is also a standalone Rust **collaboration server** in `server/`.

## Quick commands

```bash
# Frontend dev (browser only, no Tauri APIs)
npm run dev

# Full desktop app (Tauri + Vite)
npm run tauri dev

# Build production bundle
npm run build

# Run all tests (356 tests, ~2s)
npx vitest run

# Run a specific test file
npx vitest run src/renderer/__tests__/StrokeMesh.test.ts

# Type-check without emitting
npx tsc --noEmit

# Start the collaboration server (from repo root)
cd server && cargo run

# Clean all build artifacts
npm run clean

# Clean everything including WebKitGTK cache (fixes stale UI in Tauri)
npm run clean:cache

# Full clean + restart Tauri dev
npm run tauri:fresh
```

## Architecture overview

```
src/
├── main.ts              # App bootstrap, render loop, keyboard shortcuts
├── styles.css           # All CSS (toolbar, connection panel, HUD)
├── camera/              # Pan/zoom with momentum and animated transitions
├── crdt/                # Yjs CRDT document, stroke adapter, undo manager
├── input/               # Pointer event capture, stroke smoothing
├── model/               # Stroke/Document type definitions
├── persistence/         # Tauri file I/O, auto-save (dynamic import)
├── renderer/            # WebGL2 pipeline: triangle strips, spatial index, LOD, dot grid, vertex cache
├── sync/                # y-websocket SyncManager for collaboration
├── tools/               # Brush presets, eraser, tool manager
└── ui/                  # Toolbar, ConnectionPanel, CursorManager, FpsCounter

server/                  # Rust collaboration server (Axum + Tokio)
├── src/main.rs          # HTTP + WebSocket server entry point
├── src/room.rs          # Room management, broadcast, debounced persistence
├── src/ws.rs            # WebSocket upgrade handler
└── src/persistence.rs   # Binary file persistence for room state
```

## Key design decisions

### Rendering pipeline
- **Triangle strip geometry** (`StrokeMesh.ts`) replaces deprecated `GL_LINE_STRIP` + `gl.lineWidth()`. Each stroke is rendered as filled quads offset along segment normals with miter joins.
- **Batch rendering** — all visible strokes are concatenated into a single `GL_TRIANGLE_STRIP` draw call with degenerate triangles between strips.
- **Spatial indexing** (`SpatialIndex.ts`) — grid-based culling so only viewport-visible strokes are drawn.
- **LOD simplification** (`StrokeLOD.ts`) — Douglas-Peucker algorithm reduces point count at low zoom levels.
- **Vertex caching** (`StrokeVertexCache.ts`) — pre-computed vertex data per stroke, invalidated on document change.

### Data layer
- **Yjs CRDT** is the single source of truth for all strokes. The in-memory `Document.ts` model exists but `DrawfinityDoc.ts` (Yjs wrapper) is what the app actually uses.
- **Stroke opacity** is stored as an optional field (`opacity?: number`, defaults to 1.0). Brush `opacityCurve` and `pressureCurve` functions are applied during stroke capture, not during rendering.
- **Persistence** uses Tauri's `plugin-fs` APIs which are **dynamically imported** in `main.ts` so the app works in a browser without Tauri.

### Collaboration
- The Rust server at `server/` is a simple WebSocket relay — it stores accumulated Yjs state bytes and broadcasts updates.
- The client uses `y-websocket` provider which handles the Yjs sync protocol automatically.
- Connection UI is toggled with `Ctrl+K`.

### Camera
- Zoom range: `1e-10` to `1e10` (effectively infinite).
- Zoom interpolation is done in **log-space** for perceptually uniform speed.
- Momentum/inertia on pan release with exponential friction decay.

## Important patterns and gotchas

### Tauri + WebKitGTK caching
On Linux, Tauri uses WebKitGTK which **aggressively caches** frontend assets. If you change frontend code but the Tauri app still shows old behavior:
1. Kill any zombie Vite processes: `pkill -f vite`
2. Run `npm run clean:cache` to clear dist, Cargo target, and WebKitGTK cache
3. Or use `npm run tauri:fresh` which does both and restarts

### Persistence is dynamically imported
`src/persistence/` uses Tauri-only APIs (`@tauri-apps/plugin-fs`, `@tauri-apps/api/path`). These are loaded via `await import("./persistence")` in `main.ts` to avoid crashing in browser dev mode. If persistence fails, the app falls back to a no-op auto-save stub.

### Brush curves are applied at capture time
`StrokeCapture.ts` applies `pressureCurve()` to raw pointer pressure when building stroke points, and `opacityCurve()` when finalizing the stroke. The renderer (`StrokeMesh.ts`) uses pressure directly for width scaling and passes through the color's alpha unchanged. Do not add pressure-to-opacity multiplication in the mesh generator.

### TypeScript strictness
`tsconfig.json` has `noUnusedLocals` and `noUnusedParameters` enabled. Unused imports will break `npm run build`. Remove them rather than prefixing with `_`.

### Test environment
Tests use **Vitest** with **jsdom** for DOM-dependent tests. WebGL is mocked in renderer tests. Run the full suite with `npx vitest run` — all 316 tests should pass in ~2s.

### Barrel exports
Each module has an `index.ts` barrel. Import from the barrel (`from "./renderer"`) not from individual files, unless you need a specific non-exported type.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `B` | Switch to brush tool |
| `E` | Switch to eraser tool |
| `1`–`4` | Select brush preset (Pen, Pencil, Marker, Highlighter) |
| `[` / `]` | Decrease / increase brush size |
| `Space` + drag | Pan mode |
| `Ctrl+=` / `Ctrl+-` | Animated zoom in/out |
| `Ctrl+0` | Reset zoom to 100% |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo |
| `Ctrl+K` | Toggle connection panel |
| `F3` | Toggle FPS counter |
| Middle mouse drag | Pan |
| Scroll wheel | Zoom (discrete steps) |
| Trackpad pinch | Zoom (continuous) |

## Phase documentation

Detailed implementation plans for each phase are in:
```
Auto Run Docs/Initiation/2026-03-17-Drawfinity-MVP/
├── DRAWFINITY-01-Foundation-and-Canvas.md
├── DRAWFINITY-02-CRDT-Data-Layer-and-Persistence.md
├── DRAWFINITY-02.5-Smooth-Camera-and-Stroke-Rendering.md
├── DRAWFINITY-03-Drawing-Tools-and-Pressure.md
├── DRAWFINITY-04-Collaboration-Server.md
└── DRAWFINITY-05-Polish-and-Cross-Platform.md
```

All phases are complete. Each doc contains checked task lists with implementation details.
