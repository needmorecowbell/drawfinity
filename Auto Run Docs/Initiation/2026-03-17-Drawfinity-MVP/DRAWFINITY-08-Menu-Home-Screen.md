# Phase 08: Menu / Home Screen

Add a home screen that appears before the canvas, allowing users to browse, create, rename, and delete drawings, and configure the save directory. This requires refactoring the app from a single-canvas IIFE into a multi-view architecture with multi-document persistence.

## Design Decisions

**In-webview view switching, not separate Tauri windows.** A simple `ViewManager` toggles between "home" and "canvas" views. No router library — just show/hide. This avoids IPC complexity and keeps the single-window Tauri config.

**Manifest-based multi-document persistence.** The save directory contains a `manifest.json` mapping drawing IDs to metadata (name, dates, thumbnail) and individual `{id}.drawfinity` binary files. This avoids reading every file to list drawings and supports thumbnails without bloating the Yjs state.

**Canvas initialization extracted into a class.** The current `main.ts` IIFE is refactored into a `CanvasApp` class with `init(drawingId)` and `destroy()` lifecycle methods. This is necessary for switching between drawings without reloading the page.

**Thumbnails via offscreen canvas render.** On save, render the current canvas to a small offscreen WebGL context (200x150), read pixels, encode as base64 PNG, and store in the manifest. Generated periodically (not every auto-save) to avoid performance overhead.

## Tasks

- [x] Multi-document persistence layer:
  - Create `src/persistence/DrawingManifest.ts`:
    - `DrawingMetadata` interface: `id`, `name`, `createdAt`, `modifiedAt`, `thumbnail?` (base64 data URL), `fileName` (relative to save dir)
    - `Manifest` interface: `{ version: 1, drawings: DrawingMetadata[] }`
    - `loadManifest(dir): Manifest` — read and parse manifest.json
    - `saveManifest(dir, manifest): void` — write manifest.json
  - Create `src/persistence/DrawingManager.ts`:
    - `listDrawings(): DrawingMetadata[]` — read manifest
    - `createDrawing(name): DrawingMetadata` — create new empty .drawfinity file, add to manifest
    - `openDrawing(id): Uint8Array` — read specific drawing file (returns Yjs state bytes)
    - `saveDrawing(id, state: Uint8Array): void` — write drawing file, update `modifiedAt` in manifest
    - `deleteDrawing(id): void` — remove file + manifest entry
    - `renameDrawing(id, name): void` — update manifest name field
    - `duplicateDrawing(id, newName): DrawingMetadata` — copy file, add new manifest entry
    - `setSaveDirectory(path): void` — update save directory preference
    - `getDefaultSaveDirectory(): string` — `~/Documents/Drawfinity/`
  - All file ops use dynamic Tauri imports (same pattern as existing persistence)

- [x] Migrate from single-file to multi-document:
  - On first launch with new system, detect existing `drawing.drawfinity` at the old path
  - If found, copy it into the new manifest as "Untitled Drawing" and create the manifest
  - Update `LocalStorage.ts` to delegate to DrawingManager
  - Update `AutoSave.ts` to accept a drawing ID and save to the correct file path

- [x] Thumbnail generation:
  - Create `src/persistence/ThumbnailGenerator.ts`:
    - Create a small offscreen WebGL2 canvas (200x150)
    - Render all strokes/shapes with a computed "fit all" camera transform
    - Read pixels via `gl.readPixels()` and encode as PNG data URL (use an offscreen `<canvas>` for `toDataURL()`)
    - Generate on explicit save and periodically (every 30s of activity), not on every auto-save
  - Store thumbnail in manifest via DrawingManager

- [x] Refactor main.ts into CanvasApp:
  - Create `src/canvas/CanvasApp.ts`:
    - Encapsulates: Renderer, Camera, CameraController, DrawfinityDoc, StrokeCapture, Toolbar, SyncManager, AutoSave, FpsCounter, UndoManager
    - `async init(drawingId: string): Promise<void>` — load drawing, set up canvas, start render loop
    - `destroy(): void` — stop render loop, disconnect sync, stop auto-save, remove event listeners, clean up WebGL context
    - `getCurrentDrawingId(): string`
    - `getDoc(): DrawfinityDoc` (for thumbnail generation)
  - Create `src/canvas/index.ts` barrel export
  - Slim `main.ts` down to: create ViewManager, load DrawingManager, show initial view

- [x] Home screen view:
  - Create `src/ui/HomeScreen.ts`:
    - Full-page view with a grid of drawing cards (thumbnail, name, last modified date)
    - "New Drawing" button — creates drawing with default name ("Untitled"), opens it in canvas
    - Click a drawing card to open it
    - Context menu (right-click or "..." button) on each card: Rename, Duplicate, Delete (with confirmation)
    - Save directory display at the bottom + "Change" button (Tauri only)
    - Search/filter input to filter drawings by name
    - Empty state message when no drawings exist ("Create your first drawing!")
    - Sort options: by name, by date modified
  - Style with CSS — clean grid layout, matches Drawfinity visual style

- [x] View manager:
  - Create `src/ui/ViewManager.ts`:
    - Manages two views: "home" and "canvas"
    - `showHome()` — destroy current CanvasApp if active, show HomeScreen, refresh drawing list
    - `showCanvas(drawingId)` — hide HomeScreen, create and init CanvasApp with drawing ID
    - `getCurrentView(): "home" | "canvas"`
  - Add transitions between views (simple fade or instant switch)
  - *(Completed: ViewManager class with transition guard, 15 unit tests passing)*

- [x] Update toolbar with navigation:
  - Add "Home" button (house icon) to toolbar — returns to home screen
  - Add drawing name display in toolbar (editable — click to rename)
  - Keyboard shortcut: `Ctrl+W` or `Escape` returns to home from canvas
  - *(Completed: Home button with ⌂ icon, inline editable drawing name with Enter/Escape/blur handling, Ctrl+W and Escape shortcuts, ViewManager wiring for navigation and rename callbacks, 8 new Toolbar tests, 648 total tests passing)*

- [x] Update index.html:
  - Add container divs for both views: `<div id="home-screen">` and `<div id="canvas-view">`
  - Canvas view contains existing `<canvas>` element
  - Home screen is populated by HomeScreen.ts
  - *(Completed: Added `#home-screen` and `#canvas-view` container divs to index.html, wired main.ts to use ViewManager with DrawingManager integration and in-memory browser fallback, updated HomeScreen to use pre-existing DOM container with display toggle, added getDrawingName to DrawingManager, 648 tests passing)*

- [ ] Tests:
  - Unit tests for DrawingManifest CRUD operations (mock Tauri FS)
  - Unit tests for DrawingManager list/create/delete/rename
  - Unit tests for migration from single-file to multi-document
  - Unit tests for ViewManager state transitions
  - Unit tests for HomeScreen rendering (drawing cards, search filter)
