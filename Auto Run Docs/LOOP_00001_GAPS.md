---
type: report
title: Documentation Gaps - Loop 00001
created: 2026-03-20
tags:
  - documentation
  - gaps
  - analysis
related:
  - '[[LOOP_00001_DOC_REPORT]]'
  - '[[2_FIND_GAPS]]'
---

# Documentation Gaps - Loop 00001

## Summary
- **Total Gaps Found:** 66
- **By Type:** 14 Functions, 8 Classes, 18 Interfaces/Types, 6 Type Aliases, 20 Constants/Misc
- **By Visibility:** 11 Public API, 38 Internal API, 17 Utility/Implementation
- **Overall Coverage:** 50% (target: 90%)

## Gap List

### GAP-001: CameraBookmark
- **File:** `src/model/Bookmark.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Core data model used across camera, CRDT, and UI modules
- **Signature:**
  ```ts
  export interface CameraBookmark { id: string; label: string; x: number; y: number; zoom: number; createdBy: string; createdByName?: string; createdAt: number; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-002: generateBookmarkId
- **File:** `src/model/Bookmark.ts`
- **Line:** 14
- **Type:** Function
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export function generateBookmarkId(): string
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Return value

### GAP-003: DrawDocument
- **File:** `src/model/Document.ts`
- **Line:** 3
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Implements DocumentModel interface, used as in-memory document store
- **Signature:**
  ```ts
  export class DrawDocument implements DocumentModel
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (constructor)

### GAP-004: StrokePoint
- **File:** `src/model/Stroke.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Fundamental data type used throughout the entire rendering and input pipeline
- **Signature:**
  ```ts
  export interface StrokePoint { x: number; y: number; pressure: number; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-005: Stroke
- **File:** `src/model/Stroke.ts`
- **Line:** 7
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Core data model for all drawn content; opacity field has non-obvious default behavior
- **Signature:**
  ```ts
  export interface Stroke { id: string; points: StrokePoint[]; color: string; width: number; opacity?: number; timestamp: number; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields, especially opacity default)

### GAP-006: generateStrokeId
- **File:** `src/model/Stroke.ts`
- **Line:** 31
- **Type:** Function
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export function generateStrokeId(): string
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-007: ShapeType
- **File:** `src/model/Shape.ts`
- **Line:** 1
- **Type:** Type Alias
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export type ShapeType = "rectangle" | "ellipse" | "polygon" | "star"
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-008: Shape
- **File:** `src/model/Shape.ts`
- **Line:** 3
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Core data model; sides/starInnerRadius fields are conditional on type
- **Signature:**
  ```ts
  export interface Shape { id: string; type: ShapeType; x: number; y: number; width: number; height: number; rotation: number; strokeColor: string; strokeWidth: number; fillColor: string | null; opacity: number; sides?: number; starInnerRadius?: number; timestamp: number; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields, conditional fields)

### GAP-009: CanvasItemKind
- **File:** `src/model/Shape.ts`
- **Line:** 26
- **Type:** Type Alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export type CanvasItemKind = "stroke" | "shape"
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-010: CanvasItem
- **File:** `src/model/Shape.ts`
- **Line:** 28
- **Type:** Type Alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export type CanvasItem = { kind: "stroke"; item: Stroke } | { kind: "shape"; item: Shape }
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-011: generateShapeId
- **File:** `src/model/Shape.ts`
- **Line:** 34
- **Type:** Function
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export function generateShapeId(): string
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-012: CanvasAppCallbacks
- **File:** `src/canvas/CanvasApp.ts`
- **Line:** 23
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export interface CanvasAppCallbacks { onGoHome?: () => void; onRenameDrawing?: (id: string, name: string) => void; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-013: CanvasApp
- **File:** `src/canvas/CanvasApp.ts`
- **Line:** 36
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Central application orchestrator; coordinates all subsystems (camera, renderer, input, CRDT, sync, tools, UI)
- **Signature:**
  ```ts
  export class CanvasApp { init(drawingId: string, callbacks?: CanvasAppCallbacks): Promise<void>; render(): void; destroy(): void; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (init)
  - [x] Key methods

### GAP-014: getDefaultSavePath
- **File:** `src/persistence/LocalStorage.ts`
- **Line:** 14
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export async function getDefaultSavePath(): Promise<string>
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Return value

### GAP-015: getDefaultFilePath
- **File:** `src/persistence/LocalStorage.ts`
- **Line:** 19
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export async function getDefaultFilePath(): Promise<string>
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Return value

### GAP-016: saveDocument
- **File:** `src/persistence/LocalStorage.ts`
- **Line:** 24
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Serializes Yjs doc to binary and writes via Tauri plugin-fs
- **Signature:**
  ```ts
  export async function saveDocument(doc: Y.Doc, filePath: string): Promise<void>
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters
  - [x] Error handling

### GAP-017: loadDocument
- **File:** `src/persistence/LocalStorage.ts`
- **Line:** 43
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Returns null for missing files; uses Tauri APIs
- **Signature:**
  ```ts
  export async function loadDocument(filePath: string): Promise<Y.Doc | null>
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters
  - [x] Return value

### GAP-018: DrawingMetadata
- **File:** `src/persistence/DrawingManifest.ts`
- **Line:** 9
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export interface DrawingMetadata { id: string; name: string; createdAt: string; modifiedAt: string; thumbnail?: string; fileName: string; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-019: Manifest
- **File:** `src/persistence/DrawingManifest.ts`
- **Line:** 18
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export interface Manifest { version: 1; drawings: DrawingMetadata[]; }
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-020: loadManifest
- **File:** `src/persistence/DrawingManifest.ts`
- **Line:** 29
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:**
  ```ts
  export async function loadManifest(dir: string): Promise<Manifest>
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters
  - [x] Return value

### GAP-021: saveManifest
- **File:** `src/persistence/DrawingManifest.ts`
- **Line:** 40
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:**
  ```ts
  export async function saveManifest(dir: string, manifest: Manifest): Promise<void>
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters

### GAP-022: DrawingManager
- **File:** `src/persistence/DrawingManager.ts`
- **Line:** 22
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Central persistence coordinator; manages drawing lifecycle (create, open, save, delete, rename, duplicate)
- **Signature:**
  ```ts
  export class DrawingManager { listDrawings(): DrawingMetadata[]; createDrawing(name?: string): Promise<DrawingMetadata>; openDrawing(id: string): DrawingMetadata | undefined; saveDrawing(id: string, doc: Y.Doc): Promise<void>; deleteDrawing(id: string): Promise<void>; renameDrawing(id: string, name: string): Promise<void>; ... }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods
  - [x] Error handling

### GAP-023: AutoSave
- **File:** `src/persistence/AutoSave.ts`
- **Line:** 7
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Manages debounced auto-save lifecycle; two constructor overloads
- **Signature:**
  ```ts
  export class AutoSave { start(): void; stop(): void; saveNow(): Promise<void>; setFilePath(path: string): void; setDrawingId(id: string): void; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (constructor overloads)
  - [x] Key methods

### GAP-024: ThumbnailGenerator
- **File:** `src/persistence/ThumbnailGenerator.ts`
- **Line:** 93
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Generates drawing thumbnails for home screen; activity-gated generation with interval throttling
- **Signature:**
  ```ts
  export class ThumbnailGenerator { markActivity(): void; shouldGenerate(): boolean; forceGenerate(): void; generate(doc: DrawfinityDoc): string | null; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods
  - [x] Return value (base64 data URL)

### GAP-025: THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT / GENERATION_INTERVAL_MS
- **File:** `src/persistence/ThumbnailGenerator.ts`
- **Line:** 335
- **Type:** Constants
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-026: ReconnectConfig
- **File:** `src/sync/SyncManager.ts`
- **Line:** 12
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export interface ReconnectConfig { enabled: boolean; initialDelayMs: number; maxDelayMs: number; maxAttempts: number; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-027: RemoteUser
- **File:** `src/sync/SyncManager.ts`
- **Line:** 26
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export interface RemoteUser { id: string; name: string; color: string; cursor: { x: number; y: number } | null; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-028: SyncManager
- **File:** `src/sync/SyncManager.ts`
- **Line:** 33
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Collaboration engine; manages WebSocket connection, user presence, cursor sync
- **Signature:**
  ```ts
  export class SyncManager { connect(serverUrl: string, roomName: string): void; disconnect(): void; getConnectionState(): ConnectionState; updateCursorPosition(x: number, y: number): void; getRemoteUsers(): RemoteUser[]; ... }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods
  - [x] Error handling

### GAP-029: DEFAULT_BACKGROUND_COLOR
- **File:** `src/crdt/DrawfinityDoc.ts`
- **Line:** 10
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export const DEFAULT_BACKGROUND_COLOR = "#FAFAF8"
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-030: DrawfinityDoc
- **File:** `src/crdt/DrawfinityDoc.ts`
- **Line:** 12
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Yjs CRDT document wrapper; single source of truth for all strokes, shapes, bookmarks; 21 methods
- **Signature:**
  ```ts
  export class DrawfinityDoc implements DocumentModel { addStroke(stroke: Stroke): void; removeStroke(id: string): void; getStrokes(): Stroke[]; addShape(shape: Shape): void; getShapes(): Shape[]; getBackgroundColor(): string; setBackgroundColor(color: string): void; addBookmark(bookmark: CameraBookmark): void; ... }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods
  - [x] Event callbacks (onStrokesChanged, onMetaChanged, onBookmarksChanged)

### GAP-031: yMapToStroke
- **File:** `src/crdt/StrokeAdapter.ts`
- **Line:** 30
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export function yMapToStroke(yMap: Y.Map<unknown>): Stroke
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-032: yMapToShape
- **File:** `src/crdt/ShapeAdapter.ts`
- **Line:** 33
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export function yMapToShape(yMap: Y.Map<unknown>): Shape
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-033: bookmarkToYMap
- **File:** `src/crdt/BookmarkAdapter.ts`
- **Line:** 4
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export function bookmarkToYMap(bookmark: CameraBookmark): Y.Map<unknown>
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-034: yMapToBookmark
- **File:** `src/crdt/BookmarkAdapter.ts`
- **Line:** 19
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export function yMapToBookmark(yMap: Y.Map<unknown>): CameraBookmark
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-035: StrokeCapture
- **File:** `src/input/StrokeCapture.ts`
- **Line:** 9
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Handles pointer events, pressure curves, stroke smoothing; central to drawing input pipeline
- **Signature:**
  ```ts
  export class StrokeCapture { setEnabled(enabled: boolean): void; setColor(color: string): void; setWidth(width: number): void; setBrushConfig(config: BrushConfig): void; getActiveStroke(): Stroke | null; ... }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods
  - [x] Relationship to BrushConfig

### GAP-036: ShapeToolConfig
- **File:** `src/input/ShapeCapture.ts`
- **Line:** 10
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export interface ShapeToolConfig { shapeType: ShapeType; strokeColor: string; strokeWidth: number; fillColor: string | null; opacity: number; sides: number; starInnerRadius: number; }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-037: ShapeCapture
- **File:** `src/input/ShapeCapture.ts`
- **Line:** 30
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:**
  ```ts
  export class ShapeCapture { setEnabled(enabled: boolean): void; setConfig(config: Partial<ShapeToolConfig>): void; getPreviewShape(): Shape | null; ... }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods

### GAP-038: ToolbarCallbacks
- **File:** `src/ui/Toolbar.ts`
- **Line:** 14
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export interface ToolbarCallbacks { ... }
  ```
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-039: ToolbarGroup
- **File:** `src/ui/Toolbar.ts`
- **Line:** 57
- **Type:** Type Alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-040: ConnectionPanelCallbacks
- **File:** `src/ui/ConnectionPanel.ts`
- **Line:** 3
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-041: ConnectionPanel
- **File:** `src/ui/ConnectionPanel.ts`
- **Line:** 7
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - UI for WebSocket collaboration connection; toggled with Ctrl+K
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods

### GAP-042: BookmarkPanelCallbacks
- **File:** `src/ui/BookmarkPanel.ts`
- **Line:** 6
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-043: BookmarkPanel
- **File:** `src/ui/BookmarkPanel.ts`
- **Line:** 14
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods

### GAP-044: SettingsPanelCallbacks
- **File:** `src/ui/SettingsPanel.ts`
- **Line:** 8
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-045: SettingsPanel
- **File:** `src/ui/SettingsPanel.ts`
- **Line:** 12
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-046: ViewName
- **File:** `src/ui/ViewManager.ts`
- **Line:** 5
- **Type:** Type Alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-047: ViewManagerDeps
- **File:** `src/ui/ViewManager.ts`
- **Line:** 7
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-048: ViewManager
- **File:** `src/ui/ViewManager.ts`
- **Line:** 18
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Manages transitions between home screen and canvas views
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods

### GAP-049: Action
- **File:** `src/ui/ActionRegistry.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters (fields)

### GAP-050: ActionCategory
- **File:** `src/ui/ActionRegistry.ts`
- **Line:** 9
- **Type:** Type Alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-051: ACTION_CATEGORIES
- **File:** `src/ui/ActionRegistry.ts`
- **Line:** 11
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-052: ActionRegistry
- **File:** `src/ui/ActionRegistry.ts`
- **Line:** 22
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Central keyboard shortcut and action management system; used by cheat sheet and toolbar
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods

### GAP-053: HomeScreenCallbacks
- **File:** `src/ui/HomeScreen.ts`
- **Line:** 9
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-054: TabName
- **File:** `src/ui/HomeScreen.ts`
- **Line:** 19
- **Type:** Type Alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-055: SharedConnectionStatus
- **File:** `src/ui/HomeScreen.ts`
- **Line:** 21
- **Type:** Type Alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-056: HomeScreen
- **File:** `src/ui/HomeScreen.ts`
- **Line:** 29
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Main entry screen; manages drawing list, room joining, tabs
- **Documentation Needed:**
  - [x] Description
  - [x] Key methods

### GAP-057: CheatSheet
- **File:** `src/ui/CheatSheet.ts`
- **Line:** 4
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-058: ICONS
- **File:** `src/ui/ToolbarIcons.ts`
- **Line:** 14
- **Type:** Constant (object)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-059: TurtleCommand
- **File:** `src/turtle/LuaRuntime.ts`
- **Line:** 4
- **Type:** Type Alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-060: TurtleExample
- **File:** `src/turtle/TurtleExamples.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-061: TURTLE_EXAMPLES
- **File:** `src/turtle/TurtleExamples.ts`
- **Line:** 7
- **Type:** Constant (array)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-062: AABB
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 4
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export interface AABB { minX: number; minY: number; maxX: number; maxY: number; }
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-063: STROKE_VERTEX_SHADER
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 70
- **Type:** Constant (string)
- **Visibility:** UTILITY
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - GLSL shader source; important for understanding the rendering pipeline
- **Documentation Needed:**
  - [x] Description

### GAP-064: STROKE_FRAGMENT_SHADER
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 87
- **Type:** Constant (string)
- **Visibility:** UTILITY
- **Complexity:** MODERATE
- **Current State:** No docs
- **Documentation Needed:**
  - [x] Description

### GAP-065: main.ts bootstrap
- **File:** `src/main.ts`
- **Line:** 1
- **Type:** Module (IIFE)
- **Visibility:** IMPLEMENTATION
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - App entry point; orchestrates dynamic imports and fallback behavior
- **Documentation Needed:**
  - [x] Module header comment

### GAP-066: src/user/ module
- **File:** `src/user/`
- **Type:** Module
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** Not covered in report (may have been added recently)
- **Documentation Needed:**
  - [x] Module-level docs if exports are undocumented

---

## Gaps by Module

| Module | Gap Count | Types |
|--------|-----------|-------|
| `src/model/` | 11 | 3 Functions, 3 Interfaces, 4 Types, 1 Class |
| `src/canvas/` | 2 | 1 Class, 1 Interface |
| `src/persistence/` | 12 | 4 Functions, 3 Classes, 2 Interfaces, 3 Constants |
| `src/sync/` | 3 | 1 Class, 2 Interfaces |
| `src/crdt/` | 6 | 4 Functions, 1 Class, 1 Constant |
| `src/input/` | 3 | 2 Classes, 1 Interface |
| `src/ui/` | 21 | 8 Classes, 6 Interfaces, 5 Types, 2 Constants |
| `src/turtle/` | 3 | 1 Interface, 1 Type, 1 Constant |
| `src/renderer/` | 3 | 1 Interface, 2 Constants |
| `src/main.ts` | 1 | 1 Module |
| `src/user/` | 1 | 1 Module |

## Gaps by Type

### Functions (14)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `generateBookmarkId` | `src/model/Bookmark.ts` | UTILITY | SIMPLE |
| `generateStrokeId` | `src/model/Stroke.ts` | UTILITY | SIMPLE |
| `generateShapeId` | `src/model/Shape.ts` | UTILITY | SIMPLE |
| `getDefaultSavePath` | `src/persistence/LocalStorage.ts` | INTERNAL API | SIMPLE |
| `getDefaultFilePath` | `src/persistence/LocalStorage.ts` | INTERNAL API | SIMPLE |
| `saveDocument` | `src/persistence/LocalStorage.ts` | INTERNAL API | MODERATE |
| `loadDocument` | `src/persistence/LocalStorage.ts` | INTERNAL API | MODERATE |
| `loadManifest` | `src/persistence/DrawingManifest.ts` | INTERNAL API | MODERATE |
| `saveManifest` | `src/persistence/DrawingManifest.ts` | INTERNAL API | MODERATE |
| `yMapToStroke` | `src/crdt/StrokeAdapter.ts` | INTERNAL API | SIMPLE |
| `yMapToShape` | `src/crdt/ShapeAdapter.ts` | INTERNAL API | SIMPLE |
| `bookmarkToYMap` | `src/crdt/BookmarkAdapter.ts` | INTERNAL API | SIMPLE |
| `yMapToBookmark` | `src/crdt/BookmarkAdapter.ts` | INTERNAL API | SIMPLE |

### Classes (8)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `CanvasApp` | `src/canvas/CanvasApp.ts` | PUBLIC API | COMPLEX |
| `DrawfinityDoc` | `src/crdt/DrawfinityDoc.ts` | PUBLIC API | COMPLEX |
| `SyncManager` | `src/sync/SyncManager.ts` | PUBLIC API | COMPLEX |
| `DrawingManager` | `src/persistence/DrawingManager.ts` | PUBLIC API | COMPLEX |
| `StrokeCapture` | `src/input/StrokeCapture.ts` | PUBLIC API | COMPLEX |
| `AutoSave` | `src/persistence/AutoSave.ts` | INTERNAL API | MODERATE |
| `ThumbnailGenerator` | `src/persistence/ThumbnailGenerator.ts` | INTERNAL API | COMPLEX |
| `DrawDocument` | `src/model/Document.ts` | INTERNAL API | MODERATE |

### Interfaces (18)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `CameraBookmark` | `src/model/Bookmark.ts` | PUBLIC API | SIMPLE |
| `StrokePoint` | `src/model/Stroke.ts` | PUBLIC API | SIMPLE |
| `Stroke` | `src/model/Stroke.ts` | PUBLIC API | MODERATE |
| `Shape` | `src/model/Shape.ts` | PUBLIC API | MODERATE |
| `CanvasAppCallbacks` | `src/canvas/CanvasApp.ts` | INTERNAL API | SIMPLE |
| `DrawingMetadata` | `src/persistence/DrawingManifest.ts` | INTERNAL API | SIMPLE |
| `Manifest` | `src/persistence/DrawingManifest.ts` | INTERNAL API | SIMPLE |
| `ReconnectConfig` | `src/sync/SyncManager.ts` | INTERNAL API | SIMPLE |
| `RemoteUser` | `src/sync/SyncManager.ts` | INTERNAL API | SIMPLE |
| `ShapeToolConfig` | `src/input/ShapeCapture.ts` | INTERNAL API | SIMPLE |
| `ToolbarCallbacks` | `src/ui/Toolbar.ts` | INTERNAL API | SIMPLE |
| `ConnectionPanelCallbacks` | `src/ui/ConnectionPanel.ts` | INTERNAL API | SIMPLE |
| `BookmarkPanelCallbacks` | `src/ui/BookmarkPanel.ts` | INTERNAL API | SIMPLE |
| `SettingsPanelCallbacks` | `src/ui/SettingsPanel.ts` | INTERNAL API | SIMPLE |
| `ViewManagerDeps` | `src/ui/ViewManager.ts` | INTERNAL API | SIMPLE |
| `Action` | `src/ui/ActionRegistry.ts` | INTERNAL API | SIMPLE |
| `HomeScreenCallbacks` | `src/ui/HomeScreen.ts` | INTERNAL API | SIMPLE |
| `AABB` | `src/renderer/SpatialIndex.ts` | INTERNAL API | SIMPLE |

### Type Aliases (6)
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `ShapeType` | `src/model/Shape.ts` | PUBLIC API | SIMPLE |
| `CanvasItemKind` | `src/model/Shape.ts` | INTERNAL API | SIMPLE |
| `CanvasItem` | `src/model/Shape.ts` | INTERNAL API | SIMPLE |
| `ViewName` | `src/ui/ViewManager.ts` | INTERNAL API | SIMPLE |
| `ActionCategory` | `src/ui/ActionRegistry.ts` | INTERNAL API | SIMPLE |
| `TurtleCommand` | `src/turtle/LuaRuntime.ts` | INTERNAL API | SIMPLE |

## Related Exports

Exports that should be documented together:

- **Group A:** `Stroke`, `StrokePoint`, `generateStrokeId` - Core stroke data model
- **Group B:** `Shape`, `ShapeType`, `CanvasItemKind`, `CanvasItem`, `generateShapeId` - Shape data model and discriminated union
- **Group C:** `CameraBookmark`, `generateBookmarkId` - Bookmark data model
- **Group D:** `strokeToYMap`/`yMapToStroke`, `shapeToYMap`/`yMapToShape`, `bookmarkToYMap`/`yMapToBookmark` - CRDT adapter pairs
- **Group E:** `DrawingManager`, `DrawingMetadata`, `Manifest`, `loadManifest`, `saveManifest` - Drawing persistence
- **Group F:** `AutoSave`, `saveDocument`, `loadDocument` - Document save/load
- **Group G:** `SyncManager`, `ConnectionState`, `ReconnectConfig`, `RemoteUser` - Collaboration
- **Group H:** `ActionRegistry`, `Action`, `ActionCategory`, `ACTION_CATEGORIES`, `CheatSheet` - Keyboard shortcut system
- **Group I:** `HomeScreen`, `HomeScreenCallbacks`, `TabName`, `SharedConnectionStatus` - Home screen
- **Group J:** `ViewManager`, `ViewManagerDeps`, `ViewName` - View management
- **Group K:** All `*Callbacks` interfaces - UI callback patterns (Toolbar, Connection, Bookmark, Settings, HomeScreen)
