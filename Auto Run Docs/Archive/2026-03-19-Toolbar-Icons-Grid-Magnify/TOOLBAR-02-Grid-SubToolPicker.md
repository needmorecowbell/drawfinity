# Phase 02: Grid Hold-to-Select SubToolPicker

Replace the grid toggle button with a SubToolPicker offering Dots / Lines / None options. Quick click toggles between "none" and the last-used style (preserving current behavior). Hold (300ms) reveals a popover with all three options.

## Design Decisions

**Reuse existing SubToolPicker pattern.** The brush and shape buttons already use SubToolPicker for hold-to-select. The grid button follows the same pattern with grid-specific toggle logic.

**Quick-click toggle semantics.** SubToolPicker fires `onSelect(lastUsedId)` on quick click. The grid handler checks: if the selected style matches the current active style, toggle to "none". If current is "none", activate the selected style. When "none" is explicitly picked from the popover, override `lastUsedId` to the last non-none style so the next quick-click restores it.

**Keep settings panel dropdown.** The grid style dropdown in Settings remains as-is for discoverability. Both UIs sync via the existing `setGridStyle()` method.

## Tasks

- [x] Update `src/ui/Toolbar.ts` — add `private gridPicker!: SubToolPicker;` member. In `build()`, replace the grid button's direct `pointerdown` handler with a SubToolPicker: create `gridOptions` array with `{ id: "dots", label: ICONS.gridDots, title: "Dot grid" }`, `{ id: "lines", label: ICONS.gridLines, title: "Line grid" }`, `{ id: "none", label: ICONS.gridNone, title: "No grid" }`. Create the SubToolPicker with `onSelect: (id) => this.selectGridStyle(id as GridStyle)`. Call `this.gridPicker.attach(this.gridButton)`. Add a new `selectGridStyle(style: GridStyle)` method implementing toggle logic: if `style === this.gridStyle` (quick-click on active) → toggle to "none" and set picker lastUsedId to `lastNonNoneGridStyle`; if `style === "none"` (explicit pick) → set to "none" and set picker lastUsedId to `lastNonNoneGridStyle`; otherwise → set to style and update `lastNonNoneGridStyle`. Always update the grid button active class and fire `onGridStyleChange`. Remove the old `toggleGrid()` private method on Toolbar. Update `setGridStyle()` to also call `this.gridPicker.setLastUsedId(style === "none" ? this.lastNonNoneGridStyle : style)`. Add `this.gridPicker.destroy()` in `destroy()`.

- [x] Update `src/canvas/CanvasApp.ts` — update the `toggleGrid()` method (Ctrl+' handler) to use the toolbar's last non-none style instead of hardcoded "dots". Either expose `toolbar.getLastNonNoneGridStyle()` or make the CanvasApp track its own `lastNonNoneGridStyle`. When toggling from "none", restore the last non-none style; when toggling to "none", remember the current style.

- [x] Update tests — update grid-related tests in `src/ui/__tests__/Toolbar.test.ts` and `src/ui/__tests__/ToolbarFeatures.test.ts` to account for the SubToolPicker behavior (quick click toggle, hold popover with 3 options, style memory). Run `npx vitest run` to verify all tests pass. ✅ All 961 tests pass.
