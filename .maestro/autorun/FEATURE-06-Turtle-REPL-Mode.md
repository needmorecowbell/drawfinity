# Feature 06: Turtle REPL Mode

Add an interactive REPL (Read-Eval-Print Loop) mode to the turtle panel, allowing users to type individual Lua commands and see them execute immediately with persistent state.

## Context

Currently the turtle panel only supports batch execution: write a full script, click Run, watch it replay. This phase adds an interactive REPL mode where users can type individual Lua commands and see them execute immediately, building up state incrementally.

**Key files:**
- `src/ui/TurtlePanel.ts` — Panel UI, will need a REPL tab/mode
- `src/turtle/TurtleExecutor.ts` — Script execution engine (currently batch-only)
- `src/turtle/LuaRuntime.ts` — Lua VM wrapper, manages wasmoon engine
- `src/turtle/TurtleState.ts` — Mutable turtle state
- `src/turtle/TurtleRegistry.ts` — Turtle instance management

**Design:** Add a "REPL" tab alongside the existing script editor. The REPL maintains a persistent Lua VM instance (unlike batch mode which creates a fresh VM per run). Users type commands in a single-line input at the bottom, press Enter, and see the result + any print output in a scrolling history above. The turtle state persists between commands. A "Reset" button clears the VM and turtle state.

**Key constraint:** The existing `LuaRuntime` creates a fresh engine per `execute()` call. The REPL needs a long-lived engine where `execute()` can be called repeatedly without resetting state. This requires a new mode or a separate `ReplRuntime` class that keeps the Lua engine alive between calls.

**Run tests with:** `npx vitest run`
**Type-check with:** `npx tsc --noEmit`

---

## Tasks

- [ ] **Create `src/turtle/ReplRuntime.ts` — persistent Lua VM for REPL mode.** This class wraps `wasmoon` similarly to `LuaRuntime` but: (1) keeps the Lua engine alive between `execute()` calls (do not call `engine.global.close()` between commands), (2) `execute(line)` runs a single line/expression in the existing engine context, collecting any commands generated, (3) handles both statements (`forward(100)`) and expressions (`position()`) — try as expression first (wrap in `return ...`), fall back to statement on syntax error, (4) returns `{ commands: TurtleCommand[], output: string | null, error: string | null }` where `output` is the stringified return value (if any), (5) provides a `reset()` method that destroys and recreates the engine, (6) provides a `destroy()` method for cleanup. Re-register the same turtle API globals as `LuaRuntime` does — extract the shared registration logic into a helper function in a shared file (e.g., `src/turtle/luaApiRegistration.ts`) so both `LuaRuntime` and `ReplRuntime` use the same API surface without duplication.

- [ ] **Create `src/turtle/ReplExecutor.ts` — REPL command executor.** This class orchestrates REPL command execution: (1) holds a `ReplRuntime` instance and wires it to a `TurtleState` + `TurtleDrawing` (from TurtleRegistry's main turtle), (2) `executeCommand(line: string)` runs the line through ReplRuntime, then immediately replays any collected commands (at speed 0 / instant, since REPL should feel instant), (3) returns `{ output: string | null, error: string | null }` for display in the REPL UI, (4) `reset()` resets both the runtime and the turtle state (but does NOT clear drawn strokes — add a separate `clearDrawing()` for that), (5) integrates with TurtleAwareness to broadcast turtle position updates after each command. Write unit tests in `src/turtle/__tests__/ReplRuntime.test.ts` covering: multi-command state persistence, expression evaluation, error handling, and reset behavior.

- [ ] **Add REPL UI to TurtlePanel.** Modify `src/ui/TurtlePanel.ts` to add a REPL mode: (1) add a tab bar at the top of the panel with "Script" and "REPL" tabs, (2) "Script" tab shows the existing CodeMirror editor + console (from Phase 01), (3) "REPL" tab shows a scrolling command history (div with `.repl-history` class) and a single-line input at the bottom (`.repl-input`), (4) the history displays each command with `>>>` prefix and its output/error below (errors in red), (5) pressing Enter in the input executes via `ReplExecutor.executeCommand()` and appends to history, (6) Up/Down arrow keys cycle through command history (maintain a history array, like a shell), (7) add a "Reset" button in the REPL controls that calls `ReplExecutor.reset()` and clears the history display, (8) add a "Clear" button that clears drawn strokes from the REPL session. Tab switching should preserve state — switching to Script tab and back should keep REPL history. Persist the active tab preference to localStorage.

- [ ] **Add REPL CSS styles to `src/styles.css`.** Style the new REPL UI elements: (1) `.turtle-tabs` — horizontal tab bar matching Drawfinity's tab style (similar to home screen tabs: underline active tab in `#0066FF`), (2) `.repl-history` — scrollable area, monospace font, padding 8px, entries separated by subtle borders, (3) `.repl-prompt` — `>>>` prefix in `#0066FF`, command text in default color, (4) `.repl-output` — slightly muted color (`#444`), (5) `.repl-error` — red color (`#e53935`), (6) `.repl-input` — single-line input at bottom, monospace font, border-top separator, full width, matching editor font size. Ensure the REPL layout works within the resizable panel.

- [ ] **Run full test suite and type-check.** Run `npx vitest run` and `npx tsc --noEmit`. Fix any failures. Ensure the shared Lua API registration refactor didn't break existing batch execution — specifically verify turtle-related tests pass. If there are integration concerns, run `npm run dev` and manually verify both Script mode (existing behavior) and REPL mode work.

- [ ] **Update barrel exports.** Add `ReplRuntime` and `ReplExecutor` to `src/turtle/index.ts`. Ensure new files follow existing import patterns (import from barrels, not individual files).
