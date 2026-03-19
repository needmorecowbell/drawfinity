# Feature 01: Command Cheat Sheet Modal

A searchable modal that shows all available actions, keyboard shortcuts, and commands. Triggered by `Cmd+?` (or `Ctrl+?`). Functions as both a reference card and a quick command launcher.

## Design Decisions

**Searchable, not just static.** The modal has a search input at the top. Typing filters the list in real time, making it a lightweight command palette. Selecting an item executes the action and closes the modal.

**Organized by category.** Actions are grouped: Tools, Navigation, Drawing, Panels, File/Export. Each group has a header. Search queries match against action name, shortcut text, and category.

**Centralized action registry.** All actions are registered in a single `ActionRegistry` that the cheat sheet reads from. This ensures shortcuts displayed match actual behavior and makes it easy to add new actions. The toolbar and keyboard handler also read from this registry, creating a single source of truth.

**Modal overlay with backdrop.** The cheat sheet appears as a centered modal with a semi-transparent backdrop. Pressing Escape or clicking outside closes it. Same pattern as the settings panel but larger.

## Tasks

- [ ] Create the action registry:
  - Create `src/ui/ActionRegistry.ts`:
    - `Action` interface: `id: string`, `label: string`, `shortcut?: string`, `category: string`, `execute: () => void`
    - `ActionRegistry` class:
      - `register(action: Action): void`
      - `getAll(): Action[]`
      - `getByCategory(): Map<string, Action[]>`
      - `search(query: string): Action[]` — fuzzy match on label, shortcut, and category
      - `execute(id: string): void`
    - Categories: "Tools", "Navigation", "Drawing", "Panels", "File"
  - Register all existing keyboard shortcut actions:
    - Tools: Brush (B), Eraser (E), Rectangle (R), Ellipse (O), Polygon (P), Star (S)
    - Drawing: Brush preset 1-4, Brush size +/-, Undo (Ctrl+Z), Redo (Ctrl+Shift+Z)
    - Navigation: Zoom in (Ctrl+=), Zoom out (Ctrl+-), Reset zoom (Ctrl+0), Go home (Escape / Ctrl+W)
    - Panels: Connection panel (Ctrl+K), Settings (Ctrl+,), Bookmarks (Ctrl+B), Turtle (Ctrl+`), Cheat sheet (Ctrl+?)
    - File: Export (no shortcut yet)

- [ ] Build the cheat sheet modal:
  - Create `src/ui/CheatSheet.ts`:
    - Full-screen modal overlay with semi-transparent backdrop
    - Centered content container (~600px wide, max 80vh tall, scrollable)
    - Search input at the top (autofocused on open)
    - Action list grouped by category with headers
    - Each action row shows: icon/label on the left, keyboard shortcut badge on the right
    - Keyboard shortcut badges styled as `<kbd>` elements (rounded, bordered, monospace)
    - Click an action row → execute it and close the modal
    - Search filters the list in real time (hide non-matching rows, hide empty category headers)
    - Empty search state: "No matching actions"

  - Close behavior:
    - Escape key
    - Click on backdrop
    - `Ctrl+?` again (toggle)

- [ ] Style the modal:
  - Backdrop: `rgba(0, 0, 0, 0.4)`, z-index above everything
  - Content: white/off-white background, rounded corners, subtle shadow
  - Search input: full width, large font, no border (just bottom divider)
  - Category headers: uppercase, small, gray, with bottom border
  - Action rows: hover highlight, pointer cursor
  - `<kbd>` shortcut badges: light gray background, 1px border, small rounded corners, smaller font
  - Responsive: on small screens, content stretches to ~95% width

- [ ] Wire to keyboard shortcut:
  - `Ctrl+?` (which is `Ctrl+Shift+/` on most keyboards) toggles the cheat sheet
  - On macOS: `Cmd+?`
  - Add to the keydown handler in CanvasApp
  - Also add to the home screen keydown handler (so it works from the home screen too)

- [ ] Toolbar integration:
  - Add a help/question-mark button at the end of the toolbar
  - Click opens the cheat sheet
  - Tooltip: "Keyboard shortcuts (Ctrl+?)"

- [ ] Future: slash commands (foundation only):
  - The search input in the cheat sheet could also accept `/` prefixed commands in the future (e.g., `/turtle`, `/export`, `/bookmark add`), laying groundwork for a command-line interface
  - For now, just note this in the architecture — the `ActionRegistry.search()` method already supports matching by ID which could serve as command names
  - No implementation needed yet, but design the registry with this in mind

- [ ] Tests:
  - Unit tests for ActionRegistry (register, search, getByCategory, execute)
  - Unit tests for CheatSheet modal (open/close, search filtering, action execution)
  - Unit test for keyboard shortcut `Ctrl+?` triggering the modal
  - Verify all registered actions have correct labels and shortcuts
