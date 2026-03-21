---
type: report
title: Documentation Gaps - Loop 00003
created: 2026-03-20
tags:
  - documentation
  - coverage
  - gaps
related:
  - '[[LOOP_00003_DOC_REPORT]]'
  - '[[LOOP_00002_PLAN]]'
---

# Documentation Gaps - Loop 00003

## Summary
- **Overall Coverage:** 86.3% (target: 90%)
- **Total Gaps Found:** 55
- **By Type:** 16 Functions, 5 Classes, 8 Interfaces/Types, 3 Constants, 23 Methods
- **By Visibility:** 12 Public API, 31 Internal API, 12 Utility

## Gaps by Module

| Module | Gap Count | Types |
|--------|-----------|-------|
| `src/renderer/` | 27 | 5 Functions, 22 Methods |
| `src/ui/` | 14 | 1 Class, 13 Methods |
| `src/user/` | 7 | 4 Functions, 1 Interface, 1 Constant, 1 Class method |
| `src/turtle/` | 5 | 5 Interfaces/Types + Constants |
| `src/input/` | 4 | 1 Class, 3 Methods |
| `src/model/` | 2 | 1 Class, 1 Method |

---

## Gap List

### user/ Module (46% coverage - CRITICAL)

#### GAP-001: UserProfile
- **File:** `src/user/UserProfile.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Why It Needs Docs:** Core identity type used across collaboration features
- **Signature:** `interface UserProfile { id: string; name: string; color: string; }`
- **Documentation Needed:**
  - [x] Description
  - [x] Properties

#### GAP-002: USER_COLORS
- **File:** `src/user/UserStore.ts`
- **Line:** 7
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Why It Needs Docs:** Defines the palette for user cursor/stroke colors in collaboration
- **Signature:** `const USER_COLORS: string[]`
- **Documentation Needed:**
  - [x] Description

#### GAP-003: loadProfile
- **File:** `src/user/UserStore.ts`
- **Line:** 28
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:** Synchronous profile loader with localStorage fallback, generates defaults
- **Signature:** `function loadProfile(): UserProfile`
- **Documentation Needed:**
  - [x] Description
  - [x] Return value

#### GAP-004: saveProfile
- **File:** `src/user/UserStore.ts`
- **Line:** 45
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:** Persists profile and notifies listeners
- **Signature:** `function saveProfile(profile: UserProfile): void`
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters

#### GAP-005: onProfileChange
- **File:** `src/user/UserStore.ts`
- **Line:** 71
- **Type:** Function
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:** Returns unsubscribe function (non-obvious pattern)
- **Signature:** `function onProfileChange(callback: (profile: UserProfile) => void): () => void`
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters
  - [x] Return value

#### GAP-006: readConfigFile
- **File:** `src/user/ConfigFile.ts`
- **Line:** 34
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:** Async Tauri file I/O with null fallback on missing file
- **Signature:** `async function readConfigFile(filename: string): Promise<string | null>`
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters
  - [x] Return value

#### GAP-007: writeConfigFile
- **File:** `src/user/ConfigFile.ts`
- **Line:** 48
- **Type:** Function
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:** Creates config directory if missing, uses Tauri filesystem APIs
- **Signature:** `async function writeConfigFile(filename: string, content: string): Promise<void>`
- **Documentation Needed:**
  - [x] Description
  - [x] Parameters

---

### renderer/ Module (67% coverage - HIGH PRIORITY)

#### GAP-008: Renderer.setBackgroundColor
- **File:** `src/renderer/Renderer.ts`
- **Line:** 39
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setBackgroundColor(hex: string): void`

#### GAP-009: Renderer.setGridStyle
- **File:** `src/renderer/Renderer.ts`
- **Line:** 45
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setGridStyle(style: GridStyle): void`

#### GAP-010: Renderer.clear
- **File:** `src/renderer/Renderer.ts`
- **Line:** 49
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

#### GAP-011: Renderer.setCameraMatrix
- **File:** `src/renderer/Renderer.ts`
- **Line:** 54
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setCameraMatrix(matrix: Float32Array): void`

#### GAP-012: Renderer.drawGrid
- **File:** `src/renderer/Renderer.ts`
- **Line:** 58
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `drawGrid(cameraMatrix: Float32Array, viewportBounds: {...}, zoom: number): void`

#### GAP-013: Renderer.drawStroke
- **File:** `src/renderer/Renderer.ts`
- **Line:** 71
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `drawStroke(points: readonly StrokePoint[], color: [number, number, number, number], width: number): void`

#### GAP-014: Renderer.destroy
- **File:** `src/renderer/Renderer.ts`
- **Line:** 102
- **Type:** Method
- **Visibility:** PUBLIC API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

#### GAP-015: WebGLContext.resize
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 28
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `resize(): void`

#### GAP-016: WebGLContext.setClearColor
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 42
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setClearColor(hex: string): void`

#### GAP-017: WebGLContext.clear
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 50
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

#### GAP-018: WebGLContext.destroy
- **File:** `src/renderer/WebGLContext.ts`
- **Line:** 54
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

#### GAP-019: StrokeRenderer.setCameraMatrix
- **File:** `src/renderer/StrokeRenderer.ts`
- **Line:** 77
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `setCameraMatrix(matrix: Float32Array): void`

#### GAP-020: StrokeRenderer.drawStroke
- **File:** `src/renderer/StrokeRenderer.ts`
- **Line:** 84
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `drawStroke(points: readonly StrokePoint[], color: [...], width: number): void`

#### GAP-021: StrokeRenderer.destroy
- **File:** `src/renderer/StrokeRenderer.ts`
- **Line:** 221
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `destroy(): void`

#### GAP-022: SpatialIndex.add
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 108
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `add(stroke: Stroke): void`

#### GAP-023: SpatialIndex.query
- **File:** `src/renderer/SpatialIndex.ts`
- **Line:** 230
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `query(viewport: AABB): Stroke[]`

#### GAP-024: SpatialIndex remaining methods
- **File:** `src/renderer/SpatialIndex.ts`
- **Type:** Methods (addShape, remove, removeShape, clear, rebuild, rebuildAll, queryShapes, size, shapeSize, has, hasShape)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE to MODERATE
- **Current State:** No docs
- **Count:** 11 methods

#### GAP-025: ShapeMesh generation functions
- **File:** `src/renderer/ShapeMesh.ts`
- **Lines:** 247-267
- **Type:** Functions
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signatures:**
  - `generateRectangleVertices(shape: Shape): ShapeVertexData`
  - `generateEllipseVertices(shape: Shape, segments?: number): ShapeVertexData`
  - `generatePolygonVertices(shape: Shape): ShapeVertexData`
  - `generateStarVertices(shape: Shape): ShapeVertexData`
  - `generateShapeVertices(shape: Shape, ellipseSegments?: number): ShapeVertexData`

#### GAP-026: ShaderProgram methods
- **File:** `src/renderer/ShaderProgram.ts`
- **Lines:** 37-49
- **Type:** Methods (use, getUniformLocation, getAttribLocation, destroy)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Note:** Thin GL wrappers - doc report suggests skipping

#### GAP-027: DotGridRenderer methods
- **File:** `src/renderer/DotGridRenderer.ts`
- **Lines:** 109-175
- **Type:** Methods (getEffectiveSpacing, draw, setDotColor, destroy)
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs

#### GAP-028: LineGridRenderer methods
- **File:** `src/renderer/LineGridRenderer.ts`
- **Lines:** 75-154
- **Type:** Methods (getEffectiveSpacing, draw, setLineColor, setAutoContrastColor, destroy)
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs

#### GAP-029: StrokeVertexCache methods
- **File:** `src/renderer/StrokeVertexCache.ts`
- **Lines:** 21-52
- **Type:** Methods (get, invalidate, clear, size)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs

#### GAP-030: ShapeVertexCache methods
- **File:** `src/renderer/ShapeVertexCache.ts`
- **Lines:** 17-36
- **Type:** Methods (get, invalidate, clear, size)
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs

---

### ui/ Module (83% coverage)

#### GAP-031: CheatSheet class
- **File:** `src/ui/CheatSheet.ts`
- **Line:** 12
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs (entire class undocumented)
- **Why It Needs Docs:** Full keyboard shortcut overlay - 6 public methods (show, hide, toggle, isVisible, destroy)
- **Documentation Needed:**
  - [x] Class description
  - [x] All public methods

#### GAP-032: CursorManager methods
- **File:** `src/ui/CursorManager.ts`
- **Lines:** 24-131
- **Type:** Methods
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE to MODERATE
- **Current State:** No docs on 7 methods
- **Methods:** setTool, setBrushWidth, setEraserRadius, setZoom, setPanning, setMagnifyMode, updateCursor

#### GAP-033: ViewManager class
- **File:** `src/ui/ViewManager.ts`
- **Lines:** 26-167
- **Type:** Class + Methods
- **Visibility:** PUBLIC API
- **Complexity:** COMPLEX
- **Current State:** No docs
- **Why It Needs Docs:** Controls navigation between home and canvas views, manages app lifecycle
- **Methods:** constructor, showHome, showCanvas, getCurrentView, getCanvasApp, getHomeScreen, destroy

---

### turtle/ Module (86% coverage)

#### GAP-034: TurtleExample
- **File:** `src/turtle/TurtleExamples.ts`
- **Line:** 1
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `interface TurtleExample { name: string; description: string; script: string; }`

#### GAP-035: TURTLE_EXAMPLES
- **File:** `src/turtle/TurtleExamples.ts`
- **Line:** 7
- **Type:** Constant
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `const TURTLE_EXAMPLES: TurtleExample[]`

#### GAP-036: PenState
- **File:** `src/turtle/TurtleState.ts`
- **Line:** 4
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `interface PenState { down: boolean; color: string; width: number; opacity: number; }`

#### GAP-037: TurtleSnapshot
- **File:** `src/turtle/TurtleState.ts`
- **Line:** 12
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `interface TurtleSnapshot { x: number; y: number; angle: number; pen: PenState; speed: number; }`

#### GAP-038: MovementSegment
- **File:** `src/turtle/TurtleState.ts`
- **Line:** 177
- **Type:** Interface
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `interface MovementSegment { fromX: number; fromY: number; toX: number; toY: number; pen: PenState; }`

---

### input/ Module (84% coverage)

#### GAP-039: MagnifyCapture class
- **File:** `src/input/MagnifyCapture.ts`
- **Line:** 11
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Why It Needs Docs:** Handles magnifying glass pointer capture with enable/disable lifecycle
- **Methods needing docs:** setEnabled, isEnabled, destroy

#### GAP-040: ShapeCapture constructor
- **File:** `src/input/ShapeCapture.ts`
- **Line:** 97
- **Type:** Constructor
- **Visibility:** INTERNAL API
- **Complexity:** MODERATE
- **Current State:** No docs
- **Signature:** `constructor(camera: Camera, cameraController: CameraController, document: ShapeDocumentModel, canvas: HTMLCanvasElement)`

---

### model/ Module (83% coverage)

#### GAP-041: DrawDocument class
- **File:** `src/model/Document.ts`
- **Line:** 3
- **Type:** Class
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Why It Needs Docs:** Reference implementation of DocumentModel interface
- **Signature:** `class DrawDocument implements DocumentModel`

#### GAP-042: DrawDocument.clear
- **File:** `src/model/Document.ts`
- **Line:** 14
- **Type:** Method
- **Visibility:** INTERNAL API
- **Complexity:** SIMPLE
- **Current State:** No docs
- **Signature:** `clear(): void`

---

## Related Exports (Document Together)

- **Group A:** `UserProfile`, `loadProfile`, `saveProfile`, `onProfileChange`, `USER_COLORS` - User identity system
- **Group B:** `readConfigFile`, `writeConfigFile` - Config file I/O pair
- **Group C:** `Renderer.*` methods - Core rendering pipeline
- **Group D:** `TurtleExample`, `TURTLE_EXAMPLES` - Turtle example system
- **Group E:** `PenState`, `TurtleSnapshot`, `MovementSegment` - Turtle state types
- **Group F:** `CheatSheet` class - All methods together
- **Group G:** `ViewManager` class - All methods together
- **Group H:** `SpatialIndex` methods - Spatial query system

## Priority Order for Implementation

1. **user/** - Lowest coverage (46%), highest visibility impact
2. **renderer/Renderer.ts** methods - Core public API
3. **ui/CheatSheet.ts** - Entire class undocumented
4. **ui/ViewManager.ts** - App navigation controller
5. **renderer/SpatialIndex.ts** - Complex query methods
6. **input/MagnifyCapture.ts** - Class-level docs
7. **turtle/TurtleExamples.ts** and **TurtleState.ts** - Quick wins
8. **model/Document.ts** - Simple class
9. **renderer/** remaining - Grid renderers, caches, ShapeMesh functions
10. **ui/CursorManager.ts** - Simple setter methods
