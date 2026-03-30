# Drawfinity v0.1.0

<p align="center">
  <img src="docs/assets/screenshot-turtle.png" alt="Sakura cherry blossom tree generated with turtle graphics in Drawfinity" width="720">
</p>

We're excited to release **Drawfinity v0.1.0** — a free, open-source infinite canvas for drawing, creative coding, and real-time collaboration.

## What's New

### Infinite Canvas
Pan and zoom without limits across a boundless drawing surface. Momentum panning, log-space zoom, and a dot grid give you a fluid, natural sketching experience.

### Turtle Graphics with Exchange
Write Lua scripts to drive a virtual turtle across the canvas — draw spirals, fractal trees, cherry blossoms, and more. Browse and share scripts through the built-in Turtle Exchange.

### Real-time Collaboration
Draw together with friends in shared rooms. All changes sync instantly and conflict-free via Yjs CRDTs — everyone can draw at the same time without issues.

### Shape Tools
Rectangle, ellipse, polygon, and star tools with pressure-sensitive stroke width for quick geometry.

### Home Screen
A drawing management hub with tabs for local drawings and shared collaboration sessions. Create, rename, duplicate, and delete drawings from one place.

### Gamification
45 badges across 4 tiers, 13 personal records, real-time statistics, and end-of-session summaries to track your creative journey.

### Bookmarks & Camera
Save and recall camera positions with bookmarks. Smooth animated zoom, momentum panning, and infinite zoom let you work at any scale.

### Cross-platform Support
Native desktop app on Linux, macOS, and Windows via Tauri v2. Grab the installer for your platform from the [Releases page](https://github.com/needmorecowbell/drawfinity/releases).

## Screenshots

<table>
<tr>
<td align="center">
<img src="docs/assets/screenshot-canvas.png" alt="Infinite canvas with brush strokes and shapes" width="360"><br>
<em>Infinite canvas drawing</em>
</td>
<td align="center">
<img src="docs/assets/screenshot-turtle.png" alt="Sakura cherry blossom tree generated with turtle graphics" width="360"><br>
<em>Turtle graphics — sakura tree</em>
</td>
</tr>
<tr>
<td align="center">
<img src="docs/assets/screenshot-zoom.png" alt="Infinite zoom with worlds nested within paintings" width="360"><br>
<em>Infinite zoom — worlds within worlds</em>
</td>
<td align="center">
<img src="docs/assets/screenshot-collab.png" alt="Two users drawing together in a shared collaboration room" width="360"><br>
<em>Real-time collaboration</em>
</td>
</tr>
</table>

## Getting Started

- **Download:** Grab the latest build from the [Releases page](https://github.com/needmorecowbell/drawfinity/releases)
- **Documentation:** Read the full docs at [needmorecowbell.github.io/drawfinity](https://needmorecowbell.github.io/drawfinity/)
- **Build from source:** Clone the repo and run `make dev` — see the [README](README.md) for details

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript, Vite, WebGL2 (raw shaders) |
| Desktop | Tauri v2 (Rust + WebKitGTK/WebView2) |
| Data sync | Yjs CRDTs with y-websocket |
| Server | Rust, Axum, Tokio |
| Rendering | Triangle strip geometry, spatial indexing, Douglas-Peucker LOD, vertex caching |
| Persistence | Binary Yjs state encoding via Tauri plugin-fs |
