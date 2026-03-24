<p align="center">
  <img src="docs/assets/logo.png" alt="Drawfinity logo" width="128" height="128">
</p>

<h1 align="center">Drawfinity</h1>

<p align="center"><em>An infinite canvas for drawing, collaboration, and creative coding.</em></p>

Drawfinity is a free, open-source drawing app with an infinite canvas. Use pressure-sensitive brushes to sketch, write Lua scripts to generate geometric art with turtle graphics, or draw together in real-time with friends. Runs as a native desktop app on Linux, macOS, and Windows.

<!-- Replace placeholder screenshots with actual captures -->
<p align="center">
  <img src="docs/assets/screenshot-canvas.png" alt="Drawfinity canvas with brush strokes and shapes" width="720">
</p>

<p align="center">
  <img src="docs/assets/screenshot-turtle.png" alt="Turtle graphics mode generating a fractal tree" width="720">
</p>

## Features

### Highlights

- **Infinite canvas** — pan and zoom without limits, with momentum and smooth log-space zoom
- **Turtle graphics** — write Lua scripts to generate spirals, fractals, and geometric art
- **Real-time collaboration** — draw together in shared rooms with conflict-free sync
- **Cross-platform** — native desktop app on Linux, macOS, and Windows via Tauri v2

### Drawing Tools

Drawfinity comes with a **brush tool** offering four presets, an **eraser**, and four **shape tools** for quick geometry.

| Preset | Width | Pressure | Opacity | Use case |
|--------|-------|----------|---------|----------|
| **Pen** | 2px | Constant | Full | Technical drawing |
| **Pencil** | 1.5px | Responsive | Pressure-based | Sketching |
| **Marker** | 8px | Low sensitivity | Full | Bold strokes |
| **Highlighter** | 16px | Constant | 30% | Overlay marking |

**Shape tools:** Rectangle (`R`), Ellipse (`O`), Polygon (`P`), and Star (`S`). Each supports pressure-sensitive stroke width.

### Turtle Graphics

Open the turtle panel with `` Ctrl+` `` and write Lua scripts to drive a virtual turtle across the canvas. Built-in examples include spirals, fractal trees, and recursive snowflakes — a great way to explore creative coding.

```lua
-- Draw a square
for i = 1, 4 do
  forward(100)
  right(90)
end
```

See [docs/turtle-graphics.md](docs/turtle-graphics.md) for the full API reference.

### Real-time Collaboration

Press `Ctrl+K` to open the connection panel, enter a server URL and room ID, and start drawing with others. All changes sync instantly and conflict-free via Yjs CRDTs — everyone can draw at the same time without issues.

### Camera & Navigation

- **Bookmarks** — save and recall camera positions (`Ctrl+B` to open panel, `Ctrl+D` to quick-add)
- **Momentum panning** — flick the canvas and it glides with inertia
- **Smooth zoom** — scroll wheel, trackpad pinch, or `Ctrl+=`/`Ctrl+-` with animation
- **Dot grid** — toggle a reference grid with `Ctrl+'`

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
