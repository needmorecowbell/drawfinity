---
type: analysis
title: Documentation Plan - Loop 00004
created: 2026-03-20
tags:
  - documentation
  - plan
related:
  - '[[LOOP_00004_GAPS]]'
  - '[[3_EVALUATE]]'
  - '[[4_IMPLEMENT]]'
---

# Documentation Plan - Loop 00004

## Summary
- **Total Gaps:** 108
- **Auto-Document (PENDING):** 0
- **Auto-Document (IMPLEMENTED):** 52
- **Needs Context:** 0
- **Won't Do:** 56

## Current Coverage: 80.9%
## Target Coverage: 90%
## Estimated Post-Loop Coverage: ~90.5%

---

## PENDING - Ready for Auto-Documentation

### renderer/ — Core Rendering Pipeline

### DOC-001: Renderer.setBackgroundColor
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00005
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-003
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  setBackgroundColor(color: string): void
  ```
- **Documentation Added:**
  - [x] Description: Sets the canvas background color and adjusts grid colors for contrast
  - [x] Parameters: hex (CSS hex color string)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-002: Renderer.setGridStyle
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00005
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-004
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  setGridStyle(style: GridStyle): void
  ```
- **Documentation Added:**
  - [x] Description: Sets the grid rendering style
  - [x] Parameters: style (GridStyle enum)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-003: Renderer.clear
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00005
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-005
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  clear(): void
  ```
- **Documentation Added:**
  - [x] Description: Clears the rendering canvas
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-004: Renderer.setCameraMatrix
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00005
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-006
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  setCameraMatrix(matrix: Float32Array): void
  ```
- **Documentation Added:**
  - [x] Description: Sets the camera transform matrix for rendering
  - [x] Parameters: matrix (3x3 Float32Array)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-005: Renderer.drawGrid
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00006
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-007
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  drawGrid(cameraMatrix: Float32Array, viewportBounds: { minX: number; minY: number; maxX: number; maxY: number }, zoom: number): void
  ```
- **Documentation Added:**
  - [x] Description: Renders the background grid overlay using the configured GridStyle
  - [x] Parameters: cameraMatrix, viewportBounds (with sub-properties), zoom
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-006: Renderer.drawStroke
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00006
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-008
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  drawStroke(...): void
  ```
- **Documentation Added:**
  - [x] Description: Renders a single stroke to the canvas as triangle strip geometry
  - [x] Parameters: points (readonly StrokePoint[]), color (RGBA tuple), width (base world-space units)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-007: Renderer.destroy
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00006
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-009
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  destroy(): void
  ```
- **Documentation Added:**
  - [x] Description: Cleans up WebGL resources
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### renderer/ — Spatial Index

### DOC-008: StrokePoint (interface)
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00006
- **File:** `src/renderer/StrokeRenderer.ts`
- **Gap ID:** GAP-020
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export interface StrokePoint { x, y, pressure }
  ```
- **Documentation Added:**
  - [x] Description: Renderer-local stroke point with position and optional pressure
  - [x] Parameters: x, y, pressure fields documented
  - [x] Examples: No
  - [x] Errors: No

### DOC-009: AABB (interface)
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00006
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-023
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export interface AABB { minX, minY, maxX, maxY }
  ```
- **Documentation Added:**
  - [x] Description: Axis-aligned bounding box for spatial queries and viewport culling
  - [x] Parameters: minX, minY, maxX, maxY fields documented with descriptions
  - [x] Examples: No
  - [x] Errors: No

### DOC-010: computeStrokeBounds
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-024
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function computeStrokeBounds(stroke: Stroke): AABB
  ```
- **Documentation Added:**
  - [x] Description: Computes bounding box for a stroke, expanding by stroke width
  - [x] Parameters: stroke documented with edge-case note
  - [x] Returns: AABB
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-011: computeShapeBounds
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-025
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function computeShapeBounds(shape: Shape): AABB
  ```
- **Documentation Added:**
  - [x] Description: Computes bounding box for a shape
  - [x] Parameters: shape documented with rotation/stroke detail
  - [x] Returns: AABB
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-012: SpatialIndex.add
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-026
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  add(stroke: Stroke): void
  ```
- **Documentation Added:**
  - [x] Description: Adds a stroke to the spatial index for viewport culling
  - [x] Parameters: stroke (1 param, not 2 — plan had incorrect signature)
  - [x] Returns: void
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-013: SpatialIndex.addShape
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00009
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-027
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  addShape(id: string, shape: Shape): void
  ```
- **Documentation Added:**
  - [x] Description: Adds a shape to the spatial index for viewport culling
  - [x] Parameters: shape
  - [x] Returns: void
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-014: SpatialIndex.remove
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00010
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-028
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  remove(id: string): void
  ```
- **Documentation Added:**
  - [x] Description: Removes a stroke from the spatial index by its unique identifier
  - [x] Parameters: strokeId
  - [x] Returns: void
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-015: SpatialIndex.removeShape
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-029
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  removeShape(id: string): void
  ```
- **Documentation Added:**
  - [x] Description: Removes a shape from the spatial index by its unique identifier
  - [x] Parameters: shapeId
  - [x] Returns: void
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-016: SpatialIndex.clear
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00008
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-030
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  clear(): void
  ```
- **Documentation Added:**
  - [x] Description: Removes all strokes and shapes from the spatial index
  - [x] Returns: void
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-017: SpatialIndex.query
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00009
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-033
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  query(viewport: AABB): Stroke[]
  ```
- **Documentation Added:**
  - [x] Description: Queries spatial index for strokes intersecting viewport
  - [x] Parameters: viewport AABB
  - [x] Returns: Deduplicated Stroke[] sorted by timestamp
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-018: SpatialIndex.queryShapes
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00010
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-034
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  queryShapes(viewport: AABB): Shape[]
  ```
- **Documentation Added:**
  - [x] Description: Queries spatial index for shapes intersecting viewport
  - [x] Parameters: viewport AABB
  - [x] Returns: Deduplicated Shape[] sorted by timestamp
  - [ ] Examples: No
  - [ ] Errors: No

### renderer/ — LOD System

### DOC-019: generateTriangleStrip
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/StrokeMesh.ts`
- **Gap ID:** GAP-022
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** CRITICAL
- **Signature:**
  ```
  export function generateTriangleStrip(...): Float32Array
  ```
- **Documentation Added:**
  - [x] Description: Converts stroke points into triangle strip vertex data with miter joins
  - [x] Parameters: points, width, color (3 params documented with details)
  - [x] Returns: Float32Array of interleaved vertex data or null
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-020: getLODBracket
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00012
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-039
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function getLODBracket(zoom: number): number
  ```
- **Documentation Added:**
  - [x] Description: Maps camera zoom level to LOD bracket for simplification tolerance
  - [x] Parameters: zoom (1 param documented)
  - [x] Returns: bracket index or -1 for full detail
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-021: douglasPeucker
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-040
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function douglasPeucker(points: StrokePoint[], epsilon: number): StrokePoint[]
  ```
- **Documentation Added:**
  - [x] Description: Douglas-Peucker recursive polyline simplification algorithm
  - [x] Parameters: points array (2 params documented)
  - [x] Returns: simplified points array with endpoints preserved
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-022: getStrokeLOD
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-041
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  export function getStrokeLOD(strokeId: string, points: readonly StrokePoint[], zoom: number): readonly StrokePoint[]
  ```
- **Documentation Added:**
  - [x] Description: Returns LOD-simplified points for a stroke at given zoom
  - [x] Parameters: strokeId, points, zoom (3 params documented)
  - [x] Returns: simplified StrokePoint array
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-023: invalidateStrokeLOD
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-042
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function invalidateStrokeLOD(strokeId: string): void
  ```
- **Documentation Added:**
  - [x] Description: Invalidates cached LOD and subdivision data for a stroke
  - [x] Parameters: strokeId (1 param documented)
  - [x] Returns: void
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-024: clearLODCache
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00008
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-043
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function clearLODCache(): void
  ```
- **Documentation Added:**
  - [x] Description: Clears all cached LOD simplification and subdivision data for every stroke
  - [x] Returns: void
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-025: generateShapeVertices
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00009
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-062
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function generateShapeVertices(shape: Shape): ShapeVertexData
  ```
- **Documentation Added:**
  - [x] Description: Generates WebGL vertex data for rendering any supported shape type
  - [x] Parameters: shape, ellipseSegments
  - [x] Returns: ShapeVertexData
  - [ ] Examples: No
  - [ ] Errors: No

### DOC-026: ShapeVertexData (interface)
- **Status:** `IMPLEMENTED`
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-057
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Implemented In:** Loop 00010
- **Signature:**
  ```
  export interface ShapeVertexData
  ```
- **Documentation Added:**
  - [x] Description: Vertex data output from shape mesh generation with outline/fill buffers
  - [x] Parameters: Document fields (outline, fill with types and nullability)
  - [ ] Examples: No
  - [ ] Errors: No

### renderer/ — Internal methods (HIGH importance)

### DOC-027: WebGLContext.resize
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-010
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  resize(width: number, height: number): void
  ```
- **Documentation Added:**
  - [x] Description: Synchronizes canvas buffer with CSS layout size for high-DPI rendering
  - [x] Parameters: N/A (parameterless method)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-028: StrokeRenderer.setCameraMatrix
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00012
- **File:** `src/renderer/StrokeRenderer.ts`
- **Gap ID:** GAP-021
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  setCameraMatrix(matrix: Float32Array): void
  ```
- **Documentation Added:**
  - [x] Description: Sets camera transform on the stroke shader
  - [x] Parameters: matrix
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-029: SpatialIndex.rebuild
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00013
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-031
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  rebuild(strokes: Stroke[]): void
  ```
- **Documentation Added:**
  - [x] Description: Rebuilds entire spatial index from a complete stroke set
  - [x] Parameters: strokes (1)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-030: SpatialIndex.rebuildAll
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-032
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  rebuildAll(strokes: Stroke[], shapes: Shape[]): void
  ```
- **Documentation Added:**
  - [x] Description: Clears and re-indexes both strokes and shapes from scratch
  - [x] Parameters: strokes (1), shapes (1)
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-031: DotGridRenderer.getEffectiveSpacing
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/DotGridRenderer.ts`
- **Gap ID:** GAP-047
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  getEffectiveSpacing(zoom: number): number
  ```
- **Documentation Added:**
  - [x] Description: Calculates the effective grid spacing accounting for zoom
  - [x] Returns: world-space distance between dots, always a power of 2
  - [x] Examples: No
  - [x] Errors: No

### DOC-032: LineGridRenderer.getEffectiveSpacing
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00016
- **File:** `src/renderer/LineGridRenderer.ts`
- **Gap ID:** GAP-050
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  getEffectiveSpacing(zoom: number): number
  ```
- **Documentation Added:**
  - [x] Description: Computes effective world-space grid spacing using power-of-2 scaling
  - [x] Returns: world-space distance between adjacent grid lines, always a power of 2
  - [x] Examples: No
  - [x] Errors: No

### DOC-033: generateRectangleVertices
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00017
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-058
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function generateRectangleVertices(...): ShapeVertexData
  ```
- **Documentation Added:**
  - [x] Description: Generates WebGL vertex data for rendering a rectangle shape
  - [x] Parameters: shape (1 param documented)
  - [x] Returns: ShapeVertexData with outline/fill buffers
  - [x] Examples: No
  - [x] Errors: No

### DOC-034: generateEllipseVertices
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00018
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-059
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function generateEllipseVertices(...): ShapeVertexData
  ```
- **Documentation Added:**
  - [x] Description: Generates WebGL vertex data for rendering an ellipse shape
  - [x] Parameters: shape, segments (2 params documented)
  - [x] Returns: ShapeVertexData with outline/fill buffers
  - [x] Examples: No
  - [x] Errors: No

### DOC-035: generatePolygonVertices
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-060
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function generatePolygonVertices(...): ShapeVertexData
  ```
- **Documentation Added:**
  - [x] Description: Generates vertex data for regular polygon shapes
  - [x] Parameters: shape (1 param documented)
  - [x] Returns: ShapeVertexData with outline/fill buffers
  - [x] Examples: No
  - [x] Errors: No

### DOC-036: generateStarVertices
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-061
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function generateStarVertices(...): ShapeVertexData
  ```
- **Documentation Added:**
  - [x] Description: Generates vertex data for star shapes
  - [x] Parameters: shape (1 param documented)
  - [x] Returns: ShapeVertexData with outline/fill buffers
  - [x] Examples: No
  - [x] Errors: No

### ui/ — CheatSheet

### DOC-037: CheatSheet (class)
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/CheatSheet.ts`
- **Gap ID:** GAP-067
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export class CheatSheet
  ```
- **Documentation Added:**
  - [x] Description: Keyboard shortcuts cheat sheet overlay panel
  - [x] Constructor: registry parameter
  - [x] Examples: Yes
  - [x] Errors: No

### DOC-038: CheatSheet.show
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00022
- **File:** `src/ui/CheatSheet.ts`
- **Gap ID:** GAP-068
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  show(): void
  ```
- **Documentation Added:**
  - [x] Description: Shows the cheat sheet overlay
  - [x] Returns: void
  - [x] Examples: No
  - [x] Errors: No

### DOC-039: CheatSheet.hide
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/CheatSheet.ts`
- **Gap ID:** GAP-069
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  hide(): void
  ```
- **Documentation Added:**
  - [x] Description: Closes the cheat sheet overlay and removes it from the DOM
  - [x] Returns: void

### DOC-040: CheatSheet.toggle
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/CheatSheet.ts`
- **Gap ID:** GAP-070
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  toggle(): void
  ```
- **Documentation Added:**
  - [x] Description: Toggles cheat sheet overlay between visible and hidden states, delegating to show/hide

### DOC-041: CheatSheet.isVisible
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/CheatSheet.ts`
- **Gap ID:** GAP-071
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  isVisible(): boolean
  ```
- **Documentation Added:**
  - [x] Description: Returns whether the cheat sheet overlay is currently visible
  - [x] Returns: boolean indicating visibility state

### DOC-042: CheatSheet.destroy
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/CheatSheet.ts`
- **Gap ID:** GAP-072
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  destroy(): void
  ```
- **Documentation Added:**
  - [x] Description: Tears down the cheat sheet by hiding the overlay and removing it from the DOM

### ui/ — ViewManager

### DOC-043: ViewName (type)
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-073
- **Type:** Type
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export type ViewName = "home" | "canvas"
  ```
- **Documentation Added:**
  - [x] Description: Union type representing the two top-level application view states (home and canvas)

### DOC-044: ViewManagerDeps (interface)
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-074
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export interface ViewManagerDeps
  ```
- **Documentation Added:**
  - [x] Description: Dependencies injected into ViewManager
  - [x] Parameters: Document fields

### DOC-045: ViewManager (class)
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-075
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  export class ViewManager
  ```
- **Documentation Added:**
  - [x] Description: Manages transitions between home and canvas views
  - [x] Constructor: deps parameter
  - [x] Examples: Yes

### DOC-046: ViewManager.showHome
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-076
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  async showHome(): Promise<void>
  ```
- **Documentation Added:**
  - [x] Description: Transitions to the home screen view, destroys active CanvasApp, refreshes drawing list
  - [x] Returns: Promise<void>

### DOC-047: ViewManager.showCanvas
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-077
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  async showCanvas(drawingId: string): Promise<void>
  ```
- **Documentation Added:**
  - [x] Description: Transitions the application to the canvas view for a specific drawing
  - [x] Parameters: drawingId (1)
  - [x] Returns: Promise<void>

### DOC-048: ViewManager.getCurrentView
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-078
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  getCurrentView(): ViewName
  ```
- **Documentation Added:**
  - [x] Description: Returns the name of the currently active view
  - [x] Returns: ViewName

### DOC-049: ViewManager.destroy
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-081
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  async destroy(): Promise<void>
  ```
- **Documentation Added:**
  - [x] Description: Tears down ViewManager by destroying active CanvasApp and HomeScreen, releasing all resources
  - [x] Returns: Promise<void>
  - [x] Examples: No
  - [x] Errors: No

### ui/ — Toolbar

### DOC-050: ToolbarCallbacks (interface)
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/Toolbar.ts`
- **Gap ID:** GAP-094
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  export interface ToolbarCallbacks
  ```
- **Documentation Added:**
  - [x] Description: Callback interface for toolbar user interactions
  - [x] Parameters: All 18 callback fields documented with @property tags

### DOC-051: Toolbar (class)
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/ui/Toolbar.ts`
- **Gap ID:** GAP-095
- **Type:** Class
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  export class Toolbar
  ```
- **Documentation Added:**
  - [x] Description: Main toolbar UI component for tool selection, color picking, brush settings, zoom controls, and canvas actions
  - [x] Constructor: callbacks (ToolbarCallbacks)
  - [x] Examples: Yes

### ui/ — UserStore

### DOC-052: loadProfile
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00007
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-105
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function loadProfile(): UserProfile
  ```
- **Documentation Added:**
  - [x] Description: Loads user profile from localStorage, creating a default if none exists
  - [x] Returns: UserProfile
  - [x] Examples: No

### DOC-053: saveProfile
- **Status:** `IMPLEMENTED`
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-106
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function saveProfile(profile: UserProfile): void
  ```
- **Implemented In:** Loop 00007
- **Documentation Added:**
  - [x] Description: Persists user profile to localStorage and Tauri config file, notifies listeners
  - [x] Parameters: profile
  - [x] Returns: void

### DOC-054: onProfileChange
- **Status:** `IMPLEMENTED`
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-107
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function onProfileChange(callback: (profile: UserProfile) => void): () => void
  ```
- **Implemented In:** Loop 00007
- **Documentation Added:**
  - [x] Description: Subscribes to profile change events triggered by saveProfile
  - [x] Parameters: callback
  - [x] Returns: unsubscribe function
  - [x] Example: subscribe/unsubscribe pattern

---

## WON'T DO

### DOC-W01: Renderer.gl (getter)
- **Status:** `WON'T DO`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-001
- **Reason:** Simple getter, self-explanatory, INTERNAL visibility

### DOC-W02: Renderer.canvas (getter)
- **Status:** `WON'T DO`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-002
- **Reason:** Simple getter, self-explanatory, INTERNAL visibility

### DOC-W03: WebGLContext.setClearColor
- **Status:** `WON'T DO`
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-011
- **Reason:** Thin WebGL wrapper, self-explanatory signature

### DOC-W04: WebGLContext.clear
- **Status:** `WON'T DO`
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-012
- **Reason:** Thin WebGL wrapper, self-explanatory

### DOC-W05: WebGLContext.destroy
- **Status:** `WON'T DO`
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-013
- **Reason:** Standard destroy pattern, self-explanatory

### DOC-W06: ShaderProgram.use
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-014
- **Reason:** Standard WebGL pattern, INTERNAL, LOW importance

### DOC-W07: ShaderProgram.getUniformLocation
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-015
- **Reason:** Direct WebGL wrapper, self-explanatory

### DOC-W08: ShaderProgram.getAttribLocation
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-016
- **Reason:** Direct WebGL wrapper, self-explanatory

### DOC-W09: ShaderProgram.destroy
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-017
- **Reason:** Standard destroy pattern

### DOC-W10: STROKE_VERTEX_SHADER
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-018
- **Reason:** GLSL source constant, self-documenting

### DOC-W11: STROKE_FRAGMENT_SHADER
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-019
- **Reason:** GLSL source constant, self-documenting

### DOC-W12: SpatialIndex.size (getter)
- **Status:** `WON'T DO`
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-035
- **Reason:** UTILITY, SIMPLE getter

### DOC-W13: SpatialIndex.shapeSize (getter)
- **Status:** `WON'T DO`
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-036
- **Reason:** UTILITY, SIMPLE getter

### DOC-W14: SpatialIndex.has
- **Status:** `WON'T DO`
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-037
- **Reason:** UTILITY, self-explanatory boolean check

### DOC-W15: SpatialIndex.hasShape
- **Status:** `WON'T DO`
- **File:** `src/renderer/SpatialIndex.ts`
- **Gap ID:** GAP-038
- **Reason:** UTILITY, self-explanatory boolean check

### DOC-W16: LOD_BRACKET_COUNT
- **Status:** `WON'T DO`
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-044
- **Reason:** INTERNAL constant, self-explanatory name

### DOC-W17: hexLuminance
- **Status:** `WON'T DO`
- **File:** `src/renderer/DotGridRenderer.ts`
- **Gap ID:** GAP-045
- **Reason:** UTILITY helper, self-explanatory name

### DOC-W18: autoContrastDotColor
- **Status:** `WON'T DO`
- **File:** `src/renderer/DotGridRenderer.ts`
- **Gap ID:** GAP-046
- **Reason:** UTILITY helper, name describes behavior

### DOC-W19: DotGridRenderer.setDotColor
- **Status:** `WON'T DO`
- **File:** `src/renderer/DotGridRenderer.ts`
- **Gap ID:** GAP-048
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W20: DotGridRenderer.destroy
- **Status:** `WON'T DO`
- **File:** `src/renderer/DotGridRenderer.ts`
- **Gap ID:** GAP-049
- **Reason:** Standard destroy pattern

### DOC-W21: LineGridRenderer.setLineColor
- **Status:** `WON'T DO`
- **File:** `src/renderer/LineGridRenderer.ts`
- **Gap ID:** GAP-051
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W22: LineGridRenderer.destroy
- **Status:** `WON'T DO`
- **File:** `src/renderer/LineGridRenderer.ts`
- **Gap ID:** GAP-052
- **Reason:** Standard destroy pattern

### DOC-W23: StrokeVertexCache.get
- **Status:** `WON'T DO`
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Gap ID:** GAP-053
- **Reason:** INTERNAL cache accessor, moderate but low visibility

### DOC-W24: StrokeVertexCache.invalidate
- **Status:** `WON'T DO`
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Gap ID:** GAP-054
- **Reason:** INTERNAL, SIMPLE cache operation

### DOC-W25: StrokeVertexCache.clear
- **Status:** `WON'T DO`
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Gap ID:** GAP-055
- **Reason:** INTERNAL, SIMPLE cache operation

### DOC-W26: StrokeVertexCache.size (getter)
- **Status:** `WON'T DO`
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Gap ID:** GAP-056
- **Reason:** UTILITY, SIMPLE getter

### DOC-W27: ShapeVertexCache.get
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Gap ID:** GAP-063
- **Reason:** INTERNAL cache accessor

### DOC-W28: ShapeVertexCache.invalidate
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Gap ID:** GAP-064
- **Reason:** INTERNAL, SIMPLE cache operation

### DOC-W29: ShapeVertexCache.clear
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Gap ID:** GAP-065
- **Reason:** INTERNAL, SIMPLE cache operation

### DOC-W30: ShapeVertexCache.size (getter)
- **Status:** `WON'T DO`
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Gap ID:** GAP-066
- **Reason:** UTILITY, SIMPLE getter

### DOC-W31: ViewManager.getCanvasApp
- **Status:** `WON'T DO`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-079
- **Reason:** INTERNAL, SIMPLE getter

### DOC-W32: ViewManager.getHomeScreen
- **Status:** `WON'T DO`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-080
- **Reason:** INTERNAL, SIMPLE getter

### DOC-W33: CursorManager (class)
- **Status:** `WON'T DO`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-082
- **Reason:** INTERNAL class with all-simple setter methods

### DOC-W34: CursorManager.setTool
- **Status:** `WON'T DO`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-083
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W35: CursorManager.setBrushWidth
- **Status:** `WON'T DO`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-084
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W36: CursorManager.setEraserRadius
- **Status:** `WON'T DO`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-085
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W37: CursorManager.setZoom
- **Status:** `WON'T DO`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-086
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W38: CursorManager.setPanning
- **Status:** `WON'T DO`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-087
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W39: CursorManager.setMagnifyMode
- **Status:** `WON'T DO`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-088
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W40: CursorManager.updateCursor
- **Status:** `WON'T DO`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-089
- **Reason:** INTERNAL method, moderate complexity but low visibility

### DOC-W41: FpsCounter (class)
- **Status:** `WON'T DO`
- **File:** `src/ui/FpsCounter.ts`
- **Gap ID:** GAP-090
- **Reason:** UTILITY, SIMPLE diagnostic class

### DOC-W42: FpsCounter.toggle
- **Status:** `WON'T DO`
- **File:** `src/ui/FpsCounter.ts`
- **Gap ID:** GAP-091
- **Reason:** UTILITY, SIMPLE toggle

### DOC-W43: FpsCounter.isVisible
- **Status:** `WON'T DO`
- **File:** `src/ui/FpsCounter.ts`
- **Gap ID:** GAP-092
- **Reason:** UTILITY, SIMPLE getter

### DOC-W44: FpsCounter.destroy
- **Status:** `WON'T DO`
- **File:** `src/ui/FpsCounter.ts`
- **Gap ID:** GAP-093
- **Reason:** UTILITY, standard destroy pattern

### DOC-W45: TurtlePanelCallbacks (interface)
- **Status:** `WON'T DO`
- **File:** `src/ui/TurtlePanel.ts`
- **Gap ID:** GAP-096
- **Reason:** INTERNAL, follows same pattern as other panel callbacks

### DOC-W46: TurtlePanel (class)
- **Status:** `WON'T DO`
- **File:** `src/ui/TurtlePanel.ts`
- **Gap ID:** GAP-097
- **Reason:** INTERNAL panel, follows established panel pattern

### DOC-W47: DrawDocument (class)
- **Status:** `WON'T DO`
- **File:** `src/model/Document.ts`
- **Gap ID:** GAP-098
- **Reason:** INTERNAL, superseded by DrawfinityDoc (Yjs CRDT) as source of truth

### DOC-W48: DrawDocument.addStroke
- **Status:** `WON'T DO`
- **File:** `src/model/Document.ts`
- **Gap ID:** GAP-099
- **Reason:** INTERNAL, SIMPLE, on superseded class

### DOC-W49: DrawDocument.getStrokes
- **Status:** `WON'T DO`
- **File:** `src/model/Document.ts`
- **Gap ID:** GAP-100
- **Reason:** INTERNAL, SIMPLE, on superseded class

### DOC-W50: DrawDocument.clear
- **Status:** `WON'T DO`
- **File:** `src/model/Document.ts`
- **Gap ID:** GAP-101
- **Reason:** INTERNAL, SIMPLE, on superseded class

### DOC-W51: MagnifyCapture.setEnabled
- **Status:** `WON'T DO`
- **File:** `src/input/MagnifyCapture.ts`
- **Gap ID:** GAP-102
- **Reason:** INTERNAL, SIMPLE setter

### DOC-W52: MagnifyCapture.isEnabled
- **Status:** `WON'T DO`
- **File:** `src/input/MagnifyCapture.ts`
- **Gap ID:** GAP-103
- **Reason:** INTERNAL, SIMPLE getter

### DOC-W53: MagnifyCapture.destroy
- **Status:** `WON'T DO`
- **File:** `src/input/MagnifyCapture.ts`
- **Gap ID:** GAP-104
- **Reason:** INTERNAL, standard destroy pattern

### DOC-W54: USER_COLORS
- **Status:** `WON'T DO`
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-108
- **Reason:** INTERNAL constant, self-explanatory array of colors

---

## Documentation Order

Recommended sequence based on visibility, dependencies, and grouping:

1. **DOC-009** - AABB (PUBLIC, base type used by spatial index)
2. **DOC-008** - StrokePoint (PUBLIC, base type used by renderer)
3. **DOC-010** - computeStrokeBounds (PUBLIC, uses AABB)
4. **DOC-011** - computeShapeBounds (PUBLIC, uses AABB)
5. **DOC-012** - SpatialIndex.add (PUBLIC, core spatial method)
6. **DOC-013** - SpatialIndex.addShape (PUBLIC, core spatial method)
7. **DOC-014** - SpatialIndex.remove (PUBLIC)
8. **DOC-015** - SpatialIndex.removeShape (PUBLIC)
9. **DOC-016** - SpatialIndex.clear (PUBLIC)
10. **DOC-017** - SpatialIndex.query (PUBLIC, CRITICAL)
11. **DOC-018** - SpatialIndex.queryShapes (PUBLIC, CRITICAL)
12. **DOC-029** - SpatialIndex.rebuild (INTERNAL, HIGH)
13. **DOC-030** - SpatialIndex.rebuildAll (INTERNAL, HIGH)
14. **DOC-004** - Renderer.setCameraMatrix (PUBLIC, CRITICAL)
15. **DOC-006** - Renderer.drawStroke (PUBLIC, CRITICAL)
16. **DOC-001** - Renderer.setBackgroundColor (PUBLIC)
17. **DOC-002** - Renderer.setGridStyle (PUBLIC)
18. **DOC-003** - Renderer.clear (PUBLIC)
19. **DOC-005** - Renderer.drawGrid (PUBLIC)
20. **DOC-007** - Renderer.destroy (PUBLIC)
21. **DOC-027** - WebGLContext.resize (INTERNAL)
22. **DOC-028** - StrokeRenderer.setCameraMatrix (INTERNAL)
23. **DOC-019** - generateTriangleStrip (INTERNAL, CRITICAL)
24. **DOC-026** - ShapeVertexData (INTERNAL, base type)
25. **DOC-025** - generateShapeVertices (PUBLIC, dispatcher)
26. **DOC-033** - generateRectangleVertices (INTERNAL)
27. **DOC-034** - generateEllipseVertices (INTERNAL)
28. **DOC-035** - generatePolygonVertices (INTERNAL)
29. **DOC-036** - generateStarVertices (INTERNAL)
30. **DOC-022** - getStrokeLOD (PUBLIC, CRITICAL)
31. **DOC-020** - getLODBracket (INTERNAL)
32. **DOC-021** - douglasPeucker (INTERNAL)
33. **DOC-023** - invalidateStrokeLOD (PUBLIC)
34. **DOC-024** - clearLODCache (PUBLIC)
35. **DOC-031** - DotGridRenderer.getEffectiveSpacing (INTERNAL)
36. **DOC-032** - LineGridRenderer.getEffectiveSpacing (INTERNAL)
37. **DOC-043** - ViewName (PUBLIC, base type)
38. **DOC-044** - ViewManagerDeps (PUBLIC, dependency interface)
39. **DOC-045** - ViewManager (PUBLIC, CRITICAL)
40. **DOC-046** - ViewManager.showHome (PUBLIC)
41. **DOC-047** - ViewManager.showCanvas (PUBLIC, CRITICAL)
42. **DOC-048** - ViewManager.getCurrentView (PUBLIC)
43. **DOC-049** - ViewManager.destroy (PUBLIC)
44. **DOC-037** - CheatSheet (PUBLIC)
45. **DOC-038** - CheatSheet.show (PUBLIC)
46. **DOC-039** - CheatSheet.hide (PUBLIC)
47. **DOC-040** - CheatSheet.toggle (PUBLIC)
48. **DOC-041** - CheatSheet.isVisible (PUBLIC)
49. **DOC-042** - CheatSheet.destroy (PUBLIC)
50. **DOC-050** - ToolbarCallbacks (PUBLIC, CRITICAL)
51. **DOC-051** - Toolbar (PUBLIC, CRITICAL)
52. **DOC-052** - loadProfile (PUBLIC)
53. **DOC-053** - saveProfile (PUBLIC)
54. **DOC-054** - onProfileChange (PUBLIC)

## Related Documentation

Exports that should be documented together for consistency:

- **Group A:** DOC-001–007 — Renderer class public API
- **Group B:** DOC-009–018, DOC-029–030 — SpatialIndex ecosystem (AABB, bounds, queries)
- **Group C:** DOC-019 — StrokeMesh triangle strip generation
- **Group D:** DOC-020–024 — LOD system (brackets, Douglas-Peucker, cache management)
- **Group E:** DOC-025–026, DOC-033–036 — Shape mesh generation pipeline
- **Group F:** DOC-037–042 — CheatSheet panel
- **Group G:** DOC-043–049 — ViewManager and view types
- **Group H:** DOC-050–051 — Toolbar and callbacks
- **Group I:** DOC-052–054 — User profile store functions
