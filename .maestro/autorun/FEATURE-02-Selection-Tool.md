# Feature 02: Selection Tool

Add a selection tool that lets users select regions of the canvas and perform actions on the selected content. Supports rectangular, elliptical, and point-based (lasso) selection modes.

## Context

Drawfinity is an infinite canvas drawing app with a **WebGL2** rendering pipeline and **Yjs CRDT** data layer. Canvas items are either **strokes** (`src/model/Stroke.ts`) or **shapes** (`src/model/Shape.ts`), stored in a Yjs document (`src/crdt/DrawfinityDoc.ts`).

Tools are managed by `src/tools/ToolManager.ts` which tracks the active tool type (currently: `"brush"`, `"eraser"`, `"rectangle"`, `"ellipse"`, `"polygon"`, `"star"`, `"pan"`, `"magnify"`). Input is handled by `src/input/StrokeCapture.ts` (brush/eraser) and `src/input/ShapeCapture.ts` (shapes). Each capture class listens for pointer events and dispatches based on the active tool.

The turtle graphics system (`src/turtle/`) executes Lua scripts that place strokes on the canvas via `TurtleDrawing.ts`. The turtle currently draws anywhere — there is no bounds-constraining mechanism.

**Keyboard shortcuts** are registered in `src/ui/ActionRegistry.ts`. The toolbar UI is in `src/ui/Toolbar.ts`.

**Run tests with:** `npx vitest run`
**Type-check with:** `npx tsc --noEmit`

## Feature Description

### Selection Modes

The selection tool supports three region types:

1. **Rectangle** — Click and drag to define an axis-aligned rectangle. Shift constrains to square.
2. **Ellipse** — Click and drag to define an axis-aligned ellipse. Shift constrains to circle.
3. **Lasso (point-based)** — Click to place vertices of a freeform polygon. Double-click or close the path to finalize the selection region.

A canvas item is "selected" if any part of it falls within the selection region. For strokes, check if any stroke point is inside the region. For shapes, check if the shape's bounding box intersects the region.

### Actions on Selection

Once a region is selected, the user can:

- **Delete** — Remove all selected items from the document (`Backspace` or `Delete` key)
- **Move** — Drag the selection to reposition all selected items (translate all points/coordinates)
- **Duplicate** — Copy selected items with an offset (`Ctrl+D` while selection is active)
- **Constrain turtle** — When a selection is active and the turtle panel is open, the turtle's `forward()` command clips to the selection boundary. Strokes that would exit the region are truncated at the boundary edge.

### Visual Feedback

- Selection region rendered as a dashed outline (marching ants or static dash pattern)
- Selected items highlighted with a subtle overlay or bounding box indicator
- Selection handles at corners/edges for potential future resize (not required in this phase)

## Tasks

- [ ] Add `"select"` to the tool type enum in `ToolManager.ts`:
  - Add keyboard shortcut `V` to activate (standard selection shortcut)
  - Add a selection tool button to the toolbar with a mode picker (rectangle/ellipse/lasso)
  - Update `CursorManager.ts` with a crosshair cursor for selection mode

- [ ] Create `src/input/SelectionCapture.ts`:
  - Handle pointer events for all three selection modes
  - **Rectangle mode**: `pointerdown` sets corner 1, `pointermove` updates corner 2, `pointerup` finalizes
  - **Ellipse mode**: Same drag mechanic, defines bounding box of ellipse
  - **Lasso mode**: Each `pointerdown` adds a vertex; double-click or clicking near the first vertex closes the polygon
  - Convert screen coordinates to world coordinates using `camera.screenToWorld()`
  - Emit a `SelectionRegion` object: `{ type: "rect" | "ellipse" | "lasso", bounds: ... , points?: ... }`

- [ ] Create `src/model/Selection.ts`:
  - `SelectionRegion` type definition (rect, ellipse, lasso with their parameters)
  - `hitTestStroke(stroke, region): boolean` — check if any stroke point falls inside the region
  - `hitTestShape(shape, region): boolean` — check if shape bounding box intersects the region
  - `getSelectedItems(doc, region): CanvasItem[]` — query document for all items in region
  - Point-in-ellipse: `((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1`
  - Point-in-polygon: ray-casting algorithm for lasso regions

- [ ] Implement selection actions:
  - **Delete**: call `doc.removeStroke(id)` / `doc.removeShape(id)` for each selected item, wrapped in a single Yjs transaction for atomic undo
  - **Move**: on drag, compute delta in world coordinates, update all point positions (strokes) and center coordinates (shapes) via CRDT mutations
  - **Duplicate**: clone selected items with new IDs and offset positions, add to document

- [ ] Render selection overlay in `src/renderer/Renderer.ts`:
  - Draw selection region outline (dashed rectangle/ellipse/polygon)
  - Use a separate shader pass or overlay canvas for the selection visualization
  - The selection overlay should be in screen-space (doesn't scale with zoom)

- [ ] Integrate turtle bounds constraining:
  - When a `SelectionRegion` is active, pass it to `TurtleDrawing.ts`
  - In `TurtleDrawing.addSegment()`, clip the line segment to the selection boundary
  - For rectangle: standard line-rect clipping (Cohen-Sutherland or similar)
  - For ellipse: line-ellipse intersection
  - For lasso: line-polygon clipping (Sutherland-Hodgman)
  - If the turtle moves entirely outside the region, the pen produces no stroke

- [ ] Tests:
  - Test: point-in-rectangle hit testing (inside, outside, on edge)
  - Test: point-in-ellipse hit testing
  - Test: point-in-polygon (lasso) hit testing with convex and concave polygons
  - Test: `getSelectedItems` returns correct items for each selection mode
  - Test: delete action removes all selected items in one undo step
  - Test: move action translates all selected item coordinates correctly
  - Test: turtle line clipping at rectangle boundary
  - All existing tests must still pass: `npx vitest run`
