# Drawfinity

An infinite canvas drawing application with pressure-sensitive brushes, real-time collaboration, and a high-performance WebGL rendering pipeline. Built with Tauri v2, TypeScript, and Yjs CRDTs.

## Features

- **Infinite canvas** — pan and zoom without limits (log-space interpolation for smooth zooming)
- **Pressure-sensitive brushes** — 4 presets (Pen, Pencil, Marker, Highlighter) with configurable pressure and opacity curves
- **Real-time collaboration** — connect multiple clients to a shared room via WebSocket; conflict-free sync powered by Yjs CRDTs
- **High-performance rendering** — WebGL2 triangle strip geometry, spatial indexing, LOD simplification, vertex caching, and batched draw calls for 60fps with 1000+ strokes
- **Eraser tool** — remove strokes by proximity, fully undoable
- **Local persistence** — auto-saves to `~/Documents/Drawfinity/drawing.drawfinity`
- **Cross-platform** — runs as a native desktop app on Linux, Windows, and macOS via Tauri

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable toolchain)
- Tauri v2 system dependencies (see below)

#### Linux (Debian/Ubuntu)
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

#### Linux (Arch/Manjaro)
```bash
sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg
```

#### macOS
```bash
xcode-select --install
```

#### Windows
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the C++ workload
- [WebView2 runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10 1803+ and Windows 11)

### Install dependencies

```bash
npm install
```

### Run in development

**Desktop app (recommended):**

```bash
npm run tauri dev
```

**Browser only (drawings saved to localStorage):**

```bash
npm run dev
```

Then open `http://localhost:1420` in your browser.

### Build for production

```bash
npm run tauri build
```

Build artifacts by platform:

| Platform | Format | Location |
|----------|--------|----------|
| Linux | `.deb`, `.rpm` | `src-tauri/target/release/bundle/deb/`, `rpm/` |
| Linux | Binary | `src-tauri/target/release/drawfinity` |
| macOS | `.dmg`, `.app` | `src-tauri/target/release/bundle/dmg/`, `macos/` |
| Windows | `.msi`, `.exe` | `src-tauri/target/release/bundle/msi/`, `nsis/` |

## Collaboration

Drawfinity includes a Rust WebSocket server for real-time multi-user collaboration.

### Start the server

```bash
cd server
cargo run
```

The server listens on port `8080` by default. Configure with:

```bash
cargo run -- --port 9090 --data-dir /path/to/storage
```

Or via environment variables:

```bash
DRAWFINITY_PORT=9090 DRAWFINITY_DATA_DIR=/path/to/storage cargo run
```

### Connect from the app

1. Press `Ctrl+K` to open the connection panel
2. Enter the server URL (default: `ws://localhost:8080`)
3. Enter or generate a room ID
4. Click **Connect**

Multiple clients connected to the same room will see each other's strokes in real time. All changes are conflict-free — draw simultaneously without issues.

Room state is persisted on the server in the data directory, so rooms survive server restarts.

## Controls

| Input | Action |
|-------|--------|
| Left click + drag | Draw |
| Middle mouse drag | Pan |
| Scroll wheel | Zoom |
| Trackpad pinch | Zoom (continuous) |
| `Space` + drag | Pan mode |
| `Ctrl+=` / `Ctrl+-` | Animated zoom in/out |
| `Ctrl+0` | Reset zoom to 100% |
| `B` | Brush tool |
| `E` | Eraser tool |
| `1`–`4` | Select brush preset |
| `[` / `]` | Adjust brush size |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo |
| `Ctrl+K` | Toggle connection panel |
| `F3` | Toggle FPS counter |

## Brush presets

| Preset | Width | Pressure | Opacity | Use case |
|--------|-------|----------|---------|----------|
| **Pen** | 2px | Constant | Full | Technical drawing |
| **Pencil** | 1.5px | Responsive | Pressure-based | Sketching |
| **Marker** | 8px | Low sensitivity | Full | Bold strokes |
| **Highlighter** | 16px | Constant | 30% | Overlay marking |

## Project structure

```
src/                     # TypeScript frontend
├── main.ts              # App entry point and render loop
├── camera/              # Infinite pan/zoom with momentum
├── crdt/                # Yjs CRDT document and undo manager
├── input/               # Pointer capture and stroke smoothing
├── model/               # Stroke and document type definitions
├── persistence/         # Tauri file I/O and auto-save
├── renderer/            # WebGL2 rendering pipeline
├── sync/                # WebSocket collaboration (y-websocket)
├── tools/               # Brush presets, eraser, tool manager
└── ui/                  # Toolbar, connection panel, cursors, FPS

server/                  # Rust collaboration server
├── src/main.rs          # Axum HTTP + WebSocket server
├── src/room.rs          # Room management and broadcast
├── src/ws.rs            # WebSocket handler
└── src/persistence.rs   # Room state persistence

src-tauri/               # Tauri desktop wrapper configuration
```

## Development

### Run tests

```bash
npx vitest run          # All 316 tests
npx vitest --watch      # Watch mode
```

### Type-check

```bash
npx tsc --noEmit
```

### Clean build artifacts

```bash
npm run clean           # Remove dist/ and Cargo target
npm run clean:cache     # Also clear WebKitGTK cache (Linux)
npm run tauri:fresh     # Clean everything and restart Tauri dev
```

## Technology

- **Frontend:** TypeScript, Vite, WebGL2 (raw shaders, no framework)
- **Desktop:** Tauri v2 (Rust + WebKitGTK/WebView2)
- **Data sync:** Yjs CRDTs with y-websocket provider
- **Server:** Rust, Axum, Tokio
- **Rendering:** Triangle strip geometry, spatial indexing (grid-based), Douglas-Peucker LOD, vertex caching, batched draw calls
- **Persistence:** Binary Yjs state encoding via Tauri plugin-fs

## Stylus & Tablet Support

Pressure data is read from `PointerEvent.pressure` and works with:
- **Wacom tablets** on all platforms
- **Windows Ink** via WebView2
- Mouse input defaults to 0.5 pressure, so all brush presets work without a stylus

## Known Issues

- **AppImage builds** may fail on some Linux distributions — use `.deb`/`.rpm` packages or run the binary directly
- **WebKitGTK cache staleness** (Linux): if the UI shows stale content after code changes, run `npm run clean:cache`
- **macOS code signing**: unsigned builds work locally but require signing for distribution

See [`docs/cross-platform-notes.md`](docs/cross-platform-notes.md) for detailed platform notes.

## License

This project is licensed under the [MIT License](LICENSE).
