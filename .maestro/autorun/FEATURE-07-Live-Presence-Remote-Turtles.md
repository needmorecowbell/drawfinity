# Feature 07: Enhanced Live Presence & Remote Turtle Visualization

Strengthen collaboration presence with tool indicators, activity badges, typing indicators, and animated remote turtle trails that let you watch collaborators' scripts execute in real-time.

## Context

Drawfinity already has basic collaboration infrastructure: Yjs CRDT sync for strokes, awareness protocol for cursor positions (`src/ui/RemoteCursors.ts`), and turtle state broadcasting (`src/turtle/TurtleAwareness.ts` + `src/turtle/RemoteTurtleRenderer.ts`). This phase strengthens presence by adding:

1. **Active tool & activity indicators** — see what tool each user is using and whether they're actively drawing
2. **Typing indicators** — see when a collaborator is writing in the turtle panel
3. **Remote turtle script execution visualization** — watch other users' turtle scripts run in real-time with animated turtle indicators that trace their paths

**Key files:**
- `src/sync/SyncManager.ts` — Awareness protocol, user state broadcasting
- `src/ui/RemoteCursors.ts` — Remote cursor DOM overlays (SVG arrows + labels)
- `src/turtle/TurtleAwareness.ts` — Broadcasts turtle states via awareness
- `src/turtle/RemoteTurtleRenderer.ts` — Renders remote turtle SVG indicators
- `src/turtle/TurtleExecutor.ts` — Script execution, replay commands
- `src/ui/Toolbar.ts` — Tool selection UI
- `src/canvas/CanvasApp.ts` — Main app, wires all subsystems

**Awareness state structure (current):**
```ts
{ user: { id, name, color, cursor: { x, y } }, turtles: TurtleSnapshot[] }
```

**Run tests with:** `npx vitest run`
**Type-check with:** `npx tsc --noEmit`

---

## Tasks

- [x] **Extend awareness state with tool & activity info.** Modify `src/sync/SyncManager.ts` to include additional fields in the awareness state: (1) `activeTool: string` — current tool name (brush, eraser, rectangle, etc.), (2) `isDrawing: boolean` — whether the user is currently in an active stroke, (3) `isTurtleRunning: boolean` — whether a turtle script is executing, (4) `isTurtleTyping: boolean` — whether the user is typing in the turtle panel. Add methods: `updateActiveTool(tool: string)`, `updateDrawingState(isDrawing: boolean)`, `updateTurtleActivity(running: boolean, typing: boolean)`. Update the `RemoteUser` type (or create one if it doesn't exist) to include these fields. Ensure backward compatibility — remote clients running older versions without these fields should not crash (default to undefined/false).
  - Completed in `src/sync/SyncManager.ts`: local awareness now preserves cursor/tool/activity fields through a shared update path, exposes the requested update methods, and defaults missing remote presence booleans to `false` while leaving absent tools `undefined`.
  - Added/updated tests in `src/sync/__tests__/SyncManager.test.ts`, `src/ui/__tests__/RemoteCursors.test.ts`, and `src/ui/__tests__/ConnectionPanel.test.ts`.
  - Verified with `npx vitest run src/sync/__tests__/SyncManager.test.ts`, `npx tsc --noEmit`, and `npx vitest run`.

- [x] **Broadcast tool and drawing state from CanvasApp.** Modify `src/canvas/CanvasApp.ts` to: (1) call `syncManager.updateActiveTool()` whenever the tool changes (hook into ToolManager's tool change event or callback), (2) call `syncManager.updateDrawingState(true)` when a stroke begins (pointerdown in drawing mode) and `false` when it ends (pointerup / stroke complete), (3) call `syncManager.updateTurtleActivity(running, false)` when turtle execution starts/stops. Modify `src/ui/TurtlePanel.ts` to call `syncManager.updateTurtleActivity(false, true)` on editor input events (debounced to avoid spam — 500ms debounce, set typing=false after 2s of inactivity).
  - Completed in `src/canvas/CanvasApp.ts`: tool changes now broadcast through SyncManager from toolbar, shortcut, and brush-selection paths; brush, eraser, and shape capture lifecycles now drive drawing-state presence; turtle execution start/stop broadcasts running activity.
  - Completed in `src/ui/TurtlePanel.ts`: script editor input now emits debounced typing activity after 500ms and clears it after 2s of inactivity, with cleanup on destroy.
  - Added focused tests in `src/input/__tests__/StrokeCapture.test.ts`, `src/input/__tests__/ShapeCapture.test.ts`, and `src/ui/__tests__/TurtlePanel.test.ts`.
  - Verified with `npx vitest run src/ui/__tests__/TurtlePanel.test.ts src/input/__tests__/StrokeCapture.test.ts src/input/__tests__/ShapeCapture.test.ts src/canvas/__tests__/CanvasApp.test.ts`, `npx tsc --noEmit`, and `npx vitest run`.

- [x] **Enhance RemoteCursors to show tool & activity badges.** Modify `src/ui/RemoteCursors.ts` to: (1) display a small tool icon or label next to each remote cursor (e.g., a tiny brush/eraser/shape icon or just the tool name as text), (2) show a pulsing dot animation when `isDrawing` is true (the user is actively drawing), (3) show a small turtle icon when `isTurtleRunning` is true, (4) show a typing indicator (three animated dots) when `isTurtleTyping` is true. Keep the visual design minimal — these are small indicators near the existing cursor arrow. Use CSS animations for the pulse and typing dots.
  - Completed in `src/ui/RemoteCursors.ts`: remote cursor entries now render an optional active-tool label, pulsing drawing activity dot, SVG turtle-running badge, and three-dot turtle typing indicator from awareness state.
  - Added CSS animations and compact indicator styling in `src/styles.css`.
  - Added focused coverage in `src/ui/__tests__/RemoteCursors.test.ts` for tool labels, drawing pulse state, turtle-running badges, typing dots, and older-client fallback behavior.
  - Verified with `npx vitest run src/ui/__tests__/RemoteCursors.test.ts` and `npx tsc --noEmit`.

- [x] **Add CSS for presence indicators.** Add styles to `src/styles.css`: (1) `.remote-cursor-tool` — small label/icon below the cursor name, font-size 10px, muted color, (2) `.remote-cursor-drawing` — pulsing animation (scale 1.0 to 1.3, 600ms ease-in-out infinite) on the cursor arrow when actively drawing, (3) `.remote-cursor-turtle` — small turtle emoji or SVG icon indicator, (4) `.remote-cursor-typing` — three small dots with staggered bounce animation (like a chat typing indicator), opacity 0.7. All indicators should inherit the user's color.
  - Completed in `src/styles.css`: presence indicator selectors now cover the 10px tool label, 600ms drawing pulse, color-inheriting turtle SVG badge, and 0.7-opacity three-dot typing animation with staggered bounce timing.

- [x] **Enhance remote turtle visualization.** Modify `src/turtle/RemoteTurtleRenderer.ts` to improve how remote turtles are displayed: (1) add a trail effect — render a short fading polyline behind each remote turtle showing its recent path (store last 20 positions, draw with decreasing opacity), (2) show the remote user's name next to their turtle (not just a generic indicator), (3) animate the turtle indicator rotation smoothly (interpolate heading changes over 100ms instead of snapping), (4) add a subtle glow/shadow effect using the user's color to make remote turtles visually distinct from local ones. Update the CSS in `src/styles.css` for any new DOM elements.
  - Completed in `src/turtle/RemoteTurtleRenderer.ts`: remote turtles now keep the last 20 world-space positions, render fading dotted SVG trail segments, preserve user labels while rotating only the turtle glyph, and use the remote user's color for indicator/trail styling.
  - Added trail layer, glow styling, label text-shadow, and 100ms glyph rotation transitions in `src/styles.css`.
  - Updated `src/turtle/__tests__/RemoteTurtleRenderer.test.ts` to cover split translate/rotate transforms, trail rendering, trail trimming, camera redraw, and trail cleanup.
  - Verified with `npx vitest run src/turtle/__tests__/RemoteTurtleRenderer.test.ts`, `npx tsc --noEmit`, and `npx vitest run`.

- [x] **Add trail rendering for remote turtles.** In `RemoteTurtleRenderer.ts`, implement the trail system: (1) maintain a `Map<string, {x: number, y: number}[]>` of recent positions per remote turtle (keyed by `${clientId}:${turtleId}`), (2) on each awareness update, push the new position and trim to last 20 entries, (3) render the trail as an SVG `<polyline>` with `stroke-dasharray` for a dotted effect, using the user's color at 30% opacity, (4) fade out older segments by varying opacity along the trail, (5) clear trails when a remote turtle disappears. This gives observers a sense of what the remote turtle is doing without needing to see the full script.
  - Verified existing implementation in `src/turtle/RemoteTurtleRenderer.ts`: trails are keyed by `${clientId}:${turtleId}`, deduplicate unchanged points, trim to the last 20 positions, render dotted SVG polyline segments with newest segments reaching 30% opacity, redraw on camera changes, and clear stale trails when turtles disappear.
  - Existing focused coverage in `src/turtle/__tests__/RemoteTurtleRenderer.test.ts` checks dotted trail rendering, 20-position trimming, camera redraw, and cleanup.

- [x] **Run full test suite and type-check.** Run `npx vitest run` and `npx tsc --noEmit`. Fix any failures. Pay special attention to tests that mock SyncManager or awareness state — update them to handle the new fields.
  - Verified with `npx vitest run`: 108 test files passed, 2,297 tests passed.
  - Verified with `npx tsc --noEmit`: completed without TypeScript errors.
