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

/** Catppuccin Mocha syntax highlighting colors. */
const luaHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#cba6f7" },           // mauve
  { tag: tags.controlKeyword, color: "#cba6f7" },
  { tag: tags.operatorKeyword, color: "#cba6f7" },
  { tag: tags.definitionKeyword, color: "#cba6f7" },
  { tag: tags.comment, color: "#6c7086", fontStyle: "italic" }, // overlay0
  { tag: tags.blockComment, color: "#6c7086", fontStyle: "italic" },
  { tag: tags.string, color: "#a6e3a1" },             // green
  { tag: tags.number, color: "#fab387" },              // peach
  { tag: tags.bool, color: "#fab387" },
  { tag: tags.null, color: "#fab387" },
  { tag: tags.function(tags.variableName), color: "#89b4fa" }, // blue
  { tag: tags.variableName, color: "#cdd6f4" },       // text
  { tag: tags.operator, color: "#89dceb" },            // sky
  { tag: tags.punctuation, color: "#9399b2" },         // overlay2
  { tag: tags.paren, color: "#9399b2" },
  { tag: tags.brace, color: "#9399b2" },
  { tag: tags.squareBracket, color: "#9399b2" },
  { tag: tags.self, color: "#f38ba8" },                // red (self)
  { tag: tags.atom, color: "#fab387" },
]);

/** Catppuccin Mocha-inspired theme matching existing .turtle-editor textarea styles. */
const turtleEditorTheme = EditorView.theme({
  "&": {
    flex: "1",
    minHeight: "0",
    overflow: "auto",
    backgroundColor: "#1e1e2e",
    color: "#cdd6f4",
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "13px",
    lineHeight: "1.5",
  },
  ".cm-content": {
    padding: "4px 12px 12px",
    caretColor: "#cdd6f4",
  },
  ".cm-gutters": {
    backgroundColor: "#1e1e2e",
    color: "#585b70",
    border: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#28283d",
  },
  ".cm-activeLine": {
    backgroundColor: "#28283d",
  },
  ".cm-cursor": {
    borderLeftColor: "#cdd6f4",
  },
  ".cm-selectionBackground": {
    backgroundColor: "#44475a !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "#44475a !important",
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
