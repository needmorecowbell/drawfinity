# Phase 01: SVG Icons for Toolbar Buttons

Replace all Unicode character labels with inline SVG icons for a polished, consistent look. SVGs use `stroke="currentColor"` so they inherit button color for active/disabled states.

## Design Decisions

**Inline SVG strings, not external files.** Each icon is a small SVG string stored in a dedicated module. This avoids async loading, bundler complexity, and icon library dependencies. The SVGs are 18x18px with a 24x24 viewBox, line-art style with `stroke-width="2"`, `stroke-linecap="round"`, and `stroke-linejoin="round"`.

**innerHTML replaces textContent.** All button label assignments switch from `textContent` to `innerHTML`. The SubToolPicker must also switch so SVG labels render in popovers. Single-character strings (like brush preset letters "P", "M") render identically via innerHTML, so no regressions there.

## Tasks

- [x] Create `src/ui/ToolbarIcons.ts` — export a `const ICONS` object mapping icon names to SVG strings. Icons needed: `brush`, `eraser`, `rectangle`, `ellipse`, `polygon`, `star`, `pan`, `magnify`, `gridDots`, `gridLines`, `gridNone`, `zoomIn`, `zoomOut`, `fitAll`, `undo`, `redo`, `export`, `home`, `help`, `settings`, `fillToggle`, `opacity`, `brushSize`. Each SVG should be `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">...</svg>`. Keep icons simple and recognizable: brush = angled pen nib, eraser = rectangular block, pan = open hand, magnify = circle with handle, undo/redo = curved arrows, etc.

- [x] Update `src/ui/SubToolPicker.ts` — change `updateButtonAppearance()` to use `this.button.innerHTML = option.label` instead of `this.button.textContent = option.label`. Change popover item creation to use `item.innerHTML = option.label` instead of `item.textContent = option.label`. This lets SVG strings render as actual icons in both the button and the popover. *(Already implemented in prior iteration — both lines already use innerHTML.)*

- [x] Update `src/ui/Toolbar.ts` — import `ICONS` from `ToolbarIcons.ts`. Replace all `button.textContent = "unicode"` assignments with `button.innerHTML = ICONS.xxx`. Update the `SHAPE_TOOLS` array `label` values from Unicode characters to the corresponding SVG strings (`ICONS.rectangle`, `ICONS.ellipse`, `ICONS.polygon`, `ICONS.star`). Update brush preset SubToolOption labels — keep as single characters (they render fine via innerHTML). *(Already implemented in prior iteration — all buttons use innerHTML with ICONS, SHAPE_TOOLS uses SVG strings.)*

- [x] Update `src/canvas/CanvasApp.ts` — change the settings button from `this.settingsButton.textContent = "\u2699"` to `this.settingsButton.innerHTML = ICONS.settings`. Import `ICONS` from `../ui/ToolbarIcons`. *(Already implemented in prior iteration — line 332 uses `innerHTML = ICONS.settings`.)*

- [x] Add CSS for SVG icons in `src/styles.css` — add rules: `.toolbar-btn svg { display: block; pointer-events: none; }` and `.subtool-option svg { display: block; pointer-events: none; }` to ensure SVGs render as block elements and don't intercept pointer events. *(Already implemented in prior iteration — rules present at lines 132-140.)*

- [x] Update tests in `src/ui/__tests__/Toolbar.test.ts` and `src/ui/__tests__/ToolbarFeatures.test.ts` — update any assertions that check `textContent` of buttons to instead check that `innerHTML` contains `<svg` or check for specific CSS classes. Run `npx vitest run` to verify all tests pass. Run `npx tsc --noEmit` to verify no new type errors. *(Verified: all 956 tests pass, no new type errors. Tests no longer assert Unicode textContent on toolbar buttons.)*
