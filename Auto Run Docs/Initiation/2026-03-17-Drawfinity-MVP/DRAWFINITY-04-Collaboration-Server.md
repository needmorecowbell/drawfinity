# Phase 04: Collaboration Server and Real-Time Sync

Build the Rust WebSocket server that acts as a relay and persistence layer for collaborative sessions. Integrate Yjs sync protocol into the client so that connecting to a server "just works" — the CRDT layer already handles conflict resolution, so this phase is about transport and room management. By the end, two clients can connect to the same room and see each other's strokes in real time.

## Tasks

- [x] Scaffold the Rust collaboration server:
  - Create a new Rust project in `server/` within the Drawfinity repo (`cargo init server`)
  - Add dependencies: `tokio` (async runtime), `warp` or `axum` (HTTP/WebSocket framework), `serde` + `serde_json` (serialization), `uuid` (room IDs)
  - Implement a basic health-check HTTP endpoint (`GET /health` → 200 OK)
  - Set up the binary entry point with Tokio async runtime
  - Verify it compiles and runs (`cargo run` in `server/`)

- [x] Implement WebSocket room management:
  - Create `server/src/room.rs`:
    - `Room` struct: holds a room ID, a set of connected client senders, and the accumulated Yjs document state (as raw bytes)
    - `RoomManager` struct: holds a `HashMap<String, Room>`, provides `create_room()`, `join_room()`, `leave_room()`, `get_or_create_room()`
    - When a client joins, send them the current document state as the first message
    - When a client sends an update, broadcast it to all other clients in the room
  - Create `server/src/ws.rs`:
    - WebSocket upgrade handler at `/ws/{room_id}`
    - On connection: register the client with the RoomManager, send current state
    - On message: broadcast Yjs update bytes to all other clients in the room
    - On disconnect: remove the client from the room, clean up empty rooms after a timeout
  - Wire the WebSocket handler into the HTTP server

- [x] Add server-side document persistence:
  - Create `server/src/persistence.rs`:
    - Store room documents to disk as binary files in a configurable data directory (e.g., `./data/{room_id}.bin`)
    - On room creation, check for an existing file and load it
    - On receiving updates, debounce writes to disk (e.g., every 5 seconds or on room empty)
  - This ensures that rooms survive server restarts — clients reconnect and pick up where they left off
  - Add a CLI flag or environment variable for the data directory path (`--data-dir` or `DRAWFINITY_DATA_DIR`)

- [x] Integrate Yjs WebSocket sync into the client:
  - `npm install y-websocket` — the standard Yjs WebSocket provider
  - Create `src/sync/SyncManager.ts`:
    - Wraps `WebsocketProvider` from y-websocket
    - Accepts a server URL and room ID, connects the local Y.Doc to the remote room
    - Exposes connection state: `connecting`, `connected`, `disconnected`
    - Handles reconnection automatically (y-websocket does this, but expose the state)
    - `connect(serverUrl: string, roomId: string): void`
    - `disconnect(): void`
    - `getConnectionState(): string`
  - On connect, the Yjs sync protocol automatically exchanges state — no custom merge logic needed
  - The existing render loop already observes the CRDT doc, so remote strokes should appear automatically

- [x] Build a minimal connection UI in the client:
  - Add a connection panel to the toolbar or as a modal:
    - Server URL input (default: `ws://localhost:8080`)
    - Room ID input (with a "Generate Random" button)
    - Connect / Disconnect button
    - Connection status indicator (green dot = connected, yellow = connecting, gray = offline)
  - When offline (no server), the app works exactly as before — pure local mode
  - When connected, all stroke operations sync in real time via the CRDT layer
  - Add keyboard shortcut: `Ctrl+K` → open/close connection panel

- [x] Test real-time collaboration end-to-end:
  - Start the server with `cargo run` in `server/`
  - Open two instances of the Drawfinity client (two `npm run tauri dev` windows, or one Tauri + one browser if possible)
  - Connect both to the same room on localhost
  - Draw in one window → verify strokes appear in the other
  - Test: both users drawing simultaneously, undo in one client doesn't affect the other, disconnect and reconnect preserves state
  - Test: close server, restart it, reconnect clients → room state should persist
  - Fix any issues and commit
  - ✅ Created comprehensive automated e2e test suite (`src/__tests__/Collaboration.e2e.test.ts`) with 15 tests covering: stroke sync between clients, simultaneous drawing convergence, opacity sync, undo isolation (each client's undo only affects their own strokes), eraser collaboration, disconnect/reconnect state preservation, new client join, server restart persistence simulation, incremental update relay, and remote change observer notification. All 257 tests (23 files) pass including 13 Rust server tests.
