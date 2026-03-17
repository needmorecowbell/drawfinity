# Phase 01: Foundation and Interactive Canvas

Set up the Tauri + TypeScript project from scratch, establish the WebGL rendering pipeline, and deliver a working infinite canvas where you can draw freehand strokes and navigate with pan/zoom. By the end of this phase, the app launches as a native window and responds to mouse/pointer input with real-time drawing — the core loop that everything else builds on.

## Tasks

- [x] Initialize the Tauri v2 project with a TypeScript + Vite frontend:
  - Run `npm create tauri-app@latest` (or equivalent) in the project root, selecting TypeScript + Vite template
  - Project name: `drawfinity`, identifier: `com.drawfinity.app`
  - Verify the scaffold builds and launches with `cargo tauri dev`
  - Add a `.gitignore` covering `node_modules/`, `target/`, `dist/`, and OS files
  - Commit the initial scaffold

- [x] Create the WebGL rendering foundation in `src/renderer/`:
  - `WebGLContext.ts` — initialize a WebGL2 context from a `<canvas>` element, handle resize events to match window size, set clear color to a warm off-white (#FAFAF8)
  - `ShaderProgram.ts` — compile and link a basic vertex + fragment shader pair for rendering colored line segments. Vertex shader should accept position (vec2), color (vec4), and a uniform mat3 for the camera transform. Fragment shader passes through vertex color
  - `StrokeRenderer.ts` — takes an array of polyline points and renders them as `GL_LINE_STRIP` with configurable line width (using the lineWidth API as a starting point; we'll move to geometry-based thick lines in a later phase)
  - Export a single `Renderer` class that owns the context, shaders, and provides `clear()` and `drawStroke(points, color, width)` methods
  - Wire the canvas into `src/App.tsx` (or `main.ts`) so it fills the window, and call `clear()` on init to confirm WebGL is working — you should see the off-white background

- [x] Implement the camera system for infinite pan and zoom in `src/camera/`:
  - `Camera.ts` — stores `position` (x, y) and `zoom` (scale factor), provides `getTransformMatrix(): mat3` that maps world coordinates to screen (NDC) coordinates, and `screenToWorld(screenX, screenY): {x, y}` for converting pointer positions
  - `CameraController.ts` — listens for pointer events on the canvas:
    - Middle mouse button drag (or Ctrl+left drag) → pan the camera
    - Scroll wheel → zoom in/out centered on the cursor position (multiplicative scaling, e.g., 1.1x per tick)
    - Pinch-to-zoom via touch events (for trackpad users)
  - Clamp zoom to a reasonable range (e.g., 0.01x to 100x) to prevent degenerate states
  - Integrate the camera transform matrix into the Renderer's draw calls via the shader uniform

- [x] Implement freehand stroke capture and the in-memory document model:
  - `src/model/Stroke.ts` — define a `Stroke` type: `{ id: string, points: Array<{x: number, y: number, pressure: number}>, color: string, width: number, timestamp: number }`
  - `src/model/Document.ts` — holds an array of `Stroke` objects, provides `addStroke()`, `getStrokes()`, and `clear()` methods. This will later be replaced by the CRDT-backed model, so keep the interface minimal and clean
  - `src/input/StrokeCapture.ts` — on pointerdown (left button), begin a new stroke; on pointermove, append points (converting screen coords to world coords via Camera); on pointerup, finalize the stroke and add it to the Document. Read `pressure` from the PointerEvent (defaults to 0.5 for mice without pressure)
  - Render all strokes from the Document on every frame using `requestAnimationFrame`. The render loop should: clear the canvas, set the camera uniform, iterate over strokes and draw each one

- [ ] Create the main application entry point that wires everything together:
  - In `src/main.ts` (or `App.tsx`), create the canvas element, initialize Renderer, Camera, CameraController, Document, and StrokeCapture
  - Set up the render loop with `requestAnimationFrame`
  - Add a simple HUD overlay (plain HTML div) showing current zoom level (e.g., "100%") — this confirms the camera is working and gives visual feedback during zoom
  - Ensure the app handles window resize gracefully (update canvas size and WebGL viewport)
  - Verify the complete flow: launch the app, draw strokes with the mouse, pan around, zoom in/out — strokes should remain in world space and render correctly at any zoom level

- [ ] Run the app with `cargo tauri dev` and verify the following work end-to-end:
  - The app opens a native window with an off-white canvas
  - Drawing with mouse creates visible strokes
  - Middle-mouse drag pans the view
  - Scroll wheel zooms in and out, centered on cursor
  - Strokes persist across pan/zoom (they stay in place in world space)
  - Window resize works without breaking the canvas
  - Fix any issues found during verification
  - Commit all working code
