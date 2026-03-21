---
type: report
title: Documentation Gaps - Loop 00002
created: 2026-03-20
tags:
  - documentation
  - gaps
  - analysis
related:
  - '[[LOOP_00002_DOC_REPORT]]'
  - '[[2_FIND_GAPS]]'
  - '[[3_PRIORITIZE]]'
---

# Documentation Gaps - Loop 00002

## Summary
- **Total Gaps Found:** 69
- **By Type:** 8 Functions, 6 Classes, 5 Interfaces/Types, 48 Methods, 2 Constants
- **By Visibility:** 5 Public API, 48 Internal API, 16 Utility

## Gaps by Module

| Module | Gap Count | Types |
|--------|-----------|-------|
| `src/ui/` | 31 | 2 Types, 3 Classes, 26 Methods |
| `src/renderer/` | 23 | 1 Interface, 23 Methods/Constants |
| `src/user/` | 11 | 3 Types, 6 Functions, 2 Constants |
| `src/camera/` | 2 | 2 Methods |
| `src/tools/` | 2 | 2 Methods |

---

## Gap List

### GAP-001: ViewName
- **File:** `src/ui/ViewManager.ts`
- **Line:** 5
- **Type:** Type alias
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Type alias for view routing, used across navigation
- **Signature:**
  ```ts
  export type ViewName = "home" | "canvas";
  ```
- **Documentation Needed:**
  - [x] Description

### GAP-002: ViewManagerDeps
- **File:** `src/ui/ViewManager.ts`
- **Line:** 7
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Dependency injection interface for ViewManager construction
- **Signature:**
  ```ts
  export interface ViewManagerDeps { ... }
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Fields

### GAP-003: ViewManager (class + 7 methods)
- **File:** `src/ui/ViewManager.ts`
- **Lines:** 18, 26, 51, 79, 149, 153, 157, 161
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:**
  - Central navigation orchestrator managing home/canvas view lifecycle
  - Multiple async methods with side effects
- **Signature:**
  ```ts
  export class ViewManager {
    constructor(canvasContainer: HTMLElement, deps: ViewManagerDeps)
    async showHome(): Promise<void>
    async showCanvas(drawingId: string): Promise<void>
    getCurrentView(): ViewName
    getCanvasApp(): CanvasApp | null
    getHomeScreen(): HomeScreen
    async destroy(): Promise<void>
  }
  ```
- **Documentation Needed:**
  - [ ] Class description
  - [ ] Constructor parameters
  - [ ] All method descriptions
  - [ ] Examples

### GAP-004: CheatSheet (class + 6 methods)
- **File:** `src/ui/CheatSheet.ts`
- **Lines:** 4, 12, 107, 116, 122, 130, 134
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs (entire class)
- **Why It Needs Docs:**
  - User-facing keyboard shortcut reference panel
  - Builds DOM dynamically from ActionRegistry
- **Signature:**
  ```ts
  export class CheatSheet {
    constructor(registry: ActionRegistry)
    show(): void
    hide(): void
    toggle(): void
    isVisible(): boolean
    destroy(): void
  }
  ```
- **Documentation Needed:**
  - [ ] Class description
  - [ ] Constructor parameters
  - [ ] All method descriptions

### GAP-005: CursorManager (7 methods)
- **File:** `src/ui/CursorManager.ts`
- **Lines:** 24, 29, 34, 39, 43, 48, 111
- **Type:** Methods
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** Class has JSDoc, methods do not
- **Why It Needs Docs:**
  - Called by every tool switch and zoom change
  - Non-obvious cursor rendering logic with SVG generation
- **Signature:**
  ```ts
  setTool(tool: ToolType): void
  setBrushWidth(width: number): void
  setEraserRadius(radius: number): void
  setZoom(zoom: number): void
  setPanning(panning: boolean): void
  setMagnifyMode(mode: "default" | "in" | "out"): void
  updateCursor(): void
  ```
- **Documentation Needed:**
  - [ ] All method descriptions
  - [ ] Parameter explanations

### GAP-006: TurtlePanel (interface + 5 lifecycle methods)
- **File:** `src/ui/TurtlePanel.ts`
- **Lines:** 3, 348, 356, 362, 370, 387
- **Type:** Interface + Methods
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** Partial docs (many methods documented, lifecycle methods missing)
- **Why It Needs Docs:**
  - TurtlePanelCallbacks interface undocumented
  - Standard lifecycle methods (show/hide/toggle/isVisible/destroy) lack docs
- **Signature:**
  ```ts
  export interface TurtlePanelCallbacks { ... }
  show(): void
  hide(): void
  toggle(): void
  isVisible(): boolean
  destroy(): void
  ```
- **Documentation Needed:**
  - [ ] Interface description and fields
  - [ ] Lifecycle method descriptions

### GAP-007: Renderer (9 methods)
- **File:** `src/renderer/Renderer.ts`
- **Lines:** 22, 31, 35, 39, 45, 49, 54, 58, 71, 102
- **Type:** Methods
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** Class has JSDoc, methods do not
- **Why It Needs Docs:**
  - Core rendering orchestrator, every drawing operation flows through it
  - Complex WebGL state management
- **Signature:**
  ```ts
  get gl(): WebGL2RenderingContext
  get canvas(): HTMLCanvasElement
  setBackgroundColor(color: [number, number, number, number]): void
  setGridStyle(style: GridStyle): void
  clear(): void
  setCameraMatrix(matrix: Float32Array): void
  drawGrid(camera: Camera): void
  drawStroke(points: StrokePoint[], color: number[], width: number, opacity: number): void
  destroy(): void
  ```
- **Documentation Needed:**
  - [ ] All method descriptions
  - [ ] Parameter explanations
  - [ ] WebGL state notes

### GAP-008: ShaderProgram (4 methods + 2 constants)
- **File:** `src/renderer/ShaderProgram.ts`
- **Lines:** 37, 41, 45, 49, 70, 87
- **Type:** Methods + Constants
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** Class has JSDoc, methods do not
- **Why It Needs Docs:**
  - WebGL shader abstraction, foundational to rendering
- **Signature:**
  ```ts
  use(): void
  getUniformLocation(name: string): WebGLUniformLocation | null
  getAttribLocation(name: string): number
  destroy(): void
  // Constants:
  STROKE_VERTEX_SHADER: string
  STROKE_FRAGMENT_SHADER: string
  ```
- **Documentation Needed:**
  - [ ] All method descriptions
  - [ ] Shader constant descriptions

### GAP-009: StrokeRenderer (1 interface + 3 methods)
- **File:** `src/renderer/StrokeRenderer.ts`
- **Lines:** 8, 77, 84, 221
- **Type:** Interface + Methods
- **Visibility:** INTERNAL API
- **Complexity:** COMPLEX
- **Current State:** Class has JSDoc, methods/interface do not
- **Why It Needs Docs:**
  - StrokePoint interface is consumed by multiple renderers
  - Core stroke drawing pipeline
- **Signature:**
  ```ts
  export interface StrokePoint { x: number; y: number; pressure: number }
  setCameraMatrix(matrix: Float32Array): void
  drawStroke(points: StrokePoint[], color: number[], width: number, opacity: number): void
  destroy(): void
  ```
- **Documentation Needed:**
  - [ ] Interface fields
  - [ ] Method descriptions
  - [ ] Parameters

### GAP-010: WebGLContext (4 methods)
- **File:** `src/renderer/WebGLContext.ts`
- **Lines:** 28, 42, 50, 54
- **Type:** Methods
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** Class has JSDoc, methods do not
- **Why It Needs Docs:**
  - Manages WebGL2 context lifecycle, viewport, and clear operations
- **Signature:**
  ```ts
  resize(width: number, height: number): void
  setClearColor(r: number, g: number, b: number, a: number): void
  clear(): void
  destroy(): void
  ```
- **Documentation Needed:**
  - [ ] Method descriptions
  - [ ] Parameters

### GAP-011: GridStyle
- **File:** `src/user/UserPreferences.ts`
- **Line:** 3
- **Type:** Type alias
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  export type GridStyle = "dot" | "line" | "none";
  ```
- **Documentation Needed:**
  - [ ] Description

### GAP-012: UserPreferences
- **File:** `src/user/UserPreferences.ts`
- **Line:** 5
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Core settings type persisted to disk
- **Signature:**
  ```ts
  export interface UserPreferences { ... }
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Fields with defaults

### GAP-013: loadPreferences / savePreferences
- **File:** `src/user/UserPreferences.ts`
- **Lines:** 22, 35
- **Type:** Functions
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Persistence layer for user settings, async with file I/O
- **Signature:**
  ```ts
  export async function loadPreferences(): Promise<UserPreferences>
  export async function savePreferences(prefs: UserPreferences): Promise<void>
  ```
- **Documentation Needed:**
  - [ ] Descriptions
  - [ ] Parameters
  - [ ] Return values
  - [ ] Error handling

### GAP-014: UserProfile
- **File:** `src/user/UserProfile.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Why It Needs Docs:**
  - Identity type used in collaboration
- **Signature:**
  ```ts
  export interface UserProfile { ... }
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Fields

### GAP-015: loadProfile / saveProfile / onProfileChange / USER_COLORS
- **File:** `src/user/UserStore.ts`
- **Lines:** 28, 45, 71, 78
- **Type:** Functions + Constant
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:**
  - User identity persistence and change notification
  - USER_COLORS defines the collaboration color palette
- **Signature:**
  ```ts
  export async function loadProfile(): Promise<UserProfile>
  export async function saveProfile(profile: UserProfile): Promise<void>
  export function onProfileChange(callback: (profile: UserProfile) => void): () => void
  export const USER_COLORS: string[]
  ```
- **Documentation Needed:**
  - [ ] All descriptions
  - [ ] Parameters and return values
  - [ ] USER_COLORS purpose and format

### GAP-016: readConfigFile / writeConfigFile
- **File:** `src/user/ConfigFile.ts`
- **Lines:** 34, 48
- **Type:** Functions
- **Visibility:** UTILITY
- **Complexity:** MODERATE
- **Current State:** No docs (file header exists)
- **Why It Needs Docs:**
  - Generic config file I/O used by preferences and profile
- **Signature:**
  ```ts
  export async function readConfigFile<T>(filename: string, defaults: T): Promise<T>
  export async function writeConfigFile<T>(filename: string, data: T): Promise<void>
  ```
- **Documentation Needed:**
  - [ ] Descriptions
  - [ ] Generic type parameters
  - [ ] Error handling

### GAP-017: Camera.setViewportSize
- **File:** `src/camera/Camera.ts`
- **Line:** 16
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  setViewportSize(width: number, height: number): void
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters

### GAP-018: CameraController.destroy
- **File:** `src/camera/CameraController.ts`
- **Line:** 307
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  destroy(): void
  ```
- **Documentation Needed:**
  - [ ] Description

### GAP-019: EraserTool.getRadius / setRadius
- **File:** `src/tools/EraserTool.ts`
- **Lines:** 309, 313
- **Type:** Methods
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:**
  ```ts
  getRadius(): number
  setRadius(radius: number): void
  ```
- **Documentation Needed:**
  - [ ] Descriptions
  - [ ] Parameters

---

## Gaps by Type

### Functions
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `loadPreferences` | `src/user/UserPreferences.ts` | PUBLIC API | MODERATE |
| `savePreferences` | `src/user/UserPreferences.ts` | PUBLIC API | MODERATE |
| `loadProfile` | `src/user/UserStore.ts` | PUBLIC API | MODERATE |
| `saveProfile` | `src/user/UserStore.ts` | PUBLIC API | MODERATE |
| `onProfileChange` | `src/user/UserStore.ts` | PUBLIC API | MODERATE |
| `readConfigFile` | `src/user/ConfigFile.ts` | UTILITY | MODERATE |
| `writeConfigFile` | `src/user/ConfigFile.ts` | UTILITY | MODERATE |

### Classes
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `ViewManager` | `src/ui/ViewManager.ts` | INTERNAL API | COMPLEX |
| `CheatSheet` | `src/ui/CheatSheet.ts` | INTERNAL API | MODERATE |
| `CursorManager` | `src/ui/CursorManager.ts` | INTERNAL API | MODERATE |

### Types/Interfaces
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `ViewName` | `src/ui/ViewManager.ts` | INTERNAL API | SIMPLE |
| `ViewManagerDeps` | `src/ui/ViewManager.ts` | INTERNAL API | MODERATE |
| `TurtlePanelCallbacks` | `src/ui/TurtlePanel.ts` | INTERNAL API | MODERATE |
| `GridStyle` | `src/user/UserPreferences.ts` | PUBLIC API | SIMPLE |
| `UserPreferences` | `src/user/UserPreferences.ts` | PUBLIC API | MODERATE |
| `UserProfile` | `src/user/UserProfile.ts` | PUBLIC API | SIMPLE |
| `StrokePoint` | `src/renderer/StrokeRenderer.ts` | INTERNAL API | SIMPLE |

### Constants
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `USER_COLORS` | `src/user/UserStore.ts` | PUBLIC API | SIMPLE |
| `STROKE_VERTEX_SHADER` | `src/renderer/ShaderProgram.ts` | INTERNAL API | MODERATE |
| `STROKE_FRAGMENT_SHADER` | `src/renderer/ShaderProgram.ts` | INTERNAL API | MODERATE |

## Related Exports

Exports that should be documented together:

- **Group A:** `UserPreferences`, `GridStyle`, `loadPreferences`, `savePreferences` - User settings persistence
- **Group B:** `UserProfile`, `loadProfile`, `saveProfile`, `onProfileChange`, `USER_COLORS` - User identity and collaboration
- **Group C:** `readConfigFile`, `writeConfigFile` - Generic config file I/O (used by Groups A and B)
- **Group D:** `ViewName`, `ViewManagerDeps`, `ViewManager` - View navigation system
- **Group E:** `Renderer` methods, `ShaderProgram` methods, `StrokeRenderer` + `StrokePoint`, `WebGLContext` methods - WebGL rendering pipeline
- **Group F:** `CheatSheet`, `CursorManager`, `TurtlePanel` lifecycle methods - UI component patterns
