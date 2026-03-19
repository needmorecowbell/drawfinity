# Feature 04: Camera Bookmarks

Allow users to bookmark camera positions (pan + zoom) for quick navigation. Bookmarks have labels and navigating between them is animated. In shared rooms, bookmarks are visible to all participants.

## Design Decisions

**Shared by default.** Bookmarks are stored in the Yjs document (same `"meta"` map or a dedicated `Y.Array`) so they sync in collaborative sessions. In single-player mode they persist with the drawing. Private bookmarks for shared rooms are out of scope for now but the data model should not preclude them.

**Stored as labeled coordinate positions.** Each bookmark has: `id`, `label`, `x` (world), `y` (world), `zoom`, `createdBy` (user ID), `createdAt` (timestamp). The `createdBy` field enables future per-user filtering.

**Sidebar UI.** A collapsible sidebar panel on the right edge shows the bookmark list. Each entry shows the label and a click-to-navigate action. The sidebar can be toggled via a toolbar button.

**Animated navigation.** Navigating to a bookmark uses the existing `CameraAnimator` to smoothly pan and zoom to the target position. The animation uses the same log-space zoom interpolation already implemented for keyboard zoom.

## Tasks

- [x] Define bookmark data model:
  - `CameraBookmark` interface: `id: string`, `label: string`, `x: number`, `y: number`, `zoom: number`, `createdBy: string`, `createdAt: number`
  - Store as a `Y.Array<Y.Map<unknown>>` named `"bookmarks"` on the Y.Doc
  - Add to `DrawfinityDoc`: `addBookmark(bookmark)`, `removeBookmark(id)`, `getBookmarks()`, `updateBookmark(id, partial)`, `onBookmarksChanged(callback)`

- [x] Bookmark sidebar UI:
  - Create `src/ui/BookmarkPanel.ts`:
    - Collapsible sidebar panel (slides in from right edge, ~250px wide)
    - Header: "Bookmarks" title + "Add Bookmark" button (captures current camera position)
    - Bookmark list: each item shows label, creator name (if collaborative), and action buttons
    - Click a bookmark label → animate camera to that position
    - Edit button (pencil icon) → inline edit the label
    - Delete button (trash icon) → remove bookmark with confirmation
    - Empty state: "No bookmarks yet — click + to save your current view"
    - Drag-to-reorder would be nice but is not required initially
  - Style consistently with the existing toolbar/panel aesthetic

- [x] Toolbar integration:
  - Add a bookmark icon button to the toolbar (e.g., a flag or pin icon)
  - Click toggles the bookmark sidebar
  - Keyboard shortcut: `Ctrl+B` to toggle the panel
  - Quick-add shortcut: `Ctrl+D` to bookmark the current camera position (prompts for label via a small inline input or uses a default name like "Bookmark 1")

- [x] Animated camera navigation:
  - Add `CameraAnimator.animateTo(x, y, zoom, durationMs?)` method
  - Use existing log-space zoom interpolation for the zoom axis
  - Linear interpolation for pan (x, y)
  - Default duration: 500ms, eased with an ease-in-out curve
  - Ensure the animation is interruptible (user can pan/zoom during animation to cancel it)

- [x] Collaboration sync:
  - Bookmarks auto-sync via Yjs (Y.Array on the shared doc) — already working via shared Y.Doc
  - When a remote user adds/removes a bookmark, the sidebar updates in real time — handled by `onBookmarksChanged` observer
  - Show creator name on each bookmark in collaborative mode (from `createdBy` → awareness or stored name) — added `createdByName` to model, `resolveUserName`/`isCollaborating` callbacks, creator name display in sidebar

- [x] "Add Bookmark" flow:
  - Capture current `camera.x`, `camera.y`, `camera.zoom`
  - Show a small popover or inline input for the label (pre-filled with "Bookmark N" where N increments) — implemented as inline input at top of bookmark list with `.bm-adding` styling
  - On confirm, add to the Yjs bookmarks array — Enter key or blur confirms; Escape cancels without creating
  - The new bookmark appears in the sidebar immediately — onBookmarksChanged triggers re-render
  - When `addBookmark(label)` is called with an explicit label, creates immediately without input (used by programmatic callers)

- [x] Tests:
  - Unit tests for bookmark CRDT operations (add, remove, update, list) — `DrawfinityDocBookmarks.test.ts` (19 tests) + `BookmarkAdapter.test.ts` (4 tests)
  - Unit tests for BookmarkPanel rendering (list items, empty state, add/delete actions) — `BookmarkPanel.test.ts` (30 tests) + `BookmarkToolbarIntegration.test.ts` (12 tests)
  - Unit test for `CameraAnimator.animateTo()` (position interpolation over time) — `CameraAnimator.test.ts` animateTo section (8 tests covering interpolation, ease-in-out timing, interruptibility, zoom clamping, default duration)
  - Integration test: add bookmark on one client, verify it appears on another — `DrawfinityDocBookmarks.test.ts` collaboration sync section (3 tests: state sync, remote observer firing, real-time bidirectional sync)
