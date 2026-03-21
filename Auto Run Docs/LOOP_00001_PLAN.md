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
- **Auto-Document (PENDING):** 48
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
- **Status:** `PENDING`
- **File:** `src/canvas/CanvasApp.ts`
- **Gap ID:** GAP-001
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```ts
  export class CanvasApp
  ```
- **Documentation Plan:**
  - [ ] Description: Central application orchestrator managing all drawing subsystems
  - [ ] Parameters: Constructor params
  - [ ] Returns: N/A (class)
  - [ ] Examples: Yes — initialization and lifecycle
  - [ ] Errors: Async init failure modes
- **Methods to Document:** `init`, `destroy`, `getCurrentDrawingId`, `getDoc`, `setDrawingName`, `connectToRoom`

### DOC-002: DrawfinityDoc
- **Status:** `PENDING`
- **File:** `src/crdt/DrawfinityDoc.ts`
- **Gap ID:** GAP-002
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```ts
  export class DrawfinityDoc implements DocumentModel
  ```
- **Documentation Plan:**
  - [ ] Description: Yjs CRDT document wrapper — single source of truth for all drawing data
  - [ ] Parameters: Optional Y.Doc instance
  - [ ] Returns: N/A (class)
  - [ ] Examples: Yes — CRDT transactions, observation callbacks
  - [ ] Errors: CRDT conflict resolution behavior
- **Methods to Document:** `constructor`, `addStroke`, `removeStroke`, `replaceStroke`, `addShape`, `removeShape`, `getShapes`, `onStrokesChanged`, `getDoc`, `getStrokesArray`, `getBackgroundColor`, `setBackgroundColor`, `onMetaChanged`, `getMetaMap`, `addBookmark`, `removeBookmark`, `getBookmarks`, `updateBookmark`, `onBookmarksChanged`, `getBookmarksArray`

### DOC-003: SyncManager
- **Status:** `PENDING`
- **File:** `src/sync/SyncManager.ts`
- **Gap ID:** GAP-003
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```ts
  export class SyncManager
  ```
- **Documentation Plan:**
  - [ ] Description: WebSocket collaboration engine with reconnection and cursor sync
  - [ ] Parameters: Y.Doc, optional ReconnectConfig
  - [ ] Returns: N/A (class)
  - [ ] Examples: Yes — connect/disconnect lifecycle
  - [ ] Errors: Connection state machine, reconnection behavior
- **Methods to Document:** `constructor`, `setUser`, `connect`, `disconnect`, `getConnectionState`, `getReconnectAttempts`, `onStatusChange`, `updateCursorPosition`, `getRemoteUsers`, `onRemoteUsersChange`, `onConnectionStateChange`, `destroy`

### DOC-004: DrawingManager
- **Status:** `PENDING`
- **File:** `src/persistence/DrawingManager.ts`
- **Gap ID:** GAP-004
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class DrawingManager
  ```
- **Documentation Plan:**
  - [ ] Description: File persistence manager — CRUD operations for drawings via Tauri filesystem APIs
  - [ ] Parameters: N/A
  - [ ] Returns: N/A (class)
  - [ ] Examples: Yes — create, open, save, delete flows
  - [ ] Errors: Filesystem I/O failures, missing files
- **Methods to Document:** `getDefaultSaveDirectory`, `getSaveDirectory`, `setSaveDirectory`, `listDrawings`, `getDrawingName`, `createDrawing`, `openDrawing`, `saveDrawing`, `deleteDrawing`, `renameDrawing`, `duplicateDrawing`, `updateThumbnail`, `getDrawingFilePath`

### DOC-005: ToolManager
- **Status:** `PENDING`
- **File:** `src/tools/ToolManager.ts`
- **Gap ID:** GAP-005
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ToolManager
  ```
- **Documentation Plan:**
  - [ ] Description: Central tool state management — active tool, brush config, color, opacity
  - [ ] Parameters: N/A
  - [ ] Returns: N/A (class)
  - [ ] Examples: No — straightforward API
  - [ ] Errors: N/A
- **Methods to Document:** `setTool`, `getTool`, `setBrush`, `getBrush`, `setColor`, `getColor`, `setOpacity`, `getOpacity`, `setShapeConfig`, `getShapeConfig`, `getActiveConfig`

### DOC-006: ActionRegistry
- **Status:** `PENDING`
- **File:** `src/ui/ActionRegistry.ts`
- **Gap ID:** GAP-006
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ActionRegistry
  ```
- **Documentation Plan:**
  - [ ] Description: Keyboard shortcut and action dispatch system
  - [ ] Parameters: N/A
  - [ ] Returns: N/A (class)
  - [ ] Examples: Yes — registering and executing actions
  - [ ] Errors: Unknown action ID behavior
- **Methods to Document:** `register`, `getAll`, `get`, `getByCategory`, `search`, `execute`

### DOC-007: AutoSave
- **Status:** `PENDING`
- **File:** `src/persistence/AutoSave.ts`
- **Gap ID:** GAP-007
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class AutoSave
  ```
- **Documentation Plan:**
  - [ ] Description: Auto-save lifecycle management — debounced persistence of CRDT state
  - [ ] Parameters: Overloaded constructor (file-based vs DrawingManager-based)
  - [ ] Returns: N/A (class)
  - [ ] Examples: Yes — start/stop lifecycle, debounce behavior
  - [ ] Errors: Save failure handling
- **Methods to Document:** `constructor`, `start`, `stop`, `setFilePath`, `getFilePath`, `setDrawingId`, `getDrawingId`, `setDrawingManager`, `saveNow`

### DOC-008: StrokePoint
- **Status:** `PENDING`
- **File:** `src/model/Stroke.ts`
- **Gap ID:** GAP-010
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface StrokePoint
  ```
- **Documentation Plan:**
  - [ ] Description: Single point in a stroke with position, pressure, and timestamp
  - [ ] Parameters: All fields
  - [ ] Returns: N/A (interface)
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-009: Stroke
- **Status:** `PENDING`
- **File:** `src/model/Stroke.ts`
- **Gap ID:** GAP-011
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface Stroke
  ```
- **Documentation Plan:**
  - [ ] Description: Complete stroke with points, color, width, opacity, and metadata
  - [ ] Parameters: All fields including optional opacity
  - [ ] Returns: N/A (interface)
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-010: Shape
- **Status:** `PENDING`
- **File:** `src/model/Shape.ts`
- **Gap ID:** GAP-014
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface Shape
  ```
- **Documentation Plan:**
  - [ ] Description: Geometric shape (rectangle, ellipse, polygon, star) on the canvas
  - [ ] Parameters: All fields
  - [ ] Returns: N/A (interface)
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-011: BrushConfig
- **Status:** `PENDING`
- **File:** `src/tools/Brush.ts`
- **Gap ID:** GAP-021
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface BrushConfig
  ```
- **Documentation Plan:**
  - [ ] Description: Brush configuration with pressure/opacity curves and rendering parameters
  - [ ] Parameters: All fields, especially pressureCurve and opacityCurve semantics
  - [ ] Returns: N/A (interface)
  - [ ] Examples: Yes — explain curve functions
  - [ ] Errors: N/A

### DOC-012: HomeScreen
- **Status:** `PENDING`
- **File:** `src/ui/HomeScreen.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class HomeScreen
  ```
- **Documentation Plan:**
  - [ ] Description: Main menu screen for creating/opening/managing drawings
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A (class)
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-013: CameraBookmark
- **Status:** `PENDING`
- **File:** `src/model/Bookmark.ts`
- **Gap ID:** GAP-008
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export interface CameraBookmark
  ```
- **Documentation Plan:**
  - [ ] Description: Saved camera position/zoom for quick navigation
  - [ ] Parameters: All fields
  - [ ] Returns: N/A (interface)
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-014: ConnectionState
- **Status:** `PENDING`
- **File:** `src/sync/SyncManager.ts`
- **Gap ID:** GAP-018
- **Type:** Type Alias
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export type ConnectionState
  ```
- **Documentation Plan:**
  - [ ] Description: WebSocket connection state machine values
  - [ ] Parameters: N/A
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-015: RemoteUser
- **Status:** `PENDING`
- **File:** `src/sync/SyncManager.ts`
- **Gap ID:** GAP-020
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export interface RemoteUser
  ```
- **Documentation Plan:**
  - [ ] Description: Remote collaborator's profile and cursor state
  - [ ] Parameters: All fields
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-016: ShapeType
- **Status:** `PENDING`
- **File:** `src/model/Shape.ts`
- **Gap ID:** GAP-013
- **Type:** Type Alias
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export type ShapeType
  ```
- **Documentation Plan:**
  - [ ] Description: Supported shape types (rectangle, ellipse, polygon, star)
  - [ ] Parameters: N/A
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-017: ToolType
- **Status:** `PENDING`
- **File:** `src/tools/ToolManager.ts`
- **Gap ID:** GAP-022
- **Type:** Type Alias
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export type ToolType
  ```
- **Documentation Plan:**
  - [ ] Description: Available drawing tool types
  - [ ] Parameters: N/A
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-018: CanvasAppCallbacks
- **Status:** `PENDING`
- **File:** `src/canvas/CanvasApp.ts`
- **Gap ID:** GAP-024
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export interface CanvasAppCallbacks
  ```
- **Documentation Plan:**
  - [ ] Description: Callback hooks for CanvasApp lifecycle events
  - [ ] Parameters: All callback fields
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-019: Action
- **Status:** `PENDING`
- **File:** `src/ui/ActionRegistry.ts`
- **Gap ID:** (from interfaces table)
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export interface Action
  ```
- **Documentation Plan:**
  - [ ] Description: Registered keyboard action with shortcut, category, and handler
  - [ ] Parameters: All fields
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-020: ActionCategory
- **Status:** `PENDING`
- **File:** `src/ui/ActionRegistry.ts`
- **Gap ID:** (from type aliases table)
- **Type:** Type Alias
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export type ActionCategory
  ```
- **Documentation Plan:**
  - [ ] Description: Category groupings for actions in the cheat sheet
  - [ ] Parameters: N/A
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-021: BRUSH_PRESETS
- **Status:** `PENDING`
- **File:** `src/tools/BrushPresets.ts`
- **Gap ID:** (from constants table)
- **Type:** Constant
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```ts
  export const BRUSH_PRESETS: BrushConfig[]
  ```
- **Documentation Plan:**
  - [ ] Description: Built-in brush configurations (Pen, Pencil, Marker, Highlighter)
  - [ ] Parameters: N/A
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-022: bookmarkToYMap
- **Status:** `PENDING`
- **File:** `src/crdt/BookmarkAdapter.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function bookmarkToYMap(bookmark: CameraBookmark): Y.Map<unknown>
  ```
- **Documentation Plan:**
  - [ ] Description: Serializes a CameraBookmark to a Yjs Map for CRDT storage
  - [ ] Parameters: bookmark
  - [ ] Returns: Y.Map
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-023: yMapToBookmark
- **Status:** `PENDING`
- **File:** `src/crdt/BookmarkAdapter.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function yMapToBookmark(map: Y.Map<unknown>): CameraBookmark
  ```
- **Documentation Plan:**
  - [ ] Description: Deserializes a Yjs Map back to a CameraBookmark
  - [ ] Parameters: map
  - [ ] Returns: CameraBookmark
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-024: yMapToStroke
- **Status:** `PENDING`
- **File:** `src/crdt/StrokeAdapter.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function yMapToStroke(map: Y.Map<unknown>): Stroke
  ```
- **Documentation Plan:**
  - [ ] Description: Deserializes a Yjs Map to a Stroke object
  - [ ] Parameters: map
  - [ ] Returns: Stroke
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-025: yMapToShape
- **Status:** `PENDING`
- **File:** `src/crdt/ShapeAdapter.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function yMapToShape(map: Y.Map<unknown>): Shape
  ```
- **Documentation Plan:**
  - [ ] Description: Deserializes a Yjs Map to a Shape object
  - [ ] Parameters: map
  - [ ] Returns: Shape
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-026: isShapeTool
- **Status:** `PENDING`
- **File:** `src/tools/ToolManager.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export function isShapeTool(tool: ToolType): boolean
  ```
- **Documentation Plan:**
  - [ ] Description: Type guard for shape-type tools
  - [ ] Parameters: tool
  - [ ] Returns: boolean
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-027: loadManifest
- **Status:** `PENDING`
- **File:** `src/persistence/DrawingManifest.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function loadManifest(savePath: string): Promise<Manifest>
  ```
- **Documentation Plan:**
  - [ ] Description: Loads drawing manifest from filesystem
  - [ ] Parameters: savePath
  - [ ] Returns: Manifest
  - [ ] Examples: No
  - [ ] Errors: File not found, parse errors

### DOC-028: saveManifest
- **Status:** `PENDING`
- **File:** `src/persistence/DrawingManifest.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function saveManifest(savePath: string, manifest: Manifest): Promise<void>
  ```
- **Documentation Plan:**
  - [ ] Description: Persists drawing manifest to filesystem
  - [ ] Parameters: savePath, manifest
  - [ ] Returns: void
  - [ ] Examples: No
  - [ ] Errors: Write failures

### DOC-029: saveDocument
- **Status:** `PENDING`
- **File:** `src/persistence/LocalStorage.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function saveDocument(doc: Y.Doc, filePath: string): Promise<void>
  ```
- **Documentation Plan:**
  - [ ] Description: Saves Yjs document state to a file
  - [ ] Parameters: doc, filePath
  - [ ] Returns: void
  - [ ] Examples: No
  - [ ] Errors: Filesystem errors

### DOC-030: loadDocument
- **Status:** `PENDING`
- **File:** `src/persistence/LocalStorage.ts`
- **Gap ID:** (from functions table)
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function loadDocument(doc: Y.Doc, filePath: string): Promise<void>
  ```
- **Documentation Plan:**
  - [ ] Description: Loads Yjs document state from a file
  - [ ] Parameters: doc, filePath
  - [ ] Returns: void
  - [ ] Examples: No
  - [ ] Errors: File not found, corrupt state

### DOC-031: DrawingMetadata
- **Status:** `PENDING`
- **File:** `src/persistence/DrawingManifest.ts`
- **Gap ID:** (from interfaces table)
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface DrawingMetadata
  ```
- **Documentation Plan:**
  - [ ] Description: Metadata for a saved drawing (id, name, timestamps, thumbnail)
  - [ ] Parameters: All fields
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-032: Manifest
- **Status:** `PENDING`
- **File:** `src/persistence/DrawingManifest.ts`
- **Gap ID:** (from interfaces table)
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface Manifest
  ```
- **Documentation Plan:**
  - [ ] Description: Root manifest file structure containing drawing metadata list
  - [ ] Parameters: All fields
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-033: ReconnectConfig
- **Status:** `PENDING`
- **File:** `src/sync/SyncManager.ts`
- **Gap ID:** GAP-019
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface ReconnectConfig
  ```
- **Documentation Plan:**
  - [ ] Description: Configuration for WebSocket reconnection strategy
  - [ ] Parameters: All fields (delays, max attempts)
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-034: StrokeCapture
- **Status:** `PENDING`
- **File:** `src/input/StrokeCapture.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class StrokeCapture
  ```
- **Documentation Plan:**
  - [ ] Description: Pointer event capture and stroke construction with smoothing
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-035: ShapeCapture
- **Status:** `PENDING`
- **File:** `src/input/ShapeCapture.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ShapeCapture
  ```
- **Documentation Plan:**
  - [ ] Description: Shape drawing capture from pointer events
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-036: ThumbnailGenerator
- **Status:** `PENDING`
- **File:** `src/persistence/ThumbnailGenerator.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ThumbnailGenerator
  ```
- **Documentation Plan:**
  - [ ] Description: Generates drawing thumbnails for the home screen
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-037: BookmarkPanel
- **Status:** `PENDING`
- **File:** `src/ui/BookmarkPanel.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class BookmarkPanel
  ```
- **Documentation Plan:**
  - [ ] Description: UI panel for managing camera bookmarks
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-038: ConnectionPanel
- **Status:** `PENDING`
- **File:** `src/ui/ConnectionPanel.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class ConnectionPanel
  ```
- **Documentation Plan:**
  - [ ] Description: UI panel for WebSocket collaboration connection
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-039: SettingsPanel
- **Status:** `PENDING`
- **File:** `src/ui/SettingsPanel.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class SettingsPanel
  ```
- **Documentation Plan:**
  - [ ] Description: UI panel for application settings
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

### DOC-040: RemoteCursors
- **Status:** `PENDING`
- **File:** `src/ui/RemoteCursors.ts`
- **Gap ID:** (from classes table)
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export class RemoteCursors
  ```
- **Documentation Plan:**
  - [ ] Description: Renders remote collaborators' cursor positions on canvas
  - [ ] Parameters: Constructor dependencies
  - [ ] Returns: N/A
  - [ ] Examples: No
  - [ ] Errors: N/A

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
