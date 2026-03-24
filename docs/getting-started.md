---
title: Getting Started
description: Quick-start guide for Drawfinity — Docker, local dev, desktop app, and browser-only paths.
---

# Getting Started

The fastest way to try Drawfinity depends on what you have installed. Pick whichever path suits you.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable toolchain) — needed for the collaboration server and Tauri desktop builds

### Linux (Debian/Ubuntu)

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Linux (Arch/Manjaro)

```bash
sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg
```

### macOS

```bash
xcode-select --install
```

### Windows

- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the C++ workload
- [WebView2 runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10 1803+ and Windows 11)

## Quick start with Docker

If you have Docker and Docker Compose, one command gets everything running — the collaboration server and the frontend:

```bash
make up
```

Open `http://localhost:1420` in your browser and start drawing. Use `make logs` to watch output, `make restart` to rebuild, and `make down` to stop.

## Quick start without Docker

Start both the server and frontend locally:

```bash
make dev
```

This launches the collaboration server on port 8080 and Vite on port 1420. Stop everything with `make stop`.

## Desktop app

For the full native experience with file save/load and tablet support:

```bash
make tauri
```

This starts Tauri in dev mode with hot-reload. For a production build: `npm run tauri build`.

| Platform | Format | Location |
|----------|--------|----------|
| Linux | `.deb`, `.rpm`, Binary | `src-tauri/target/release/bundle/` |
| macOS | `.dmg`, `.app` | `src-tauri/target/release/bundle/` |
| Windows | `.msi`, `.exe` | `src-tauri/target/release/bundle/` |

## Browser only

If you just want to sketch without a server:

```bash
npm run dev
```

Open `http://localhost:1420`. Drawings are saved to localStorage (no collaboration in this mode).

## What's next?

- Explore the [Features](./features) Drawfinity offers
- Learn about [Collaboration](./collaboration) and drawing with others
- Try [Turtle Graphics](./turtle-graphics) for creative coding
- See the full [Keyboard Shortcuts](./shortcuts) reference
