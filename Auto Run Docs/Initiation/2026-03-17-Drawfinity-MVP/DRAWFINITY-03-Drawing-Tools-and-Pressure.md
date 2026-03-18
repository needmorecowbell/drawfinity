# Phase 03: Drawing Tools, Pressure Sensitivity, and UI

Build out the full drawing toolkit: pressure-sensitive strokes with variable width and opacity, multiple brush types, a color picker, an eraser, and a clean toolbar UI. This phase transforms the prototype into something that feels like a real drawing application.

## Tasks

- [x] Extend the triangle strip renderer (from Phase 02.5) with per-point pressure-based width:
  - **Prerequisite**: Phase 02.5 delivers `StrokeMesh.ts` with uniform-width triangle strip geometry and miter joins, replacing `GL_LINE_STRIP` + `gl.lineWidth()`. This task builds on that foundation.
  - Update `StrokeMesh.ts` to accept per-vertex pressure values and compute `±(width * pressure) / 2` offsets instead of uniform `±width/2`
  - Update the vertex shader to accept per-vertex width (already have position and color)
  - Verify existing strokes still render correctly, now with pressure-based width variation (mouse strokes at pressure 0.5 should look similar to before)

- [x] Add stroke smoothing and pressure-sensitive opacity:
  - Create `src/input/StrokeSmoothing.ts` — applies a simple moving-average or Catmull-Rom interpolation to incoming points, reducing jaggedness from fast mouse/stylus movement. Keep the raw points and produce smoothed points for rendering
  - Update the fragment shader to support per-vertex alpha (opacity), derived from pressure. Low pressure → more transparent, high pressure → fully opaque
  - Wire pressure from PointerEvent into the stroke points (already captured in Phase 01, now actually used for rendering)
  - Test with mouse (constant pressure 0.5 → consistent width/opacity) and note that Wacom testing will happen on the Linux machine

- [x] Create the brush system with multiple brush types:
  - Create `src/tools/Brush.ts` — defines a `BrushConfig` type: `{ name: string, baseWidth: number, pressureCurve: (p: number) => number, opacityCurve: (p: number) => number, color: string, smoothing: number }`
  - Create `src/tools/BrushPresets.ts` — define at least 4 presets:
    - **Pen**: firm, consistent width, full opacity, low smoothing (technical drawing)
    - **Pencil**: responsive to pressure, slightly transparent, medium smoothing (sketching)
    - **Marker**: wide, high opacity, low pressure sensitivity (bold strokes)
    - **Highlighter**: wide, very transparent, no pressure sensitivity (overlay marking)
  - Create `src/tools/ToolManager.ts` — manages the active tool (brush/eraser), active brush config, and current color. Exposes `setTool()`, `setBrush()`, `setColor()`, `getActiveConfig()`
  - Integrate ToolManager into StrokeCapture so new strokes use the active brush config

- [x] Implement the eraser tool:
  - In `src/tools/EraserTool.ts`:
    - Eraser works by detecting which strokes intersect with the eraser's path
    - On pointermove while erasing, check each stroke's bounding box and then do point-distance checks against the eraser radius
    - Remove intersecting strokes from the CRDT document via `DrawfinityDoc` (whole-stroke eraser for now — splitting strokes is complex and can come later)
  - Eraser operations should be undoable via the existing UndoManager
  - Wire eraser activation to the ToolManager (e.g., keyboard shortcut 'E' to toggle)

- [ ] Build the toolbar UI:
  - Create `src/ui/Toolbar.tsx` (or vanilla TS + HTML if not using React):
    - A floating toolbar anchored to the top or left of the canvas
    - Brush selector: clickable icons/buttons for each brush preset, with the active one highlighted
    - Color picker: a compact color palette (8-12 preset colors) plus a custom color input (HTML color input)
    - Eraser button with active state indication
    - Undo / Redo buttons (wired to the existing UndoManager)
    - Zoom level display (moved from the HUD)
  - Style with CSS — keep it minimal and non-intrusive (semi-transparent background, small footprint)
  - Keyboard shortcuts for quick switching:
    - `B` → brush tool, `E` → eraser tool
    - `1-4` → select brush presets
    - `[` and `]` → decrease/increase brush size
  - Ensure the toolbar does NOT capture pointer events that should go to the canvas (use proper event delegation)

- [ ] Test the complete drawing experience:
  - Launch the app and verify each brush type produces visually distinct strokes
  - Verify eraser removes strokes and is undoable
  - Verify color changes affect new strokes (not existing ones)
  - Verify keyboard shortcuts work for tool switching and brush size
  - Verify toolbar doesn't interfere with canvas pan/zoom
  - Verify strokes still persist (save/load) with the new brush metadata
  - Fix any issues and commit
