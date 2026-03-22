---
type: report
title: Documentation Plan - Loop 00001
created: 2026-03-20
tags:
  - documentation
  - plan
  - prioritization
related:
  - '[[LOOP_00001_GAPS]]'
  - '[[LOOP_00001_DOC_REPORT]]'
  - '[[3_EVALUATE]]'
---

# Documentation Plan - Loop 00001

## Summary
- **Total Gaps:** 268
- **Auto-Document (PENDING):** 36
- **Needs Context:** 3
- **Won't Do:** 217

## Current Coverage: 50.0%
## Target Coverage: 90%
## Estimated Post-Loop Coverage: 59.0%

> **Note:** Documenting 48 exports (plus their ~80 associated methods) out of ~536 total
> raises coverage from 50% → ~59%. Reaching 90% will require additional loops targeting
> MEDIUM-importance and UTILITY items.

---

## PENDING - Ready for Auto-Documentation

### DOC-001: CanvasApp
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/canvas/CanvasApp.ts`
- **Gap ID:** GAP-001
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```ts
  export class CanvasApp
  ```
- **Documentation Added:**
  - [x] Description: Central application orchestrator managing all drawing subsystems
  - [x] Parameters: Constructor params (N/A — uses async init pattern)
  - [x] Returns: N/A (class)
  - [x] Examples: Yes — initialization, collaboration, and lifecycle
  - [x] Errors: Documents `init` throwing when canvas element not found
- **Methods Documented:** `init`, `destroy`, `getCurrentDrawingId`, `getDoc`, `setDrawingName`, `connectToRoom`
- **Also Documented:** `CanvasAppCallbacks` interface

### DOC-002: DrawfinityDoc
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/crdt/DrawfinityDoc.ts`
- **Gap ID:** GAP-002
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```ts
  export class DrawfinityDoc implements DocumentModel
  ```
- **Documentation Added:**
  - [x] Description: Yjs CRDT document wrapper — single source of truth for all drawing data
  - [x] Parameters: Optional Y.Doc instance
  - [x] Returns: N/A (class)
  - [x] Examples: Yes — CRDT transactions, observation callbacks
  - [x] Errors: CRDT conflict resolution behavior
- **Methods Documented:** `constructor`, `addStroke`, `removeStroke`, `replaceStroke`, `addShape`, `removeShape`, `getShapes`, `onStrokesChanged`, `getDoc`, `getStrokesArray`, `getBackgroundColor`, `setBackgroundColor`, `onMetaChanged`, `getMetaMap`, `addBookmark`, `removeBookmark`, `getBookmarks`, `updateBookmark`, `onBookmarksChanged`, `getBookmarksArray`
- **Also Documented:** `DEFAULT_BACKGROUND_COLOR` constant, `getAllItems` method

### DOC-003: SyncManager
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/sync/SyncManager.ts`
- **Gap ID:** GAP-003
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```ts
  export class SyncManager
  ```
- **Documentation Added:**
  - [x] Description: WebSocket collaboration engine with reconnection and cursor sync
  - [x] Parameters: Y.Doc, optional ReconnectConfig
  - [x] Returns: N/A (class)
  - [x] Examples: Yes — connect/disconnect lifecycle
  - [x] Errors: Connection state machine, reconnection behavior
- **Methods Documented:** `constructor`, `setUser`, `connect`, `disconnect`, `getConnectionState`, `getReconnectAttempts`, `onStatusChange`, `updateCursorPosition`, `getRemoteUsers`, `onRemoteUsersChange`, `onConnectionStateChange`, `destroy`
- **Also Documented:** `ConnectionState` type, `ReconnectConfig` interface, `RemoteUser` interface

### DOC-004: DrawingManager
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/persistence/DrawingManager.ts`
- **Gap ID:** GAP-004
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class DrawingManager
  ```
- **Documentation Added:**
  - [x] Description: File persistence manager — CRUD operations for drawings via Tauri filesystem APIs
  - [x] Parameters: N/A (class)
  - [x] Returns: N/A (class)
  - [x] Examples: Yes — create, open, save, delete lifecycle
  - [x] Errors: Throws on missing drawing IDs; documents graceful handling for missing files
- **Methods Documented:** `getDefaultSaveDirectory`, `getSaveDirectory`, `setSaveDirectory`, `listDrawings`, `getDrawingName`, `createDrawing`, `openDrawing`, `saveDrawing`, `deleteDrawing`, `renameDrawing`, `duplicateDrawing`, `updateThumbnail`, `getDrawingFilePath`
- **Also Documented:** `migrateFromSingleFile` (pre-existing JSDoc retained)

### DOC-005: ToolManager
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/tools/ToolManager.ts`
- **Gap ID:** GAP-005
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ToolManager
  ```
- **Documentation Added:**
  - [x] Description: Central tool state management — active tool, brush config, color, opacity
  - [x] Parameters: N/A (class)
  - [x] Returns: N/A (class)
  - [x] Examples: Yes — basic usage in class JSDoc
  - [x] Errors: N/A
- **Methods Documented:** `setTool`, `getTool`, `setBrush`, `getBrush`, `setColor`, `getColor`, `setOpacity`, `getOpacity`, `setShapeConfig`, `getShapeConfig`, `getActiveConfig`
- **Also Documented:** `ToolType` type, `ShapeToolConfig` interface, `isShapeTool` function

### DOC-006: ActionRegistry
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/ui/ActionRegistry.ts`
- **Gap ID:** GAP-006
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ActionRegistry
  ```
- **Documentation Added:**
  - [x] Description: Keyboard shortcut and action dispatch system
  - [x] Parameters: N/A (class)
  - [x] Returns: N/A (class)
  - [x] Examples: Yes — registering and executing actions
  - [x] Errors: execute() returns false for unknown action IDs
- **Methods Documented:** `register`, `getAll`, `get`, `getByCategory`, `search`, `execute`
- **Also Documented:** `Action` interface, `ActionCategory` type, `ACTION_CATEGORIES` constant

### DOC-007: AutoSave
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/persistence/AutoSave.ts`
- **Gap ID:** GAP-007
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class AutoSave
  ```
- **Documentation Added:**
  - [x] Description: Auto-save lifecycle management — debounced persistence of CRDT state
  - [x] Parameters: Overloaded constructor (file-based vs DrawingManager-based)
  - [x] Returns: N/A (class)
  - [x] Examples: Yes — start/stop lifecycle, debounce behavior
  - [x] Errors: Save failure handling (logged to console, does not throw)
- **Methods Documented:** `constructor`, `start`, `stop`, `setFilePath`, `getFilePath`, `setDrawingId`, `getDrawingId`, `setDrawingManager`, `saveNow`
- **Also Documented:** `DEFAULT_DEBOUNCE_MS` constant

### DOC-008: StrokePoint
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/model/Stroke.ts`
- **Gap ID:** GAP-010
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface StrokePoint
  ```
- **Documentation Added:**
  - [x] Description: Single point in a stroke with position, pressure, and timestamp
  - [x] Parameters: All 3 fields (x, y, pressure) documented with types and semantics
  - [x] Returns: N/A (interface)
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-009: Stroke
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/model/Stroke.ts`
- **Gap ID:** GAP-011
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface Stroke
  ```
- **Documentation Added:**
  - [x] Description: Complete stroke with points, color, width, opacity, and metadata
  - [x] Parameters: All 6 fields (id, points, color, width, opacity, timestamp) documented with types and semantics
  - [x] Returns: N/A (interface)
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-010: Shape
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/model/Shape.ts`
- **Gap ID:** GAP-014
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface Shape
  ```
- **Documentation Added:**
  - [x] Description: Geometric shape (rectangle, ellipse, polygon, star) on the canvas
  - [x] Parameters: All 13 fields (id, type, x, y, width, height, rotation, strokeColor, strokeWidth, fillColor, opacity, sides, starInnerRadius, timestamp) documented with types and semantics
  - [x] Returns: N/A (interface)
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-011: BrushConfig
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/tools/Brush.ts`
- **Gap ID:** GAP-021
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface BrushConfig
  ```
- **Documentation Added:**
  - [x] Description: Brush configuration with pressure/opacity curves and rendering parameters
  - [x] Parameters: All 6 fields (name, baseWidth, pressureCurve, opacityCurve, color, smoothing) documented with types and semantics
  - [x] Returns: N/A (interface)
  - [x] Examples: Yes — custom airbrush example demonstrating curve functions
  - [x] Errors: N/A

### DOC-012: HomeScreen
- **Status:** `IMPLEMENTED`
- **File:** `src/ui/HomeScreen.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Implemented In:** Loop 00001
- **Signature:**
  ```ts
  export class HomeScreen
  ```
- **Documentation Added:**
  - [x] Description: Main menu UI for browsing, creating, and managing drawings with two-tab interface
  - [x] Parameters: Constructor `callbacks` param documented with full `HomeScreenCallbacks` interface (7 callback properties)
  - [x] Returns: N/A (class)
  - [x] Examples: Yes — instantiation with callbacks and typical usage
  - [x] Errors: N/A
  - [x] Also documented: `HomeScreenCallbacks` interface, `TabName` type, `SharedConnectionStatus` type, and 12 public methods (`setDrawings`, `setSaveDirectory`, `show`, `hide`, `isVisible`, `destroy`, `getContainer`, `getActiveTab`, `getSharedConnectionStatus`, `getRooms`, `switchTab`)

### DOC-013: CameraBookmark
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/model/Bookmark.ts`
- **Gap ID:** GAP-008
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export interface CameraBookmark
  ```
- **Documentation Added:**
  - [x] Description: Saved camera position/zoom for quick navigation on the infinite canvas, stored in CRDT and synced across collaborators
  - [x] Parameters: All 8 fields documented (`id`, `label`, `x`, `y`, `zoom`, `createdBy`, `createdByName`, `createdAt`)
  - [x] Returns: N/A (interface)
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Also documented: `generateBookmarkId` function with return format description

### DOC-014: ConnectionState
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/sync/SyncManager.ts`
- **Gap ID:** GAP-018
- **Type:** Type Alias
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export type ConnectionState
  ```
- **Documentation Added:**
  - [x] Description: WebSocket connection state machine values with full state transition lifecycle
  - [x] Parameters: N/A (type alias)
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Note: Already documented as part of DOC-003 SyncManager work

### DOC-015: RemoteUser
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/sync/SyncManager.ts`
- **Gap ID:** GAP-020
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export interface RemoteUser
  ```
- **Documentation Added:**
  - [x] Description: A collaborator visible through the Yjs awareness protocol
  - [x] Parameters: All 4 fields (`id`, `name`, `color`, `cursor`)
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Note: Already documented as part of DOC-003 SyncManager work

### DOC-016: ShapeType
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/model/Shape.ts`
- **Gap ID:** GAP-013
- **Type:** Type Alias
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export type ShapeType
  ```
- **Documentation Added:**
  - [x] Description: Supported shape types (rectangle, ellipse, polygon, star) with rendering semantics for each variant
  - [x] Parameters: N/A
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Note: Already documented as part of DOC-010 Shape work

### DOC-017: ToolType
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/tools/ToolManager.ts`
- **Gap ID:** GAP-022
- **Type:** Type Alias
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export type ToolType
  ```
- **Documentation Added:**
  - [x] Description: Available drawing tool types with descriptions of all 8 variants (brush, eraser, rectangle, ellipse, polygon, star, pan, magnify)
  - [x] Parameters: N/A
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Note: Already documented as part of DOC-005 ToolManager work

### DOC-018: CanvasAppCallbacks
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/canvas/CanvasApp.ts`
- **Gap ID:** GAP-024
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export interface CanvasAppCallbacks
  ```
- **Documentation Added:**
  - [x] Description: Callback hooks for CanvasApp lifecycle events
  - [x] Parameters: All callback fields (onGoHome, onRenameDrawing)
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Note: Already documented as part of DOC-001 CanvasApp work

### DOC-019: Action
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/ui/ActionRegistry.ts`
- **Gap ID:** (from interfaces table)
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export interface Action
  ```
- **Documentation Added:**
  - [x] Description: Registered keyboard action with shortcut, category, and handler
  - [x] Parameters: All fields (id, label, shortcut, category, execute)
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Note: Already documented as part of DOC-006 ActionRegistry work

### DOC-020: ActionCategory
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/ui/ActionRegistry.ts`
- **Gap ID:** (from type aliases table)
- **Type:** Type Alias
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export type ActionCategory
  ```
- **Documentation Added:**
  - [x] Description: Category groupings for actions in the cheat sheet
  - [x] Parameters: N/A
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Note: Already documented as part of DOC-006 ActionRegistry work

### DOC-021: BRUSH_PRESETS
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/tools/BrushPresets.ts`
- **Gap ID:** (from constants table)
- **Type:** Constant
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export const BRUSH_PRESETS: BrushConfig[]
  ```
- **Documentation Added:**
  - [x] Description: Built-in brush preset configurations with keyboard shortcut mapping and use-case descriptions
  - [x] Parameters: N/A
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-022: bookmarkToYMap
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/crdt/BookmarkAdapter.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function bookmarkToYMap(bookmark: CameraBookmark): Y.Map<unknown>
  ```
- **Documentation Added:**
  - [x] Description: Serializes a CameraBookmark into a Yjs Map for CRDT storage and collaborative synchronization
  - [x] Parameters: bookmark (1)
  - [x] Returns: Y.Map containing all bookmark properties
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-023: yMapToBookmark
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/crdt/BookmarkAdapter.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function yMapToBookmark(map: Y.Map<unknown>): CameraBookmark
  ```
- **Documentation Added:**
  - [x] Description: Deserializes a Yjs Map back into a CameraBookmark object
  - [x] Parameters: yMap (1)
  - [x] Returns: CameraBookmark
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-024: yMapToStroke
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/crdt/StrokeAdapter.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function yMapToStroke(map: Y.Map<unknown>): Stroke
  ```
- **Documentation Added:**
  - [x] Description: Deserializes a Yjs Map back into a plain Stroke object
  - [x] Parameters: yMap (1)
  - [x] Returns: Stroke with all points and visual properties restored
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-025: yMapToShape
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/crdt/ShapeAdapter.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function yMapToShape(map: Y.Map<unknown>): Shape
  ```
- **Documentation Added:**
  - [x] Description: Deserializes a Yjs Map back into a plain Shape object
  - [x] Parameters: yMap (1)
  - [x] Returns: Fully-hydrated Shape object ready for rendering
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-026: isShapeTool
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001 (as part of DOC-005 ToolManager)
- **File:** `src/tools/ToolManager.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function isShapeTool(tool: ToolType): boolean
  ```
- **Documentation Added:**
  - [x] Description: Type guard for shape-type tools
  - [x] Parameters: tool
  - [x] Returns: boolean
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-027: loadManifest
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/persistence/DrawingManifest.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function loadManifest(savePath: string): Promise<Manifest>
  ```
- **Documentation Added:**
  - [x] Description: Loads drawing manifest from specified directory, returns empty manifest if file missing
  - [x] Parameters: dir (absolute path to save directory)
  - [x] Returns: Manifest object or fresh empty manifest
  - [x] Examples: No
  - [x] Errors: Throws on invalid JSON or unreadable file

### DOC-028: saveManifest
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/persistence/DrawingManifest.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function saveManifest(savePath: string, manifest: Manifest): Promise<void>
  ```
- **Documentation Added:**
  - [x] Description: Persists drawing manifest to filesystem as manifest.json
  - [x] Parameters: dir (absolute path), manifest (Manifest object)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: Write failures (permission denied, disk full)

### DOC-029: saveDocument
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/persistence/LocalStorage.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function saveDocument(doc: Y.Doc, filePath: string): Promise<void>
  ```
- **Documentation Added:**
  - [x] Description: Persists a Yjs document's full state to a binary file on the local filesystem
  - [x] Parameters: doc (Y.Doc), filePath (absolute path)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: Filesystem write failures (permission denied, disk full)

### DOC-030: loadDocument
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/persistence/LocalStorage.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function loadDocument(filePath: string): Promise<Y.Doc | null>
  ```
- **Documentation Added:**
  - [x] Description: Loads a Yjs document from a `.drawfinity` binary file
  - [x] Parameters: filePath (absolute path)
  - [x] Returns: Y.Doc | null (null if file does not exist)
  - [x] Examples: No
  - [x] Errors: Permission denied, corrupt data

### DOC-031: DrawingMetadata
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/persistence/DrawingManifest.ts`
- **Gap ID:** (from interfaces table)
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface DrawingMetadata
  ```
- **Documentation Added:**
  - [x] Description: Metadata for a saved drawing stored in the manifest file, used by home screen for listing and resolving file paths
  - [x] Parameters: All 6 fields (`id`, `name`, `createdAt`, `modifiedAt`, `thumbnail`, `fileName`)
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-032: Manifest
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/persistence/DrawingManifest.ts`
- **Gap ID:** (from interfaces table)
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface Manifest
  ```
- **Documentation Added:**
  - [x] Description: Root manifest file structure containing drawing metadata list
  - [x] Parameters: All 2 fields (`version`, `drawings`)
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A

### DOC-033: ReconnectConfig
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00001
- **File:** `src/sync/SyncManager.ts`
- **Gap ID:** GAP-019
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface ReconnectConfig
  ```
- **Documentation Added:**
  - [x] Description: Configuration for WebSocket reconnection strategy
  - [x] Parameters: All 4 fields (`enabled`, `initialDelayMs`, `maxDelayMs`, `maxAttempts`)
  - [x] Returns: N/A
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Note: Already documented as part of DOC-003 SyncManager work

### DOC-034: StrokeCapture
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/input/StrokeCapture.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class StrokeCapture
  ```
- **Documentation Added:**
  - [x] Description: Pointer event capture and stroke construction with smoothing, erasure delegation
  - [x] Parameters: Constructor (4 params: `camera`, `cameraController`, `document`, `canvas`)
  - [x] Returns: N/A (class)
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Public methods documented: `getActiveStroke`, `setEnabled`, `isEnabled`, `setColor`, `setWidth`, `setSmoothing`, `setTool`, `getTool`, `getEraserTool`, `setBrushConfig`, `getBrushConfig`, `destroy`

### DOC-035: ShapeCapture
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/input/ShapeCapture.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ShapeCapture
  ```
- **Documentation Added:**
  - [x] Description: Pointer-drag gesture capture converting drags into Shape objects with modifier key support (Shift=constrain, Alt=center-out)
  - [x] Parameters: Constructor (4 params: `camera`, `cameraController`, `document`, `canvas`)
  - [x] Returns: N/A (class)
  - [x] Examples: No
  - [x] Errors: N/A
  - [x] Also documented: `ShapeDocumentModel` interface, `ShapeToolConfig` interface (7 properties), public methods (`setEnabled`, `isEnabled`, `setConfig`, `getConfig`, `getPreviewShape`, `destroy`)

### DOC-036: ThumbnailGenerator
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/persistence/ThumbnailGenerator.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ThumbnailGenerator
  ```
- **Documentation Added:**
  - [x] Description: Class-level JSDoc explaining offscreen WebGL2 rendering and throttle behavior
  - [x] Parameters: N/A (no constructor params)
  - [x] Returns: N/A (class)
  - [x] Examples: Yes (usage with markActivity/shouldGenerate/generate)
  - [x] Errors: N/A
  - [x] Also documented: `markActivity`, `shouldGenerate`, `forceGenerate`, `generate` methods, `THUMBNAIL_WIDTH`, `THUMBNAIL_HEIGHT`, `GENERATION_INTERVAL_MS` constants

### DOC-037: BookmarkPanel
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/ui/BookmarkPanel.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class BookmarkPanel
  ```
- **Documentation Added:**
  - [x] Description: UI panel for managing camera bookmarks with CRDT sync
  - [x] Parameters: Constructor dependencies (doc, camera, callbacks)
  - [x] Returns: N/A
  - [x] Also documented: `BookmarkPanelCallbacks` interface (5 properties), `addBookmark`, `refreshList`, `show`, `hide`, `toggle`, `isVisible`, `destroy` methods
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-038: ConnectionPanel
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/ui/ConnectionPanel.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ConnectionPanel
  ```
- **Documentation Added:**
  - [x] Description: Modal UI panel for managing WebSocket collaboration connections
  - [x] Parameters: Constructor dependencies (syncManager, callbacks)
  - [x] Returns: N/A
  - [x] Also documented: `ConnectionPanelCallbacks` interface (1 property), `setRoomInfo`, `show`, `hide`, `toggle`, `isVisible`, `destroy` methods
  - [x] Examples: Yes (class instantiation)
  - [ ] Errors: N/A

### DOC-039: SettingsPanel
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/ui/SettingsPanel.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class SettingsPanel
  ```
- **Documentation Added:**
  - [x] Description: Modal panel for user profile and app preferences
  - [x] Parameters: Constructor dependencies (profile, preferences, callbacks)
  - [x] Returns: N/A
  - [x] Examples: Yes (class instantiation with onSave callback)
  - [x] Errors: N/A

### DOC-040: RemoteCursors
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00002
- **File:** `src/ui/RemoteCursors.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class RemoteCursors
  ```
- **Documentation Added:**
  - [x] Description: Renders remote collaborators' cursor positions on canvas
  - [x] Parameters: Constructor dependencies (root, camera)
  - [x] Returns: N/A
  - [x] Examples: Yes (attach/detach lifecycle)
  - [x] Errors: N/A
- **Methods Documented:** `attach`, `detach`, `updatePositions`

### DOC-041: CanvasItemKind / CanvasItem
- **Status:** `PENDING`
- **File:** `src/model/Shape.ts`
- **Gap ID:** GAP-015
- **Type:** Type Aliases
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export type CanvasItemKind = "stroke" | "shape"
  export type CanvasItem = { kind: CanvasItemKind; ... }
  ```
- **Documentation Plan:**
  - [ ] Description: Discriminated union for canvas items (strokes and shapes)
  - [ ] Parameters: N/A
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-042: computeContentBounds
- **Status:** `PENDING`
- **File:** `src/ui/ExportRenderer.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function computeContentBounds(strokes: Stroke[], shapes: Shape[]): AABB | null
  ```
- **Documentation Plan:**
  - [ ] Description: Computes bounding box of all content for PNG export
  - [ ] Parameters: strokes, shapes
  - [ ] Returns: AABB or null if empty
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-043: renderExport
- **Status:** `PENDING`
- **File:** `src/ui/ExportRenderer.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function renderExport(...): HTMLCanvasElement
  ```
- **Documentation Plan:**
  - [ ] Description: Renders drawing content to an offscreen canvas for PNG export
  - [ ] Parameters: Document data, export options
  - [ ] Returns: HTMLCanvasElement
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-044: HomeScreenCallbacks
- **Status:** `PENDING`
- **File:** `src/ui/HomeScreen.ts`
- **Gap ID:** (from interfaces table)
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface HomeScreenCallbacks
  ```
- **Documentation Plan:**
  - [ ] Description: Callback hooks for HomeScreen user actions
  - [ ] Parameters: All callback fields
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-045: ToolbarCallbacks
- **Status:** `PENDING`
- **File:** `src/ui/Toolbar.ts`
- **Gap ID:** (from interfaces table)
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface ToolbarCallbacks
  ```
- **Documentation Plan:**
  - [ ] Description: Callback hooks for toolbar user interactions
  - [ ] Parameters: All callback fields
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-046: ViewManager
- **Status:** `PENDING`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** (from classes table — methods listed)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ViewManager
  ```
- **Documentation Plan:**
  - [ ] Description: Manages transitions between home screen and canvas views
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A
- **Methods to Document:** `showHome`, `showCanvas`, `getCurrentView`, `getCanvasApp`, `getHomeScreen`, `destroy`

### DOC-047: getDefaultSavePath
- **Status:** `PENDING`
- **File:** `src/persistence/LocalStorage.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function getDefaultSavePath(): Promise<string>
  ```
- **Documentation Plan:**
  - [ ] Description: Returns the default save directory path for drawings
  - [ ] Parameters: None
  - [ ] Returns: string path
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-048: getDefaultFilePath
- **Status:** `PENDING`
- **File:** `src/persistence/LocalStorage.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function getDefaultFilePath(): Promise<string>
  ```
- **Documentation Plan:**
  - [ ] Description: Returns the default file path for a drawing
  - [ ] Parameters: None
  - [ ] Returns: string path
  - [ ] Examples: No
  - [ ] Errors: N/A

---

## PENDING - NEEDS CONTEXT

### DOC-NC-001: EraserTool
- **Status:** `PENDING - NEEDS CONTEXT`
- **File:** `src/tools/EraserTool.ts`
- **Gap ID:** (from classes/interfaces table)
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Questions:**
  - EraserConfig interface at line 292 — is this the public API or an internal detail?
  - What are the different eraser modes and their interaction with CRDT?

### DOC-NC-002: renderExport complex overloads
- **Status:** `PENDING - NEEDS CONTEXT`
- **File:** `src/ui/ExportRenderer.ts`
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Questions:**
  - What export options are supported and how do they affect output?
  - Background color handling in exports — transparent vs opaque?

### DOC-NC-003: TurtleState command handlers
- **Status:** `PENDING - NEEDS CONTEXT`
- **File:** `src/turtle/TurtleState.ts`, `src/turtle/LuaRuntime.ts`
- **Visibility:** INTERNAL
- **Importance:** MEDIUM
- **Questions:**
  - What is the full command API exposed to Lua scripts?
  - How do turtle commands integrate with the CRDT document?

---

## WON'T DO

The following 217 gaps are marked WON'T DO for the listed reasons:

### Simple Getters/Setters and Trivial Methods (156 items)
All class methods marked SIMPLE complexity in the gaps list (e.g., `getTool`, `setColor`, `isEnabled`, `destroy`, `getPosition`, `isDown`, etc.) — these are self-explanatory from their names and signatures. Includes:
- All renderer methods: `setClearColor`, `clear`, `resize`, `destroy`, `use`, getters (26 methods)
- All input capture simple methods: `setEnabled`, `isEnabled`, `setColor`, `setWidth`, `setSmoothing`, `setTool`, `getTool`, `getEraserTool`, `destroy`, `setConfig`, `getConfig` (15 methods)
- All tool simple methods: `getRadius`, `setRadius`, `constructor` (3 methods)
- All CRDT simple methods: `undo`, `redo`, `canUndo`, `canRedo`, `constructor` (5 methods)
- All turtle simple methods: `getPosition`, `getHeading`, `isDown`, `snapshot` (4 methods)
- All UI simple methods: `selectBrush`, `setTool`, `setColor`, `updateUndoRedo`, `updateZoom`, `getActiveBrushIndex`, `setDrawingName`, `destroy`, `getCurrentView`, `getCanvasApp`, `getHomeScreen`, toolbar methods, cursor methods (30+ methods)
- Simple class methods across all modules with obvious behavior from signature alone

### ID Generator Functions (3 items)
- `generateBookmarkId` (GAP-009) — UTILITY, LOW — trivial UUID generation
- `generateStrokeId` (GAP-012) — UTILITY, LOW — trivial UUID generation
- `generateShapeId` (GAP-016) — UTILITY, LOW — trivial UUID generation

### Internal Constants (8 items)
- `DEFAULT_BACKGROUND_COLOR` (GAP-023) — INTERNAL, LOW — self-explanatory constant
- `ACTION_CATEGORIES` — INTERNAL, LOW — simple string array
- `ICONS` — INTERNAL, LOW — SVG string dictionary
- `THUMBNAIL_WIDTH/HEIGHT/GENERATION_INTERVAL_MS` — INTERNAL, LOW — configuration constants
- `STROKE_VERTEX_SHADER` / `STROKE_FRAGMENT_SHADER` — INTERNAL, LOW — WebGL shader source strings
- `TURTLE_EXAMPLES` / `TurtleExample` — INTERNAL, LOW — example code strings

### Internal-Only Interfaces (12 items)
- `ShapeToolConfig` (tools) — INTERNAL, LOW — simple config
- `ShapeToolConfig` (input) — INTERNAL, LOW — simple config
- `EraserConfig` — INTERNAL, LOW — simple config (pending context review)
- `BookmarkPanelCallbacks` — INTERNAL, LOW — simple callback interface
- `ConnectionPanelCallbacks` — INTERNAL, LOW — simple callback interface
- `SettingsPanelCallbacks` — INTERNAL, LOW — simple callback interface
- `ToolbarOverflowConfig` — INTERNAL, LOW — simple config
- `TurtlePanelCallbacks` — INTERNAL, LOW — simple callback interface
- `AABB` — INTERNAL, LOW — simple bounding box (4 numbers)
- `PenState` — INTERNAL, LOW — simple turtle pen state
- `TurtleSnapshot` — INTERNAL, LOW — simple state snapshot
- `MovementSegment` — INTERNAL, LOW — simple line segment

### Internal-Only Type Aliases (5 items)
- `TabName` — INTERNAL, LOW — string literal union
- `SharedConnectionStatus` — INTERNAL, LOW — string literal union
- `ViewName` — INTERNAL, LOW — string literal union
- `StopCheck` — INTERNAL, LOW — simple function type
- `CommandHandler` — INTERNAL, LOW — simple function type

### Simple Internal Classes (2 items)
- `DrawDocument` (GAP-017) — INTERNAL, LOW — superseded by DrawfinityDoc, minimal usage
- `CheatSheet` — INTERNAL, LOW — simple DOM rendering class

---

## Documentation Order

Recommended sequence based on visibility, dependencies, and related groupings:

### Phase 1 — Data Model (Quick Wins)
1. **DOC-008** - StrokePoint (PUBLIC, core data type)
2. **DOC-009** - Stroke (PUBLIC, core data type)
3. **DOC-010** - Shape (PUBLIC, core data type)
4. **DOC-016** - ShapeType (PUBLIC, used by Shape)
5. **DOC-013** - CameraBookmark (PUBLIC, bookmark data)
6. **DOC-041** - CanvasItemKind / CanvasItem (INTERNAL, discriminated union)

### Phase 2 — CRDT Layer
7. **DOC-002** - DrawfinityDoc (PUBLIC, CRITICAL — single source of truth)
8. **DOC-022** - bookmarkToYMap (INTERNAL, adapter)
9. **DOC-023** - yMapToBookmark (INTERNAL, adapter)
10. **DOC-024** - yMapToStroke (INTERNAL, adapter)
11. **DOC-025** - yMapToShape (INTERNAL, adapter)

### Phase 3 — Tool System
12. **DOC-011** - BrushConfig (PUBLIC, non-obvious semantics)
13. **DOC-021** - BRUSH_PRESETS (PUBLIC, preset configs)
14. **DOC-017** - ToolType (PUBLIC, tool enumeration)
15. **DOC-005** - ToolManager (PUBLIC, tool state)
16. **DOC-026** - isShapeTool (INTERNAL, type guard)

### Phase 4 — Core Application Classes
17. **DOC-018** - CanvasAppCallbacks (PUBLIC, needed by CanvasApp)
18. **DOC-001** - CanvasApp (PUBLIC, CRITICAL — central orchestrator)
19. **DOC-003** - SyncManager (PUBLIC, CRITICAL — collaboration)
20. **DOC-014** - ConnectionState (PUBLIC, used by SyncManager)
21. **DOC-015** - RemoteUser (PUBLIC, used by SyncManager)
22. **DOC-033** - ReconnectConfig (INTERNAL, used by SyncManager)

### Phase 5 — Persistence Layer
23. **DOC-031** - DrawingMetadata (INTERNAL, manifest data)
24. **DOC-032** - Manifest (INTERNAL, manifest structure)
25. **DOC-027** - loadManifest (INTERNAL, persistence)
26. **DOC-028** - saveManifest (INTERNAL, persistence)
27. **DOC-047** - getDefaultSavePath (INTERNAL, persistence)
28. **DOC-048** - getDefaultFilePath (INTERNAL, persistence)
29. **DOC-029** - saveDocument (INTERNAL, persistence)
30. **DOC-030** - loadDocument (INTERNAL, persistence)
31. **DOC-004** - DrawingManager (PUBLIC, HIGH — persistence manager)
32. **DOC-007** - AutoSave (INTERNAL, HIGH — auto-save lifecycle)
33. **DOC-036** - ThumbnailGenerator (INTERNAL, thumbnails)

### Phase 6 — UI Components
34. **DOC-006** - ActionRegistry (PUBLIC, keyboard shortcuts)
35. **DOC-019** - Action (PUBLIC, action interface)
36. **DOC-020** - ActionCategory (PUBLIC, category type)
37. **DOC-044** - HomeScreenCallbacks (INTERNAL, callbacks)
38. **DOC-012** - HomeScreen (PUBLIC, main menu)
39. **DOC-045** - ToolbarCallbacks (INTERNAL, callbacks)
40. **DOC-046** - ViewManager (INTERNAL, view transitions)
41. **DOC-037** - BookmarkPanel (INTERNAL, bookmarks UI)
42. **DOC-038** - ConnectionPanel (INTERNAL, connection UI)
43. **DOC-039** - SettingsPanel (INTERNAL, settings UI)
44. **DOC-040** - RemoteCursors (INTERNAL, remote cursors)

### Phase 7 — Input & Export
45. **DOC-034** - StrokeCapture (INTERNAL, stroke input)
46. **DOC-035** - ShapeCapture (INTERNAL, shape input)
47. **DOC-042** - computeContentBounds (INTERNAL, export)
48. **DOC-043** - renderExport (INTERNAL, export)

---

## Related Documentation

Exports that should be documented together for consistency:

- **Group A:** DOC-008, DOC-009 — Stroke data model (StrokePoint + Stroke)
- **Group B:** DOC-010, DOC-016, DOC-041 — Shape data model (Shape + ShapeType + CanvasItem)
- **Group C:** DOC-013, DOC-022, DOC-023 — Bookmark system (CameraBookmark + adapters)
- **Group D:** DOC-002, DOC-024, DOC-025 — CRDT data layer (DrawfinityDoc + adapters)
- **Group E:** DOC-003, DOC-014, DOC-015, DOC-033 — Collaboration system
- **Group F:** DOC-004, DOC-031, DOC-032, DOC-027, DOC-028 — Persistence layer
- **Group G:** DOC-007, DOC-036 — Auto-save subsystem
- **Group H:** DOC-005, DOC-011, DOC-017, DOC-021, DOC-026 — Tool system
- **Group I:** DOC-006, DOC-019, DOC-020 — Action/shortcut system
- **Group J:** DOC-001, DOC-018, DOC-046, DOC-012 — Application lifecycle
