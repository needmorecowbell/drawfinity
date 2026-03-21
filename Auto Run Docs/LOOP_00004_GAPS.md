---
type: analysis
title: Documentation Gaps - Loop 00004
created: 2026-03-20
tags:
  - documentation
  - gaps
related:
  - '[[LOOP_00004_DOC_REPORT]]'
  - '[[2_FIND_GAPS]]'
---

# Documentation Gaps - Loop 00004

## Summary
- **Overall Coverage:** 80.9% (target: 90%)
- **Total Gaps Found:** 102
- **By Type:** 18 Functions, 9 Classes, 10 Interfaces/Types, 5 Constants, 60 Methods
- **By Visibility:** 25 Public API, 52 Internal API, 25 Utility

## Gap List

### renderer/ — 63% coverage (32 gaps identified in report, 54 total found)

### GAP-001: Renderer.gl (getter)
- **File:** `src/renderer/Renderer.ts`
- **Line:** 31
- **Type:** Method (getter)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `get gl(): WebGLRenderingContext`

### GAP-002: Renderer.canvas (getter)
- **File:** `src/renderer/Renderer.ts`
- **Line:** 35
- **Type:** Method (getter)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `get canvas(): HTMLCanvasElement`

### GAP-003: Renderer.setBackgroundColor
- **File:** `src/renderer/Renderer.ts`
- **Line:** 39
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `setBackgroundColor(color: string): void`

### GAP-004: Renderer.setGridStyle
- **File:** `src/renderer/Renderer.ts`
- **Line:** 45
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `setGridStyle(style: GridStyle): void`

### GAP-005: Renderer.clear
- **File:** `src/renderer/Renderer.ts`
- **Line:** 49
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

### GAP-006: Renderer.setCameraMatrix
- **File:** `src/renderer/Renderer.ts`
- **Line:** 54
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `setCameraMatrix(matrix: Float32Array): void`

### GAP-007: Renderer.drawGrid
- **File:** `src/renderer/Renderer.ts`
- **Line:** 58
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `drawGrid(width: number, height: number, zoom: number, panX: number, panY: number): void`

### GAP-008: Renderer.drawStroke
- **File:** `src/renderer/Renderer.ts`
- **Line:** 71
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `drawStroke(...): void`

### GAP-009: Renderer.destroy
- **File:** `src/renderer/Renderer.ts`
- **Line:** 102
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-010: WebGLContext.resize
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 28
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `resize(width: number, height: number): void`

### GAP-011: WebGLContext.setClearColor
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 42
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setClearColor(r: number, g: number, b: number, a: number): void`

### GAP-012: WebGLContext.clear
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 50
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

### GAP-013: WebGLContext.destroy
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 54
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-014: ShaderProgram.use
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 37
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `use(): void`

### GAP-015: ShaderProgram.getUniformLocation
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 41
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `getUniformLocation(name: string): WebGLUniformLocation | null`

### GAP-016: ShaderProgram.getAttribLocation
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 45
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `getAttribLocation(name: string): number`

### GAP-017: ShaderProgram.destroy
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 49
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-018: STROKE_VERTEX_SHADER
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 70
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export const STROKE_VERTEX_SHADER: string`

### GAP-019: STROKE_FRAGMENT_SHADER
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 87
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export const STROKE_FRAGMENT_SHADER: string`

### GAP-020: StrokePoint (interface)
- **File:** `src/renderer/StrokeRenderer.ts`
- **Line:** 8
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export interface StrokePoint { x, y, pressure }`

### GAP-021: StrokeRenderer.setCameraMatrix
- **File:** `src/renderer/StrokeRenderer.ts`
- **Line:** 77
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setCameraMatrix(matrix: Float32Array): void`

### GAP-022: generateTriangleStrip
- **File:** `src/renderer/StrokeMesh.ts`
- **Line:** 19
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `export function generateTriangleStrip(...): Float32Array`

### GAP-023: AABB (interface)
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 4
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export interface AABB { minX, minY, maxX, maxY }`

### GAP-024: computeStrokeBounds
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 14
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function computeStrokeBounds(stroke: Stroke): AABB`

### GAP-025: computeShapeBounds
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 37
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function computeShapeBounds(shape: Shape): AABB`

### GAP-026: SpatialIndex.add
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 108
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `add(id: string, stroke: Stroke): void`

### GAP-027: SpatialIndex.addShape
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 129
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `addShape(id: string, shape: Shape): void`

### GAP-028: SpatialIndex.remove
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 150
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `remove(id: string): void`

### GAP-029: SpatialIndex.removeShape
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 174
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `removeShape(id: string): void`

### GAP-030: SpatialIndex.clear
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 198
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

### GAP-031: SpatialIndex.rebuild
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 208
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `rebuild(id: string, stroke: Stroke): void`

### GAP-032: SpatialIndex.rebuildAll
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 216
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `rebuildAll(strokes: Map<string, Stroke>, shapes: Map<string, Shape>): void`

### GAP-033: SpatialIndex.query
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 230
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `query(viewport: AABB): string[]`

### GAP-034: SpatialIndex.queryShapes
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 264
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `queryShapes(viewport: AABB): string[]`

### GAP-035: SpatialIndex.size (getter)
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 293
- **Type:** Method (getter)
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `get size(): number`

### GAP-036: SpatialIndex.shapeSize (getter)
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 298
- **Type:** Method (getter)
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `get shapeSize(): number`

### GAP-037: SpatialIndex.has
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 303
- **Type:** Method
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `has(id: string): boolean`

### GAP-038: SpatialIndex.hasShape
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 308
- **Type:** Method
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `hasShape(id: string): boolean`

### GAP-039: getLODBracket
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 22
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function getLODBracket(zoom: number): number`

### GAP-040: douglasPeucker
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 37
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `export function douglasPeucker(points: StrokePoint[], epsilon: number): StrokePoint[]`

### GAP-041: getStrokeLOD
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 103
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `export function getStrokeLOD(stroke: Stroke, zoom: number): StrokePoint[]`

### GAP-042: invalidateStrokeLOD
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 207
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export function invalidateStrokeLOD(strokeId: string): void`

### GAP-043: clearLODCache
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 215
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export function clearLODCache(): void`

### GAP-044: LOD_BRACKET_COUNT
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 221
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export const LOD_BRACKET_COUNT: number`

### GAP-045: hexLuminance
- **File:** `src/renderer/DotGridRenderer.ts`
- **Line:** 7
- **Type:** Function
- **Visibility:** UTILITY
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function hexLuminance(hex: string): number`

### GAP-046: autoContrastDotColor
- **File:** `src/renderer/DotGridRenderer.ts`
- **Line:** 21
- **Type:** Function
- **Visibility:** UTILITY
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function autoContrastDotColor(bgHex: string): string`

### GAP-047: DotGridRenderer.getEffectiveSpacing
- **File:** `src/renderer/DotGridRenderer.ts`
- **Line:** 109
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `getEffectiveSpacing(): number`

### GAP-048: DotGridRenderer.setDotColor
- **File:** `src/renderer/DotGridRenderer.ts`
- **Line:** 171
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setDotColor(color: string): void`

### GAP-049: DotGridRenderer.destroy
- **File:** `src/renderer/DotGridRenderer.ts`
- **Line:** 175
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-050: LineGridRenderer.getEffectiveSpacing
- **File:** `src/renderer/LineGridRenderer.ts`
- **Line:** 75
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `getEffectiveSpacing(): number`

### GAP-051: LineGridRenderer.setLineColor
- **File:** `src/renderer/LineGridRenderer.ts`
- **Line:** 141
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setLineColor(color: string): void`

### GAP-052: LineGridRenderer.destroy
- **File:** `src/renderer/LineGridRenderer.ts`
- **Line:** 154
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-053: StrokeVertexCache.get
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Line:** 21
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `get(strokeId: string, stroke: Stroke, zoom: number): Float32Array`

### GAP-054: StrokeVertexCache.invalidate
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Line:** 43
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `invalidate(strokeId: string): void`

### GAP-055: StrokeVertexCache.clear
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Line:** 48
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

### GAP-056: StrokeVertexCache.size (getter)
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Line:** 52
- **Type:** Method (getter)
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `get size(): number`

### GAP-057: ShapeVertexData (interface)
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 9
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export interface ShapeVertexData`

### GAP-058: generateRectangleVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 247
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generateRectangleVertices(...): ShapeVertexData`

### GAP-059: generateEllipseVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 252
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generateEllipseVertices(...): ShapeVertexData`

### GAP-060: generatePolygonVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 257
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generatePolygonVertices(...): ShapeVertexData`

### GAP-061: generateStarVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 262
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generateStarVertices(...): ShapeVertexData`

### GAP-062: generateShapeVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 267
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generateShapeVertices(shape: Shape): ShapeVertexData`

### GAP-063: ShapeVertexCache.get
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Line:** 17
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `get(shapeId: string, shape: Shape): ShapeVertexData`

### GAP-064: ShapeVertexCache.invalidate
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Line:** 27
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `invalidate(shapeId: string): void`

### GAP-065: ShapeVertexCache.clear
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Line:** 32
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

### GAP-066: ShapeVertexCache.size (getter)
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Line:** 36
- **Type:** Method (getter)
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `get size(): number`

---

### ui/ — 73% coverage (55 gaps identified)

### GAP-067: CheatSheet (class)
- **File:** `src/ui/CheatSheet.ts`
- **Line:** 4
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs (entire class undocumented)
- **Signature:** `export class CheatSheet`

### GAP-068: CheatSheet.show
- **File:** `src/ui/CheatSheet.ts`
- **Line:** 107
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `show(): void`

### GAP-069: CheatSheet.hide
- **File:** `src/ui/CheatSheet.ts`
- **Line:** 116
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `hide(): void`

### GAP-070: CheatSheet.toggle
- **File:** `src/ui/CheatSheet.ts`
- **Line:** 122
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `toggle(): void`

### GAP-071: CheatSheet.isVisible
- **File:** `src/ui/CheatSheet.ts`
- **Line:** 130
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `isVisible(): boolean`

### GAP-072: CheatSheet.destroy
- **File:** `src/ui/CheatSheet.ts`
- **Line:** 134
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-073: ViewName (type)
- **File:** `src/ui/ViewManager.ts`
- **Line:** 5
- **Type:** Type
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export type ViewName = "home" | "canvas"`

### GAP-074: ViewManagerDeps (interface)
- **File:** `src/ui/ViewManager.ts`
- **Line:** 7
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export interface ViewManagerDeps`

### GAP-075: ViewManager (class)
- **File:** `src/ui/ViewManager.ts`
- **Line:** 18
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs (entire class undocumented)
- **Signature:** `export class ViewManager`

### GAP-076: ViewManager.showHome
- **File:** `src/ui/ViewManager.ts`
- **Line:** 51
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `async showHome(): Promise<void>`

### GAP-077: ViewManager.showCanvas
- **File:** `src/ui/ViewManager.ts`
- **Line:** 79
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `async showCanvas(drawingId: string): Promise<void>`

### GAP-078: ViewManager.getCurrentView
- **File:** `src/ui/ViewManager.ts`
- **Line:** 149
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `getCurrentView(): ViewName`

### GAP-079: ViewManager.getCanvasApp
- **File:** `src/ui/ViewManager.ts`
- **Line:** 153
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `getCanvasApp(): CanvasApp | null`

### GAP-080: ViewManager.getHomeScreen
- **File:** `src/ui/ViewManager.ts`
- **Line:** 157
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `getHomeScreen(): HomeScreen`

### GAP-081: ViewManager.destroy
- **File:** `src/ui/ViewManager.ts`
- **Line:** 161
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `async destroy(): Promise<void>`

### GAP-082: CursorManager (class)
- **File:** `src/ui/CursorManager.ts`
- **Line:** 11
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export class CursorManager`

### GAP-083: CursorManager.setTool
- **File:** `src/ui/CursorManager.ts`
- **Line:** 24
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setTool(tool: ToolType): void`

### GAP-084: CursorManager.setBrushWidth
- **File:** `src/ui/CursorManager.ts`
- **Line:** 29
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setBrushWidth(width: number): void`

### GAP-085: CursorManager.setEraserRadius
- **File:** `src/ui/CursorManager.ts`
- **Line:** 34
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setEraserRadius(radius: number): void`

### GAP-086: CursorManager.setZoom
- **File:** `src/ui/CursorManager.ts`
- **Line:** 39
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setZoom(zoom: number): void`

### GAP-087: CursorManager.setPanning
- **File:** `src/ui/CursorManager.ts`
- **Line:** 43
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setPanning(panning: boolean): void`

### GAP-088: CursorManager.setMagnifyMode
- **File:** `src/ui/CursorManager.ts`
- **Line:** 48
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setMagnifyMode(mode: "default" | "in" | "out"): void`

### GAP-089: CursorManager.updateCursor
- **File:** `src/ui/CursorManager.ts`
- **Line:** 111
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `updateCursor(): void`

### GAP-090: FpsCounter (class)
- **File:** `src/ui/FpsCounter.ts`
- **Line:** 5
- **Type:** Class
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export class FpsCounter`

### GAP-091: FpsCounter.toggle
- **File:** `src/ui/FpsCounter.ts`
- **Line:** 32
- **Type:** Method
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `toggle(): void`

### GAP-092: FpsCounter.isVisible
- **File:** `src/ui/FpsCounter.ts`
- **Line:** 41
- **Type:** Method
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `isVisible(): boolean`

### GAP-093: FpsCounter.destroy
- **File:** `src/ui/FpsCounter.ts`
- **Line:** 69
- **Type:** Method
- **Visibility:** UTILITY
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-094: ToolbarCallbacks (interface)
- **File:** `src/ui/Toolbar.ts`
- **Line:** 14
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `export interface ToolbarCallbacks`

### GAP-095: Toolbar (class)
- **File:** `src/ui/Toolbar.ts`
- **Line:** 59
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `export class Toolbar`

### GAP-096: TurtlePanelCallbacks (interface)
- **File:** `src/ui/TurtlePanel.ts`
- **Line:** 3
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export interface TurtlePanelCallbacks`

### GAP-097: TurtlePanel (class)
- **File:** `src/ui/TurtlePanel.ts`
- **Line:** 24
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export class TurtlePanel`

---

### model/ — 73% coverage (4 gaps)

### GAP-098: DrawDocument (class)
- **File:** `src/model/Document.ts`
- **Line:** 3
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export class DrawDocument implements DocumentModel`

### GAP-099: DrawDocument.addStroke
- **File:** `src/model/Document.ts`
- **Line:** 6
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `addStroke(stroke: Stroke): void`

### GAP-100: DrawDocument.getStrokes
- **File:** `src/model/Document.ts`
- **Line:** 10
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `getStrokes(): Stroke[]`

### GAP-101: DrawDocument.clear
- **File:** `src/model/Document.ts`
- **Line:** 14
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

---

### input/ — 82% coverage (4 gaps)

### GAP-102: MagnifyCapture.setEnabled
- **File:** `src/input/MagnifyCapture.ts`
- **Line:** 55
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setEnabled(enabled: boolean): void`

### GAP-103: MagnifyCapture.isEnabled
- **File:** `src/input/MagnifyCapture.ts`
- **Line:** 62
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `isEnabled(): boolean`

### GAP-104: MagnifyCapture.destroy
- **File:** `src/input/MagnifyCapture.ts`
- **Line:** 133
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

---

### user/ — 82% coverage (2 gaps on exported items)

### GAP-105: loadProfile
- **File:** `src/user/UserStore.ts`
- **Line:** 28
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function loadProfile(): UserProfile`

### GAP-106: saveProfile
- **File:** `src/user/UserStore.ts`
- **Line:** 45
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export function saveProfile(profile: UserProfile): void`

### GAP-107: onProfileChange
- **File:** `src/user/UserStore.ts`
- **Line:** 71
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function onProfileChange(callback: (profile: UserProfile) => void): () => void`

### GAP-108: USER_COLORS
- **File:** `src/user/UserStore.ts`
- **Line:** 78
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export { USER_COLORS }`

---

## Gaps by Module

| Module | Gap Count | Types |
|--------|-----------|-------|
| `src/renderer/` | 66 | 14 Functions, 2 Interfaces, 3 Constants, 47 Methods |
| `src/ui/` | 31 | 6 Classes, 3 Interfaces/Types, 22 Methods |
| `src/model/` | 4 | 1 Class, 3 Methods |
| `src/input/` | 3 | 3 Methods |
| `src/user/` | 4 | 3 Functions, 1 Constant |

## Gaps by Priority

### Quick Wins (simple, high coverage impact)
- GAP-067–072: CheatSheet (entire class, 6 items)
- GAP-073–081: ViewManager (entire class, 9 items)
- GAP-090–093: FpsCounter (4 items)
- GAP-098–101: DrawDocument (4 items)
- GAP-105–108: UserStore functions (4 items)

### High Priority (complex, heavily used)
- GAP-001–009: Renderer class methods (9 items, core rendering pipeline)
- GAP-023–038: SpatialIndex (16 items, core spatial query system)
- GAP-094–095: Toolbar + ToolbarCallbacks (main UI component)
- GAP-039–044: StrokeLOD functions (6 items, performance-critical)

### Medium Priority
- GAP-010–013: WebGLContext (4 items)
- GAP-082–089: CursorManager (8 items)
- GAP-096–097: TurtlePanel + callbacks (2 items)
- GAP-045–052: Grid renderer methods (8 items)

### Low Priority (thin wrappers, self-evident)
- GAP-014–019: ShaderProgram methods + constants (6 items)
- GAP-053–056: StrokeVertexCache (4 items)
- GAP-063–066: ShapeVertexCache (4 items)

## Related Exports

Exports that should be documented together:

- **Group A:** `Renderer`, `WebGLContext`, `ShaderProgram`, `StrokeRenderer` — core rendering pipeline
- **Group B:** `SpatialIndex`, `AABB`, `computeStrokeBounds`, `computeShapeBounds` — spatial query system
- **Group C:** `StrokeLOD`, `getLODBracket`, `douglasPeucker`, `getStrokeLOD`, `invalidateStrokeLOD`, `clearLODCache` — LOD system
- **Group D:** `CheatSheet`, `ViewManager`, `FpsCounter` — standalone UI components
- **Group E:** `Toolbar`, `ToolbarCallbacks`, `CursorManager` — toolbar ecosystem
- **Group F:** `StrokeVertexCache`, `ShapeVertexCache`, `StrokeMesh`, `ShapeMesh` — vertex/mesh pipeline
- **Group G:** `loadProfile`, `saveProfile`, `onProfileChange`, `USER_COLORS` — user store
