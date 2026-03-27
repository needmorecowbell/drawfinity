# Feature 08: Dark Mode (Homepage & UI Chrome)

Introduce a CSS variable-based theming system and dark mode toggle, focused on the homepage and UI chrome (toolbar, panels, settings). The canvas retains its own user-controlled background.

## Context

Drawfinity's CSS (`src/styles.css`, ~3,338 lines) uses **hardcoded color values** throughout — no CSS variables, no theming system. The primary background is `#FAFAF8` (off-white), text is `#222`, accent is `#0066FF`, and borders are various grays. This phase introduces a CSS variable-based theming system and a dark mode toggle, focused primarily on the homepage and UI chrome (toolbar, panels, settings). The canvas itself remains as-is since it has its own background color picker.

**Key files:**
- `src/styles.css` — All application CSS (3,338 lines)
- `src/ui/HomeScreen.ts` — Homepage UI
- `src/ui/SettingsPanel.ts` — Settings modal (will host the theme toggle)
- `src/ui/Toolbar.ts` — Canvas toolbar
- `src/ui/TurtlePanel.ts` — Turtle script panel
- `src/user/UserStore.ts` — User preferences persistence (localStorage)

**Design decision:** Use CSS custom properties (variables) defined on `:root` for the light theme, with a `[data-theme="dark"]` attribute on `<html>` for the dark override. Store the preference in `UserStore` alongside existing user preferences. Respect `prefers-color-scheme` as the default when no explicit preference is saved.

**Scope:** This phase covers the homepage, toolbar, all panels (settings, connection, bookmarks, turtle, stats, cheat sheet), modals, toasts, and context menus. It does NOT change the WebGL canvas background (that has its own user-controlled background color).

**Run tests with:** `npx vitest run`
**Type-check with:** `npx tsc --noEmit`

---

## Tasks

- [ ] **Define CSS custom properties for the light theme and extract colors.** At the top of `src/styles.css`, add a `:root` block defining CSS variables for all semantic colors used across the UI. Map the current hardcoded values. Key variables to define (at minimum): `--bg-primary` (#FAFAF8), `--bg-secondary` (#fff), `--bg-tertiary` (#f5f5f5), `--bg-hover` (rgba(0,0,0,0.06)), `--bg-active` (rgba(0,102,255,0.12)), `--text-primary` (#222), `--text-secondary` (#444), `--text-tertiary` (#666), `--text-muted` (#999), `--border-primary` (#e0e0e0), `--border-secondary` (#eee), `--accent` (#0066FF), `--accent-hover` (#0052cc), `--danger` (#e53935), `--warning` (#f9a825), `--shadow-color` (rgba(0,0,0,0.08)), `--backdrop-blur-bg` (rgba(255,255,255,0.85)), `--overlay-bg` (rgba(0,0,0,0.3)), `--input-bg` (#fff), `--input-border` (#ddd), `--card-bg` (#fff), `--toast-info-bg` (#e3f2fd), `--toast-warning-bg` (#fff8e1), `--toast-error-bg` (#fce4ec). Do NOT replace the hardcoded values yet — just define the variables in this task.

- [ ] **Add the dark theme variable overrides.** Below the `:root` light theme variables, add a `[data-theme="dark"]` selector block that overrides all the CSS variables with dark mode values. Recommended dark palette: `--bg-primary` (#1a1a1a), `--bg-secondary` (#242424), `--bg-tertiary` (#2a2a2a), `--bg-hover` (rgba(255,255,255,0.08)), `--bg-active` (rgba(0,102,255,0.2)), `--text-primary` (#e8e8e8), `--text-secondary` (#b0b0b0), `--text-tertiary` (#888), `--text-muted` (#666), `--border-primary` (#3a3a3a), `--border-secondary` (#333), `--accent` (#4d8eff — slightly lighter blue for dark backgrounds), `--accent-hover` (#6ba1ff), `--danger` (#ff5252), `--shadow-color` (rgba(0,0,0,0.3)), `--backdrop-blur-bg` (rgba(30,30,30,0.85)), `--overlay-bg` (rgba(0,0,0,0.5)), `--input-bg` (#2a2a2a), `--input-border` (#444), `--card-bg` (#242424), `--toast-info-bg` (#1a2a3a), `--toast-warning-bg` (#2a2210), `--toast-error-bg` (#2a1015). Also add a `@media (prefers-color-scheme: dark)` block with `[data-theme="auto"]` selector that applies the same dark overrides, so the default "auto" mode respects OS preference.

- [ ] **Replace hardcoded colors with CSS variables in homepage styles.** In `src/styles.css`, find all rules within the home screen section (selectors starting with `#home-screen`, `.home-*`) and replace hardcoded color values with their corresponding CSS variables. For example: `background: #FAFAF8` becomes `background: var(--bg-primary)`, `color: #222` becomes `color: var(--text-primary)`, `border: 1px solid #e8e8e8` becomes `border: 1px solid var(--border-primary)`, etc. Be methodical — go through every color property (color, background, background-color, border, border-color, box-shadow, outline) in the home screen rules. Do NOT change colors that are decorative/brand-specific (like user color swatches or the specific color presets).

- [ ] **Replace hardcoded colors with CSS variables in toolbar styles.** Same process as above but for toolbar selectors (`#toolbar`, `.toolbar-*`, `.tool-*`). Key areas: toolbar background (currently `rgba(255,255,255,0.85)` should become `var(--backdrop-blur-bg)`), button hover states, active states, dividers, text colors, dropdown menus, the zoom display, brush size popover, color picker container borders. The color swatches themselves (the actual drawing colors) should NOT be changed — those are the user's palette.

- [ ] **Replace hardcoded colors with CSS variables in panel styles.** Convert all panel CSS to use variables: (1) Settings panel (`#settings-overlay`, `#settings-panel`, `.settings-*`), (2) Connection panel (`.connection-*`), (3) Bookmark panel (`.bookmark-*`), (4) Turtle panel (`#turtle-panel`, `.turtle-*`, and the CodeMirror editor from Phase 01), (5) Stats panel (`#stats-panel`, `.stats-*`), (6) Cheat sheet (`.cheat-sheet-*`). Also convert: toast/notification styles (`.storage-toast*`), context menus (`.context-menu*`), modal overlays, scrollbar styles, and any remaining miscellaneous UI elements. For the CodeMirror editor (from Phase 01), add a dark theme configuration that reads from CSS variables or switches CodeMirror's theme based on the active theme.

- [ ] **Add theme persistence and toggle to UserStore and SettingsPanel.** (1) In `src/user/UserStore.ts` (or the appropriate preferences file), add a `theme` field to user preferences with values `"auto" | "light" | "dark"`, defaulting to `"auto"`. Add `getTheme()` and `setTheme()` methods. (2) Create `src/ui/ThemeManager.ts` that: reads the saved preference on startup, sets `data-theme` attribute on `document.documentElement`, listens to `prefers-color-scheme` media query changes (for auto mode), and exposes a `setTheme()` method that updates both the DOM attribute and saves the preference. (3) In `src/ui/SettingsPanel.ts`, add a "Theme" section near the top of the settings with three toggle buttons: Auto (sun+moon icon), Light (sun), Dark (moon). Style these to match the existing settings button groups. (4) Wire the theme manager into `src/main.ts` initialization so the theme is applied before the UI renders (to avoid flash of wrong theme). Add ThemeManager to `src/ui/index.ts` barrel.

- [ ] **Run full test suite, type-check, and visual verification.** Run `npx vitest run` and `npx tsc --noEmit`. Fix any failures. Verify both themes look correct by running `npm run dev`: (1) homepage in light mode — should look identical to current design, (2) homepage in dark mode — readable text, proper contrast, no white flashes, (3) toolbar in both modes, (4) all panels in both modes, (5) toggle between modes in settings panel. Check that the canvas drawing area is NOT affected by the theme (it has its own background).
