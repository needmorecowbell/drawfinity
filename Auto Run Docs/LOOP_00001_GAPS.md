---
type: analysis
title: README Documentation Gaps - Drawfinity
created: 2026-03-21
tags:
  - readme-accuracy
  - documentation-gaps
related:
  - '[[LOOP_00001_FEATURE_INVENTORY]]'
  - '[[1_ANALYZE]]'
  - '[[2_FIND_GAPS]]'
---

# Documentation Gaps - Loop 00001

## Summary
- **Total Gaps Found:** 24
- **MISSING (undocumented features):** 20
- **STALE (removed features still documented):** 0
- **INACCURATE (wrong descriptions):** 2
- **INCOMPLETE (needs more detail):** 2

---

## Gap List

### GAP-001: Shape Tools
- **Type:** MISSING
- **Feature:** Rectangle, Ellipse, Polygon, and Star shape tools
- **Code Location:** `src/input/ShapeCapture.ts`
- **README Location:** Not mentioned
- **Description:**
  Four shape drawing tools exist with keyboard shortcuts (R, O, P, S) and constraint modifiers (Shift for square/circle, Alt for center-out). Not documented anywhere in README.
- **Evidence:**
  - Code: ShapeCapture.ts handles rectangle, ellipse, polygon, star drawing with constraint keys
  - README: Only mentions Brush and Eraser tools
- **User Impact:** Users won't discover shape tools without the cheat sheet or guessing keys

### GAP-002: Background Color Picker
- **Type:** MISSING
- **Feature:** Configurable canvas background color
- **Code Location:** `src/ui/Toolbar.ts`
- **README Location:** Not mentioned
- **Description:**
  Canvas background can be changed via a toolbar color picker with 16 presets. Not documented.
- **Evidence:**
  - Code: Toolbar.ts includes background color picker UI
  - README: No mention of background color
- **User Impact:** Users may not know they can change the canvas background

### GAP-003: Camera Bookmarks
- **Type:** MISSING
- **Feature:** Save and restore camera positions
- **Code Location:** `src/ui/BookmarkPanel.ts`
- **README Location:** Not mentioned
- **Description:**
  Users can save camera positions as bookmarks (Ctrl+D), manage them in a panel (Ctrl+B), and jump between saved views. Not documented.
- **Evidence:**
  - Code: BookmarkPanel.ts with full CRUD and keyboard shortcuts
  - README: No mention of bookmarks
- **User Impact:** Power users miss a key navigation feature

### GAP-004: Turtle Graphics Mode
- **Type:** MISSING
- **Feature:** Lua scripting for programmatic drawing
- **Code Location:** `src/turtle/`, `src/ui/TurtlePanel.ts`
- **README Location:** Not mentioned
- **Description:**
  A full turtle graphics mode with Lua scripting, built-in examples, and a dedicated panel (Ctrl+\`). Major feature completely absent from README.
- **Evidence:**
  - Code: Entire `src/turtle/` module with LuaRuntime, TurtleExamples, TurtlePanel
  - README: No mention
- **User Impact:** A flagship feature is invisible to users reading the README

### GAP-005: Settings Panel
- **Type:** MISSING
- **Feature:** User preferences and settings UI
- **Code Location:** `src/ui/SettingsPanel.ts`
- **README Location:** Not mentioned
- **Description:**
  Settings panel (Ctrl+,) for configuring default brush, color, grid style, server URL, save directory, and user profile. Not documented.
- **Evidence:**
  - Code: SettingsPanel.ts with multiple configuration sections
  - README: No mention
- **User Impact:** Users can't discover how to customize the app

### GAP-006: Cheat Sheet
- **Type:** MISSING
- **Feature:** Searchable keyboard shortcut overlay
- **Code Location:** `src/ui/CheatSheet.ts`
- **README Location:** Not mentioned
- **Description:**
  An in-app searchable cheat sheet of all keyboard shortcuts (Ctrl+?). Not documented.
- **Evidence:**
  - Code: CheatSheet.ts with search functionality
  - README: No mention
- **User Impact:** Users don't know there's a built-in help system

### GAP-007: PNG Export Dialog
- **Type:** MISSING
- **Feature:** Export drawings as PNG with options
- **Code Location:** `src/ui/ExportDialog.ts`
- **README Location:** Not mentioned
- **Description:**
  Full export dialog (Ctrl+Shift+E) with resolution options, scope selection (viewport/fit-all), and background options. Not documented.
- **Evidence:**
  - Code: ExportDialog.ts with resolution/scope/background configuration
  - README: No mention
- **User Impact:** Users don't know they can export their work

### GAP-008: Home Screen
- **Type:** MISSING
- **Feature:** Drawing list with search, sort, and shared rooms browser
- **Code Location:** `src/ui/HomeScreen.ts`
- **README Location:** Not mentioned
- **Description:**
  A home screen with drawing list, search, sort, shared rooms tab, and drawing management (create/rename/duplicate/delete). Not documented.
- **Evidence:**
  - Code: HomeScreen.ts with full drawing management UI
  - README: No mention
- **User Impact:** Users don't know about multi-drawing management

### GAP-009: Magnify Tool
- **Type:** MISSING
- **Feature:** Click-to-zoom and drag-zoom tool
- **Code Location:** `src/input/MagnifyCapture.ts`
- **README Location:** Not mentioned
- **Description:**
  A dedicated magnify/zoom tool with Z shortcut. Not documented.
- **Evidence:**
  - Code: MagnifyCapture.ts with Z key binding
  - README: No mention
- **User Impact:** Users miss a useful navigation tool

### GAP-010: Color Picker
- **Type:** MISSING
- **Feature:** Stroke color picker with presets
- **Code Location:** `src/ui/Toolbar.ts`
- **README Location:** Not mentioned
- **Description:**
  12 preset colors plus custom hex input on the toolbar. Not documented.
- **Evidence:**
  - Code: Color picker UI in Toolbar.ts
  - README: No mention of color selection
- **User Impact:** Users may not realize they can change stroke color

### GAP-011: Opacity Slider
- **Type:** MISSING
- **Feature:** Per-stroke opacity control
- **Code Location:** `src/ui/OpacitySlider.ts`
- **README Location:** Not mentioned
- **Description:**
  Toolbar opacity slider for per-stroke opacity. Not documented.
- **Evidence:**
  - Code: OpacitySlider.ts component
  - README: No mention
- **User Impact:** Users miss fine-grained opacity control

### GAP-012: Grid Options
- **Type:** MISSING
- **Feature:** Dot grid and line grid with toggle
- **Code Location:** `src/renderer/DotGridRenderer.ts`, `src/renderer/LineGridRenderer.ts`
- **README Location:** Not mentioned (Ctrl+' shortcut also missing)
- **Description:**
  Two grid styles (dot and line) configurable in settings. The README Controls table doesn't include the grid toggle shortcut (Ctrl+').
- **Evidence:**
  - Code: DotGridRenderer.ts, LineGridRenderer.ts, grid toggle in CanvasApp.ts
  - README: No mention of grids
- **User Impact:** Users miss a helpful drawing aid

### GAP-013: Remote Cursors
- **Type:** MISSING
- **Feature:** See collaborator cursor positions
- **Code Location:** `src/ui/RemoteCursors.ts`
- **README Location:** Not mentioned
- **Description:**
  During collaboration, remote user cursors are shown with colored labels. Not documented.
- **Evidence:**
  - Code: RemoteCursors.ts with cursor rendering and labels
  - README: Collaboration section doesn't mention cursor visibility
- **User Impact:** Users don't know they can see collaborator positions

### GAP-014: Docker / docker-compose
- **Type:** MISSING
- **Feature:** Containerized server deployment
- **Code Location:** `docker-compose.yml`, `server/Dockerfile`
- **README Location:** Not mentioned
- **Description:**
  Docker and docker-compose configuration for deploying the collaboration server. Not documented.
- **Evidence:**
  - Code: docker-compose.yml and server/Dockerfile exist
  - README: Server section only shows `cargo run`
- **User Impact:** DevOps users miss the easiest deployment method

### GAP-015: Makefile
- **Type:** MISSING
- **Feature:** Convenience build targets
- **Code Location:** `Makefile`
- **README Location:** Not mentioned
- **Description:**
  Makefile with targets like `make up`, `make dev`, `make test`. Not documented.
- **Evidence:**
  - Code: Makefile at project root
  - README: No mention
- **User Impact:** Developers miss convenient workflow shortcuts

### GAP-016: Server REST API
- **Type:** MISSING
- **Feature:** HTTP API endpoints
- **Code Location:** `server/src/api.rs`
- **README Location:** Not mentioned
- **Description:**
  The server has REST API endpoints (e.g., /api/rooms, /health). Not documented.
- **Evidence:**
  - Code: server/src/api.rs with route handlers
  - README: Only mentions WebSocket functionality
- **User Impact:** API consumers can't discover available endpoints

### GAP-017: localStorage Fallback
- **Type:** MISSING
- **Feature:** Browser persistence when Tauri unavailable
- **Code Location:** `src/persistence/LocalStorage.ts`
- **README Location:** Not mentioned
- **Description:**
  When running in browser mode (no Tauri), drawings persist to localStorage. README says "no local persistence" for browser mode, which is now inaccurate.
- **Evidence:**
  - Code: LocalStorage.ts provides browser fallback persistence
  - README: "(no local persistence)" on line 56
- **User Impact:** Users may avoid browser mode thinking their work won't be saved

### GAP-018: User Profile
- **Type:** MISSING
- **Feature:** Configurable name and color for collaboration
- **Code Location:** `src/user/UserProfile.ts`
- **README Location:** Not mentioned
- **Description:**
  Users can set their name and cursor color for collaboration. Not documented.
- **Evidence:**
  - Code: UserProfile.ts with name/color configuration
  - README: No mention
- **User Impact:** Collaborators can't personalize their identity

### GAP-019: Fit-All View
- **Type:** MISSING
- **Feature:** Frame all content in viewport
- **Code Location:** `src/ui/Toolbar.ts`
- **README Location:** Not mentioned
- **Description:**
  A toolbar button to zoom/pan to fit all drawing content in the viewport. Not documented.
- **Evidence:**
  - Code: Fit-all button in Toolbar.ts
  - README: No mention
- **User Impact:** Users miss a quick way to see all their content

### GAP-020: Keyboard Shortcut Gaps
- **Type:** MISSING
- **Feature:** 14+ undocumented keyboard shortcuts
- **Code Location:** `src/canvas/CanvasApp.ts`
- **README Location:** Controls table (lines 115-130)
- **Description:**
  README documents 14 shortcuts but codebase has 28+. Missing shortcuts: R (Rectangle), O (Ellipse), P (Polygon), S (Star), G (Pan), Z (Magnify), Ctrl+B (Bookmarks), Ctrl+D (Quick bookmark), Ctrl+, (Settings), Ctrl+\` (Turtle), Ctrl+? (Cheat sheet), Ctrl+Shift+E (Export), Ctrl+W (Home), Escape (Home), Ctrl+' (Grid toggle).
- **Evidence:**
  - Code: Key bindings in CanvasApp.ts
  - README: Only 14 shortcuts listed
- **User Impact:** Users can't discover most keyboard shortcuts from README

### GAP-021: Test Count Outdated
- **Type:** INACCURATE
- **Feature:** Test suite count
- **Code Location:** Test suite output
- **README Location:** Development section (line 170)
- **Description:**
  README says "All 316 tests". Actual count is 1343 passing tests.
- **Evidence:**
  - Code: `npx vitest run` reports 1343 passed
  - README: "All 316 tests"
- **User Impact:** Minor — gives wrong impression of test coverage size

### GAP-022: Browser Mode Persistence Claim
- **Type:** INACCURATE
- **Feature:** Browser mode persistence description
- **Code Location:** `src/persistence/LocalStorage.ts`
- **README Location:** Getting started section (line 56)
- **Description:**
  README states "Browser only (no local persistence)" but localStorage fallback now provides browser persistence.
- **Evidence:**
  - Code: LocalStorage.ts implements browser-side persistence
  - README: "(no local persistence)" on line 56
- **User Impact:** Users may avoid browser mode thinking drawings will be lost

### GAP-023: Project Structure Outdated
- **Type:** INCOMPLETE
- **Feature:** Source directory listing
- **Code Location:** `src/`
- **README Location:** Project structure section (lines 143-153)
- **Description:**
  README project structure tree is missing `turtle/`, `user/`, and `canvas/` directories.
- **Evidence:**
  - Code: `src/turtle/`, `src/user/`, `src/canvas/` all exist
  - README: Tree only shows 9 of 12 src/ subdirectories
- **User Impact:** Developers exploring the codebase get an incomplete picture

### GAP-024: Collaboration Section Incomplete
- **Type:** INCOMPLETE
- **Feature:** Collaboration details
- **Code Location:** `src/sync/SyncManager.ts`, `src/ui/RemoteCursors.ts`
- **README Location:** Collaboration section (lines 79-111)
- **Description:**
  Collaboration section doesn't mention remote cursors, auto-reconnect with exponential backoff, shared rooms browser, or Docker deployment.
- **Evidence:**
  - Code: SyncManager.ts has auto-reconnect; RemoteCursors.ts shows remote users
  - README: Only describes basic connect flow
- **User Impact:** Users don't know about collaboration UX features

---

## Gaps by Type

### MISSING Features
| Gap ID | Feature | Code Location | User Impact |
|--------|---------|---------------|-------------|
| GAP-001 | Shape tools (R/O/P/S) | `src/input/ShapeCapture.ts` | 4 tools undiscoverable |
| GAP-002 | Background color picker | `src/ui/Toolbar.ts` | Can't customize canvas |
| GAP-003 | Camera bookmarks | `src/ui/BookmarkPanel.ts` | Navigation feature hidden |
| GAP-004 | Turtle graphics mode | `src/turtle/` | Flagship feature invisible |
| GAP-005 | Settings panel | `src/ui/SettingsPanel.ts` | No customization path |
| GAP-006 | Cheat sheet | `src/ui/CheatSheet.ts` | Built-in help unknown |
| GAP-007 | PNG export | `src/ui/ExportDialog.ts` | Can't export drawings |
| GAP-008 | Home screen | `src/ui/HomeScreen.ts` | Multi-drawing management unknown |
| GAP-009 | Magnify tool | `src/input/MagnifyCapture.ts` | Navigation tool hidden |
| GAP-010 | Color picker | `src/ui/Toolbar.ts` | Color selection undocumented |
| GAP-011 | Opacity slider | `src/ui/OpacitySlider.ts` | Fine opacity control hidden |
| GAP-012 | Grid options | `src/renderer/DotGridRenderer.ts` | Drawing aid unknown |
| GAP-013 | Remote cursors | `src/ui/RemoteCursors.ts` | Collab UX unknown |
| GAP-014 | Docker deployment | `docker-compose.yml` | Easiest deploy path missing |
| GAP-015 | Makefile targets | `Makefile` | Dev shortcuts hidden |
| GAP-016 | Server REST API | `server/src/api.rs` | API undocumented |
| GAP-017 | localStorage fallback | `src/persistence/LocalStorage.ts` | Browser persistence unknown |
| GAP-018 | User profile | `src/user/UserProfile.ts` | Collab identity config missing |
| GAP-019 | Fit-all view | `src/ui/Toolbar.ts` | Quick view command hidden |
| GAP-020 | 14+ keyboard shortcuts | `src/canvas/CanvasApp.ts` | Most shortcuts undocumented |

### STALE Documentation
No stale documentation found. All features documented in README exist in code.

### INACCURATE Documentation
| Gap ID | Feature | What's Wrong | Correct Behavior |
|--------|---------|--------------|------------------|
| GAP-021 | Test count | README says 316 | Actual: 1343 tests |
| GAP-022 | Browser persistence | Says "no local persistence" | localStorage fallback exists |

### INCOMPLETE Documentation
| Gap ID | Feature | What's Missing |
|--------|---------|----------------|
| GAP-023 | Project structure | Missing turtle/, user/, canvas/ dirs |
| GAP-024 | Collaboration | Missing remote cursors, auto-reconnect, Docker |

---

## Priority Indicators

### High Priority Gaps
Features that new users would immediately encounter or need:
1. GAP-007: PNG export — users need to know how to get their work out
2. GAP-001: Shape tools — 4 drawing tools with no documentation
3. GAP-010: Color picker — basic drawing functionality undocumented
4. GAP-008: Home screen — first thing users see
5. GAP-022: Browser persistence claim — actively misleading
6. GAP-020: Keyboard shortcuts — 14+ missing from Controls table
7. GAP-021: Test count — inaccurate (316 vs 1343)

### Medium Priority Gaps
Features that regular users would use:
1. GAP-004: Turtle graphics — major feature, invisible in README
2. GAP-003: Camera bookmarks — power navigation
3. GAP-005: Settings panel — customization
4. GAP-006: Cheat sheet — built-in help
5. GAP-002: Background color — visual customization
6. GAP-011: Opacity slider — drawing control
7. GAP-012: Grid options — drawing aid
8. GAP-013: Remote cursors — collaboration UX
9. GAP-019: Fit-all view — navigation convenience
10. GAP-023: Project structure — developer onboarding

### Low Priority Gaps
Advanced features or edge cases:
1. GAP-014: Docker deployment — advanced ops
2. GAP-015: Makefile targets — developer convenience
3. GAP-016: Server REST API — API consumers
4. GAP-017: localStorage fallback — edge case persistence
5. GAP-018: User profile — collaboration config
6. GAP-009: Magnify tool — alternative zoom method
7. GAP-024: Collaboration details — supplementary info
