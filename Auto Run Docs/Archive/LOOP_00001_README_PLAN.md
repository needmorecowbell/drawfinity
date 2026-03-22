---
type: report
title: README Documentation Fix Plan - Loop 00001
created: 2026-03-21
tags:
  - readme-accuracy
  - documentation
  - prioritization
related:
  - '[[LOOP_00001_GAPS]]'
  - '[[3_EVALUATE]]'
---

# README Documentation Fix Plan - Loop 00001

## Summary
- **Total Gaps:** 24
- **Auto-Fix (PENDING):** 16
- **Needs Review:** 1
- **Won't Do:** 7

## Current README Accuracy: ~35%
## Target README Accuracy: 90%

> **Note:** The README documents only basic brush/eraser tools, omitting shape tools,
> turtle graphics, bookmarks, settings, export, home screen, and 14+ keyboard shortcuts.
> Fixing the 16 PENDING items will bring coverage to approximately 90%.

---

## PENDING - Ready for Auto-Fix

### DOC-001: Browser Persistence Claim
- **Status:** `PENDING`
- **Gap ID:** GAP-022
- **Type:** INACCURATE
- **User Importance:** CRITICAL
- **Fix Effort:** EASY
- **README Section:** Getting Started → "Browser only" line
- **Fix Description:**
  Change "(no local persistence)" to indicate localStorage fallback exists.
- **Proposed Content:**
  ```markdown
  **Browser only (drawings saved to localStorage):**
  ```

### DOC-002: Shape Tools
- **Status:** `PENDING`
- **Gap ID:** GAP-001
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add shape tools to the features list.
- **Proposed Content:**
  ```markdown
  - **Shape tools** — rectangle, ellipse, polygon, and star with constraint modifiers (Shift for regular, Alt for center-out)
  ```

### DOC-003: Color Picker
- **Status:** `PENDING`
- **Gap ID:** GAP-010
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add color picker mention to features.
- **Proposed Content:**
  ```markdown
  - **Color picker** — 12 preset colors plus custom hex input
  ```

### DOC-004: PNG Export
- **Status:** `PENDING`
- **Gap ID:** GAP-007
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add export capability to features.
- **Proposed Content:**
  ```markdown
  - **PNG export** — export drawings with configurable resolution, scope (viewport or fit-all), and background options (`Ctrl+Shift+E`)
  ```

### DOC-005: Home Screen
- **Status:** `PENDING`
- **Gap ID:** GAP-008
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add home screen/drawing management to features.
- **Proposed Content:**
  ```markdown
  - **Home screen** — manage multiple drawings with search, sort, create, rename, duplicate, and delete
  ```

### DOC-006: Keyboard Shortcuts
- **Status:** `PENDING`
- **Gap ID:** GAP-020
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** MEDIUM
- **README Section:** Controls table
- **Fix Description:**
  Add all missing keyboard shortcuts to the controls table. Add shortcuts for shape tools (R, O, P, S), pan tool (G), magnify (Z), bookmarks (Ctrl+B, Ctrl+D), settings (Ctrl+,), turtle (Ctrl+\`), cheat sheet (Ctrl+?), export (Ctrl+Shift+E), home (Ctrl+W, Escape), grid toggle (Ctrl+').

### DOC-007: Turtle Graphics Mode
- **Status:** `PENDING`
- **Gap ID:** GAP-004
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** MEDIUM
- **README Section:** Features (new subsection)
- **Fix Description:**
  Add turtle graphics as a feature with brief description.
- **Proposed Content:**
  ```markdown
  - **Turtle graphics** — programmatic drawing via Lua scripting with built-in examples and a dedicated panel (`Ctrl+\``)
  ```

### DOC-008: Camera Bookmarks
- **Status:** `PENDING`
- **Gap ID:** GAP-003
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add bookmarks to features.
- **Proposed Content:**
  ```markdown
  - **Camera bookmarks** — save and restore camera positions for quick navigation (`Ctrl+B` to manage, `Ctrl+D` to quick-add)
  ```

### DOC-009: Settings Panel
- **Status:** `PENDING`
- **Gap ID:** GAP-005
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add settings panel to features.
- **Proposed Content:**
  ```markdown
  - **Settings panel** — configure default brush, color, grid style, server URL, and user profile (`Ctrl+,`)
  ```

### DOC-010: Cheat Sheet
- **Status:** `PENDING`
- **Gap ID:** GAP-006
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add cheat sheet to features.
- **Proposed Content:**
  ```markdown
  - **Keyboard cheat sheet** — searchable in-app shortcut reference (`Ctrl+?`)
  ```

### DOC-011: Test Count
- **Status:** `PENDING`
- **Gap ID:** GAP-021
- **Type:** INACCURATE
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Development section
- **Fix Description:**
  Update test count from 316 to current count.

### DOC-012: Background Color
- **Status:** `PENDING`
- **Gap ID:** GAP-002
- **Type:** MISSING
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add background color picker to features.
- **Proposed Content:**
  ```markdown
  - **Canvas background** — 16 preset background colors or custom color picker
  ```

### DOC-013: Opacity Slider
- **Status:** `PENDING`
- **Gap ID:** GAP-011
- **Type:** MISSING
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Mention opacity control with the brush features.

### DOC-014: Grid Options
- **Status:** `PENDING`
- **Gap ID:** GAP-012
- **Type:** MISSING
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Features
- **Fix Description:**
  Add grid options to features.
- **Proposed Content:**
  ```markdown
  - **Grid overlays** — dot grid and line grid styles, toggled with `Ctrl+'`
  ```

### DOC-015: Project Structure
- **Status:** `PENDING`
- **Gap ID:** GAP-023
- **Type:** INCOMPLETE
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Project structure tree
- **Fix Description:**
  Add missing `turtle/`, `user/`, and `canvas/` directories to the source tree.

### DOC-016: Docker Deployment
- **Status:** `PENDING`
- **Gap ID:** GAP-014
- **Type:** MISSING
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Collaboration server section
- **Fix Description:**
  Add Docker deployment instructions.
- **Proposed Content:**
  ```markdown
  **Docker deployment:**
  ```bash
  docker-compose up -d
  ```
  ```

---

## PENDING - NEEDS REVIEW

### DOC-017: Server REST API
- **Status:** `PENDING - NEEDS REVIEW`
- **Gap ID:** GAP-016
- **Type:** MISSING
- **User Importance:** MEDIUM
- **Fix Effort:** MEDIUM
- **Questions:**
  - What REST endpoints are stable enough to document publicly?
  - Is the API intended for external consumers or internal use only?

---

## WON'T DO

### DOC-018: Magnify Tool
- **Status:** `WON'T DO`
- **Gap ID:** GAP-009
- **Reason:** LOW importance — alternative zoom methods (scroll, trackpad, Ctrl+=/-, Space+drag) already documented. Magnify tool is niche. Will be discoverable via cheat sheet (DOC-010).

### DOC-019: Remote Cursors
- **Status:** `WON'T DO`
- **Gap ID:** GAP-013
- **Reason:** LOW importance — implementation detail of collaboration. Users discover this naturally when connecting. No configuration needed.

### DOC-020: Makefile Targets
- **Status:** `WON'T DO`
- **Gap ID:** GAP-015
- **Reason:** LOW importance, developer convenience only. `npm run` commands already documented. Makefile targets are thin wrappers.

### DOC-021: localStorage Fallback
- **Status:** `WON'T DO`
- **Gap ID:** GAP-017
- **Reason:** Already covered by DOC-001 (fixing the browser persistence claim). No separate section needed.

### DOC-022: User Profile
- **Status:** `WON'T DO`
- **Gap ID:** GAP-018
- **Reason:** LOW importance — discoverable via Settings panel (DOC-009). Collaboration-specific config detail.

### DOC-023: Fit-All View
- **Status:** `WON'T DO`
- **Gap ID:** GAP-019
- **Reason:** LOW importance — toolbar button is self-explanatory. Discoverable via cheat sheet.

### DOC-024: Collaboration Section Expansion
- **Status:** `WON'T DO`
- **Gap ID:** GAP-024
- **Reason:** LOW importance — auto-reconnect, remote cursors, and shared rooms browser are implementation details. Docker deployment handled by DOC-016. Core collaboration workflow already documented.

---

## Fix Order

Recommended sequence based on importance and dependencies:

1. **DOC-001** - Browser persistence claim (CRITICAL, actively misleading)
2. **DOC-011** - Test count (HIGH, factual error, trivial fix)
3. **DOC-002** - Shape tools (HIGH, 4 undocumented tools)
4. **DOC-003** - Color picker (HIGH, basic drawing feature)
5. **DOC-004** - PNG export (HIGH, users need to export work)
6. **DOC-005** - Home screen (HIGH, first thing users see)
7. **DOC-007** - Turtle graphics (HIGH, flagship feature)
8. **DOC-008** - Camera bookmarks (HIGH, power feature)
9. **DOC-009** - Settings panel (HIGH, customization)
10. **DOC-010** - Cheat sheet (HIGH, discoverability)
11. **DOC-006** - Keyboard shortcuts table (HIGH, many missing)
12. **DOC-012** - Background color (MEDIUM)
13. **DOC-013** - Opacity slider (MEDIUM)
14. **DOC-014** - Grid options (MEDIUM)
15. **DOC-015** - Project structure tree (MEDIUM)
16. **DOC-016** - Docker deployment (MEDIUM)

## README Section Updates Needed

| Section | Gaps to Fix | Action Needed |
|---------|-------------|---------------|
| Features | DOC-002 through DOC-010, DOC-012, DOC-013, DOC-014 | Add 12 new feature bullet points |
| Getting Started | DOC-001 | Fix browser persistence claim |
| Controls | DOC-006 | Add 14+ missing keyboard shortcuts |
| Development | DOC-011 | Update test count |
| Project Structure | DOC-015 | Add 3 missing directories |
| Collaboration | DOC-016 | Add Docker deployment option |
