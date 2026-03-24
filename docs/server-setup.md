---
title: Server Setup
description: Deploy and configure the Drawfinity collaboration server — Docker, standalone, reverse proxy.
---

# Server Setup

The Drawfinity collaboration server is a lightweight Rust application that relays Yjs CRDT updates between connected clients over WebSocket. It handles room management, document persistence, and a REST API for room listing.

## Quick Start with Docker

The fastest way to run the server:

```bash
docker build -t drawfinity-server ./server
docker run -d -p 8080:8080 -v drawfinity-data:/data drawfinity-server
```

The server is now available at `ws://localhost:8080`. Connect from the app using <kbd>Ctrl</kbd>+<kbd>K</kbd>.

### Docker Compose

```yaml
services:
  drawfinity-server:
    build: ./server
    ports:
      - "8080:8080"
    volumes:
      - drawfinity-data:/data
    environment:
      DRAWFINITY_PORT: 8080
      DRAWFINITY_DATA_DIR: /data
    restart: unless-stopped

volumes:
  drawfinity-data:
```

## Building from Source

### Prerequisites

- Rust toolchain (install via [rustup](https://rustup.rs/))

### Build and Run

```bash
cd server
cargo build --release
./target/release/drawfinity-server
```

The server listens on `0.0.0.0:8080` by default.

## Configuration

The server accepts configuration through CLI flags and environment variables:

| Flag | Environment Variable | Default | Description |
|------|---------------------|---------|-------------|
| `--port` | `DRAWFINITY_PORT` | `8080` | Port to listen on |
| `--data-dir` | `DRAWFINITY_DATA_DIR` | `./data` | Directory for persisting room state |

Examples:

```bash
# CLI flags
drawfinity-server --port 3000 --data-dir /var/lib/drawfinity

# Environment variables
DRAWFINITY_PORT=3000 DRAWFINITY_DATA_DIR=/var/lib/drawfinity drawfinity-server
```

## Persistence

Room state is persisted to the data directory as binary files:

- `{room_id}.bin` — accumulated Yjs document state (binary)
- `{room_id}.meta.json` — room metadata (name, creator, timestamps)

Persistence is **debounced** — writes are batched with a 5-second quiet period to avoid excessive disk I/O during active drawing sessions. When a room empties (all clients disconnect), its state is immediately flushed to disk.

Room IDs are sanitized before use as filenames — only alphanumeric characters, hyphens, and underscores are preserved.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check — returns `"OK"` |
| `/ws/:room_id` | GET | WebSocket upgrade for joining a room |
| `/api/rooms` | GET | List all active rooms (JSON array) |
| `/api/rooms` | POST | Create a named room |
| `/api/rooms/:room_id` | GET | Get a single room's details |

### Health Check

```bash
curl http://localhost:8080/health
# OK
```

### List Rooms

```bash
curl http://localhost:8080/api/rooms
```

```json
[
  {
    "id": "abc-123",
    "name": "Team Sketch",
    "client_count": 2,
    "created_at": 1710000000,
    "last_active_at": 1710003600
  }
]
```

### Create a Room

```bash
curl -X POST http://localhost:8080/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name": "Team Sketch", "creator_name": "Alice"}'
```

## Reverse Proxy

For production deployments, run the server behind a reverse proxy with TLS termination.

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name draw.example.com;

    ssl_certificate /etc/ssl/certs/draw.example.com.pem;
    ssl_certificate_key /etc/ssl/private/draw.example.com.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Key settings for WebSocket support:

- `proxy_http_version 1.1` — required for WebSocket upgrade
- `Upgrade` and `Connection` headers — enable the HTTP → WebSocket upgrade
- `proxy_read_timeout` / `proxy_send_timeout` — set high to prevent idle WebSocket connections from being dropped

### Caddy

```
draw.example.com {
    reverse_proxy localhost:8080
}
```

Caddy automatically handles TLS certificates and WebSocket proxying.

## Architecture

The server is built with:

- **[Axum](https://github.com/tokio-rs/axum)** — HTTP/WebSocket framework
- **[Tokio](https://tokio.rs/)** — async runtime
- **[Clap](https://docs.rs/clap)** — CLI argument parsing
- **Tower HTTP** — CORS middleware

Each room maintains:

- A **broadcast channel** for distributing updates to all connected clients
- An **accumulated document state** (raw Yjs bytes) sent to new clients on join
- A **client count** for tracking active connections
- **Metadata** (name, creator, timestamps) persisted alongside the document

Empty rooms are automatically cleaned up 30 seconds after the last client disconnects.

## Logging

The server uses `tracing` for structured logging. Set the `RUST_LOG` environment variable to control log levels:

```bash
# Default (info level)
drawfinity-server

# Debug logging
RUST_LOG=debug drawfinity-server

# Trace logging for the server, info for dependencies
RUST_LOG=drawfinity_server=trace,info drawfinity-server
```
