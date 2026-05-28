/**
 * CodeMirror 6 wrapper for the Drawfinity turtle Lua editor.
 *
 * Provides Lua syntax highlighting via @codemirror/legacy-modes/mode/lua
 * (StreamLanguage), autocompletion for turtle API, bracket matching,
 * and keybindings for running scripts (Ctrl+Enter) and 2-space indentation (Tab).
 */

import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {
  StreamLanguage,
  bracketMatching,
  syntaxHighlighting,
  HighlightStyle,
  indentUnit,
} from "@codemirror/language";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { closeBrackets } from "@codemirror/autocomplete";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import { turtleAutocompletion } from "./TurtleCompletions";

export interface TurtleEditorOptions {
  parent: HTMLElement;
  initialValue?: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
}

/** Syntax highlighting colors are sourced from CSS theme variables. */
const luaHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--turtle-syntax-keyword)" },
  { tag: tags.controlKeyword, color: "var(--turtle-syntax-keyword)" },
  { tag: tags.operatorKeyword, color: "var(--turtle-syntax-keyword)" },
  { tag: tags.definitionKeyword, color: "var(--turtle-syntax-keyword)" },
  { tag: tags.comment, color: "var(--turtle-syntax-comment)", fontStyle: "italic" },
  { tag: tags.blockComment, color: "var(--turtle-syntax-comment)", fontStyle: "italic" },
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

/** Theme values read from CSS variables so the editor follows app theme changes. */
const turtleEditorTheme = EditorView.theme({
  "&": {
    flex: "1",
    minHeight: "0",
    overflow: "auto",
    backgroundColor: "var(--turtle-bg)",
    color: "var(--turtle-text)",
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "13px",
    lineHeight: "1.5",
  },
  ".cm-content": {
    padding: "4px 12px 12px",
    caretColor: "var(--turtle-text)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--turtle-bg)",
    color: "var(--turtle-handle)",
    border: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--turtle-active-line)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--turtle-active-line)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--turtle-text)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--turtle-selection) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--turtle-selection) !important",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
});

export class TurtleEditor {
  private view: EditorView;
  private extensions: Extension[];

  constructor(options: TurtleEditorOptions) {
    const runKeymap = options.onRun
      ? keymap.of([{
          key: "Ctrl-Enter",
          mac: "Cmd-Enter",
          run: () => { options.onRun!(); return true; },
        }])
      : [];

    const extensions: Extension[] = [
      runKeymap,
      keymap.of([indentWithTab]),
      keymap.of(defaultKeymap),
      StreamLanguage.define(lua),
      syntaxHighlighting(luaHighlightStyle),
      bracketMatching(),
      closeBrackets(),
      turtleAutocompletion(),
      turtleEditorTheme,
      indentUnit.of("  "),
      EditorView.lineWrapping,
    ];

    if (options.onChange) {
      const onChange = options.onChange;
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      );
    }

    this.extensions = extensions;
    this.view = new EditorView({
      state: EditorState.create({
        doc: options.initialValue ?? "",
        extensions,
      }),
      parent: options.parent,
    });
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  setValue(code: string, resetHistory = false): void {
    if (resetHistory) {
      this.view.setState(
        EditorState.create({ doc: code, extensions: this.extensions }),
      );
    } else {
      this.view.dispatch({
        changes: {
          from: 0,
          to: this.view.state.doc.length,
          insert: code,
        },
      });
    }
  }

  focus(): void {
    this.view.focus();
  }

  requestMeasure(): void {
    this.view.requestMeasure();
  }

  destroy(): void {
    this.view.destroy();
  }
}
