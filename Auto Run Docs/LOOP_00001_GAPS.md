---
type: report
title: Documentation Gaps - Loop 00001
created: 2026-03-20
tags:
  - documentation
  - gaps
  - coverage
related:
  - '[[LOOP_00001_DOC_REPORT]]'
  - '[[1_ANALYZE]]'
  - '[[2_FIND_GAPS]]'
---

# Documentation Gaps - Loop 00001

## Summary
- **Total Gaps Found:** 268
- **By Type:** 16 Functions, 17 Classes, 25 Interfaces, 11 Types, 11 Constants, 188 Class Methods
- **By Visibility:** 42 Public API, 156 Internal API, 70 Utility
- **Current Overall Coverage:** 50.0% (target: 90%)

## High-Priority Gaps (Detailed)

These are the most impactful undocumented exports — heavily used across the codebase or complex enough to warrant detailed documentation.

---

### GAP-001: CanvasApp
- **File:** `src/canvas/CanvasApp.ts`
- **Line:** 36
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Central application orchestrator — all features flow through this class
  - Complex initialization lifecycle (async init with drawing ID, persistence, sync)
  - Manages 10+ subsystems (camera, renderer, tools, CRDT, sync, UI panels)
- **Signature:**
  ```ts
  export class CanvasApp
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters
  - [ ] Return value
  - [ ] Examples
  - [ ] Error handling
- **Undocumented Methods:**
  - `init(drawingId: string, callbacks?: CanvasAppCallbacks): Promise<void>` (line 84) — COMPLEX
  - `destroy(): Promise<void>` (line 608) — SIMPLE
  - `getCurrentDrawingId(): string` (line 667) — SIMPLE
  - `getDoc(): DrawfinityDoc` (line 671) — SIMPLE
  - `setDrawingName(name: string): void` (line 675) — SIMPLE
  - `connectToRoom(serverUrl: string, roomId: string, roomName?: string): void` (line 679) — MODERATE

---

### GAP-002: DrawfinityDoc
- **File:** `src/crdt/DrawfinityDoc.ts`
- **Line:** 12
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Yjs CRDT document wrapper — the single source of truth for all drawing data
  - 21 undocumented methods spanning strokes, shapes, bookmarks, and metadata
  - Consumers need to understand CRDT semantics (transactions, observation callbacks)
- **Signature:**
  ```ts
  export class DrawfinityDoc implements DocumentModel
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters
  - [ ] Return value
  - [ ] Examples
  - [ ] Error handling
- **Undocumented Methods:**
  - `constructor(doc?: Y.Doc)` (line 18) — MODERATE
  - `addStroke(stroke: Stroke): void` (line 25) — MODERATE
  - `removeStroke(strokeId: string): boolean` (line 32) — MODERATE
  - `replaceStroke(strokeId: string, replacements: Stroke[]): boolean` (line 47) — COMPLEX
  - `addShape(shape: Shape): void` (line 79) — MODERATE
  - `removeShape(shapeId: string): boolean` (line 86) — MODERATE
  - `getShapes(): Shape[]` (line 101) — SIMPLE
  - `onStrokesChanged(callback: () => void): void` (line 121) — MODERATE
  - `getDoc(): Y.Doc` (line 125) — SIMPLE
  - `getStrokesArray(): Y.Array<Y.Map<unknown>>` (line 129) — MODERATE
  - `getBackgroundColor(): string` (line 133) — SIMPLE
  - `setBackgroundColor(color: string): void` (line 137) — SIMPLE
  - `onMetaChanged(callback: () => void): void` (line 143) — MODERATE
  - `getMetaMap(): Y.Map<string>` (line 147) — MODERATE
  - `addBookmark(bookmark: CameraBookmark): void` (line 151) — MODERATE
  - `removeBookmark(id: string): boolean` (line 158) — MODERATE
  - `getBookmarks(): CameraBookmark[]` (line 173) — SIMPLE
  - `updateBookmark(id: string, partial: Partial<Omit<CameraBookmark, "id">>): boolean` (line 177) — COMPLEX
  - `onBookmarksChanged(callback: () => void): void` (line 194) — MODERATE
  - `getBookmarksArray(): Y.Array<Y.Map<unknown>>` (line 198) — MODERATE

---

### GAP-003: SyncManager
- **File:** `src/sync/SyncManager.ts`
- **Line:** 33
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Collaboration engine — handles WebSocket connection, user awareness, cursor sync
  - Complex state machine (5 connection states with reconnection logic)
  - Consumers need to understand lifecycle (connect -> status callbacks -> disconnect)
- **Signature:**
  ```ts
  export class SyncManager
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters
  - [ ] Return value
  - [ ] Examples
  - [ ] Error handling
- **Undocumented Methods:**
  - `constructor(doc: Y.Doc, reconnectConfig?: Partial<ReconnectConfig>)` (line 48) — MODERATE
  - `setUser(profile: UserProfile): void` (line 53) — SIMPLE
  - `connect(serverUrl: string, roomId: string): void` (line 65) — COMPLEX
  - `disconnect(): void` (line 182) — MODERATE
  - `getConnectionState(): ConnectionState` (line 198) — SIMPLE
  - `getReconnectAttempts(): number` (line 202) — SIMPLE
  - `onStatusChange(callback): () => void` (line 206) — MODERATE
  - `updateCursorPosition(worldX: number, worldY: number): void` (line 210) — SIMPLE
  - `getRemoteUsers(): RemoteUser[]` (line 225) — SIMPLE
  - `onRemoteUsersChange(callback): () => void` (line 248) — MODERATE
  - `onConnectionStateChange(callback): () => void` (line 255) — MODERATE
  - `destroy(): void` (line 278) — SIMPLE

---

### GAP-004: DrawingManager
- **File:** `src/persistence/DrawingManager.ts`
- **Line:** 22
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - File persistence manager — CRUD operations for drawings via Tauri filesystem APIs
  - All methods are async (filesystem I/O), need error behavior documented
  - Manages manifest file and save directory lifecycle
- **Signature:**
  ```ts
  export class DrawingManager
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters
  - [ ] Return value
  - [ ] Examples
  - [ ] Error handling
- **Undocumented Methods:**
  - `getDefaultSaveDirectory(): Promise<string>` (line 26) — SIMPLE
  - `getSaveDirectory(): Promise<string>` (line 31) — SIMPLE
  - `setSaveDirectory(path: string): void` (line 37) — SIMPLE
  - `listDrawings(): Promise<DrawingMetadata[]>` (line 55) — MODERATE
  - `getDrawingName(id: string): Promise<string>` (line 60) — SIMPLE
  - `createDrawing(name: string): Promise<DrawingMetadata>` (line 66) — COMPLEX
  - `openDrawing(id: string): Promise<Uint8Array>` (line 89) — MODERATE
  - `saveDrawing(id: string, state: Uint8Array): Promise<void>` (line 104) — MODERATE
  - `deleteDrawing(id: string): Promise<void>` (line 117) — MODERATE
  - `renameDrawing(id: string, name: string): Promise<void>` (line 134) — SIMPLE
  - `duplicateDrawing(id: string, newName: string): Promise<DrawingMetadata>` (line 145) — COMPLEX
  - `updateThumbnail(id: string, thumbnail: string): Promise<void>` (line 185) — SIMPLE
  - `getDrawingFilePath(id: string): Promise<string>` (line 195) — SIMPLE

---

### GAP-005: ToolManager
- **File:** `src/tools/ToolManager.ts`
- **Line:** 20
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Central tool state management — all UI and input systems depend on this
  - Manages active tool, brush config, color, opacity, and shape config
- **Signature:**
  ```ts
  export class ToolManager
  ```
- **Undocumented Methods:**
  - `setTool(tool: ToolType): void` (line 31) — SIMPLE
  - `getTool(): ToolType` (line 35) — SIMPLE
  - `setBrush(brush: BrushConfig): void` (line 39) — SIMPLE
  - `getBrush(): BrushConfig` (line 45) — SIMPLE
  - `setColor(color: string): void` (line 49) — SIMPLE
  - `getColor(): string` (line 54) — SIMPLE
  - `setOpacity(opacity: number): void` (line 58) — SIMPLE
  - `getOpacity(): number` (line 62) — SIMPLE
  - `setShapeConfig(config: Partial<ShapeToolConfig>): void` (line 66) — SIMPLE
  - `getShapeConfig(): ShapeToolConfig` (line 70) — SIMPLE
  - `getActiveConfig(): { tool, brush, color, shapeConfig }` (line 74) — SIMPLE

---

### GAP-006: ActionRegistry
- **File:** `src/ui/ActionRegistry.ts`
- **Line:** 22
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Keyboard shortcut and action dispatch system
  - Used by cheat sheet, toolbar, and keyboard handler
- **Signature:**
  ```ts
  export class ActionRegistry
  ```
- **Undocumented Methods:**
  - `register(action: Action): void` (line 25) — SIMPLE
  - `getAll(): Action[]` (line 29) — SIMPLE
  - `get(id: string): Action | undefined` (line 33) — SIMPLE
  - `getByCategory(): Map<string, Action[]>` (line 37) — MODERATE
  - `search(query: string): Action[]` (line 55) — MODERATE
  - `execute(id: string): boolean` (line 66) — MODERATE

---

### GAP-007: AutoSave
- **File:** `src/persistence/AutoSave.ts`
- **Line:** 7
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Auto-save lifecycle management — debounced persistence of CRDT state
  - Two constructor overloads (file-based vs DrawingManager-based)
  - Non-obvious start/stop lifecycle and debounce behavior
- **Signature:**
  ```ts
  export class AutoSave
  ```
- **Undocumented Methods:**
  - `constructor(doc: Y.Doc, filePath: string, debounceMs?: number)` (line 18) — COMPLEX (overloaded)
  - `start(): void` (line 44) — MODERATE
  - `stop(): void` (line 53) — SIMPLE
  - `setFilePath(filePath: string): void` (line 64) — SIMPLE
  - `getFilePath(): string` (line 68) — SIMPLE
  - `setDrawingId(drawingId: string): void` (line 72) — SIMPLE
  - `getDrawingId(): string | null` (line 76) — SIMPLE
  - `setDrawingManager(manager: DrawingManager): void` (line 80) — SIMPLE
  - `saveNow(): Promise<void>` (line 84) — MODERATE

---

## Quick-Win Gaps

Small, self-contained items that can be documented quickly.

### GAP-008: CameraBookmark
- **File:** `src/model/Bookmark.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-009: generateBookmarkId
- **File:** `src/model/Bookmark.ts`
- **Line:** 14
- **Type:** Function
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-010: StrokePoint
- **File:** `src/model/Stroke.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-011: Stroke
- **File:** `src/model/Stroke.ts`
- **Line:** 7
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-012: generateStrokeId
- **File:** `src/model/Stroke.ts`
- **Line:** 31
- **Type:** Function
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-013: ShapeType
- **File:** `src/model/Shape.ts`
- **Line:** 1
- **Type:** Type Alias
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-014: Shape
- **File:** `src/model/Shape.ts`
- **Line:** 3
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-015: CanvasItemKind / CanvasItem
- **File:** `src/model/Shape.ts`
- **Lines:** 26, 28
- **Type:** Type Aliases
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-016: generateShapeId
- **File:** `src/model/Shape.ts`
- **Line:** 34
- **Type:** Function
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-017: DrawDocument
- **File:** `src/model/Document.ts`
- **Line:** 3
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-018: ConnectionState
- **File:** `src/sync/SyncManager.ts`
- **Line:** 5
- **Type:** Type Alias
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-019: ReconnectConfig
- **File:** `src/sync/SyncManager.ts`
- **Line:** 12
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-020: RemoteUser
- **File:** `src/sync/SyncManager.ts`
- **Line:** 26
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-021: BrushConfig
- **File:** `src/tools/Brush.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:** Core concept — `pressureCurve` and `opacityCurve` fields have non-obvious semantics

### GAP-022: ToolType
- **File:** `src/tools/ToolManager.ts`
- **Line:** 5
- **Type:** Type Alias
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-023: DEFAULT_BACKGROUND_COLOR
- **File:** `src/crdt/DrawfinityDoc.ts`
- **Line:** 10
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs

### GAP-024: CanvasAppCallbacks
- **File:** `src/canvas/CanvasApp.ts`
- **Line:** 23
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs

---

## Gaps by Module

| Module | Gap Count | Types |
|--------|-----------|-------|
| `src/model/` | 11 | 4 Interfaces, 3 Types, 3 Functions, 1 Class |
| `src/canvas/` | 8 | 1 Interface, 1 Class, 6 Methods |
| `src/crdt/` | 27 | 1 Constant, 1 Class, 4 Functions, 21 Methods |
| `src/persistence/` | 40 | 2 Interfaces, 3 Classes, 4 Functions, 28 Methods, 3 Constants |
| `src/sync/` | 17 | 2 Interfaces, 1 Type, 1 Class, 12 Methods |
| `src/input/` | 20 | 1 Interface, 2 Classes, 17 Methods |
| `src/tools/` | 20 | 1 Interface, 1 Type, 1 Function, 2 Classes, 15 Methods |
| `src/ui/` | 84 | 8 Interfaces, 3 Types, 2 Functions, 10 Classes, 60 Methods, 1 Constant |
| `src/renderer/` | 30 | 2 Interfaces, 2 Constants, 26 Methods |
| `src/turtle/` | 11 | 4 Interfaces, 2 Types, 1 Constant, 4 Methods |

---

## Gaps by Type

### Functions (standalone exported)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `generateBookmarkId` | `src/model/Bookmark.ts:14` | UTILITY | SIMPLE |
| `generateStrokeId` | `src/model/Stroke.ts:31` | UTILITY | SIMPLE |
| `generateShapeId` | `src/model/Shape.ts:34` | UTILITY | SIMPLE |
| `bookmarkToYMap` | `src/crdt/BookmarkAdapter.ts:4` | INTERNAL API | MODERATE |
| `yMapToBookmark` | `src/crdt/BookmarkAdapter.ts:19` | INTERNAL API | MODERATE |
| `yMapToStroke` | `src/crdt/StrokeAdapter.ts:30` | INTERNAL API | MODERATE |
| `yMapToShape` | `src/crdt/ShapeAdapter.ts:33` | INTERNAL API | MODERATE |
| `isShapeTool` | `src/tools/ToolManager.ts:16` | INTERNAL API | SIMPLE |
| `loadManifest` | `src/persistence/DrawingManifest.ts:29` | INTERNAL API | MODERATE |
| `saveManifest` | `src/persistence/DrawingManifest.ts:40` | INTERNAL API | MODERATE |
| `getDefaultSavePath` | `src/persistence/LocalStorage.ts:14` | INTERNAL API | SIMPLE |
| `getDefaultFilePath` | `src/persistence/LocalStorage.ts:19` | INTERNAL API | SIMPLE |
| `saveDocument` | `src/persistence/LocalStorage.ts:24` | INTERNAL API | MODERATE |
| `loadDocument` | `src/persistence/LocalStorage.ts:43` | INTERNAL API | MODERATE |
| `computeContentBounds` | `src/ui/ExportRenderer.ts:41` | INTERNAL API | MODERATE |
| `renderExport` | `src/ui/ExportRenderer.ts:152` | INTERNAL API | COMPLEX |

### Classes (undocumented class-level)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `DrawDocument` | `src/model/Document.ts:3` | INTERNAL API | SIMPLE |
| `CanvasApp` | `src/canvas/CanvasApp.ts:36` | PUBLIC API | COMPLEX |
| `DrawfinityDoc` | `src/crdt/DrawfinityDoc.ts:12` | PUBLIC API | COMPLEX |
| `SyncManager` | `src/sync/SyncManager.ts:33` | PUBLIC API | COMPLEX |
| `DrawingManager` | `src/persistence/DrawingManager.ts:22` | PUBLIC API | COMPLEX |
| `AutoSave` | `src/persistence/AutoSave.ts:7` | INTERNAL API | COMPLEX |
| `ThumbnailGenerator` | `src/persistence/ThumbnailGenerator.ts:93` | INTERNAL API | MODERATE |
| `StrokeCapture` | `src/input/StrokeCapture.ts:9` | INTERNAL API | COMPLEX |
| `ShapeCapture` | `src/input/ShapeCapture.ts:30` | INTERNAL API | MODERATE |
| `ToolManager` | `src/tools/ToolManager.ts:20` | PUBLIC API | MODERATE |
| `ActionRegistry` | `src/ui/ActionRegistry.ts:22` | PUBLIC API | MODERATE |
| `BookmarkPanel` | `src/ui/BookmarkPanel.ts:14` | INTERNAL API | MODERATE |
| `CheatSheet` | `src/ui/CheatSheet.ts:4` | INTERNAL API | SIMPLE |
| `ConnectionPanel` | `src/ui/ConnectionPanel.ts:7` | INTERNAL API | MODERATE |
| `HomeScreen` | `src/ui/HomeScreen.ts:29` | PUBLIC API | COMPLEX |
| `RemoteCursors` | `src/ui/RemoteCursors.ts:20` | INTERNAL API | MODERATE |
| `SettingsPanel` | `src/ui/SettingsPanel.ts:12` | INTERNAL API | MODERATE |

### Interfaces (undocumented)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `CameraBookmark` | `src/model/Bookmark.ts:1` | PUBLIC API | SIMPLE |
| `StrokePoint` | `src/model/Stroke.ts:1` | PUBLIC API | SIMPLE |
| `Stroke` | `src/model/Stroke.ts:7` | PUBLIC API | SIMPLE |
| `Shape` | `src/model/Shape.ts:3` | PUBLIC API | SIMPLE |
| `DrawingMetadata` | `src/persistence/DrawingManifest.ts:9` | INTERNAL API | SIMPLE |
| `Manifest` | `src/persistence/DrawingManifest.ts:18` | INTERNAL API | SIMPLE |
| `ReconnectConfig` | `src/sync/SyncManager.ts:12` | INTERNAL API | SIMPLE |
| `RemoteUser` | `src/sync/SyncManager.ts:26` | PUBLIC API | SIMPLE |
| `ShapeToolConfig` (tools) | `src/tools/ToolManager.ts:10` | INTERNAL API | SIMPLE |
| `ShapeToolConfig` (input) | `src/input/ShapeCapture.ts:10` | INTERNAL API | SIMPLE |
| `BrushConfig` | `src/tools/Brush.ts:1` | PUBLIC API | MODERATE |
| `EraserConfig` | `src/tools/EraserTool.ts:292` | INTERNAL API | SIMPLE |
| `Action` | `src/ui/ActionRegistry.ts:1` | PUBLIC API | SIMPLE |
| `CanvasAppCallbacks` | `src/canvas/CanvasApp.ts:23` | PUBLIC API | SIMPLE |
| `BookmarkPanelCallbacks` | `src/ui/BookmarkPanel.ts:6` | INTERNAL API | SIMPLE |
| `ConnectionPanelCallbacks` | `src/ui/ConnectionPanel.ts:3` | INTERNAL API | SIMPLE |
| `HomeScreenCallbacks` | `src/ui/HomeScreen.ts:9` | INTERNAL API | MODERATE |
| `SettingsPanelCallbacks` | `src/ui/SettingsPanel.ts:8` | INTERNAL API | SIMPLE |
| `ToolbarCallbacks` | `src/ui/Toolbar.ts:14` | INTERNAL API | MODERATE |
| `ToolbarOverflowConfig` | `src/ui/ToolbarOverflow.ts:6` | INTERNAL API | SIMPLE |
| `TurtlePanelCallbacks` | `src/ui/TurtlePanel.ts:3` | INTERNAL API | SIMPLE |
| `AABB` | `src/renderer/SpatialIndex.ts:4` | INTERNAL API | SIMPLE |
| `PenState` | `src/turtle/TurtleState.ts:4` | INTERNAL API | SIMPLE |
| `TurtleSnapshot` | `src/turtle/TurtleState.ts:11` | INTERNAL API | SIMPLE |
| `MovementSegment` | `src/turtle/TurtleState.ts:177` | INTERNAL API | SIMPLE |

### Type Aliases (undocumented)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `ShapeType` | `src/model/Shape.ts:1` | PUBLIC API | SIMPLE |
| `CanvasItemKind` | `src/model/Shape.ts:26` | INTERNAL API | SIMPLE |
| `CanvasItem` | `src/model/Shape.ts:28` | INTERNAL API | SIMPLE |
| `ConnectionState` | `src/sync/SyncManager.ts:5` | PUBLIC API | SIMPLE |
| `ToolType` | `src/tools/ToolManager.ts:5` | PUBLIC API | SIMPLE |
| `ActionCategory` | `src/ui/ActionRegistry.ts:9` | PUBLIC API | SIMPLE |
| `TabName` | `src/ui/HomeScreen.ts:19` | INTERNAL API | SIMPLE |
| `SharedConnectionStatus` | `src/ui/HomeScreen.ts:21` | INTERNAL API | SIMPLE |
| `ViewName` | `src/ui/ViewManager.ts:5` | INTERNAL API | SIMPLE |
| `StopCheck` | `src/turtle/LuaRuntime.ts:22` | INTERNAL API | SIMPLE |
| `CommandHandler` | `src/turtle/LuaRuntime.ts:25` | INTERNAL API | SIMPLE |

### Constants (undocumented)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `DEFAULT_BACKGROUND_COLOR` | `src/crdt/DrawfinityDoc.ts:10` | INTERNAL API | SIMPLE |
| `BRUSH_PRESETS` | `src/tools/BrushPresets.ts:43` | PUBLIC API | SIMPLE |
| `ACTION_CATEGORIES` | `src/ui/ActionRegistry.ts:11` | INTERNAL API | SIMPLE |
| `ICONS` | `src/ui/ToolbarIcons.ts:14` | INTERNAL API | SIMPLE |
| `THUMBNAIL_WIDTH` | `src/persistence/ThumbnailGenerator.ts:335` | INTERNAL API | SIMPLE |
| `THUMBNAIL_HEIGHT` | `src/persistence/ThumbnailGenerator.ts:335` | INTERNAL API | SIMPLE |
| `GENERATION_INTERVAL_MS` | `src/persistence/ThumbnailGenerator.ts:335` | INTERNAL API | SIMPLE |
| `STROKE_VERTEX_SHADER` | `src/renderer/ShaderProgram.ts:70` | INTERNAL API | SIMPLE |
| `STROKE_FRAGMENT_SHADER` | `src/renderer/ShaderProgram.ts:87` | INTERNAL API | SIMPLE |
| `TURTLE_EXAMPLES` | `src/turtle/TurtleExamples.ts:7` | INTERNAL API | SIMPLE |
| `TurtleExample` | `src/turtle/TurtleExamples.ts:1` | INTERNAL API | SIMPLE |

---

## Undocumented Class Methods by Module

### src/renderer/
| Class | Method | Line | Complexity |
|-------|--------|------|------------|
| `DotGridRenderer` | `setDotColor` | 171 | SIMPLE |
| `DotGridRenderer` | `destroy` | 175 | SIMPLE |
| `WebGLContext` | `resize` | 28 | SIMPLE |
| `WebGLContext` | `setClearColor` | 42 | SIMPLE |
| `WebGLContext` | `clear` | 50 | SIMPLE |
| `WebGLContext` | `destroy` | 54 | SIMPLE |
| `SpatialIndex` | `constructor` | 90 | SIMPLE |
| `StrokeRenderer` | `setCameraMatrix` | 77 | SIMPLE |
| `StrokeRenderer` | `drawStroke` | 84 | MODERATE |
| `StrokeRenderer` | `destroy` | 221 | SIMPLE |
| `LineGridRenderer` | `setLineColor` | 141 | SIMPLE |
| `LineGridRenderer` | `destroy` | 154 | SIMPLE |
| `StrokeVertexCache` | `size` (getter) | 52 | SIMPLE |
| `ShaderProgram` | `use` | 37 | SIMPLE |
| `ShaderProgram` | `getUniformLocation` | 41 | SIMPLE |
| `ShaderProgram` | `getAttribLocation` | 45 | SIMPLE |
| `ShaderProgram` | `destroy` | 49 | SIMPLE |
| `Renderer` | `gl` (getter) | 31 | SIMPLE |
| `Renderer` | `canvas` (getter) | 35 | SIMPLE |
| `Renderer` | `setBackgroundColor` | 39 | SIMPLE |
| `Renderer` | `setGridStyle` | 45 | SIMPLE |
| `Renderer` | `clear` | 49 | SIMPLE |
| `Renderer` | `setCameraMatrix` | 54 | SIMPLE |
| `Renderer` | `drawGrid` | 58 | MODERATE |
| `Renderer` | `drawStroke` | 71 | MODERATE |
| `Renderer` | `destroy` | 102 | SIMPLE |
| `ShapeVertexCache` | `size` (getter) | 36 | SIMPLE |

### src/input/
| Class | Method | Line | Complexity |
|-------|--------|------|------------|
| `StrokeCapture` | `constructor` | 32 | COMPLEX |
| `StrokeCapture` | `setEnabled` | 157 | SIMPLE |
| `StrokeCapture` | `isEnabled` | 165 | SIMPLE |
| `StrokeCapture` | `setColor` | 169 | SIMPLE |
| `StrokeCapture` | `setWidth` | 173 | SIMPLE |
| `StrokeCapture` | `setSmoothing` | 177 | SIMPLE |
| `StrokeCapture` | `setTool` | 181 | SIMPLE |
| `StrokeCapture` | `getTool` | 185 | SIMPLE |
| `StrokeCapture` | `getEraserTool` | 189 | SIMPLE |
| `StrokeCapture` | `destroy` | 206 | SIMPLE |
| `ShapeCapture` | `constructor` | 54 | MODERATE |
| `ShapeCapture` | `isEnabled` | 83 | SIMPLE |
| `ShapeCapture` | `setConfig` | 87 | SIMPLE |
| `ShapeCapture` | `getConfig` | 91 | SIMPLE |
| `ShapeCapture` | `destroy` | 199 | SIMPLE |
| `MagnifyCapture` | `setEnabled` | 55 | SIMPLE |
| `MagnifyCapture` | `isEnabled` | 62 | SIMPLE |
| `MagnifyCapture` | `destroy` | 133 | SIMPLE |

### src/tools/
| Class | Method | Line | Complexity |
|-------|--------|------|------------|
| `EraserTool` | `constructor` | 302 | SIMPLE |
| `EraserTool` | `getRadius` | 309 | SIMPLE |
| `EraserTool` | `setRadius` | 313 | SIMPLE |

### src/crdt/
| Class | Method | Line | Complexity |
|-------|--------|------|------------|
| `UndoManager` | `constructor` | 11 | SIMPLE |
| `UndoManager` | `undo` | 17 | SIMPLE |
| `UndoManager` | `redo` | 21 | SIMPLE |
| `UndoManager` | `canUndo` | 25 | SIMPLE |
| `UndoManager` | `canRedo` | 29 | SIMPLE |

### src/turtle/
| Class | Method | Line | Complexity |
|-------|--------|------|------------|
| `TurtleState` | `getPosition` | 113 | SIMPLE |
| `TurtleState` | `getHeading` | 117 | SIMPLE |
| `TurtleState` | `isDown` | 121 | SIMPLE |
| `TurtleState` | `snapshot` | 127 | SIMPLE |

### src/ui/ (selected — full list in detailed gaps above)
| Class | Method | Line | Complexity |
|-------|--------|------|------------|
| `Toolbar` | `selectBrush` | 570 | SIMPLE |
| `Toolbar` | `setTool` | 578 | SIMPLE |
| `Toolbar` | `setColor` | 610 | SIMPLE |
| `Toolbar` | `updateUndoRedo` | 630 | SIMPLE |
| `Toolbar` | `updateZoom` | 635 | SIMPLE |
| `Toolbar` | `getActiveBrushIndex` | 639 | SIMPLE |
| `Toolbar` | `setDrawingName` | 712 | SIMPLE |
| `Toolbar` | `destroy` | 837 | SIMPLE |
| `ViewManager` | `showHome` | 51 | COMPLEX |
| `ViewManager` | `showCanvas` | 79 | COMPLEX |
| `ViewManager` | `getCurrentView` | 149 | SIMPLE |
| `ViewManager` | `getCanvasApp` | 153 | SIMPLE |
| `ViewManager` | `getHomeScreen` | 157 | SIMPLE |
| `ViewManager` | `destroy` | 161 | SIMPLE |
| `CursorManager` | `setTool` | 24 | SIMPLE |
| `CursorManager` | `setBrushWidth` | 29 | SIMPLE |
| `CursorManager` | `setEraserRadius` | 34 | SIMPLE |
| `CursorManager` | `setZoom` | 39 | SIMPLE |
| `CursorManager` | `setPanning` | 43 | SIMPLE |
| `CursorManager` | `setMagnifyMode` | 48 | SIMPLE |
| `CursorManager` | `updateCursor` | 111 | MODERATE |
| `ExportDialog` | `destroy` | 229 | SIMPLE |
| `Tooltip` | `hide` | 120 | SIMPLE |

---

## Related Exports

Exports that should be documented together:

- **Group A:** `Stroke`, `StrokePoint`, `generateStrokeId` — Core stroke data model
- **Group B:** `Shape`, `ShapeType`, `CanvasItem`, `CanvasItemKind`, `generateShapeId` — Shape data model
- **Group C:** `CameraBookmark`, `generateBookmarkId`, `BookmarkAdapter` functions — Bookmark system
- **Group D:** `DrawfinityDoc`, `StrokeAdapter`, `ShapeAdapter`, `BookmarkAdapter` — CRDT data layer
- **Group E:** `SyncManager`, `ConnectionState`, `ReconnectConfig`, `RemoteUser` — Collaboration system
- **Group F:** `DrawingManager`, `DrawingMetadata`, `Manifest`, `loadManifest`, `saveManifest` — Persistence layer
- **Group G:** `AutoSave`, `ThumbnailGenerator` — Auto-save subsystem
- **Group H:** `ToolManager`, `ToolType`, `BrushConfig`, `BRUSH_PRESETS` — Tool system
- **Group I:** `ActionRegistry`, `Action`, `ActionCategory` — Keyboard shortcut system
- **Group J:** `ViewManager`, `HomeScreen`, `CanvasApp` — Application lifecycle

---

## Recommended Documentation Order

Based on visibility, complexity, and dependency ordering:

1. **Phase 1 — Data Model** (GAP-008 through GAP-017): `src/model/` types and interfaces. These are referenced everywhere and quick to document.
2. **Phase 2 — CRDT Layer** (GAP-002, GAP-023, adapters): `DrawfinityDoc` and adapters. Central to the application.
3. **Phase 3 — Core Classes** (GAP-001, GAP-003, GAP-004, GAP-005): `CanvasApp`, `SyncManager`, `DrawingManager`, `ToolManager`.
4. **Phase 4 — UI Components** (GAP-006, panels, toolbar): `ActionRegistry`, panels, toolbar, and their callback interfaces.
5. **Phase 5 — Input & Rendering** (remaining): `StrokeCapture`, `ShapeCapture`, renderer methods.
6. **Phase 6 — Utilities** (remaining): Turtle types, constants, simple getters/setters.
