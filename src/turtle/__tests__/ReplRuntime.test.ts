import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReplRuntime } from "../ReplRuntime";
import { TurtleState } from "../TurtleState";

describe("ReplRuntime", () => {
  let repl: ReplRuntime;

  beforeEach(async () => {
    repl = new ReplRuntime();
    await repl.init();
    // Wire up a state query so position()/heading()/isdown() work
    repl.setStateQuery(new TurtleState());
  });

  afterEach(() => {
    repl.destroy();
  });

  describe("initialization", () => {
    it("initializes without error", () => {
      expect(repl).toBeTruthy();
    });

    it("returns error when executing before init", async () => {
      const uninit = new ReplRuntime();
      const result = await uninit.executeLine("forward(100)");
      expect(result.error).toContain("not initialized");
      expect(result.commands).toHaveLength(0);
    });
  });

  describe("statement execution", () => {
    it("executes a movement command", async () => {
      const result = await repl.executeLine("forward(100)");
      expect(result.error).toBeNull();
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({ type: "forward", distance: 100 });
    });

    it("executes pen control commands", async () => {
      const result = await repl.executeLine('pencolor("#ff0000")');
      expect(result.error).toBeNull();
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({
        type: "pencolor",
        color: "#ff0000",
      });
    });

    it("executes variable assignment (statement)", async () => {
      const result = await repl.executeLine("x = 42");
      expect(result.error).toBeNull();
      expect(result.output).toBeNull();
    });

    it("returns no output for void statements", async () => {
      const result = await repl.executeLine("forward(100)");
      expect(result.output).toBeNull();
    });
  });

  describe("expression evaluation", () => {
    it("evaluates a numeric expression", async () => {
      const result = await repl.executeLine("1 + 2");
      expect(result.error).toBeNull();
      expect(result.output).toBe("3");
    });

    it("evaluates a string expression", async () => {
      const result = await repl.executeLine('"hello"');
      expect(result.error).toBeNull();
      expect(result.output).toBe("hello");
    });

    it("evaluates a math expression", async () => {
      const result = await repl.executeLine("math.sqrt(144)");
      expect(result.error).toBeNull();
      expect(result.output).toBe("12.0");
    });

    it("evaluates boolean expressions", async () => {
      const result = await repl.executeLine("true");
      expect(result.error).toBeNull();
      expect(result.output).toBe("true");
    });
  });

  describe("multi-command state persistence", () => {
    it("preserves variables between lines", async () => {
      await repl.executeLine("x = 10");
      const result = await repl.executeLine("x + 5");
      expect(result.error).toBeNull();
      expect(result.output).toBe("15");
    });

    it("preserves functions between lines", async () => {
      await repl.executeLine("function double(n) return n * 2 end");
      const result = await repl.executeLine("double(21)");
      expect(result.error).toBeNull();
      expect(result.output).toBe("42");
    });

    it("accumulates turtle commands across lines", async () => {
      const r1 = await repl.executeLine("forward(100)");
      expect(r1.commands).toHaveLength(1);

      const r2 = await repl.executeLine("right(90)");
      expect(r2.commands).toHaveLength(1);

      // Each line returns only its own commands
      expect(r1.commands[0].type).toBe("forward");
      expect(r2.commands[0].type).toBe("right");
    });

    it("preserves Lua table state between lines", async () => {
      await repl.executeLine("t = {1, 2, 3}");
      await repl.executeLine("table.insert(t, 4)");
      const result = await repl.executeLine("#t");
      expect(result.error).toBeNull();
      expect(result.output).toBe("4");
    });

    it("preserves loop counter state", async () => {
      await repl.executeLine("count = 0");
      await repl.executeLine("for i=1,5 do count = count + 1 end");
      const result = await repl.executeLine("count");
      expect(result.error).toBeNull();
      expect(result.output).toBe("5");
    });
  });

  describe("error handling", () => {
    it("returns error for syntax errors", async () => {
      const result = await repl.executeLine("if then end end");
      expect(result.error).toBeTruthy();
      expect(result.output).toBeNull();
    });

    it("returns error for runtime errors", async () => {
      const result = await repl.executeLine('error("boom")');
      expect(result.error).toContain("boom");
      expect(result.output).toBeNull();
    });

    it("returns error for nil access", async () => {
      const result = await repl.executeLine("local x = nil; x.foo()");
      expect(result.error).toBeTruthy();
    });

    it("preserves state after an error", async () => {
      await repl.executeLine("x = 99");
      await repl.executeLine('error("oops")');
      const result = await repl.executeLine("x");
      expect(result.error).toBeNull();
      expect(result.output).toBe("99");
    });

    it("still collects commands before an error", async () => {
      const result = await repl.executeLine(
        'forward(50); error("mid-error")',
      );
      expect(result.error).toContain("mid-error");
      // forward(50) executed before the error
      expect(result.commands.length).toBeGreaterThanOrEqual(1);
      expect(result.commands[0]).toEqual({ type: "forward", distance: 50 });
    });
  });

  describe("print output", () => {
    it("captures print as a command", async () => {
      const result = await repl.executeLine('print("hello world")');
      expect(result.error).toBeNull();
      const printCmd = result.commands.find((c) => c.type === "print");
      expect(printCmd).toBeDefined();
      expect((printCmd as { type: "print"; message: string }).message).toBe(
        "hello world",
      );
    });
  });

  describe("reset", () => {
    it("clears all Lua state on reset", async () => {
      await repl.executeLine("x = 42");
      await repl.reset();
      repl.setStateQuery(new TurtleState());
      const result = await repl.executeLine("x");
      // After reset, x is nil — output is null (nil values are filtered)
      expect(result.error).toBeNull();
      expect(result.output).toBeNull();
    });

    it("allows continued execution after reset", async () => {
      await repl.executeLine("forward(100)");
      await repl.reset();
      repl.setStateQuery(new TurtleState());
      const result = await repl.executeLine("forward(200)");
      expect(result.error).toBeNull();
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({ type: "forward", distance: 200 });
    });

    it("re-registers turtle API after reset", async () => {
      await repl.reset();
      repl.setStateQuery(new TurtleState());
      const result = await repl.executeLine("right(45)");
      expect(result.error).toBeNull();
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({ type: "right", angle: 45 });
    });
  });

  describe("destroy", () => {
    it("returns error after destroy", async () => {
      repl.destroy();
      const result = await repl.executeLine("forward(100)");
      expect(result.error).toContain("not initialized");
    });
  });
});
