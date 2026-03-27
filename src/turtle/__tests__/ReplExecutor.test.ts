import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReplExecutor } from "../ReplExecutor";
import { TurtleRegistry } from "../TurtleRegistry";
import type { DocumentModel, Stroke } from "../../model/Stroke";

/** Minimal DocumentModel stub for testing. */
function createMockDoc(): DocumentModel & { strokes: Stroke[]; shapes: unknown[] } {
  const strokes: Stroke[] = [];
  const shapes: unknown[] = [];
  return {
    strokes,
    shapes,
    getStrokes: () => [...strokes],
    addStroke: (s: Stroke) => { strokes.push(s); },
    removeStroke: (id: string) => {
      const idx = strokes.findIndex((s) => s.id === id);
      if (idx !== -1) strokes.splice(idx, 1);
    },
    addShape: (s: unknown) => { shapes.push(s); },
    removeShape: (id: string) => {
      const idx = shapes.findIndex((s: unknown) => (s as { id: string }).id === id);
      if (idx !== -1) shapes.splice(idx, 1);
    },
  } as DocumentModel & { strokes: Stroke[]; shapes: unknown[] };
}

describe("ReplExecutor", () => {
  let executor: ReplExecutor;
  let registry: TurtleRegistry;
  let doc: DocumentModel & { strokes: Stroke[]; shapes: unknown[] };

  beforeEach(async () => {
    registry = new TurtleRegistry();
    doc = createMockDoc();
    executor = new ReplExecutor(registry, "repl-test", doc);
    await executor.init();
  });

  afterEach(() => {
    executor.destroy();
    registry.clear();
  });

  describe("initialization", () => {
    it("initializes without error", () => {
      expect(executor).toBeTruthy();
    });

    it("creates main turtle in registry", () => {
      expect(registry.has("repl-test:main")).toBe(true);
    });

    it("returns error when executing before init", async () => {
      const uninit = new ReplExecutor(new TurtleRegistry(), "test", doc);
      const result = await uninit.executeCommand("forward(100)");
      expect(result.error).toBeTruthy();
    });
  });

  describe("command execution", () => {
    it("executes a movement command and creates a stroke", async () => {
      const result = await executor.executeCommand("forward(100)");
      expect(result.error).toBeNull();
      expect(doc.strokes.length).toBeGreaterThan(0);
    });

    it("returns expression output", async () => {
      const result = await executor.executeCommand("1 + 2");
      expect(result.error).toBeNull();
      expect(result.output).toBe("3");
    });

    it("returns null output for statements", async () => {
      const result = await executor.executeCommand("forward(100)");
      expect(result.output).toBeNull();
    });

    it("updates turtle state after execution", async () => {
      await executor.executeCommand("forward(100)");
      const state = executor.getMainState();
      expect(state).toBeTruthy();
      // Turtle moved up (negative Y) by 100
      expect(state!.y).toBeCloseTo(-100);
    });
  });

  describe("multi-command state persistence", () => {
    it("preserves Lua variables between commands", async () => {
      await executor.executeCommand("x = 42");
      const result = await executor.executeCommand("x + 8");
      expect(result.output).toBe("50");
    });

    it("preserves turtle state between commands", async () => {
      await executor.executeCommand("forward(50)");
      await executor.executeCommand("forward(50)");
      const state = executor.getMainState();
      // Total movement: 100 units up
      expect(state!.y).toBeCloseTo(-100);
    });

    it("accumulates strokes across commands", async () => {
      await executor.executeCommand("forward(50)");
      const count1 = doc.strokes.length;
      await executor.executeCommand("right(90)");
      await executor.executeCommand("forward(50)");
      // Should have more strokes after the second forward
      expect(doc.strokes.length).toBeGreaterThanOrEqual(count1 + 1);
    });

    it("handles pen state changes between commands", async () => {
      await executor.executeCommand('pencolor("#ff0000")');
      await executor.executeCommand("forward(100)");
      // Stroke should have red color
      expect(doc.strokes.length).toBeGreaterThan(0);
      const lastStroke = doc.strokes[doc.strokes.length - 1];
      expect(lastStroke.color).toBe("#ff0000");
    });
  });

  describe("expression evaluation", () => {
    it("evaluates math expressions", async () => {
      const result = await executor.executeCommand("math.sqrt(144)");
      expect(result.output).toBe("12.0");
    });

    it("evaluates string expressions", async () => {
      const result = await executor.executeCommand('"hello"');
      expect(result.output).toBe("hello");
    });

    it("evaluates position queries", async () => {
      await executor.executeCommand("forward(100)");
      const result = await executor.executeCommand("position()");
      expect(result.error).toBeNull();
      // position() returns x, y — both as tab-separated values
      expect(result.output).toBeTruthy();
    });
  });

  describe("error handling", () => {
    it("returns error for syntax errors", async () => {
      const result = await executor.executeCommand("if then end end");
      expect(result.error).toBeTruthy();
      expect(result.output).toBeNull();
    });

    it("returns error for runtime errors", async () => {
      const result = await executor.executeCommand('error("boom")');
      expect(result.error).toContain("boom");
    });

    it("preserves state after an error", async () => {
      await executor.executeCommand("x = 99");
      await executor.executeCommand('error("oops")');
      const result = await executor.executeCommand("x");
      expect(result.output).toBe("99");
    });
  });

  describe("reset", () => {
    it("clears Lua state on reset", async () => {
      await executor.executeCommand("x = 42");
      await executor.reset();
      const result = await executor.executeCommand("x");
      // x is nil after reset
      expect(result.output).toBeNull();
    });

    it("resets turtle position on reset", async () => {
      await executor.executeCommand("forward(100)");
      await executor.reset();
      const state = executor.getMainState();
      expect(state!.x).toBe(0);
      expect(state!.y).toBe(0);
    });

    it("preserves drawn strokes on reset", async () => {
      await executor.executeCommand("forward(100)");
      const strokeCount = doc.strokes.length;
      expect(strokeCount).toBeGreaterThan(0);
      await executor.reset();
      // Strokes should still be in the document
      expect(doc.strokes.length).toBe(strokeCount);
    });

    it("allows continued execution after reset", async () => {
      await executor.executeCommand("forward(100)");
      await executor.reset();
      const result = await executor.executeCommand("forward(50)");
      expect(result.error).toBeNull();
      const state = executor.getMainState();
      expect(state!.y).toBeCloseTo(-50);
    });
  });

  describe("clearDrawing", () => {
    it("removes all turtle-drawn strokes", async () => {
      await executor.executeCommand("forward(100)");
      expect(doc.strokes.length).toBeGreaterThan(0);
      executor.clearDrawing();
      expect(doc.strokes.length).toBe(0);
    });

    it("does not affect turtle state", async () => {
      await executor.executeCommand("forward(100)");
      executor.clearDrawing();
      const state = executor.getMainState();
      // Position unchanged
      expect(state!.y).toBeCloseTo(-100);
    });
  });

  describe("destroy", () => {
    it("returns error after destroy", async () => {
      executor.destroy();
      const result = await executor.executeCommand("forward(100)");
      expect(result.error).toBeTruthy();
    });
  });
});
