# Phase 02: CRDT Data Layer and Local Persistence

Replace the naive in-memory document model with a Yjs-backed CRDT document. This is the most architecturally important phase — it ensures that every stroke operation goes through conflict-free replicated data types from this point forward, making collaboration a matter of connecting a sync provider rather than a rewrite. Also adds local file persistence with a configurable save folder, so work is never lost.

## Tasks

- [x] Install and configure Yjs as the core data layer:
  - `npm install yjs` — the CRDT library
  - `npm install lib0` — Yjs utility dependency for encoding/decoding
  - Create `src/crdt/DrawfinityDoc.ts` — wraps a `Y.Doc` instance and exposes:
    - `strokes: Y.Array<Y.Map>` — the shared stroke collection, where each Y.Map holds stroke properties (id, color, width, timestamp) and a `Y.Array` of point objects ({x, y, pressure})
    - `addStroke(stroke: Stroke): void` — transactionally adds a stroke to the Y.Array
    - `getStrokes(): Stroke[]` — materializes the current CRDT state into plain Stroke objects
    - `onStrokesChanged(callback): void` — observes the Y.Array and fires when strokes are added, removed, or modified
    - `getDoc(): Y.Doc` — exposes the underlying doc for sync providers (needed later for WebSocket sync)
  - Create `src/crdt/StrokeAdapter.ts` — converts between the plain `Stroke` type from Phase 01 and the Y.Map representation, handling serialization/deserialization of point arrays

- [x] Integrate the CRDT document into the existing application:
  - Search for the existing `Document.ts` model from Phase 01 and identify all its consumers
  - Update `StrokeCapture.ts` to write strokes via `DrawfinityDoc.addStroke()` instead of the old Document model
  - Update the render loop to read strokes from `DrawfinityDoc.getStrokes()` or better, maintain a cached array that updates via `onStrokesChanged`
  - Remove or deprecate the old `Document.ts` — the CRDT doc is now the single source of truth
  - Verify drawing still works identically after the swap

- [x] Implement per-user undo/redo that is collaboration-safe:
  - Create `src/crdt/UndoManager.ts` — wraps Yjs's built-in `Y.UndoManager`, scoped to track only the local user's changes on the strokes array
  - Expose `undo()` and `redo()` methods
  - Wire keyboard shortcuts: Ctrl+Z → undo, Ctrl+Shift+Z (or Ctrl+Y) → redo
  - Ensure undo only reverts the local user's strokes, not strokes from other origins (this is inherent to Y.UndoManager's tracking, but verify it by simulating two different origins adding strokes)
  - Add undo/redo to the HUD overlay (display "Undo" / "Redo" availability or just test via keyboard)

- [x] Add local file persistence using Yjs document encoding:
  - Create `src/persistence/LocalStorage.ts`:
    - `saveDocument(doc: Y.Doc, filePath: string): Promise<void>` — encodes the Y.Doc state to a binary update (`Y.encodeStateAsUpdate`) and writes it to disk via Tauri's `fs` API
    - `loadDocument(filePath: string): Promise<Y.Doc>` — reads the binary file and applies it to a new Y.Doc via `Y.applyUpdate`
    - `getDefaultSavePath(): string` — returns a default path in the user's documents folder (e.g., `~/Documents/Drawfinity/`)
  - Create `src/persistence/AutoSave.ts`:
    - Watches the Y.Doc for changes via `doc.on('update', ...)`
    - Debounces saves (e.g., 2 seconds after last change)
    - Saves to a configurable file path
  - Use Tauri's `dialog` API or a settings mechanism to let the user configure the save folder (can be a simple config file at `~/.config/drawfinity/config.json` for now)
  - On app launch, check for an existing save file and load it if present
  - Verify: draw some strokes, close the app, reopen — strokes should persist

- [ ] Write tests for the CRDT data layer:
  - Create `src/crdt/__tests__/DrawfinityDoc.test.ts`:
    - Test adding strokes and reading them back
    - Test that two independent Y.Docs can sync by exchanging state updates (simulates future collaboration)
    - Test that onStrokesChanged fires correctly
  - Create `src/crdt/__tests__/UndoManager.test.ts`:
    - Test undo reverts the last local stroke
    - Test redo restores it
    - Test that undo doesn't affect strokes from a different origin
  - Set up Vitest (or the test runner already in the scaffold) if not already configured

- [ ] Run all tests and verify the full app flow:
  - Run the test suite and fix any failures
  - Launch the app and verify: draw → undo → redo → pan/zoom → close → reopen → strokes are still there
  - Commit all working code
