---
type: report
title: Documentation Plan - Loop 00002
created: 2026-03-20
tags:
  - documentation
  - plan
  - prioritization
related:
  - '[[LOOP_00002_GAPS]]'
  - '[[3_EVALUATE]]'
  - '[[4_IMPLEMENT]]'
---

# Documentation Plan - Loop 00002

## Summary
- **Total Gaps:** 19 (covering 69 individual exports/methods)
- **Auto-Document (PENDING):** 12
- **Needs Context:** 0
- **Won't Do:** 7

## Current Coverage: 85.2%
## Target Coverage: 90%
## Estimated Post-Loop Coverage: 95.1%

---

## PENDING - Ready for Auto-Documentation

### DOC-001: GridStyle
- **Status:** `PENDING`
- **File:** `src/user/UserPreferences.ts`
- **Gap ID:** GAP-011
- **Type:** Type alias
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export type GridStyle = "dot" | "line" | "none";
  ```
- **Documentation Plan:**
  - [ ] Description: Canvas background grid style options

### DOC-002: UserPreferences
- **Status:** `PENDING`
- **File:** `src/user/UserPreferences.ts`
- **Gap ID:** GAP-012
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface UserPreferences { ... }
  ```
- **Documentation Plan:**
  - [ ] Description: Core user settings persisted to disk
  - [ ] Fields: All fields with default values

### DOC-003: loadPreferences / savePreferences
- **Status:** `PENDING`
- **File:** `src/user/UserPreferences.ts`
- **Gap ID:** GAP-013
- **Type:** Functions
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function loadPreferences(): Promise<UserPreferences>
  export async function savePreferences(prefs: UserPreferences): Promise<void>
  ```
- **Documentation Plan:**
  - [ ] Descriptions: Load/save user settings from/to config file
  - [ ] Parameters: prefs parameter for save
  - [ ] Returns: UserPreferences with defaults for missing fields
  - [ ] Errors: File I/O error handling behavior

### DOC-004: UserProfile
- **Status:** `PENDING`
- **File:** `src/user/UserProfile.ts`
- **Gap ID:** GAP-014
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface UserProfile { ... }
  ```
- **Documentation Plan:**
  - [ ] Description: User identity type used in collaboration
  - [ ] Fields: All fields with purpose

### DOC-005: loadProfile / saveProfile / onProfileChange / USER_COLORS
- **Status:** `PENDING`
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-015
- **Type:** Functions + Constant
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```ts
  export async function loadProfile(): Promise<UserProfile>
  export async function saveProfile(profile: UserProfile): Promise<void>
  export function onProfileChange(callback: (profile: UserProfile) => void): () => void
  export const USER_COLORS: string[]
  ```
- **Documentation Plan:**
  - [ ] Descriptions: User identity persistence and change notification
  - [ ] Parameters: All function parameters
  - [ ] Returns: Return values including unsubscribe function
  - [ ] USER_COLORS: Collaboration color palette purpose and format

### DOC-006: ViewManagerDeps
- **Status:** `PENDING`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-002
- **Type:** Interface
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  export interface ViewManagerDeps { ... }
  ```
- **Documentation Plan:**
  - [ ] Description: Dependency injection interface for ViewManager
  - [ ] Fields: All dependency fields

### DOC-007: ViewManager
- **Status:** `PENDING`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-003
- **Type:** Class
- **Visibility:** INTERNAL
- **Importance:** CRITICAL
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
- **Documentation Plan:**
  - [ ] Class description: Central navigation orchestrator for home/canvas views
  - [ ] Constructor parameters: canvasContainer and deps
  - [ ] All method descriptions: showHome, showCanvas, getCurrentView, getCanvasApp, getHomeScreen, destroy
  - [ ] Examples: Basic navigation flow

### DOC-008: CursorManager methods
- **Status:** `PENDING`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-005
- **Type:** Methods
- **Visibility:** INTERNAL
- **Importance:** HIGH
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
- **Documentation Plan:**
  - [ ] All method descriptions
  - [ ] Parameter explanations: tool types, width/radius units, zoom factor

### DOC-009: Renderer methods
- **Status:** `PENDING`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-007
- **Type:** Methods
- **Visibility:** INTERNAL
- **Importance:** CRITICAL
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
- **Documentation Plan:**
  - [ ] All method descriptions
  - [ ] Parameter explanations: color format, matrix layout
  - [ ] WebGL state notes: clear color, viewport, blending

### DOC-010: ShaderProgram methods + constants
- **Status:** `PENDING`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-008
- **Type:** Methods + Constants
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  use(): void
  getUniformLocation(name: string): WebGLUniformLocation | null
  getAttribLocation(name: string): number
  destroy(): void
  STROKE_VERTEX_SHADER: string
  STROKE_FRAGMENT_SHADER: string
  ```
- **Documentation Plan:**
  - [ ] All method descriptions
  - [ ] Shader constant descriptions: vertex/fragment shader GLSL source

### DOC-011: StrokeRenderer + StrokePoint
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeRenderer.ts`
- **Gap ID:** GAP-009
- **Type:** Interface + Methods
- **Visibility:** INTERNAL
- **Importance:** CRITICAL
- **Signature:**
  ```ts
  export interface StrokePoint { x: number; y: number; pressure: number }
  setCameraMatrix(matrix: Float32Array): void
  drawStroke(points: StrokePoint[], color: number[], width: number, opacity: number): void
  destroy(): void
  ```
- **Documentation Plan:**
  - [ ] Interface fields: x, y coordinates and pressure range
  - [ ] Method descriptions
  - [ ] Parameters: color format, width units, opacity range

### DOC-012: WebGLContext methods
- **Status:** `PENDING`
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-010
- **Type:** Methods
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```ts
  resize(width: number, height: number): void
  setClearColor(r: number, g: number, b: number, a: number): void
  clear(): void
  destroy(): void
  ```
- **Documentation Plan:**
  - [ ] Method descriptions
  - [ ] Parameters: dimensions in pixels, color components [0-1]

---

## PENDING - NEEDS CONTEXT

_No gaps require additional context._

---

## WON'T DO

### DOC-W01: ViewName
- **Status:** `WON'T DO`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-001
- **Reason:** Self-explanatory two-value union type (`"home" | "canvas"`). The type name and values fully convey meaning.

### DOC-W02: CheatSheet
- **Status:** `WON'T DO`
- **File:** `src/ui/CheatSheet.ts`
- **Gap ID:** GAP-004
- **Reason:** Standard UI panel class following established show/hide/toggle/destroy pattern. Method behavior is self-evident from names.

### DOC-W03: TurtlePanel lifecycle methods
- **Status:** `WON'T DO`
- **File:** `src/ui/TurtlePanel.ts`
- **Gap ID:** GAP-006
- **Reason:** Standard lifecycle methods (show/hide/toggle/isVisible/destroy) following same pattern as other documented panels. TurtlePanelCallbacks follows the same pattern as other panel callback interfaces.

### DOC-W04: readConfigFile / writeConfigFile
- **Status:** `WON'T DO`
- **File:** `src/user/ConfigFile.ts`
- **Gap ID:** GAP-016
- **Reason:** Utility-level functions with limited scope. Used only by UserPreferences and UserStore internally. Function names and generic signatures are self-documenting.

### DOC-W05: Camera.setViewportSize
- **Status:** `WON'T DO`
- **File:** `src/camera/Camera.ts`
- **Gap ID:** GAP-017
- **Reason:** Simple setter with self-evident purpose. Parameters (width, height) are unambiguous.

### DOC-W06: CameraController.destroy
- **Status:** `WON'T DO`
- **File:** `src/camera/CameraController.ts`
- **Gap ID:** GAP-018
- **Reason:** Standard destroy/cleanup method. Behavior is self-evident from name and follows established pattern.

### DOC-W07: EraserTool.getRadius / setRadius
- **Status:** `WON'T DO`
- **File:** `src/tools/EraserTool.ts`
- **Gap ID:** GAP-019
- **Reason:** Simple getter/setter pair with self-explanatory names and trivial signatures.

---

## Documentation Order

Recommended sequence based on visibility, dependencies, and grouping:

1. **DOC-001** - GridStyle (PUBLIC, dependency for UserPreferences and Renderer)
2. **DOC-002** - UserPreferences (PUBLIC, depends on GridStyle)
3. **DOC-003** - loadPreferences / savePreferences (PUBLIC, operates on UserPreferences)
4. **DOC-004** - UserProfile (PUBLIC, identity type for collaboration)
5. **DOC-005** - loadProfile / saveProfile / onProfileChange / USER_COLORS (PUBLIC, operates on UserProfile)
6. **DOC-006** - ViewManagerDeps (INTERNAL, dependency for ViewManager)
7. **DOC-007** - ViewManager (INTERNAL, CRITICAL, depends on ViewManagerDeps)
8. **DOC-008** - CursorManager methods (INTERNAL, HIGH, called by tool switches)
9. **DOC-011** - StrokeRenderer + StrokePoint (INTERNAL, CRITICAL, base interface for rendering)
10. **DOC-010** - ShaderProgram methods + constants (INTERNAL, HIGH, used by StrokeRenderer)
11. **DOC-009** - Renderer methods (INTERNAL, CRITICAL, orchestrates rendering pipeline)
12. **DOC-012** - WebGLContext methods (INTERNAL, HIGH, WebGL lifecycle)

## Related Documentation

Exports that should be documented together for consistency:

- **Group A:** DOC-001, DOC-002, DOC-003 - User settings persistence (`GridStyle`, `UserPreferences`, `loadPreferences`, `savePreferences`)
- **Group B:** DOC-004, DOC-005 - User identity and collaboration (`UserProfile`, `loadProfile`, `saveProfile`, `onProfileChange`, `USER_COLORS`)
- **Group C:** DOC-006, DOC-007 - View navigation system (`ViewManagerDeps`, `ViewManager`)
- **Group D:** DOC-008 - UI cursor management (`CursorManager` methods)
- **Group E:** DOC-009, DOC-010, DOC-011, DOC-012 - WebGL rendering pipeline (`Renderer`, `ShaderProgram`, `StrokeRenderer`, `StrokePoint`, `WebGLContext`)
