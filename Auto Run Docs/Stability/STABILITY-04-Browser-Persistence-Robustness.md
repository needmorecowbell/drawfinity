# Stability 04: Browser Persistence Robustness

Harden the browser-mode (localStorage) persistence layer against data loss, corruption, and storage limits.

## Problems

**localStorage has a ~5MB quota.** The base64-encoded Yjs state grows with drawing complexity. Complex drawings with thousands of strokes will silently fail to save when the quota is exceeded. The user gets no warning.

**No error recovery for corrupt state.** If `localStorage.setItem()` partially writes (e.g., quota exceeded mid-write), or the stored JSON is corrupted, the app creates a blank canvas with no indication of what happened. The user's work appears lost.

**base64 encoding is 33% overhead.** The Yjs binary state is encoded as base64 for localStorage, adding ~33% to the storage footprint. This wastes quota and makes the 5MB limit hit sooner.

## Tasks

- [ ] Migrate browser persistence from localStorage to IndexedDB:
  - Create `src/persistence/IndexedDBStorage.ts`:
    - Uses the IndexedDB API (effectively unlimited storage, ~50MB+ on most browsers)
    - Store binary Yjs state directly as `Uint8Array` (no base64 overhead)
    - `saveDocument(drawingId, state: Uint8Array): Promise<void>`
    - `loadDocument(drawingId): Promise<Uint8Array | null>`
    - `deleteDocument(drawingId): Promise<void>`
  - Also store the drawing manifest in IndexedDB (instead of `drawfinity:drawings` localStorage key)
  - Fall back to localStorage if IndexedDB is unavailable (private browsing in some browsers)

- [ ] Add storage quota detection and warnings:
  - Before saving, check `navigator.storage.estimate()` for available space
  - If available space is below 1MB, show a warning toast/banner
  - If a save fails, show an error message with clear instructions (export drawing, clear old drawings, etc.)
  - Never silently fail a save — always notify the user

- [ ] Add state corruption detection and recovery:
  - When loading a drawing, validate the Yjs state:
    - Try `Y.applyUpdate()` in a try/catch
    - If it throws, the state is corrupt
  - On corruption, offer options: "Start fresh" or "Try to recover" (load partial state)
  - Log corruption events to console with details for debugging
  - Consider: keep a backup of the last-known-good state (write new state, then delete old only on success)

- [ ] Add a "Clear all data" option in settings:
  - Button in the settings panel that clears all localStorage and IndexedDB data
  - Requires confirmation ("This will delete all drawings. Are you sure?")
  - Useful for users who hit storage limits or want a clean slate

- [ ] Tests:
  - Test: save and load a document via IndexedDB
  - Test: delete a document from IndexedDB
  - Test: fallback to localStorage when IndexedDB is unavailable
  - Test: corrupt state detection (invalid bytes, truncated data)
  - Test: quota warning threshold triggers notification
