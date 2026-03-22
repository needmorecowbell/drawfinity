---
type: report
title: Documentation Plan - Loop 00003
created: 2026-03-20
tags:
  - documentation
  - plan
related:
  - '[[LOOP_00003_GAPS]]'
  - '[[LOOP_00003_DOC_REPORT]]'
---

# Documentation Plan - Loop 00003

## Summary
- **Total Gaps:** 47 (prioritized) + ~24 (skip recommendations)
- **Auto-Document (PENDING):** 38
- **Needs Context:** 0
- **Won't Do:** 9

## Current Coverage: 86.3%
## Target Coverage: 90%
## Estimated Post-Loop Coverage: 95.2%

---

## PENDING - Ready for Auto-Documentation

### DOC-001: UserProfile
- **Status:** `IMPLEMENTED`
- **Implemented In:** Loop 00004
- **File:** `src/user/UserProfile.ts`
- **Gap ID:** GAP-001
- **Type:** Interface
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export interface UserProfile { id: string; name: string; color: string; }
  ```
- **Documentation Added:**
  - [x] Description: Represents a user's identity in the application and collaboration sessions
  - [x] Properties: id, name, color
  - [x] Examples: No (simple interface, not needed)

### DOC-002: readConfigFile
- **Status:** `PENDING`
- **File:** `src/user/ConfigFile.ts`
- **Gap ID:** GAP-002
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  async function readConfigFile(filename: string): Promise<string | null>
  ```
- **Documentation Plan:**
  - [ ] Description: Reads a configuration file from the Tauri app data directory
  - [ ] Parameters: filename
  - [ ] Returns: File contents or null if not found
  - [ ] Error handling: Tauri filesystem errors

### DOC-003: writeConfigFile
- **Status:** `PENDING`
- **File:** `src/user/ConfigFile.ts`
- **Gap ID:** GAP-003
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  async function writeConfigFile(filename: string, content: string): Promise<void>
  ```
- **Documentation Plan:**
  - [ ] Description: Writes content to a configuration file in the Tauri app data directory
  - [ ] Parameters: filename, content
  - [ ] Error handling: Tauri filesystem errors

### DOC-004: USER_COLORS
- **Status:** `PENDING`
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-004
- **Type:** Constant
- **Visibility:** INTERNAL
- **Importance:** MEDIUM
- **Signature:**
  ```
  const USER_COLORS = ["#e74c3c", "#e67e22", ...]
  ```
- **Documentation Plan:**
  - [ ] Description: Palette of distinct colors assigned to users for cursor/identity display

### DOC-005: loadProfile
- **Status:** `PENDING`
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-005
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function loadProfile(): UserProfile
  ```
- **Documentation Plan:**
  - [ ] Description: Loads the current user's profile from local storage
  - [ ] Returns: UserProfile with id, name, and color

### DOC-006: saveProfile
- **Status:** `PENDING`
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-006
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function saveProfile(profile: UserProfile): void
  ```
- **Documentation Plan:**
  - [ ] Description: Persists a user profile to local storage and notifies listeners
  - [ ] Parameters: profile

### DOC-007: onProfileChange
- **Status:** `PENDING`
- **File:** `src/user/UserStore.ts`
- **Gap ID:** GAP-007
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  export function onProfileChange(callback: (profile: UserProfile) => void): () => void
  ```
- **Documentation Plan:**
  - [ ] Description: Subscribes to profile change events
  - [ ] Parameters: callback
  - [ ] Returns: Unsubscribe function

### DOC-008: Renderer.setBackgroundColor
- **Status:** `PENDING`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-008
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  setBackgroundColor(hex: string): void
  ```
- **Documentation Plan:**
  - [ ] Description: Sets the canvas background color
  - [ ] Parameters: hex color string

### DOC-009: Renderer.setGridStyle
- **Status:** `PENDING`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-009
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  setGridStyle(style: GridStyle): void
  ```
- **Documentation Plan:**
  - [ ] Description: Configures the grid overlay style
  - [ ] Parameters: GridStyle enum value

### DOC-010: Renderer.clear
- **Status:** `PENDING`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-010
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  clear(): void
  ```
- **Documentation Plan:**
  - [ ] Description: Clears the WebGL canvas for a new frame

### DOC-011: Renderer.setCameraMatrix
- **Status:** `PENDING`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-011
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  setCameraMatrix(matrix: Float32Array): void
  ```
- **Documentation Plan:**
  - [ ] Description: Sets the view-projection matrix for world-to-screen transformation
  - [ ] Parameters: 3x3 affine matrix as Float32Array

### DOC-012: Renderer.drawStroke
- **Status:** `PENDING`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-012
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  drawStroke(points: readonly StrokePoint[], color: [number, number, number, number], width: number): void
  ```
- **Documentation Plan:**
  - [ ] Description: Renders a single stroke as a triangle strip
  - [ ] Parameters: points, RGBA color, base width
  - [ ] Examples: Yes

### DOC-013: Renderer.destroy
- **Status:** `PENDING`
- **File:** `src/renderer/Renderer.ts`
- **Gap ID:** GAP-013
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  destroy(): void
  ```
- **Documentation Plan:**
  - [ ] Description: Releases all WebGL resources and cleans up GPU state

### DOC-014: WebGLContext.resize
- **Status:** `PENDING`
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-014
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  resize(): void
  ```
- **Documentation Plan:**
  - [ ] Description: Updates the WebGL viewport to match canvas display size

### DOC-015: WebGLContext.setClearColor
- **Status:** `PENDING`
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-015
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** MEDIUM
- **Signature:**
  ```
  setClearColor(hex: string): void
  ```
- **Documentation Plan:**
  - [ ] Description: Sets the GL clear color from a hex string
  - [ ] Parameters: hex color string

### DOC-016: WebGLContext.clear
- **Status:** `PENDING`
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-016
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** MEDIUM
- **Signature:**
  ```
  clear(): void
  ```
- **Documentation Plan:**
  - [ ] Description: Clears the color and depth buffers

### DOC-017: WebGLContext.destroy
- **Status:** `PENDING`
- **File:** `src/renderer/WebGLContext.ts`
- **Gap ID:** GAP-017
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** MEDIUM
- **Signature:**
  ```
  destroy(): void
  ```
- **Documentation Plan:**
  - [ ] Description: Loses the WebGL context and releases GPU resources

### DOC-018: StrokeRenderer.setCameraMatrix
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeRenderer.ts`
- **Gap ID:** GAP-018
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  setCameraMatrix(matrix: Float32Array): void
  ```
- **Documentation Plan:**
  - [ ] Description: Updates the camera uniform for stroke rendering
  - [ ] Parameters: 3x3 affine matrix

### DOC-019: StrokeRenderer.drawStroke
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeRenderer.ts`
- **Gap ID:** GAP-019
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** CRITICAL
- **Signature:**
  ```
  drawStroke(points: readonly StrokePoint[], color: [number, number, number, number], width: number): void
  ```
- **Documentation Plan:**
  - [ ] Description: Core stroke rendering — generates triangle strip geometry and issues draw call
  - [ ] Parameters: points, RGBA color, base width

### DOC-020: StrokeRenderer.destroy
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeRenderer.ts`
- **Gap ID:** GAP-020
- **Type:** Method
- **Visibility:** INTERNAL
- **Importance:** MEDIUM
- **Signature:**
  ```
  destroy(): void
  ```
- **Documentation Plan:**
  - [ ] Description: Releases shader programs and WebGL buffers

### DOC-021: STROKE_VERTEX_SHADER
- **Status:** `PENDING`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-021
- **Type:** Constant
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export const STROKE_VERTEX_SHADER = ...
  ```
- **Documentation Plan:**
  - [ ] Description: GLSL vertex shader for stroke rendering with camera transform and per-vertex color/alpha

### DOC-022: STROKE_FRAGMENT_SHADER
- **Status:** `PENDING`
- **File:** `src/renderer/ShaderProgram.ts`
- **Gap ID:** GAP-022
- **Type:** Constant
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export const STROKE_FRAGMENT_SHADER = ...
  ```
- **Documentation Plan:**
  - [ ] Description: GLSL fragment shader that outputs interpolated vertex color with alpha

### DOC-023: getLODBracket
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-023
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function getLODBracket(zoom: number): number
  ```
- **Documentation Plan:**
  - [ ] Description: Maps a zoom level to a discrete LOD bracket for cache-friendly simplification
  - [ ] Parameters: zoom
  - [ ] Returns: LOD bracket number

### DOC-024: douglasPeucker
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-024
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  export function douglasPeucker(points: readonly StrokePoint[], tolerance: number): StrokePoint[]
  ```
- **Documentation Plan:**
  - [ ] Description: Douglas-Peucker line simplification algorithm for stroke point reduction
  - [ ] Parameters: points, tolerance (max perpendicular distance)
  - [ ] Returns: Simplified point array
  - [ ] Examples: Yes

### DOC-025: getStrokeLOD
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-025
- **Type:** Function
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  export function getStrokeLOD(strokeId: string, points: readonly StrokePoint[], zoom: number): readonly StrokePoint[]
  ```
- **Documentation Plan:**
  - [ ] Description: Returns a zoom-appropriate simplified version of a stroke, using cached results when available
  - [ ] Parameters: strokeId, points, zoom
  - [ ] Returns: Simplified (or original) points for current zoom bracket

### DOC-026: invalidateStrokeLOD
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-026
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function invalidateStrokeLOD(strokeId: string): void
  ```
- **Documentation Plan:**
  - [ ] Description: Removes cached LOD data for a stroke that has been modified or deleted
  - [ ] Parameters: strokeId

### DOC-027: clearLODCache
- **Status:** `PENDING`
- **File:** `src/renderer/StrokeLOD.ts`
- **Gap ID:** GAP-027
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** MEDIUM
- **Signature:**
  ```
  export function clearLODCache(): void
  ```
- **Documentation Plan:**
  - [ ] Description: Clears all cached LOD simplifications, typically on document change

### DOC-028: generateRectangleVertices
- **Status:** `PENDING`
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-028
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function generateRectangleVertices(shape: Shape): ShapeVertexData
  ```
- **Documentation Plan:**
  - [ ] Description: Generates triangle strip vertex data for rectangle shape rendering
  - [ ] Parameters: shape
  - [ ] Returns: ShapeVertexData with positions and indices

### DOC-029: generateEllipseVertices
- **Status:** `PENDING`
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-029
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function generateEllipseVertices(shape: Shape, segments?: number): ShapeVertexData
  ```
- **Documentation Plan:**
  - [ ] Description: Generates triangle fan vertex data for ellipse shape rendering
  - [ ] Parameters: shape, optional segment count for tesselation detail
  - [ ] Returns: ShapeVertexData

### DOC-030: generatePolygonVertices
- **Status:** `PENDING`
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-030
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function generatePolygonVertices(shape: Shape): ShapeVertexData
  ```
- **Documentation Plan:**
  - [ ] Description: Generates vertex data for regular polygon shape rendering
  - [ ] Parameters: shape
  - [ ] Returns: ShapeVertexData

### DOC-031: generateStarVertices
- **Status:** `PENDING`
- **File:** `src/renderer/ShapeMesh.ts`
- **Gap ID:** GAP-031
- **Type:** Function
- **Visibility:** INTERNAL
- **Importance:** HIGH
- **Signature:**
  ```
  export function generateStarVertices(shape: Shape): ShapeVertexData
  ```
- **Documentation Plan:**
  - [ ] Description: Generates vertex data for star shape rendering with alternating inner/outer radii
  - [ ] Parameters: shape
  - [ ] Returns: ShapeVertexData

### DOC-032: CursorManager.setTool
- **Status:** `PENDING`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-032
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  setTool(tool: ToolType): void
  ```
- **Documentation Plan:**
  - [ ] Description: Updates the cursor appearance based on the active tool
  - [ ] Parameters: tool

### DOC-033: CursorManager.setBrushWidth
- **Status:** `PENDING`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-033
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```
  setBrushWidth(width: number): void
  ```
- **Documentation Plan:**
  - [ ] Description: Updates the brush cursor size to reflect the current brush width
  - [ ] Parameters: width in canvas units

### DOC-034: CursorManager.setEraserRadius
- **Status:** `PENDING`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-034
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```
  setEraserRadius(radius: number): void
  ```
- **Documentation Plan:**
  - [ ] Description: Updates the eraser cursor circle to reflect the current eraser radius
  - [ ] Parameters: radius in canvas units

### DOC-035: CursorManager.setZoom
- **Status:** `PENDING`
- **File:** `src/ui/CursorManager.ts`
- **Gap ID:** GAP-035
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** MEDIUM
- **Signature:**
  ```
  setZoom(zoom: number): void
  ```
- **Documentation Plan:**
  - [ ] Description: Updates zoom factor so cursor sizes scale correctly on screen
  - [ ] Parameters: zoom level

### DOC-036: CheatSheet lifecycle methods
- **Status:** `PENDING`
- **File:** `src/ui/CheatSheet.ts`
- **Gap ID:** GAP-036
- **Type:** Methods (5)
- **Visibility:** PUBLIC
- **Importance:** HIGH
- **Signature:**
  ```
  show(): void; hide(): void; toggle(): void; isVisible(): boolean; destroy(): void
  ```
- **Documentation Plan:**
  - [ ] Description: Standard visibility lifecycle for the keyboard shortcuts cheat sheet panel
  - [ ] Methods: show, hide, toggle, isVisible, destroy

### DOC-037: ViewManager.showHome
- **Status:** `PENDING`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-037
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  showHome(): Promise<void>
  ```
- **Documentation Plan:**
  - [ ] Description: Navigates to the home screen, destroying any active canvas session
  - [ ] Returns: Promise that resolves when transition completes

### DOC-038: ViewManager.showCanvas
- **Status:** `PENDING`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-038
- **Type:** Method
- **Visibility:** PUBLIC
- **Importance:** CRITICAL
- **Signature:**
  ```
  showCanvas(drawingId: string): Promise<void>
  ```
- **Documentation Plan:**
  - [ ] Description: Opens a drawing for editing, initializing the full canvas pipeline
  - [ ] Parameters: drawingId
  - [ ] Returns: Promise that resolves when canvas is ready

---

## WON'T DO

### DOC-039: ViewManager.getCurrentView/getCanvasApp/getHomeScreen/destroy
- **Status:** `WON'T DO`
- **File:** `src/ui/ViewManager.ts`
- **Gap ID:** GAP-039
- **Reason:** Simple getters and standard destroy pattern — self-explanatory from signatures

### DOC-040: StrokeCapture setEnabled/isEnabled/setTool/getTool
- **Status:** `WON'T DO`
- **File:** `src/input/StrokeCapture.ts`
- **Gap ID:** GAP-040
- **Reason:** Standard enable/disable and getter/setter pattern — self-evident behavior

### DOC-041: ShapeCapture setEnabled/isEnabled/setConfig/getConfig/getPreviewShape
- **Status:** `WON'T DO`
- **File:** `src/input/ShapeCapture.ts`
- **Gap ID:** GAP-041
- **Reason:** Standard enable/disable and getter/setter pattern — self-evident behavior

### DOC-042: Document.addStroke/getStrokes/clear
- **Status:** `WON'T DO`
- **File:** `src/model/Document.ts`
- **Gap ID:** GAP-042
- **Reason:** Trivial CRUD methods on an internal data structure; Yjs `DrawfinityDoc` is the actual source of truth per CLAUDE.md

### DOC-043: TurtleExample
- **Status:** `WON'T DO`
- **File:** `src/turtle/TurtleExamples.ts`
- **Gap ID:** GAP-043
- **Reason:** Simple data interface with self-descriptive property names (name, description, code)

### DOC-044: TURTLE_EXAMPLES
- **Status:** `WON'T DO`
- **File:** `src/turtle/TurtleExamples.ts`
- **Gap ID:** GAP-044
- **Reason:** Simple constant array of TurtleExample objects — self-evident from type

### DOC-045: PenState
- **Status:** `WON'T DO`
- **File:** `src/turtle/TurtleState.ts`
- **Gap ID:** GAP-045
- **Reason:** Simple turtle pen state interface — self-descriptive properties

### DOC-046: TurtleSnapshot
- **Status:** `WON'T DO`
- **File:** `src/turtle/TurtleState.ts`
- **Gap ID:** GAP-046
- **Reason:** Simple state snapshot interface — self-descriptive properties

### DOC-047: TurtleExecutorEvents
- **Status:** `WON'T DO`
- **File:** `src/turtle/TurtleExecutor.ts`
- **Gap ID:** GAP-047
- **Reason:** Simple event callback interface — standard pattern

---

## Documentation Order

Recommended sequence based on visibility, dependencies, and grouping:

1. **DOC-001** - UserProfile (PUBLIC, base type for user system)
2. **DOC-005** - loadProfile (PUBLIC, depends on UserProfile)
3. **DOC-006** - saveProfile (PUBLIC, depends on UserProfile)
4. **DOC-007** - onProfileChange (PUBLIC, depends on UserProfile)
5. **DOC-004** - USER_COLORS (INTERNAL, supports user system)
6. **DOC-002** - readConfigFile (INTERNAL, file I/O pair)
7. **DOC-003** - writeConfigFile (INTERNAL, file I/O pair)
8. **DOC-011** - Renderer.setCameraMatrix (PUBLIC, core render loop entry)
9. **DOC-012** - Renderer.drawStroke (PUBLIC, core render loop)
10. **DOC-008** - Renderer.setBackgroundColor (PUBLIC, render config)
11. **DOC-009** - Renderer.setGridStyle (PUBLIC, render config)
12. **DOC-010** - Renderer.clear (PUBLIC, render loop)
13. **DOC-013** - Renderer.destroy (PUBLIC, lifecycle)
14. **DOC-018** - StrokeRenderer.setCameraMatrix (INTERNAL, render internals)
15. **DOC-019** - StrokeRenderer.drawStroke (INTERNAL, core rendering)
16. **DOC-020** - StrokeRenderer.destroy (INTERNAL, lifecycle)
17. **DOC-014** - WebGLContext.resize (INTERNAL, GL context)
18. **DOC-015** - WebGLContext.setClearColor (INTERNAL, GL context)
19. **DOC-016** - WebGLContext.clear (INTERNAL, GL context)
20. **DOC-017** - WebGLContext.destroy (INTERNAL, GL context)
21. **DOC-021** - STROKE_VERTEX_SHADER (INTERNAL, shader source)
22. **DOC-022** - STROKE_FRAGMENT_SHADER (INTERNAL, shader source)
23. **DOC-024** - douglasPeucker (PUBLIC, LOD algorithm)
24. **DOC-025** - getStrokeLOD (PUBLIC, LOD pipeline entry)
25. **DOC-023** - getLODBracket (INTERNAL, LOD support)
26. **DOC-026** - invalidateStrokeLOD (INTERNAL, LOD cache management)
27. **DOC-027** - clearLODCache (INTERNAL, LOD cache management)
28. **DOC-028** - generateRectangleVertices (INTERNAL, shape meshes)
29. **DOC-029** - generateEllipseVertices (INTERNAL, shape meshes)
30. **DOC-030** - generatePolygonVertices (INTERNAL, shape meshes)
31. **DOC-031** - generateStarVertices (INTERNAL, shape meshes)
32. **DOC-032** - CursorManager.setTool (PUBLIC, UI cursor)
33. **DOC-033** - CursorManager.setBrushWidth (PUBLIC, UI cursor)
34. **DOC-034** - CursorManager.setEraserRadius (PUBLIC, UI cursor)
35. **DOC-035** - CursorManager.setZoom (PUBLIC, UI cursor)
36. **DOC-036** - CheatSheet lifecycle (PUBLIC, UI panel)
37. **DOC-037** - ViewManager.showHome (PUBLIC, navigation)
38. **DOC-038** - ViewManager.showCanvas (PUBLIC, navigation)

## Related Documentation

Exports that should be documented together for consistency:

- **Group A:** DOC-002, DOC-003 — File I/O pair in ConfigFile.ts
- **Group B:** DOC-001, DOC-004, DOC-005, DOC-006, DOC-007 — User identity system
- **Group C:** DOC-008, DOC-009, DOC-010, DOC-011, DOC-012, DOC-013 — Core Renderer API
- **Group D:** DOC-014, DOC-015, DOC-016, DOC-017 — WebGLContext internals
- **Group E:** DOC-018, DOC-019, DOC-020 — StrokeRenderer internals
- **Group F:** DOC-021, DOC-022 — GLSL shader sources
- **Group G:** DOC-023, DOC-024, DOC-025, DOC-026, DOC-027 — LOD pipeline
- **Group H:** DOC-028, DOC-029, DOC-030, DOC-031 — Shape mesh generators
- **Group I:** DOC-032, DOC-033, DOC-034, DOC-035 — CursorManager methods
- **Group J:** DOC-037, DOC-038 — ViewManager navigation
