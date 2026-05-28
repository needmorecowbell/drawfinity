---
task: Dark mode playbook task
slug: 20260528-094206_dark-mode-playbook-task
effort: standard
phase: verify
progress: 10/10
mode: interactive
started: 2026-05-28T09:42:06-0700
updated: 2026-05-28T09:46:18-0700
---

## Context

The current playbook task asks for theme preference persistence, a ThemeManager, a SettingsPanel toggle, startup wiring in main.ts, and a UI barrel export. The task belongs to the dark mode feature sequence, so existing CSS variables and panel styles should be reused rather than expanded unnecessarily. The next checkbox covers full visual verification, so this run should complete only implementation and relevant automated checks for the first unchecked item.

## Criteria

- [x] ISC-1: User preferences include theme union defaulting to auto
- [x] ISC-2: UserStore exposes a getTheme method
- [x] ISC-3: UserStore exposes a setTheme method
- [x] ISC-4: ThemeManager sets html data-theme during construction
- [x] ISC-5: ThemeManager listens for system color-scheme changes
- [x] ISC-6: ThemeManager persists explicit theme changes
- [x] ISC-7: SettingsPanel displays Theme section near top
- [x] ISC-8: Theme buttons reflect current selected preference
- [x] ISC-9: Main initializes theme before UI rendering
- [x] ISC-10: UI barrel exports ThemeManager symbols

## Decisions

- Reuse existing settings control patterns and UserStore persistence.
- Keep the canvas background independent from document theme state.

## Verification

- Run targeted or full automated tests relevant to changed code.
- Run TypeScript type-check to validate exported contracts.
- `npx vitest run src/user/__tests__/UserPreferences.test.ts src/user/__tests__/UserStore.test.ts src/ui/__tests__/SettingsPanel.test.ts src/ui/__tests__/ThemeManager.test.ts` passed.
- `npx tsc --noEmit` passed.
- `npx vitest run` passed with the existing jsdom canvas warning.
