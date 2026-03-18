# Phase 02.5: Smooth Camera Animations and Geometry-Based Stroke Rendering

Pre-Phase-03 intervention to fix two foundational issues before layering on drawing tools: (1) the camera system lacks fluid animations and momentum, making the infinite canvas feel rigid, and (2) the stroke renderer uses `GL_LINE_STRIP` with `gl.lineWidth()`, which is effectively deprecated — most GPU drivers cap the width at 1.0, and the width is not scaled by camera zoom, so strokes appear thin and inconsistent across zoom levels. This phase delivers the smooth, zoom-aware rendering pipeline that Phase 03's pressure-sensitive brushes will build on.

## Tasks

- [x] Add a `CameraAnimator` class for smooth zoom and pan transitions:
  - Create `src/camera/CameraAnimator.ts` — drives frame-by-frame animations on the Camera, called once per `tick()` from the render loop
  - **Log-space zoom interpolation**: zoom transitions interpolate in logarithmic space (`Math.log`/`Math.exp`) so that zooming from 1x→10x and 10x→100x feel equally smooth (constant perceived speed), matching the fluid feel of endless-paper infinite canvas apps
  - **Momentum-based inertial scrolling**: on pan release, velocity is handed off to the animator which applies an exponential friction decay (`friction = 0.92`) each frame, producing natural deceleration
  - **Animated zoom-to-point** (`animateZoomTo`): smoothly zooms to a target level while keeping a specific world point anchored at the given screen position (e.g., the cursor), using the anchor math: `targetX = anchor.x - (anchorScreenX - viewW/2) / clampedZoom`
  - **Centered zoom animation** (`animateZoomCentered`): zoom in/out centered on the viewport, used by keyboard shortcuts
  - **Fit-to-bounds animation** (`animateToFit`): computes the optimal zoom and position to frame a world-space bounding box within the viewport with configurable padding
  - `interrupt()` stops all running animations (called when user begins direct manipulation); `interruptMomentum()` stops only momentum
  - `isAnimating` getter returns true when any transition or momentum is still active
  - `tick()` returns a boolean indicating whether the camera moved (so the caller can decide whether to re-render)
  - Tuning constants: `lerpSpeed = 0.14`, `friction = 0.92`, `snapZoomThreshold = 0.001`, `snapPosThreshold = 0.01`, `minMomentum = 0.05`

- [x] Refactor `Camera.ts` for cleaner API and zoom-at-point support:
  - Rename internal properties from `canvasWidth`/`canvasHeight` to `viewportWidth`/`viewportHeight` for clarity
  - Add `getViewportSize(): [number, number]` getter so the animator and controller can query viewport dimensions without exposing internals
  - Add `zoomAt(screenX, screenY, factor)` method that zooms by a multiplicative factor while keeping the world point under the given screen pixel fixed — computes `screenToWorld` before and after the zoom change and corrects camera position by the delta
  - Add static `MIN_ZOOM = 0.01` and `MAX_ZOOM = 100` constants, replacing scattered magic numbers
  - Retain existing `getTransformMatrix()` and `screenToWorld()` unchanged

- [x] Overhaul `CameraController.ts` for modern input handling:
  - **PointerEvent-only pinch-to-zoom**: replace the `TouchEvent`-based two-finger handling with a `pointerCache` Map keyed by `pointerId`. Two simultaneous pointers trigger pinch mode with distance-ratio scaling and center-point panning. This is more modern and handles stylus + finger combos correctly
  - **Pan momentum tracking**: during a drag, compute an exponential moving average of world-space velocity (`VELOCITY_SMOOTH = 0.4`). On pointer up, hand off velocity to `CameraAnimator.setMomentum()` if above threshold (0.1)
  - **Trackpad vs. mouse wheel detection**: `ctrlKey` on wheel events indicates a trackpad pinch gesture — apply continuous zoom via `camera.zoomAt()` with `Math.exp(-deltaY * 0.01)`. Non-ctrl wheel events use discrete zoom steps (`ZOOM_STEP = 1.1`)
  - **Space-to-pan mode**: holding Space sets `spaceHeld = true` and changes cursor to "grab", allowing left-click panning without requiring middle mouse or Ctrl
  - **Keyboard zoom shortcuts**: `Ctrl+=` animated zoom in (1.5x), `Ctrl+-` animated zoom out (/1.5), `Ctrl+0` animated reset to 100% — all using `CameraAnimator.animateZoomTo`/`animateZoomCentered`
  - Accept `CameraAnimator` as a constructor parameter (third argument after `camera` and `canvas`)
  - `panning` getter returns true when any pan/pinch/space mode is active (used by `StrokeCapture` to gate drawing)
  - `destroy()` removes all event listeners for clean teardown

- [x] Update `src/camera/index.ts` to export `CameraAnimator`

- [x] Wire `CameraAnimator` into the application:
  - In `src/main.ts`, create `CameraAnimator` after `Camera`, pass it as third argument to `CameraController`
  - Call `cameraAnimator.tick()` at the top of the render loop's `frame()` function (before `clear()` and drawing)
  - Expose `cameraAnimator` in the `__drawfinity` debug object

- [x] Add test suite for `CameraAnimator`:
  - Create `src/camera/__tests__/CameraAnimator.test.ts`
  - Test animated zoom converges to target value after sufficient ticks
  - Test momentum decays to zero and stops after friction
  - Test `interrupt()` stops all animations immediately
  - Test `isAnimating` reflects active state correctly

- [x] Update `CameraController` tests for the new constructor signature and PointerEvent-based behavior:
  - Update `src/camera/__tests__/CameraController.test.ts` to pass a `CameraAnimator` instance as the third constructor argument
  - Update event dispatch to use `PointerEvent` instead of `MouseEvent` where applicable

- [x] Replace `GL_LINE_STRIP` + `gl.lineWidth()` with triangle strip geometry:
  - Create `src/renderer/StrokeMesh.ts` — a pure function that takes a polyline and width, returns triangle strip vertices:
    - For each segment between consecutive points, compute the 2D normal (perpendicular to the segment direction)
    - Offset vertices by `±width/2` along the normal to form a quad (two triangles) per segment
    - At joins between segments, use the average of adjacent normals (miter join) to produce smooth corners without gaps or overlaps
    - For the first and last points, use round or square end caps
    - Output format: interleaved `Float32Array` matching the existing vertex layout (position vec2 + color vec4), ready for `GL_TRIANGLE_STRIP`
  - The width parameter is in **world-space units**, so strokes maintain consistent visual thickness regardless of zoom level — the camera transform matrix handles the scaling
  - Update `StrokeRenderer.ts`:
    - Replace `gl.drawArrays(gl.LINE_STRIP, ...)` with `gl.drawArrays(gl.TRIANGLE_STRIP, ...)`
    - Remove the `gl.lineWidth()` call entirely (deprecated and unreliable)
    - Use `StrokeMesh.generateTriangleStrip()` to build vertex data instead of raw point pass-through
    - Enable alpha blending (`gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)`) for smooth anti-aliased edges
  - Verify that existing strokes render correctly with the new geometry — mouse strokes at default width should look similar to before but with consistent thickness at all zoom levels
  - Verify that zooming in/out keeps stroke width proportional to the canvas content (world-space width), not fixed to screen pixels

- [x] Add test suite for `StrokeMesh`:
  - Create `src/renderer/__tests__/StrokeMesh.test.ts`
  - Test that a two-point polyline produces the expected 4 vertices (one quad)
  - Test that vertex offsets are perpendicular to the segment direction and have magnitude `width/2`
  - Test that a multi-segment polyline produces correct miter joins (shared vertices at interior points)
  - Test degenerate cases: duplicate points, single point, zero width
  - Test that output vertex count matches `(pointCount * 2)` for the triangle strip

- [ ] Verify the complete Phase 02.5 experience end-to-end:
  - Launch the app with `npm run tauri dev`
  - Confirm smooth animated zoom on `Ctrl+=`/`Ctrl+-`/`Ctrl+0`
  - Confirm momentum scrolling on pan release (canvas glides to a stop)
  - Confirm trackpad pinch-to-zoom works with continuous zoom
  - Confirm Space+drag enables pan mode
  - Confirm strokes render with consistent world-space width at all zoom levels (zoom in → strokes get thicker on screen; zoom out → strokes get thinner)
  - Confirm strokes have clean joins and end caps, no gaps or visual artifacts
  - Confirm no regression in stroke capture, CRDT persistence, or undo/redo
  - Fix any issues found during verification
  - Commit all working code
