---
title: Downloads
description: Download Drawfinity desktop app and collaboration server for Linux, macOS, and Windows.
---

# Downloads

## Desktop App {#desktop}

The desktop app includes everything you need to draw — just install and open.

<div style="text-align: center; margin: 2rem 0;">
  <a href="https://github.com/needmorecowbell/drawfinity/releases/latest" style="display: inline-block; padding: 0.75rem 2rem; background: var(--vp-c-brand-1); color: var(--vp-c-white); border-radius: 8px; font-weight: 600; font-size: 1.1rem; text-decoration: none;">Download Latest Release</a>
</div>

Pick the right file for your platform:

| Platform | Format | Filename pattern |
|----------|--------|-----------------|
| **Linux** (Debian/Ubuntu) | `.deb` | `Drawfinity_*_amd64.deb` |
| **Linux** (Fedora/RHEL) | `.rpm` | `Drawfinity-*-1.x86_64.rpm` |
| **Linux** (any distro) | `.AppImage` | `Drawfinity_*_amd64.AppImage` |
| **macOS** (Apple Silicon) | `.dmg` | `Drawfinity_*_aarch64.dmg` |
| **Windows** | `.msi` | `Drawfinity_*_x64_en-US.msi` |
| **Windows** | `.exe` | `Drawfinity_*_x64-setup.exe` |

### Platform notes {#platform-notes}

::: details Linux — system dependencies
All Linux formats require WebKitGTK 4.1 and GTK 3 at runtime:

```bash
# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0

# Arch/Manjaro
sudo pacman -S webkit2gtk-4.1 gtk3

# Fedora
sudo dnf install webkit2gtk4.1 gtk3
```

For `.AppImage`, make it executable first: `chmod +x Drawfinity_*.AppImage`
:::

::: details macOS — unsigned app
Drawfinity is not yet code-signed. On first launch, macOS may block it:

1. Right-click the app and choose **Open**
2. Or go to **System Settings > Privacy & Security** and click **Open Anyway**
:::

::: details Windows — WebView2
Both installers include a WebView2 runtime check. If WebView2 isn't present (rare on modern Windows), it will be installed automatically.
:::

## Collaboration Server {#server}

The server is optional — only needed if you want to draw together with others. It's a lightweight binary that relays drawing updates between clients via WebSocket.

Download directly:

| Platform | Download |
|----------|----------|
| **Linux** (x86_64) | [drawfinity-server-linux-amd64](https://github.com/needmorecowbell/drawfinity/releases/latest/download/drawfinity-server-linux-amd64) |
| **macOS** (ARM64) | [drawfinity-server-macos-arm64](https://github.com/needmorecowbell/drawfinity/releases/latest/download/drawfinity-server-macos-arm64) |
| **Windows** (x86_64) | [drawfinity-server-windows-amd64.exe](https://github.com/needmorecowbell/drawfinity/releases/latest/download/drawfinity-server-windows-amd64.exe) |

Run it:

```bash
chmod +x drawfinity-server-*    # Linux/macOS only
./drawfinity-server-linux-amd64  # starts on port 8080
```

Configure with `--port` and `--data-dir` flags, or `DRAWFINITY_PORT` / `DRAWFINITY_DATA_DIR` environment variables. See [Server Setup](/server-setup) for Docker deployment, reverse proxy, and other options.

## Connect and Draw {#connecting}

1. Open Drawfinity
2. Press <kbd>Ctrl</kbd>+<kbd>K</kbd> to open the connection panel
3. Enter the server URL (e.g., `ws://localhost:8080`) and a room ID
4. Click **Connect**

Anyone in the same room sees each other's strokes in real time.

## Build from Source {#from-source}

Prefer to build it yourself? See the [Getting Started guide](/getting-started) for full instructions.

## All Releases {#all-releases}

Browse every version on the [GitHub Releases page](https://github.com/needmorecowbell/drawfinity/releases).
