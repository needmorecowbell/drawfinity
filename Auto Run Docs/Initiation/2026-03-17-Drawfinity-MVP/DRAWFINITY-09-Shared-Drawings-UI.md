# Phase 09: Shared Drawings UI

Build a browsable interface for collaborative drawings: configure server URL, list available rooms, join or create shared sessions. Requires server-side REST API additions and builds on Phase 07 (user identity) and Phase 08 (home screen navigation).

## Prerequisites

- **Phase 07 (User Concept):** user identity is needed for awareness (name, color, cursor) in shared sessions
- **Phase 08 (Home Screen):** the shared drawings tab lives in the home screen, and the ViewManager handles the transition to canvas

## Design Decisions

**REST API on the collaboration server.** The current server is a pure WebSocket relay. Add `GET /api/rooms` and `POST /api/rooms` HTTP endpoints via Axum. The `RoomManager` already tracks rooms in memory — exposing them via HTTP is straightforward.

**Room metadata.** Extend the `Room` struct with `name`, `created_at`, `last_active_at`, and `creator_name`. Store as a JSON sidecar alongside the binary room state.

**Shared drawings as a tab in the home screen.** The home screen gets two tabs: "My Drawings" (local) and "Shared" (remote). This avoids a separate navigation flow and reuses the home screen grid layout for room cards.

## Tasks

- [x] Server: Room metadata:
  - Add fields to `Room` struct in `server/src/room.rs`: `name: Option<String>`, `created_at: u64`, `last_active_at: u64`, `creator_name: Option<String>`
  - Set `last_active_at` on every message received in a room
  - Create `RoomMetadata` struct for serialization (excludes doc state and channels)
  - Persist metadata as `{room_id}.meta.json` alongside binary state in the data directory
  - Update `DebouncedWriter` to also write metadata on save
  - Load metadata on room recovery from disk

- [x] Server: Room listing REST API:
  - Create `server/src/api.rs` with Axum handlers:
    - `GET /api/rooms` — returns JSON array of `{ id, name, client_count, created_at, last_active_at }` for all rooms
    - `GET /api/rooms/{room_id}` — returns room detail including connected user count
    - `POST /api/rooms` — accepts `{ name, creator_name }` body, creates a named room, returns room info
  - Register routes in `server/src/main.rs` alongside existing WebSocket route
  - Add CORS headers for the API routes (already have `tower-http` CORS)
  - Server-side tests for each endpoint (in `server/src/api.rs` or `tests/`)

- [x] Client: Server API client:
  - Create `src/sync/ServerApi.ts`:
    - `fetchRooms(serverUrl): Promise<RoomInfo[]>` — HTTP GET `/api/rooms`, parse JSON
    - `fetchRoom(serverUrl, roomId): Promise<RoomDetail>` — HTTP GET room detail
    - `createRoom(serverUrl, name, userName): Promise<RoomInfo>` — HTTP POST to create room
    - Handle errors: server unreachable, timeout, non-JSON response
  - Define `RoomInfo` interface: `id`, `name`, `clientCount`, `createdAt`, `lastActiveAt`
  - Create `src/sync/__tests__/ServerApi.test.ts` (mock fetch)

- [x] Shared drawings tab in home screen:
  - Update `src/ui/HomeScreen.ts` with a tab bar: "My Drawings" | "Shared"
  - "Shared" tab contents:
    - Server URL input (pre-filled from UserPreferences, Phase 07)
    - "Connect" button to fetch room list from server
    - Connection status indicator (disconnected / connecting / connected / error)
    - Room grid/list: each card shows room name, participant count, last activity time
    - "Join" button per room — opens canvas view and connects to that room via SyncManager
    - "Create Shared Drawing" button — prompts for name, POSTs to server, joins the new room
    - "Refresh" button to re-fetch room list
    - Empty state when no rooms exist ("No shared drawings yet — create one!")
  - Save last-used server URL to UserPreferences on successful connection

- [x] Enhanced connection panel for in-canvas use:
  - Update `src/ui/ConnectionPanel.ts`:
    - Show current room name and ID
    - Show list of connected users with name + color indicator (from awareness, Phase 07)
    - "Copy Room ID" button for sharing
    - "Leave Session" button — disconnects sync and returns to home screen
    - Real-time participant count

- [x] Auto-reconnect:
  - Update `src/sync/SyncManager.ts`:
    - Add configurable auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
    - Maximum reconnect attempts (10) before giving up
    - Emit status events: `connecting`, `connected`, `disconnected`, `reconnecting`, `failed`
    - Expose `onStatusChange(callback)` for UI updates
    - On reconnect, re-set awareness state (user profile + cursor)

- [ ] Wire user identity into shared sessions:
  - When joining a room, set awareness from UserProfile (Phase 07)
  - Display user color in participant list
  - Cursor colors match user colors in RemoteCursors (Phase 07)
  - Room creator name is set from UserProfile when creating a room via API

- [ ] Tests:
  - Server: integration tests for `GET /api/rooms`, `POST /api/rooms`, `GET /api/rooms/{id}`
  - Server: test room metadata persistence and recovery
  - Client: unit tests for ServerApi (mock fetch responses, error handling)
  - Client: unit tests for shared tab rendering (room list, connection state)
  - Client: unit tests for auto-reconnect logic (backoff timing, max attempts)
