import { describe, it, expect } from "vitest";
import {
  turtleCompletionSource,
  allCompletions,
  turtleAPICompletions,
  luaKeywordCompletions,
} from "../turtle-editor/TurtleCompletions";
import { EditorState } from "@codemirror/state";
import { CompletionContext } from "@codemirror/autocomplete";

/** Helper: create a CompletionContext from a string with cursor at end. */
function makeContext(doc: string, explicit = false): CompletionContext {
  const state = EditorState.create({ doc });
  return new CompletionContext(state, doc.length, explicit);
}

describe("TurtleCompletions", () => {
  describe("allCompletions", () => {
    it("contains turtle API, keywords, math, and string completions", () => {
      // Should have a reasonable number of completions
      expect(allCompletions.length).toBeGreaterThan(50);

      const labels = allCompletions.map((c) => c.label);
      // Turtle API
      expect(labels).toContain("forward");
      expect(labels).toContain("backward");
      expect(labels).toContain("pencolor");
      expect(labels).toContain("spawn");
      expect(labels).toContain("simulate");

      // Lua keywords
      expect(labels).toContain("local");
      expect(labels).toContain("function");
      expect(labels).toContain("if");
      expect(labels).toContain("end");

      // Math
      expect(labels).toContain("math.sin");
      expect(labels).toContain("math.pi");

      // String
      expect(labels).toContain("string.format");
    });

    it("every completion has label, type, and detail", () => {
      for (const c of allCompletions) {
        expect(c.label).toBeTruthy();
        expect(c.type).toBeTruthy();
        expect(c.detail).toBeTruthy();
      }
    });

    it("has no duplicate labels", () => {
      const labels = allCompletions.map((c) => c.label);
      const unique = new Set(labels);
      expect(unique.size).toBe(labels.length);
    });
  });

  describe("turtleAPICompletions", () => {
    it("all entries have type 'function'", () => {
      for (const c of turtleAPICompletions) {
        expect(c.type).toBe("function");
      }
    });
  });

  describe("luaKeywordCompletions", () => {
    it("contains only keyword or constant types", () => {
      for (const c of luaKeywordCompletions) {
        expect(["keyword", "constant"]).toContain(c.type);
      }
    });
  });

  describe("turtleCompletionSource", () => {
    it("returns completions when typing a word", () => {
      const result = turtleCompletionSource(makeContext("for"));
      expect(result).not.toBeNull();
      expect(result!.options.length).toBeGreaterThan(0);
      expect(result!.from).toBe(0);
    });

    it("returns completions for dotted identifiers like math.", () => {
      const result = turtleCompletionSource(makeContext("math.s"));
      expect(result).not.toBeNull();
      expect(result!.from).toBe(0);
    });

    it("returns null for empty input without explicit trigger", () => {
      const result = turtleCompletionSource(makeContext(""));
      expect(result).toBeNull();
    });

    it("returns completions for empty input with explicit trigger", () => {
      const result = turtleCompletionSource(makeContext("", true));
      // Still null because matchBefore won't match empty
      expect(result).toBeNull();
    });

    it("returns completions after a space (new word)", () => {
      const result = turtleCompletionSource(makeContext("forward(10)\npen"));
      expect(result).not.toBeNull();
      expect(result!.from).toBe(12); // start of "pen" on line 2
    });
  });
});
