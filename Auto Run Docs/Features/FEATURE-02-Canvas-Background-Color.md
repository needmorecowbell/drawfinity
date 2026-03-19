# Feature 02: Canvas Background Color

Allow users to set a background color for each canvas. In collaborative sessions, the background color is a property of the drawing itself (synced via CRDT), not a per-user preference.

## Design Decisions

**Drawing-level property, not user-level.** The background color is stored in the Yjs document alongside strokes and shapes. When any user changes it, all connected clients see the change immediately. This ensures visual consistency in shared sessions.

**Solid colors only (for now).** Support a preset palette of ~16 colors plus a custom hex color picker. Gradients and patterns are out of scope but the data model should not preclude them later.

**Stored as a Yjs shared map.** Use a dedicated `Y.Map` named `"meta"` on the Y.Doc (separate from the `"strokes"` array) to store document-level properties like background color. This avoids polluting the strokes array and makes metadata access O(1).

**Renderer integration.** The WebGL clear color (`gl.clearColor`) and the dot grid renderer both need to respect the background color. The dot grid color should auto-contrast (dark dots on light backgrounds, light dots on dark backgrounds).

## Tasks

- [ ] Add document metadata to CRDT layer:
  - Add a `Y.Map<string>` named `"meta"` to `DrawfinityDoc`
  - `getBackgroundColor(): string` — reads from meta map, defaults to `"#FAFAF8"` (current off-white)
  - `setBackgroundColor(color: string): void` — writes to meta map in a transaction
  - `onMetaChanged(callback): void` — observe the meta map for changes
  - Ensure undo/redo does NOT affect background color changes (exclude meta map from UndoManager scope)

- [ ] Update renderer for dynamic background:
  - `WebGLContext.setClearColor(hex: string)` — parse hex and call `gl.clearColor()`
  - Update `DotGridRenderer` to accept a foreground color parameter
  - Auto-compute dot grid color: if background luminance > 0.5 use dark dots (`rgba(0,0,0,0.15)`), otherwise light dots (`rgba(255,255,255,0.2)`)
  - Wire `onMetaChanged` in CanvasApp render loop to update clear color and dot grid when background changes

- [ ] Add background color UI to toolbar:
  - Add a background color button/swatch to the toolbar (distinct from stroke color)
  - On click, show a dropdown with:
    - Preset palette: white, off-white, light gray, dark gray, black, cream, light blue, light green, light pink, light yellow, navy, dark green, dark red, dark purple, slate, warm gray
    - Custom color input (HTML `<input type="color">`)
  - Selecting a color calls `doc.setBackgroundColor()`
  - The swatch should display the current background color

- [ ] Sync background color in collaboration:
  - Background color changes propagate automatically via Yjs (shared map)
  - On initial sync (joining a room), read and apply the existing background color
  - Verify: two clients in the same room see background change in real time

- [ ] Persist background color:
  - Tauri mode: background color is part of the Yjs doc state, already persisted by AutoSave
  - Browser mode: same — stored in the base64-encoded Yjs state in localStorage
  - No additional persistence logic needed beyond what exists

- [ ] Tests:
  - Unit tests for `getBackgroundColor`/`setBackgroundColor` on DrawfinityDoc
  - Unit test for auto-contrast dot grid color computation
  - Unit test for toolbar background color UI
  - Integration test: set background in one client, verify it appears in another (via shared Y.Doc)
