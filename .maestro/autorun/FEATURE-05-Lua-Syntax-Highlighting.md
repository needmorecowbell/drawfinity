# Feature 05: Lua Syntax Highlighting & Autosuggestions for Turtle Panel

Replace the plain `<textarea>` in the turtle panel with a CodeMirror 6 editor providing Lua syntax highlighting, bracket matching, and autosuggestions for the turtle API.

## Context

The turtle panel (`src/ui/TurtlePanel.ts`) currently uses a plain `<textarea>` for Lua script editing. This phase replaces it with a rich code editor that provides Lua syntax highlighting, bracket matching, and autosuggestions for the turtle API.

**Key files:**
- `src/ui/TurtlePanel.ts` — Turtle panel UI, contains the textarea editor
- `src/turtle/LuaRuntime.ts` — Defines all Lua API functions registered as globals
- `src/styles.css` — All application CSS

**Design decision:** Use **CodeMirror 6** (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-lua` if available, or a custom Lua grammar via `@lezer/generator`). CodeMirror 6 is lightweight, tree-shakeable, and has first-class support for custom completions. If `@codemirror/lang-lua` does not exist as a published package, use `codemirror-lang-lua` (community package) or build a minimal Lua highlighter with `@lezer/highlight` and `@codemirror/language`.

**Completion source:** The turtle API surface is well-defined in `LuaRuntime.ts`. Extract the full list of global functions (forward, backward, right, left, pencolor, penwidth, spawn, etc.) along with brief doc strings for each. Also include Lua keywords and standard library names (math.sin, string.format, etc.).

**Run tests with:** `npx vitest run`
**Type-check with:** `npx tsc --noEmit`

---

## Tasks

- [ ] **Install CodeMirror 6 dependencies.** Run `npm install @codemirror/view @codemirror/state @codemirror/language @codemirror/autocomplete @codemirror/commands @codemirror/search @codemirror/lint codemirror`. Also investigate Lua language support — check if `codemirror-lang-lua` or `@codemirror/lang-lua` exists on npm. If a Lua package exists, install it. If not, install `@lezer/highlight` for building a minimal Lua tokenizer. Document your findings in a comment at the top of the new file you create.

- [ ] **Create `src/ui/turtle-editor/TurtleCompletions.ts` — autocompletion source for turtle API.** Read `src/turtle/LuaRuntime.ts` to extract every global function registered on the Lua VM. Create a `CompletionSource` (CodeMirror autocomplete type) that provides completions for: (1) all turtle API functions with their signatures and one-line descriptions, (2) Lua keywords (`local`, `function`, `if`, `then`, `else`, `elseif`, `end`, `for`, `while`, `do`, `repeat`, `until`, `return`, `break`, `not`, `and`, `or`, `in`, `nil`, `true`, `false`), (3) Lua standard math functions (`math.sin`, `math.cos`, `math.pi`, `math.random`, `math.floor`, `math.ceil`, `math.abs`, `math.sqrt`), and (4) string functions (`string.format`, `string.sub`, `string.len`, `string.rep`). Each completion should have a `label`, `type` (function/keyword/constant), and `detail` (brief description). Export this as a function that returns a CodeMirror `Extension`.

- [ ] **Create `src/ui/turtle-editor/TurtleEditor.ts` — CodeMirror wrapper component.** This class should: (1) create a CodeMirror `EditorView` with Lua syntax highlighting (from the language package installed in task 1, or a minimal StreamLanguage-based Lua mode if no package exists), (2) wire in the `TurtleCompletions` extension, (3) support a `getValue()` / `setValue(code)` API, (4) emit an `onChange` callback when content changes, (5) use a theme that matches the current Drawfinity aesthetic (light background, monospace font matching the existing textarea style from `src/styles.css`), (6) support `Ctrl+Enter` to trigger a `onRun` callback (matching existing behavior), (7) handle Tab key for 2-space indentation (matching existing textarea behavior). Also create `src/ui/turtle-editor/index.ts` barrel export for TurtleEditor and TurtleCompletions.

- [ ] **Integrate TurtleEditor into TurtlePanel.** Modify `src/ui/TurtlePanel.ts` to: (1) replace the `<textarea>` with the new `TurtleEditor` component, (2) wire `onChange` to update localStorage auto-save (preserving existing `drawfinity:turtle-script:{drawingId}` key), (3) wire `onRun` to the existing run handler, (4) update `getScript()` and `setScript()` to use the new editor API, (5) ensure the editor resizes properly when the panel is resized (call `EditorView.requestMeasure()` on panel resize). Remove the old textarea creation code and any textarea-specific CSS if it is no longer needed. Ensure all existing TurtlePanel tests still pass — run `npx vitest run src/ui/__tests__/TurtlePanel` and fix any failures.

- [ ] **Add CSS for the CodeMirror editor inside the turtle panel.** In `src/styles.css`, add styles for `.turtle-editor .cm-editor` to: (1) fill the available left-panel space (flex: 1, min-height: 0, overflow: auto), (2) match the existing font (monospace, 13px from the textarea styles), (3) set appropriate line-height and padding, (4) style the autocomplete dropdown to match Drawfinity's design language (white background, subtle border, `#0066FF` highlight for selected item), (5) ensure the editor looks correct in the resizable panel. Remove or update any now-unused `.turtle-code` textarea styles. Verify visually by running `npm run dev` and opening the turtle panel with `Ctrl+backtick`.

- [ ] **Run the full test suite (`npx vitest run`) and fix any failures.** Also run `npx tsc --noEmit` to ensure no type errors were introduced. Fix any unused imports, type mismatches, or test failures caused by the textarea-to-CodeMirror migration. If TurtlePanel tests mock or reference the textarea element, update them to work with the new CodeMirror EditorView.
