---
title: Cross-Platform Notes
description: Build instructions, platform-specific issues, and compatibility notes for Linux, macOS, and Windows.
---

# Cross-Platform Build & Compatibility Notes

## Build Commands

### Prerequisites (all platforms)
- Node.js 18+
- Rust toolchain (rustup)
- npm dependencies: `npm install`

### Linux
```bash
# System dependencies (Debian/Ubuntu)
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# System dependencies (Arch/Manjaro)
sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg

# Dev mode
npm run tauri dev

# Production build (produces .deb and .rpm)
npm run tauri build

# Clean build (clears WebKitGTK cache too)
npm run tauri:fresh
```

### macOS
```bash
# Xcode command line tools required
xcode-select --install

# Dev mode
npm run tauri dev

# Production build (produces .dmg and .app)
npm run tauri build
```

### Windows
```bash
# Requires: Visual Studio Build Tools with C++ workload, WebView2 runtime
# WebView2 is pre-installed on Windows 10 (1803+) and Windows 11

# Dev mode
npm run tauri dev

# Production build (produces .msi and .exe installer)
npm run tauri build
```

## Known Issues

### Linux
- **AppImage bundling fails**: `linuxdeploy` fails during AppImage creation on some distributions. The `.deb` and `.rpm` packages build successfully. Workaround: install via `.deb`/`.rpm` or run the binary directly from `src-tauri/target/release/drawfinity`.
- **WebKitGTK cache staleness**: After code changes, the WebKitGTK webview may serve stale cached assets. Use `npm run clean:cache` or `npm run tauri:fresh` to clear the cache.
- **Wayland**: Tauri uses GTK which supports Wayland natively. No special configuration needed, though some window decorations may differ from X11.

### macOS
- **Bundle identifier**: Changed from `com.drawfinity.app` to `com.drawfinity.canvas` to avoid conflicts with the `.app` bundle extension on macOS.
- **Code signing**: Production builds require code signing for distribution. For local testing, unsigned builds work fine.
- **Apple Silicon**: Tauri builds natively for the host architecture. Cross-compilation requires `rustup target add aarch64-apple-darwin` or `x86_64-apple-darwin`.

### Windows
- **WebView2**: Required runtime. Pre-installed on modern Windows but may need manual install on older systems. The Tauri installer can bootstrap it.
- **Long paths**: Enable long path support if the project is deeply nested (`git config --system core.longpaths true`).

## Tablet / Stylus Input Notes

- **Wacom tablets**: Pointer events with pressure data work through the browser's PointerEvent API, which WebKitGTK and WebView2 both support. The app reads `event.pressure` for pressure-sensitive brush strokes.
- **Apple Pencil (iPad)**: Not applicable — Tauri targets desktop platforms only.
- **Windows Ink**: Supported through PointerEvent API in WebView2. Pressure and tilt data are available.
- **Linux libinput**: Wacom and other tablets report pressure through libinput → X11/Wayland → browser PointerEvent chain. Works out of the box on most distributions.

## Test Checklist (per platform)

- [ ] App launches and displays canvas
- [ ] Drawing with mouse works (click and drag creates strokes)
- [ ] Pan (middle mouse / Space+drag) and zoom (scroll wheel) work
- [ ] Strokes persist across app restart (Tauri FS plugin save/load)
- [ ] Toolbar and keyboard shortcuts function (B=brush, E=eraser, Ctrl+Z=undo, Ctrl+Shift+Z=redo)
- [ ] WebSocket collaboration connects and syncs (when server is running)
- [ ] Pressure-sensitive input works with stylus/tablet (if available)
- [ ] Window resizes correctly and canvas fills the viewport
- [ ] Custom cursors display correctly for brush/eraser tools
- [ ] Dot grid background renders and scales with zoom

## Build Artifacts

| Platform | Format | Location |
|----------|--------|----------|
| Linux | .deb | `src-tauri/target/release/bundle/deb/` |
| Linux | .rpm | `src-tauri/target/release/bundle/rpm/` |
| Linux | Binary | `src-tauri/target/release/drawfinity` |
| macOS | .dmg | `src-tauri/target/release/bundle/dmg/` |
| macOS | .app | `src-tauri/target/release/bundle/macos/` |
| Windows | .msi | `src-tauri/target/release/bundle/msi/` |
| Windows | .exe | `src-tauri/target/release/bundle/nsis/` |
