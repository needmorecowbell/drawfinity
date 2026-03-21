---
type: report
title: Documentation Gaps - Loop 00004 (Updated Loop 6)
created: 2026-03-20
tags:
  - documentation
  - gaps
related:
  - '[[LOOP_00004_DOC_REPORT]]'
  - '[[LOOP_00004_PLAN]]'
---

# Documentation Gaps - Loop 00004 (Updated Loop 6)

## Summary
- **Overall Coverage:** 80.9% (target: 90%)
- **Total Gaps Found:** 57
- **By Type:** 3 Functions, 4 Classes, 2 Interfaces, 1 Constant, 47 Methods
- **By Visibility:** 12 Public API, 35 Internal API, 10 Utility

## Gaps by Module

| Module | Gap Count | Types |
|--------|-----------|-------|
| `src/renderer/` | 18 | 4 Methods (WebGLContext), 6 Methods+Constants (ShaderProgram), 1 Interface + 5 Methods (StrokeRenderer), 2 Methods (Renderer) |
| `src/ui/` | 35 | 2 Classes + 1 Interface + 32 Methods |
| `src/model/` | 4 | 1 Class + 3 Methods |
| `src/input/` | 4 | 1 Class + 2 Methods + 1 Property |
| `src/user/` | 4 | 3 Functions + 1 Constant |

---

## Gap List

### renderer/ Module (63% coverage — 54/86)

#### GAP-001: WebGLContext.resize
- **File:** `src/renderer/WebGLContext.ts:28`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Signature:** `resize(): void`

#### GAP-002: WebGLContext.setClearColor
- **File:** `src/renderer/WebGLContext.ts:42`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `setClearColor(hex: string): void`

#### GAP-003: WebGLContext.clear
- **File:** `src/renderer/WebGLContext.ts:50`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `clear(): void`

#### GAP-004: WebGLContext.destroy
- **File:** `src/renderer/WebGLContext.ts:54`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `destroy(): void`

#### GAP-005: ShaderProgram.use
- **File:** `src/renderer/ShaderProgram.ts:37`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `use(): void`

#### GAP-006: ShaderProgram.getUniformLocation
- **File:** `src/renderer/ShaderProgram.ts:41`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `getUniformLocation(name: string): WebGLUniformLocation | null`

#### GAP-007: ShaderProgram.getAttribLocation
- **File:** `src/renderer/ShaderProgram.ts:45`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `getAttribLocation(name: string): number`

#### GAP-008: ShaderProgram.destroy
- **File:** `src/renderer/ShaderProgram.ts:49`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `destroy(): void`

#### GAP-009: STROKE_VERTEX_SHADER
- **File:** `src/renderer/ShaderProgram.ts:70`
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `export const STROKE_VERTEX_SHADER`

#### GAP-010: STROKE_FRAGMENT_SHADER
- **File:** `src/renderer/ShaderProgram.ts:87`
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `export const STROKE_FRAGMENT_SHADER`

#### GAP-011: StrokePoint
- **File:** `src/renderer/StrokeRenderer.ts:8`
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Signature:** `export interface StrokePoint { x: number; y: number; pressure?: number; }`

#### GAP-012: StrokeRenderer.setCameraMatrix
- **File:** `src/renderer/StrokeRenderer.ts:77`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `setCameraMatrix(matrix: Float32Array): void`

#### GAP-013: StrokeRenderer.drawStroke
- **File:** `src/renderer/StrokeRenderer.ts:84`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Signature:** `drawStroke(points: readonly StrokePoint[], color: [number, number, number, number], width: number): void`

#### GAP-014: StrokeRenderer.drawStrokeBatch
- **File:** `src/renderer/StrokeRenderer.ts:114`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Signature:** `drawStrokeBatch(strips: Float32Array[]): void`

#### GAP-015: StrokeRenderer.drawTriangleBatch
- **File:** `src/renderer/StrokeRenderer.ts:184`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Signature:** `drawTriangleBatch(triangleArrays: Float32Array[]): void`

#### GAP-016: StrokeRenderer.destroy
- **File:** `src/renderer/StrokeRenderer.ts:221`
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Signature:** `destroy(): void`

#### GAP-017: Renderer.drawGrid
- **File:** `src/renderer/Renderer.ts:95`
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Signature:** `drawGrid(cameraMatrix: Float32Array, viewportBounds: {...}, zoom: number): void`

#### GAP-018: Renderer.drawStroke
- **File:** `src/renderer/Renderer.ts:108`
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Signature:** `drawStroke(points: readonly StrokePoint[], color: [number, number, number, number], width: number): void`

---

### ui/ Module (73% coverage — 146/201)

#### GAP-019: CheatSheet (class)
- **File:** `src/ui/CheatSheet.ts:4`
- **Type:** Class (entirely undocumented)
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE

#### GAP-020: CheatSheet.show
- **File:** `src/ui/CheatSheet.ts:107`
- **Type:** Method — **Signature:** `show(): void`

#### GAP-021: CheatSheet.hide
- **File:** `src/ui/CheatSheet.ts:116`
- **Type:** Method — **Signature:** `hide(): void`

#### GAP-022: CheatSheet.toggle
- **File:** `src/ui/CheatSheet.ts:122`
- **Type:** Method — **Signature:** `toggle(): void`

#### GAP-023: CheatSheet.isVisible
- **File:** `src/ui/CheatSheet.ts:130`
- **Type:** Method — **Signature:** `isVisible(): boolean`

#### GAP-024: CheatSheet.destroy
- **File:** `src/ui/CheatSheet.ts:134`
- **Type:** Method — **Signature:** `destroy(): void`

#### GAP-025: ViewManager (class)
- **File:** `src/ui/ViewManager.ts:18`
- **Type:** Class (entirely undocumented)
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX

#### GAP-026: ViewManager.showHome
- **File:** `src/ui/ViewManager.ts:51`
- **Type:** Method — **Signature:** `async showHome(): Promise<void>`

#### GAP-027: ViewManager.showCanvas
- **File:** `src/ui/ViewManager.ts:79`
- **Type:** Method — **Signature:** `async showCanvas(drawingId: string): Promise<void>`
- **Complexity:** COMPLEX (async, error handling, view transitions)

#### GAP-028: ViewManager.getCurrentView
- **File:** `src/ui/ViewManager.ts:149`
- **Type:** Method — **Signature:** `getCurrentView(): ViewName`

#### GAP-029: ViewManager.getCanvasApp
- **File:** `src/ui/ViewManager.ts:153`
- **Type:** Method — **Signature:** `getCanvasApp(): CanvasApp | null`

#### GAP-030: ViewManager.getHomeScreen
- **File:** `src/ui/ViewManager.ts:157`
- **Type:** Method — **Signature:** `getHomeScreen(): HomeScreen`

#### GAP-031: ViewManager.destroy
- **File:** `src/ui/ViewManager.ts:161`
- **Type:** Method — **Signature:** `async destroy(): Promise<void>`

#### GAP-032: CursorManager.setTool
- **File:** `src/ui/CursorManager.ts:24`
- **Type:** Method — **Signature:** `setTool(tool: ToolType): void`

#### GAP-033: CursorManager.setBrushWidth
- **File:** `src/ui/CursorManager.ts:29`
- **Type:** Method — **Signature:** `setBrushWidth(width: number): void`

#### GAP-034: CursorManager.setEraserRadius
- **File:** `src/ui/CursorManager.ts:34`
- **Type:** Method — **Signature:** `setEraserRadius(radius: number): void`

#### GAP-035: CursorManager.setZoom
- **File:** `src/ui/CursorManager.ts:39`
- **Type:** Method — **Signature:** `setZoom(zoom: number): void`

#### GAP-036: CursorManager.setPanning
- **File:** `src/ui/CursorManager.ts:43`
- **Type:** Method — **Signature:** `setPanning(panning: boolean): void`

#### GAP-037: CursorManager.setMagnifyMode
- **File:** `src/ui/CursorManager.ts:48`
- **Type:** Method — **Signature:** `setMagnifyMode(mode: "default" | "in" | "out"): void`

#### GAP-038: FpsCounter.toggle
- **File:** `src/ui/FpsCounter.ts:32`
- **Type:** Method — **Signature:** `toggle(): void`

#### GAP-039: FpsCounter.isVisible
- **File:** `src/ui/FpsCounter.ts:41`
- **Type:** Method — **Signature:** `isVisible(): boolean`

#### GAP-040: ToolbarCallbacks
- **File:** `src/ui/Toolbar.ts:14`
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE

#### GAP-041: Toolbar (class)
- **File:** `src/ui/Toolbar.ts:59`
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX

#### GAP-042: Toolbar.selectBrush
- **File:** `src/ui/Toolbar.ts:570`
- **Type:** Method — **Signature:** `selectBrush(index: number): void`

#### GAP-043: Toolbar.setTool
- **File:** `src/ui/Toolbar.ts:578`
- **Type:** Method — **Signature:** `setTool(tool: ToolType): void`

#### GAP-044: Toolbar.setColor
- **File:** `src/ui/Toolbar.ts:610`
- **Type:** Method — **Signature:** `setColor(color: string): void`

#### GAP-045: Toolbar.updateUndoRedo
- **File:** `src/ui/Toolbar.ts:630`
- **Type:** Method — **Signature:** `updateUndoRedo(canUndo: boolean, canRedo: boolean): void`

#### GAP-046: Toolbar.updateZoom
- **File:** `src/ui/Toolbar.ts:635`
- **Type:** Method — **Signature:** `updateZoom(zoomPercent: number): void`

#### GAP-047: Toolbar.getActiveBrushIndex
- **File:** `src/ui/Toolbar.ts:639`
- **Type:** Method — **Signature:** `getActiveBrushIndex(): number`

#### GAP-048: Toolbar.setDrawingName
- **File:** `src/ui/Toolbar.ts:712`
- **Type:** Method — **Signature:** `setDrawingName(name: string): void`

#### GAP-049: Toolbar.destroy
- **File:** `src/ui/Toolbar.ts:837`
- **Type:** Method — **Signature:** `destroy(): void`

#### GAP-050: TurtlePanel.setRunning
- **File:** `src/ui/TurtlePanel.ts:310`
- **Type:** Method — **Signature:** `setRunning(running: boolean): void`

#### GAP-051: TurtlePanel.setPlacing
- **File:** `src/ui/TurtlePanel.ts:321`
- **Type:** Method — **Signature:** `setPlacing(placing: boolean): void`

#### GAP-052: TurtlePanel.show
- **File:** `src/ui/TurtlePanel.ts:348`
- **Type:** Method — **Signature:** `show(): void`

#### GAP-053: TurtlePanel.hide
- **File:** `src/ui/TurtlePanel.ts:356`
- **Type:** Method — **Signature:** `hide(): void`

#### GAP-054: TurtlePanel.toggle
- **File:** `src/ui/TurtlePanel.ts:362`
- **Type:** Method — **Signature:** `toggle(): void`

---

### model/ Module (73% coverage — 11/15)

#### GAP-055: DrawDocument (class + 3 methods)
- **File:** `src/model/Document.ts:3`
- **Type:** Class
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Methods:** addStroke (line 6), getStrokes (line 10), clear (line 14)

---

### input/ Module (82% coverage — 23/28)

#### GAP-056: MagnifyCapture (class + methods)
- **File:** `src/input/MagnifyCapture.ts:11`
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Undocumented:** class (line 11), onCursorChange property (line 28), setEnabled (line 55), isEnabled (line 62)

---

### user/ Module (82% coverage — 9/11)

#### GAP-057: UserStore exports
- **File:** `src/user/UserStore.ts`
- **Type:** 3 Functions + 1 Constant
- **Visibility:** PUBLIC API
- **Items:**
  - `USER_COLORS` (line 7) — constant array of hex color strings
  - `loadProfile()` (line 28) — loads user profile from localStorage
  - `saveProfile(profile)` (line 45) — saves user profile to localStorage
  - `onProfileChange(callback)` (line 71) — registers change listener, returns unsubscribe

---

## Priority Order

1. **ViewManager** — core app coordinator, PUBLIC API, entirely undocumented
2. **Toolbar + ToolbarCallbacks** — primary user interface, PUBLIC API
3. **UserStore exports** — PUBLIC API, user-facing persistence
4. **StrokePoint + StrokeRenderer** — PUBLIC API interface + core rendering
5. **CheatSheet** — entirely undocumented class
6. **DrawDocument** — PUBLIC API, simple but undocumented
7. **MagnifyCapture** — input handling
8. **Renderer.drawGrid/drawStroke** — high-level render methods
9. **WebGLContext methods** — internal GL wrapper
10. **CursorManager setters** — simple internal setters
11. **Lifecycle methods** (FpsCounter, TurtlePanel) — simple show/hide/toggle
12. **ShaderProgram methods + constants** — thin GL wrappers, lowest priority

## Related Exports

Exports that should be documented together:

- **Group A:** `CheatSheet` class + all methods — complete class documentation
- **Group B:** `ViewManager` class + all methods — complete class documentation
- **Group C:** `Toolbar` + `ToolbarCallbacks` — interface and implementation together
- **Group D:** `WebGLContext` methods — all 4 undocumented methods
- **Group E:** `StrokeRenderer` + `StrokePoint` — interface and renderer together
- **Group F:** `UserStore` exports — `loadProfile`, `saveProfile`, `onProfileChange`, `USER_COLORS`
- **Group G:** `DrawDocument` class + all methods
- **Group H:** `MagnifyCapture` class + methods
