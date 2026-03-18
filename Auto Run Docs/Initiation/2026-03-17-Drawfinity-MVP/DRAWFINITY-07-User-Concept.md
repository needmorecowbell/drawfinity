# Phase 07: User Concept

Introduce local user identity for collaboration: name, color, persistent preferences. This is the foundation for remote cursor visibility, attribution, and the shared drawings UI in Phase 09.

## Design Decisions

**localStorage for user data.** Works in both browser and Tauri, is synchronous (available at startup), and requires no dynamic imports. A UUID is generated on first launch and persists across sessions.

**Yjs awareness protocol for presence.** The `y-websocket` provider already supports awareness — each user sets `awareness.setLocalStateField('user', { name, color, cursor })` and it broadcasts automatically. No custom server changes needed.

**User preferences are separate from profile.** Profile (id, name, color) is identity. Preferences (default brush, last color, save directory, server URL) are settings. Both stored in localStorage but in separate keys for clarity.

## Tasks

- [x] User model and storage:
  - Create `src/user/UserProfile.ts` with `UserProfile` interface: `id` (UUID), `name` (string), `color` (hex string)
  - Create `src/user/UserStore.ts`:
    - `loadProfile(): UserProfile` — reads from localStorage, generates defaults on first launch (UUID, random color from palette, name "Anonymous")
    - `saveProfile(profile): void` — persists to localStorage
    - `onProfileChange(callback): void` — notify listeners on save
  - Create `src/user/index.ts` barrel export
  - Create `src/user/__tests__/UserStore.test.ts` — test load/save, default generation, persistence

- [x] User preferences:
  - Create `src/user/UserPreferences.ts` with `UserPreferences` interface: `defaultBrush` (preset index), `defaultColor` (hex), `saveDirectory?` (string, Tauri only), `serverUrl?` (string), `lastRoomId?` (string)
  - `loadPreferences(): UserPreferences` — reads from localStorage with sensible defaults
  - `savePreferences(prefs): void` — persists to localStorage
  - Create `src/user/__tests__/UserPreferences.test.ts`

- [x] Awareness integration with SyncManager:
  - Update `src/sync/SyncManager.ts`:
    - Accept `UserProfile` via constructor or `setUser(profile)` method
    - On connect, set awareness local state: `provider.awareness.setLocalStateField('user', { id, name, color, cursor: null })`
    - Add `updateCursorPosition(worldX, worldY)` — sets cursor field in awareness
    - Add `getRemoteUsers(): RemoteUser[]` — reads awareness states, excludes self
    - Add `onRemoteUsersChange(callback)` — subscribes to awareness changes
  - Define `RemoteUser` interface: `{ id, name, color, cursor: { x, y } | null }`
  - Update `src/sync/__tests__/SyncManager.test.ts` with awareness tests

- [x] Remote cursor rendering:
  - Create `src/ui/RemoteCursors.ts`:
    - Subscribes to SyncManager remote user awareness
    - For each remote user with a non-null cursor position, renders a colored cursor + name label
    - Uses CSS-positioned HTML elements overlaid on the canvas (not WebGL — simpler, text rendering is free)
    - Transforms cursor world-coords through the camera matrix for screen positioning
    - Fades/hides cursors after 5s idle (no cursor updates received)
    - Cleans up cursor elements when users disconnect

- [x] Settings UI:
  - Create `src/ui/SettingsPanel.ts`:
    - Modal/panel triggered by gear icon in toolbar or keyboard shortcut (e.g., `Ctrl+,`)
    - Name input field (updates UserProfile)
    - Color picker for user color (small palette of 8-12 colors)
    - Default brush preset selector
    - Save directory path display + change button (Tauri only, hidden in browser)
    - Server URL input (pre-filled from preferences)
    - "Save" / "Close" buttons
  - Persist changes to UserStore and UserPreferences on save

- [ ] Wire into main.ts:
  - Load UserProfile and UserPreferences on startup
  - Pass UserProfile to SyncManager
  - Apply UserPreferences to ToolManager (default brush, default color)
  - Add settings button (gear icon) to toolbar
  - Broadcast cursor position on pointermove when connected to a collaboration session
  - Update toolbar to show user color indicator when connected

- [ ] Tests:
  - Unit tests for UserStore (localStorage mock via JSDOM)
  - Unit tests for UserPreferences serialization and defaults
  - Unit tests for RemoteCursors element creation/cleanup
  - Unit tests for awareness state management in SyncManager
