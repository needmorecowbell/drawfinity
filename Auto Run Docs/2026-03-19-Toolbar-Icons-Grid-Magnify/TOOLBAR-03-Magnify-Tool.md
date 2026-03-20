# Phase 03: Magnify Tool

Add a new "magnify" tool type for click-to-zoom and drag-to-zoom interaction. Click zooms in 2x toward the clicked point. Drag up zooms in continuously, drag down zooms out continuously, anchored at the initial pointer position.

## Design Decisions

**Standalone MagnifyCapture class.** Follows the established StrokeCapture/ShapeCapture pattern — a class that listens for pointer events on the canvas and is enabled/disabled via `setEnabled()`. This keeps pointer event handling clean and separated by tool.

**Click vs drag detection.** Track initial pointerdown Y position. If pointer moves more than 5px vertically before pointerup, it's a drag. Otherwise it's a click. This threshold prevents accidental drag detection from jitter.

**Drag zoom mechanics.** Use frame-to-frame deltaY with `camera.zoomAt(startX, startY, factor)` where `factor = 1 - frameDeltaY * 0.005`. Negative deltaY (drag up) yields factor > 1 (zoom in). Positive deltaY (drag down) yields factor < 1 (zoom out). The zoom anchors at the pointerdown position so the point of interest stays fixed.

**Click zoom.** Uses `cameraAnimator.animateZoomTo(camera.zoom * 2, clickX, clickY)` for a smooth animated 2x zoom at the click point.

**Cursor.** Magnifying glass SVG data URI cursor. Default shows plain magnifier. During drag-up shows magnifier with "+", during drag-down shows magnifier with "-". Built similarly to `CursorManager.buildCircleCursor()`.

**Event ordering.** When magnify is active, StrokeCapture and ShapeCapture are disabled, and CameraController.panToolActive is false. CameraController ignores bare left-clicks when panToolActive is false, so MagnifyCapture gets them cleanly. Middle-mouse pan, scroll zoom, and space-to-pan still work via CameraController.

## Tasks

- [x] Update `src/tools/ToolManager.ts` — add `"magnify"` to the `ToolType` union: `export type ToolType = "brush" | "eraser" | "rectangle" | "ellipse" | "polygon" | "star" | "pan" | "magnify";`

- [x] Create `src/input/MagnifyCapture.ts` — new class `MagnifyCapture` with constructor `(camera: Camera, cameraAnimator: CameraAnimator, cameraController: CameraController, canvas: HTMLCanvasElement)`. Private state: `enabled`, `isActive` (pointer is down), `startX`, `startY`, `lastY`, `isDragging` (totalDeltaY exceeds 5px threshold), `pointerId`. Methods: `setEnabled(enabled: boolean)` — gates pointer handling and resets state; `handlePointerDown(e)` — if `!enabled` or `e.button !== 0` or `e.ctrlKey` or `cameraController.panning` (space-held, pinch), return; record start position, set isActive, capture pointer; `handlePointerMove(e)` — if `!isActive` return; compute totalDeltaY, if `|totalDeltaY| > 5` set isDragging; if dragging, compute frameDeltaY, apply `camera.zoomAt(startX, startY, 1 - frameDeltaY * 0.005)`, update lastY, call `onCursorChange` callback with "in" or "out"; `handlePointerUp(e)` — if `!isActive` return; if not dragging (click), call `cameraAnimator.animateZoomTo(camera.zoom * 2, startX, startY)`; reset state, release pointer, call `onCursorChange("default")`; `destroy()` — remove event listeners. Expose `onCursorChange?: (mode: "default" | "in" | "out") => void` callback. Register pointerdown/pointermove/pointerup/pointercancel on the canvas element.

- [x] Update `src/input/index.ts` — add export: `export { MagnifyCapture } from "./MagnifyCapture";`

- [x] Update `src/ui/CursorManager.ts` — add `"magnify"` handling in `updateCursor()`: when `currentTool === "magnify"`, set `this.canvas.style.cursor` to a magnifying glass SVG data URI. Add `buildMagnifyCursor(mode: "default" | "in" | "out"): string` method that returns an SVG data URI cursor string — a circle with a diagonal handle line, optionally with "+" (zoom in) or "-" (zoom out) inside the circle. Add `setMagnifyMode(mode: "default" | "in" | "out"): void` method that updates the cursor during drag (called by MagnifyCapture via CanvasApp wiring).

- [x] Update `src/ui/Toolbar.ts` — add `private magnifyButton!: HTMLButtonElement;` member. In `build()`, after the pan button, add the magnify button: create button with class `toolbar-btn magnify-btn`, set `innerHTML = ICONS.magnify`, attach tooltip "Magnify (Z)", add pointerdown handler with toggle behavior (same pattern as pan button — if already magnify, switch to previousTool; otherwise switch to magnify). In `setToolUI()`, add `this.magnifyButton.classList.toggle("active", tool === "magnify")`. Update previousTool tracking condition to skip "magnify" in addition to "pan": `if (this.activeTool !== "pan" && this.activeTool !== "magnify" && tool !== this.activeTool)`.

- [x] Update `src/canvas/CanvasApp.ts` — import `MagnifyCapture` from `../input`. Add `private magnifyCapture!: MagnifyCapture;` member. In `init()`, create: `this.magnifyCapture = new MagnifyCapture(this.camera, this.cameraAnimator, this.cameraController, this.canvas); this.magnifyCapture.setEnabled(false);`. Wire cursor changes: `this.magnifyCapture.onCursorChange = (mode) => this.cursorManager.setMagnifyMode(mode);`. In `switchTool()`, add a case for `"magnify"`: disable strokeCapture, shapeCapture; enable magnifyCapture; set cameraController.panToolActive = false; call toolbar.setToolUI and cursorManager.setTool. In ALL other switchTool branches, add `this.magnifyCapture.setEnabled(false)`. In `destroy()`, add `this.magnifyCapture.destroy()`. In `registerActions()`, add: `r.register({ id: "tool-magnify", label: "Magnify", shortcut: "Z", category: "Tools", execute: () => this.switchTool("magnify") })`. In `handleKeydown()`, add `else if (e.key === "z" || e.key === "Z") { this.switchTool("magnify"); }` in the bare-key section (after the `if (mod) return` guard, so it doesn't conflict with Ctrl+Z undo).

- [x] Create `src/input/__tests__/MagnifyCapture.test.ts` — test: click (pointerdown + pointerup without move) calls animateZoomTo with 2x zoom; drag up (negative deltaY > 5px) calls camera.zoomAt with factor > 1; drag down (positive deltaY > 5px) calls camera.zoomAt with factor < 1; small movement (<5px) treated as click not drag; setEnabled(false) prevents all zoom; right-click and ctrl-click ignored; cameraController.panning returns true → pointerdown ignored. Update `src/ui/__tests__/Toolbar.test.ts` — test magnify button exists, clicking fires onToolChange("magnify"), clicking again returns to previous tool, setToolUI("magnify") highlights the button. Run `npx vitest run` and `npx tsc --noEmit` to verify everything passes.
