---
type: report
title: Documentation Gaps - Loop 00003
created: 2026-03-20
tags:
  - documentation
  - gaps
related:
  - '[[LOOP_00003_DOC_REPORT]]'
  - '[[LOOP_00003_PLAN]]'
---

# Documentation Gaps - Loop 00003

## Summary
- **Total Gaps Found:** 55
- **By Type:** 20 Functions, 0 Classes, 7 Interfaces/Types, 5 Constants, 23 Methods (public)
- **By Visibility:** 20 Public API, 25 Internal API, 10 Utility
- **Overall Coverage:** 86.3% → Target 90%

## Gaps by Module

| Module | Gap Count | Types |
|--------|-----------|-------|
| `src/user/` | 7 | 2 Functions, 1 Interface, 1 Constant, 3 Methods |
| `src/renderer/` | 27 | 10 Functions, 2 Constants, 15 Methods |
| `src/ui/` | 18 | 18 Methods |
| `src/input/` | 5 | 5 Methods |
| `src/model/` | 3 | 3 Methods |
| `src/turtle/` | 6 | 3 Interfaces, 1 Constant, 2 Methods |

---

## Priority Tier 1: Quick Wins (user/)

### GAP-001: UserProfile
- **File:** `src/user/UserProfile.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export interface UserProfile { id: string; name: string; color: string; }`
- **Documentation Needed:**
  - [ ] Description
  - [ ] Properties

### GAP-002: readConfigFile
- **File:** `src/user/ConfigFile.ts`
- **Line:** 34
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `async function readConfigFile(filename: string): Promise<string | null>`
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters
  - [ ] Return value
  - [ ] Error handling

### GAP-003: writeConfigFile
- **File:** `src/user/ConfigFile.ts`
- **Line:** 48
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `async function writeConfigFile(filename: string, content: string): Promise<void>`
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters
  - [ ] Error handling

### GAP-004: USER_COLORS
- **File:** `src/user/UserStore.ts`
- **Line:** 7
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `const USER_COLORS = ["#e74c3c", "#e67e22", ...]`
- **Documentation Needed:**
  - [ ] Description

### GAP-005: loadProfile
- **File:** `src/user/UserStore.ts`
- **Line:** 28
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function loadProfile(): UserProfile`
- **Documentation Needed:**
  - [ ] Description
  - [ ] Return value

### GAP-006: saveProfile
- **File:** `src/user/UserStore.ts`
- **Line:** 45
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function saveProfile(profile: UserProfile): void`
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters

### GAP-007: onProfileChange
- **File:** `src/user/UserStore.ts`
- **Line:** 71
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function onProfileChange(callback: (profile: UserProfile) => void): () => void`
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters
  - [ ] Return value (unsubscribe function)

---

## Priority Tier 2: High Priority (renderer/)

### GAP-008: Renderer.setBackgroundColor
- **File:** `src/renderer/Renderer.ts`
- **Line:** 39
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setBackgroundColor(hex: string): void`

### GAP-009: Renderer.setGridStyle
- **File:** `src/renderer/Renderer.ts`
- **Line:** 45
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setGridStyle(style: GridStyle): void`

### GAP-010: Renderer.clear
- **File:** `src/renderer/Renderer.ts`
- **Line:** 49
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

### GAP-011: Renderer.setCameraMatrix
- **File:** `src/renderer/Renderer.ts`
- **Line:** 54
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `setCameraMatrix(matrix: Float32Array): void`

### GAP-012: Renderer.drawStroke
- **File:** `src/renderer/Renderer.ts`
- **Line:** 71
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `drawStroke(points: readonly StrokePoint[], color: [number, number, number, number], width: number): void`

### GAP-013: Renderer.destroy
- **File:** `src/renderer/Renderer.ts`
- **Line:** 102
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-014: WebGLContext.resize
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 28
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `resize(): void`

### GAP-015: WebGLContext.setClearColor
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 42
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setClearColor(hex: string): void`

### GAP-016: WebGLContext.clear
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 50
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

### GAP-017: WebGLContext.destroy
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 54
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-018: StrokeRenderer.setCameraMatrix
- **File:** `src/renderer/StrokeRenderer.ts`
- **Line:** 77
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setCameraMatrix(matrix: Float32Array): void`

### GAP-019: StrokeRenderer.drawStroke
- **File:** `src/renderer/StrokeRenderer.ts`
- **Line:** 84
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `drawStroke(points: readonly StrokePoint[], color: [number, number, number, number], width: number): void`

### GAP-020: StrokeRenderer.destroy
- **File:** `src/renderer/StrokeRenderer.ts`
- **Line:** 221
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

### GAP-021: STROKE_VERTEX_SHADER
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 70
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export const STROKE_VERTEX_SHADER = ...`

### GAP-022: STROKE_FRAGMENT_SHADER
- **File:** `src/renderer/ShaderProgram.ts`
- **Line:** 87
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export const STROKE_FRAGMENT_SHADER = ...`

### GAP-023: getLODBracket
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 22
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export function getLODBracket(zoom: number): number`

### GAP-024: douglasPeucker
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 37
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `export function douglasPeucker(points: readonly StrokePoint[], tolerance: number): StrokePoint[]`

### GAP-025: getStrokeLOD
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 103
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Signature:** `export function getStrokeLOD(strokeId: string, points: readonly StrokePoint[], zoom: number): readonly StrokePoint[]`

### GAP-026: invalidateStrokeLOD
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 207
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export function invalidateStrokeLOD(strokeId: string): void`

### GAP-027: clearLODCache
- **File:** `src/renderer/StrokeLOD.ts`
- **Line:** 215
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `export function clearLODCache(): void`

### GAP-028: generateRectangleVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 247
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generateRectangleVertices(shape: Shape): ShapeVertexData`

### GAP-029: generateEllipseVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 252
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generateEllipseVertices(shape: Shape, segments?: number): ShapeVertexData`

### GAP-030: generatePolygonVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 257
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generatePolygonVertices(shape: Shape): ShapeVertexData`

### GAP-031: generateStarVertices
- **File:** `src/renderer/ShapeMesh.ts`
- **Line:** 262
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `export function generateStarVertices(shape: Shape): ShapeVertexData`

---

## Priority Tier 3: UI & Input Modules

### GAP-032: CursorManager.setTool
- **File:** `src/ui/CursorManager.ts`
- **Line:** 24
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Signature:** `setTool(tool: ToolType): void`

### GAP-033: CursorManager.setBrushWidth
- **File:** `src/ui/CursorManager.ts`
- **Line:** 29
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Signature:** `setBrushWidth(width: number): void`

### GAP-034: CursorManager.setEraserRadius
- **File:** `src/ui/CursorManager.ts`
- **Line:** 34
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Signature:** `setEraserRadius(radius: number): void`

### GAP-035: CursorManager.setZoom
- **File:** `src/ui/CursorManager.ts`
- **Line:** 39
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Signature:** `setZoom(zoom: number): void`

### GAP-036: CheatSheet.show/hide/toggle/isVisible/destroy
- **File:** `src/ui/CheatSheet.ts`
- **Lines:** 107, 116, 122, 130, 134
- **Type:** Methods (5)
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs on any lifecycle/visibility methods

### GAP-037: ViewManager.showHome
- **File:** `src/ui/ViewManager.ts`
- **Line:** 51
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Signature:** `showHome(): Promise<void>`

### GAP-038: ViewManager.showCanvas
- **File:** `src/ui/ViewManager.ts`
- **Line:** 79
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Signature:** `showCanvas(drawingId: string): Promise<void>`

### GAP-039: ViewManager.getCurrentView/getCanvasApp/getHomeScreen/destroy
- **File:** `src/ui/ViewManager.ts`
- **Lines:** 149, 153, 157, 161
- **Type:** Methods (4)
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE

### GAP-040: StrokeCapture setEnabled/isEnabled/setTool/getTool
- **File:** `src/input/StrokeCapture.ts`
- **Lines:** 187, 196, 232, 237
- **Type:** Methods (4)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE

### GAP-041: ShapeCapture setEnabled/isEnabled/setConfig/getConfig/getPreviewShape
- **File:** `src/input/ShapeCapture.ts`
- **Lines:** 119, 127, 140, 150, 253
- **Type:** Methods (5)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE

---

## Priority Tier 4: Model & Turtle

### GAP-042: Document.addStroke/getStrokes/clear
- **File:** `src/model/Document.ts`
- **Lines:** 6, 10, 14
- **Type:** Methods (3)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE

### GAP-043: TurtleExample
- **File:** `src/turtle/TurtleExamples.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `export interface TurtleExample { name: string; description: string; code: string; }`

### GAP-044: TURTLE_EXAMPLES
- **File:** `src/turtle/TurtleExamples.ts`
- **Line:** 7
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `export const TURTLE_EXAMPLES: TurtleExample[]`

### GAP-045: PenState
- **File:** `src/turtle/TurtleState.ts`
- **Line:** 4
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE

### GAP-046: TurtleSnapshot
- **File:** `src/turtle/TurtleState.ts`
- **Line:** 12
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE

### GAP-047: TurtleExecutorEvents
- **File:** `src/turtle/TurtleExecutor.ts`
- **Line:** 6
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE

---

## Skip Recommendations

The following items are thin GL wrappers or self-evident and may be deprioritized:
- `ShaderProgram.use/getUniformLocation/getAttribLocation/destroy` — thin GL wrappers
- `SpatialIndex` simple accessors (`size`, `shapeSize`, `has`, `hasShape`) — self-evident
- `StrokeVertexCache` / `ShapeVertexCache` basic cache operations — standard cache pattern
- `DotGridRenderer` / `LineGridRenderer` setters and destroy — standard lifecycle
- `MagnifyCapture.setEnabled/isEnabled` — standard enable/disable pattern
- `TurtleIndicator` show/hide/toggle/destroy — standard visibility pattern
- `TurtleState.setOrigin/reset/snapshot` — standard state management
- `TurtleExecutor.isRunning/stop` — self-evident
- `TurtleDrawing.addSegment/flush/getStrokeIds` — standard drawing operations
- `LuaRuntime` methods — init/execute/close lifecycle

These account for ~24 additional undocumented items. Documenting the 47 gaps above should bring coverage above 90%.

---

## Related Exports (Document Together)

- **Group A:** `readConfigFile`, `writeConfigFile` — file I/O pair in ConfigFile.ts
- **Group B:** `UserProfile`, `loadProfile`, `saveProfile`, `onProfileChange`, `USER_COLORS` — user identity system
- **Group C:** `Renderer.setBackgroundColor/setGridStyle/clear/setCameraMatrix/drawStroke/destroy` — core render loop
- **Group D:** `getLODBracket`, `getStrokeLOD`, `invalidateStrokeLOD`, `clearLODCache`, `douglasPeucker` — LOD pipeline
- **Group E:** `generateRectangleVertices/generateEllipseVertices/generatePolygonVertices/generateStarVertices` — shape mesh generators
- **Group F:** `TurtleExample`, `TURTLE_EXAMPLES`, `PenState`, `TurtleSnapshot`, `TurtleExecutorEvents` — turtle type definitions
- **Group G:** `CheatSheet` lifecycle methods — all simple show/hide/toggle pattern
- **Group H:** `ViewManager` navigation methods — view switching system
