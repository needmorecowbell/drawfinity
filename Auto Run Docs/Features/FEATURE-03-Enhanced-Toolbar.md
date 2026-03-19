# Feature 03: Enhanced Toolbar

Expand the toolbar to surface key drawing and navigation features that are currently gated behind keyboard shortcuts. Designed for Wacom tablet users who need most functionality accessible via pointer interactions. Inspired by GIMP's hold-to-select sub-tooling pattern.

## Design Decisions

**Expand the existing floating toolbar, not a menu bar.** The current floating toolbar is already well-positioned. We add more buttons and use sub-menus/popovers for grouped options rather than switching to a traditional File/Edit/View menu bar. This preserves the clean canvas-centric aesthetic.

**Hold-to-select for tool groups.** Following GIMP's pattern, tools with sub-options (e.g., brush with presets, shapes with types) show a secondary picker when the button is held/long-pressed (~300ms). A quick click selects the last-used sub-tool. This reduces toolbar clutter while keeping everything one pointer action away.

**Wacom-friendly design.** All buttons must be large enough for stylus tapping (~36px minimum), with adequate spacing to prevent mis-taps. Tooltips should appear on hover to show the keyboard shortcut. No double-click interactions — everything is single-click or hold.

## New Toolbar Items

| Item | Type | Behavior |
|------|------|----------|
| **Pan/Zoom tool** | Toggle button | Activates pan mode (grab cursor). Scroll zooms. Click exits back to previous tool. Currently Space-only. |
| **Brush size** | Slider popover | Click shows a slider (1-64px). Current size shown as a number badge on the button. |
| **Opacity** | Slider popover | Click shows an opacity slider (0-100%). Affects stroke/shape opacity. |
| **Grid toggle** | Toggle button | Show/hide the dot grid background. Currently no UI for this. |
| **Export** | Button | Export the current view or full canvas as PNG. Opens a dialog with options (viewport only vs. fit-all, resolution). |
| **Zoom controls** | Button group | Zoom in / zoom out / fit-all / reset to 100%. Currently keyboard-only. |

## Tasks

- [x] Refactor toolbar layout:
  - Organize buttons into logical groups with subtle dividers:
    - **Tools:** Brush (hold → presets), Shapes (hold → rect/ellipse/polygon/star), Eraser, Pan/Zoom
    - **Properties:** Color, Fill color, Brush size, Opacity
    - **Actions:** Undo, Redo, Export
    - **Navigation:** Zoom in, Zoom out, Reset zoom, Zoom display
    - **Panels:** Home, Bookmarks, Turtle, Connection, Settings
  - Add CSS for group dividers (thin vertical line or gap)

- [x] Hold-to-select sub-tooling:
  - Create `src/ui/SubToolPicker.ts`:
    - A small popover that appears on long-press (~300ms) of a tool button
    - Shows sub-options in a grid or vertical list
    - For brush button: shows 4 brush presets (Pen, Pencil, Marker, Highlighter)
    - For shape button: shows 4 shape types (Rectangle, Ellipse, Polygon, Star)
    - Quick click (< 300ms) selects the last-used sub-tool
    - The button icon updates to reflect the last-used sub-tool
  - Implement hold detection: `pointerdown` starts a timer, `pointerup` before 300ms = quick click, after 300ms = show picker

- [x] Pan/Zoom tool button:
  - Add a hand/grab icon button to the tools group
  - Click activates pan mode: sets `CameraController` to pan-only mode, changes cursor to grab/grabbing
  - Click again (or press another tool) exits pan mode
  - While pan tool is active, scroll wheel zooms (already works), left-click drags to pan
  - Show active state highlight when pan mode is on
  - Added "G" keyboard shortcut to toggle pan tool (registered in ActionRegistry + CheatSheet)

- [x] Brush size slider:
  - Add a brush-size button (shows current size as text, e.g., "2")
  - On click, show a popover with:
    - Horizontal slider (range 0.5 to 64)
    - Numeric input for precise values
    - A few preset sizes (1, 2, 4, 8, 16, 32)
  - Changes update `ToolManager`, `StrokeCapture`, and `CursorManager` in real time
  - The slider should respond to pointer drag (Wacom-friendly)

- [x] Opacity slider:
  - Add an opacity button (shows current opacity, e.g., "100%")
  - On click, show a popover with a slider (0-100%)
  - Changes update the active brush's opacity curve
  - Consider: opacity affects new strokes only, not existing ones
  - Implemented: `OpacitySlider` component in `src/ui/OpacitySlider.ts` with popover, slider, preset buttons (25/50/75/100%), and dismiss-on-click-outside. Opacity stored in `ToolManager` and applied as a multiplier on the brush's `opacityCurve`. Shape opacity also updated. 24 new tests added.

- [x] Grid toggle:
  - Add a grid icon button
  - Click toggles the dot grid background on/off
  - Visual indicator: button appears pressed/highlighted when grid is on
  - Store grid visibility preference in UserPreferences
  - Implemented: Trigram icon (☷) button in navigation group with `.active` highlight when grid is on. `Ctrl+'` keyboard shortcut registered in ActionRegistry. `gridVisible` field added to `UserPreferences` (persisted to localStorage/config). Conditional `drawDotGrid()` call in render loop. 7 new tests added.

- [x] Export:
  - Add an export/download button (arrow-down icon)
  - On click, show a dialog with options:
    - Scope: "Current viewport" or "Fit all content"
    - Resolution: 1x, 2x, 4x
    - Format: PNG (default)
    - Background: include background color (yes/no)
  - Implementation: render to an offscreen canvas at the chosen resolution, then trigger a download via `<a download>` or Tauri save dialog
  - In browser mode, use `canvas.toBlob()` → `URL.createObjectURL()` → download link
  - Implemented: `ExportDialog` component in `src/ui/ExportDialog.ts` with popover containing scope, resolution, and background options. `ExportRenderer` in `src/ui/ExportRenderer.ts` handles offscreen WebGL2 rendering (based on ThumbnailGenerator pattern) with `computeContentBounds` for fit-all and viewport matrix pass-through for current-view export. `downloadCanvas` uses blob URL + anchor download pattern. `Ctrl+Shift+E` keyboard shortcut registered. 36 new tests added (22 ExportDialog + 14 ExportRenderer).

- [x] Zoom controls:
  - Add zoom in (+) and zoom out (-) buttons
  - Add a "fit all" button (magnifying glass with arrows) — computes bounds of all content and animates camera to fit
  - The existing zoom percentage display stays and is clickable → reset to 100%
  - All zoom actions use `CameraAnimator` for smooth transitions
  - Implemented: Zoom out (−), zoom display (clickable → reset), zoom in (+), and fit-all (⤢) buttons in navigation group. All use `CameraAnimator` for smooth animated transitions. Fit-all computes content bounds from strokes and shapes. Registered `fit-all` action in ActionRegistry. 9 new tests added.

- [ ] Tooltip system:
  - Show tooltips on hover for all toolbar buttons
  - Format: "Tool name (Shortcut)" e.g., "Brush (B)", "Undo (Ctrl+Z)"
  - Delay: 500ms before showing
  - Create a lightweight `src/ui/Tooltip.ts` utility

- [ ] Responsive layout:
  - If the toolbar would overflow the viewport width, wrap to a second row or collapse less-used items into a "..." overflow menu
  - Ensure minimum button size of 36px for stylus tapping

- [ ] Tests:
  - Unit tests for SubToolPicker (hold detection timing, last-used memory)
  - Unit tests for slider popovers (value changes propagate correctly)
  - Unit tests for export dialog (option selection, download trigger)
  - Unit tests for tooltip rendering
  - Integration test: hold brush button → sub-picker appears → select preset → verify tool change
