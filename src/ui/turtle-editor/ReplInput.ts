/**
 * CodeMirror 6 REPL input with turtle autocompletion and block-aware
 * multiline editing.
 *
 * Behaves like Python's interactive shell:
 * - Single-line expressions execute on Enter
 * - Incomplete blocks (for/if/function/repeat) continue on the next line
 * - Pasted multiline code is kept intact (not collapsed)
 * - Shift+Enter always inserts a newline
 * - Enter on a blank line inside a block force-executes
 * - ArrowUp/Down navigate command history when on a single line
 */

import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Prec, Compartment } from "@codemirror/state";
import {
  StreamLanguage,
  syntaxHighlighting,
  HighlightStyle,
} from "@codemirror/language";
import { defaultKeymap, insertNewlineAndIndent } from "@codemirror/commands";
import { closeBrackets, completionStatus } from "@codemirror/autocomplete";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import { turtleAutocompletion } from "./TurtleCompletions";

export interface ReplInputOptions {
  parent: HTMLElement;
  onSubmit: (line: string) => void;
  onHistoryBack?: () => string | null;
  onHistoryForward?: () => string | null;
}

// ── Lua block-depth analysis ───────────────────────────────────────────

/**
 * Block-opening keywords that require a matching `end`.
 * Note: `do` is intentionally excluded — in `for...do` / `while...do`
 * it is part of the loop syntax, not a separate block. Standalone
 * `do...end` blocks are rare enough in REPL usage to ignore.
 */
const BLOCK_OPENERS = /\b(function|if|for|while)\b/g;
/** `repeat` opens a block closed by `until`, not `end`. */
const REPEAT_OPENER = /\brepeat\b/g;
/** Block closers. */
const END_CLOSER = /\bend\b/g;
const UNTIL_CLOSER = /\buntil\b/g;

/**
 * Strip strings and comments from Lua source so keyword counting
 * is not confused by keywords inside literals.
 *
 * Handles: `--[=*[ ]=*]` block comments (all levels), `-- ...` line comments,
 * `[=*[ ]=*]` long strings (all levels), `"..."` and `'...'` short strings.
 */
function stripLuaLiterals(code: string): string {
  // Match block comments/long strings with balanced level-N delimiters,
  // line comments, and short strings. The level-N matching uses a
  // backreference to ensure the closing delimiter has the same number
  // of `=` signs as the opening one.
  return code.replace(
    /--\[(=*)\[[\s\S]*?]\1]|--[^\n]*|\[(=*)\[[\s\S]*?]\2]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
    "",
  );
}

function countMatches(text: string, re: RegExp): number {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text)) n++;
  return n;
}

/**
 * Compute how many unclosed blocks remain in `code`.
 * Returns > 0 when the code is incomplete (needs more `end`/`until`).
 */
export function luaBlockDepth(code: string): number {
  const stripped = stripLuaLiterals(code);
  const openers = countMatches(stripped, BLOCK_OPENERS);
  const repeats = countMatches(stripped, REPEAT_OPENER);
  const ends = countMatches(stripped, END_CLOSER);
  const untils = countMatches(stripped, UNTIL_CLOSER);
  return Math.max(0, (openers - ends) + (repeats - untils));
}

// ── Highlight + theme ──────────────────────────────────────────────────

/** Highlighting palette follows CSS theme variables shared with TurtleEditor. */
const replHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--turtle-syntax-keyword)" },
  { tag: tags.controlKeyword, color: "var(--turtle-syntax-keyword)" },
  { tag: tags.operatorKeyword, color: "var(--turtle-syntax-keyword)" },
  { tag: tags.definitionKeyword, color: "var(--turtle-syntax-keyword)" },
  { tag: tags.comment, color: "var(--turtle-syntax-comment)", fontStyle: "italic" },
  { tag: tags.string, color: "var(--turtle-syntax-string)" },
  { tag: tags.number, color: "var(--turtle-syntax-number)" },
  { tag: tags.bool, color: "var(--turtle-syntax-number)" },
  { tag: tags.null, color: "var(--turtle-syntax-number)" },
  { tag: tags.function(tags.variableName), color: "var(--turtle-syntax-function)" },
  { tag: tags.variableName, color: "var(--turtle-text)" },
  { tag: tags.operator, color: "var(--turtle-syntax-operator)" },
  { tag: tags.punctuation, color: "var(--turtle-syntax-punctuation)" },
  { tag: tags.paren, color: "var(--turtle-syntax-punctuation)" },
  { tag: tags.brace, color: "var(--turtle-syntax-punctuation)" },
  { tag: tags.squareBracket, color: "var(--turtle-syntax-punctuation)" },
  { tag: tags.self, color: "var(--turtle-danger)" },
  { tag: tags.atom, color: "var(--turtle-syntax-number)" },
]);

/** Theme: starts as single-line, grows up to a max height for multiline. */
const replInputTheme = EditorView.theme({
  "&": {
    flex: "1",
    backgroundColor: "transparent",
    color: "var(--turtle-text)",
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "13px",
    lineHeight: "1.5",
    maxHeight: "8em",
  },
  ".cm-content": {
    padding: "0",
    caretColor: "var(--turtle-accent)",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--turtle-accent)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--turtle-selection) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--turtle-selection) !important",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
});

// ── ReplInput class ────────────────────────────────────────────────────

export class ReplInput {
  private view: EditorView;
  private disabled = false;
  private editableCompartment = new Compartment();
  private promptEl: HTMLElement | null;

  constructor(options: ReplInputOptions) {
    // Keep a reference to the prompt label so we can toggle >>> / ...
    this.promptEl = options.parent.querySelector(".repl-prompt");

    const replKeymap = Prec.highest(keymap.of([
      {
        key: "Shift-Enter",
        run: (view) => {
          if (this.disabled) return true;
          insertNewlineAndIndent(view);
          this.updatePrompt(view);
          return true;
        },
      },
      {
        key: "Enter",
        run: (view) => {
          if (this.disabled) return true;
          if (completionStatus(view.state) === "active") return false;

          const code = view.state.doc.toString();
          const trimmed = code.trim();

          // Empty single-line: do nothing
          if (!trimmed) {
            // But if we're in a multiline block, force-execute
            if (view.state.doc.lines > 1) {
              this.submit(code, options.onSubmit);
              return true;
            }
            return true;
          }

          // Check block completeness
          const depth = luaBlockDepth(trimmed);
          if (depth > 0) {
            // Incomplete block — insert newline to continue
            insertNewlineAndIndent(view);
            this.updatePrompt(view);
            return true;
          }

          // Complete — execute
          this.submit(code, options.onSubmit);
          return true;
        },
      },
      {
        key: "ArrowUp",
        run: (view) => {
          if (completionStatus(view.state) === "active") return false;
          // Only navigate history when on first line
          if (view.state.doc.lines > 1) {
            const cursor = view.state.selection.main.head;
            const line = view.state.doc.lineAt(cursor);
            if (line.number > 1) return false;
          }
          if (!options.onHistoryBack) return false;
          const val = options.onHistoryBack();
          if (val === null) return true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: val },
            selection: { anchor: val.length },
          });
          this.updatePrompt(view);
          return true;
        },
      },
      {
        key: "ArrowDown",
        run: (view) => {
          if (completionStatus(view.state) === "active") return false;
          // Only navigate history when on last line
          if (view.state.doc.lines > 1) {
            const cursor = view.state.selection.main.head;
            const line = view.state.doc.lineAt(cursor);
            if (line.number < view.state.doc.lines) return false;
          }
          if (!options.onHistoryForward) return false;
          const val = options.onHistoryForward();
          if (val === null) return true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: val },
            selection: { anchor: val.length },
          });
          this.updatePrompt(view);
          return true;
        },
      },
    ]));

    const extensions: Extension[] = [
      replKeymap,
      keymap.of(defaultKeymap),
      StreamLanguage.define(lua),
      syntaxHighlighting(replHighlightStyle),
      closeBrackets(),
      turtleAutocompletion(),
      replInputTheme,
      this.editableCompartment.of(EditorView.editable.of(true)),
      EditorView.contentAttributes.of({ "aria-label": "REPL input" }),
    ];

    this.view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions,
      }),
      parent: options.parent,
    });
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  setValue(text: string): void {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: text },
      selection: { anchor: text.length },
    });
    this.updatePrompt(this.view);
  }

  focus(): void {
    this.view.focus();
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    this.view.dispatch({
      effects: this.editableCompartment.reconfigure(
        EditorView.editable.of(!disabled),
      ),
    });
  }

  destroy(): void {
    this.view.destroy();
  }

  /** Submit the code, clear the editor, and reset the prompt. */
  private submit(code: string, onSubmit: (line: string) => void): void {
    const trimmed = code.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: "" },
    });
    if (this.promptEl) this.promptEl.textContent = ">>>";
  }

  /** Toggle the prompt label between >>> (first line) and ... (continuation). */
  private updatePrompt(view: EditorView): void {
    if (!this.promptEl) return;
    this.promptEl.textContent = view.state.doc.lines > 1 ? "..." : ">>>";
  }
}
