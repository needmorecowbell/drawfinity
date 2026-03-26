import { describe, it, expect, beforeEach, vi } from "vitest";
import { TurtleExecutor, TurtleExecutorEvents } from "../TurtleExecutor";
import { TurtleRegistry } from "../TurtleRegistry";
import { TurtleCommand } from "../LuaRuntime";
import { Stroke, DocumentModel } from "../../model/Stroke";

/** Minimal in-memory document for testing. */
class MockDocument implements DocumentModel {
  strokes: Stroke[] = [];

  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
  }

  getStrokes(): Stroke[] {
    return this.strokes;
  }

  removeStroke(strokeId: string): boolean {
    const idx = this.strokes.findIndex((s) => s.id === strokeId);
    if (idx === -1) return false;
    this.strokes.splice(idx, 1);
    return true;
  }
}

/**
 * Fake LuaRuntime that returns preconfigured commands instead of
 * actually running Lua. This lets us test TurtleExecutor independently.
 */
class FakeLuaRuntime {
  private commands: TurtleCommand[] = [];
  private shouldFail = false;
  private errorMessage = "";

  setCommands(cmds: TurtleCommand[]): void {
    this.commands = cmds;
  }

  setFailure(error: string): void {
    this.shouldFail = true;
    this.errorMessage = error;
  }

  setStateQuery(): void {
    // no-op for testing
  }

  async execute(_script: string) {
    if (this.shouldFail) {
      return { success: false as const, error: this.errorMessage };
    }
    return { success: true as const };
  }

  getCommands(): TurtleCommand[] {
    return this.commands;
  }

  close(): void {
    // no-op
  }
}

describe("TurtleExecutor", () => {
  let doc: MockDocument;
  let registry: TurtleRegistry;
  let runtime: FakeLuaRuntime;
  const scriptId = "test-script";

  beforeEach(() => {
    doc = new MockDocument();
    registry = new TurtleRegistry();
    runtime = new FakeLuaRuntime();
    vi.useFakeTimers();
  });

  function createExecutor(events: TurtleExecutorEvents = {}) {
    return new TurtleExecutor(
      runtime as unknown as import("../LuaRuntime").LuaRuntime,
      registry,
      scriptId,
      doc,
      events,
    );
  }

  describe("basic execution", () => {
    it("runs a script that produces forward commands and creates strokes", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 100 },
        { type: "right", angle: 90 },
        { type: "forward", distance: 50 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("ignored");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      // speed(0) enables batching, so segments should be batched into a single stroke
      expect(doc.strokes.length).toBe(1);
      expect(doc.strokes[0].points).toHaveLength(3);
    });

    it("returns error when Lua execution fails", async () => {
      runtime.setFailure("syntax error near 'end'");

      const executor = createExecutor();
      const result = await executor.run("bad code");

      expect(result.success).toBe(false);
      expect(result.error).toBe("syntax error near 'end'");
    });

    it("prevents concurrent execution", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 10 },
      ]);

      const executor = createExecutor();
      const first = executor.run("script1");
      const second = await executor.run("script2");

      expect(second.success).toBe(false);
      expect(second.error).toBe("A script is already running");

      await vi.runAllTimersAsync();
      await first;
    });
  });

  describe("speed control and step delays", () => {
    it("speed(0) runs instantly with no delays", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 10 },
        { type: "forward", distance: 20 },
        { type: "forward", distance: 30 },
      ]);

      const steps: number[] = [];
      const executor = createExecutor({
        onStep: () => steps.push(Date.now()),
      });

      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(steps).toHaveLength(4); // speed + 3 forwards
    });

    it("speed(1) uses 100ms delay between steps", async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      runtime.setCommands([
        { type: "speed", value: 1 },
        { type: "forward", distance: 10 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      // The speed command itself has a delay, then the forward command has a delay
      const delays = setTimeoutSpy.mock.calls
        .map((call: unknown[]) => call[1])
        .filter((d: unknown) => typeof d === "number" && d > 0);
      expect(delays).toContain(100);

      setTimeoutSpy.mockRestore();
    });

    it("speed(10) uses 1ms delay between steps", async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      runtime.setCommands([
        { type: "speed", value: 10 },
        { type: "forward", distance: 10 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      const delays = setTimeoutSpy.mock.calls
        .map((call: unknown[]) => call[1])
        .filter((d: unknown) => typeof d === "number" && d > 0);
      expect(delays).toContain(1);

      setTimeoutSpy.mockRestore();
    });
  });

  describe("stop button", () => {
    it("stops execution when stop() is called", async () => {
      runtime.setCommands([
        { type: "speed", value: 5 },
        { type: "forward", distance: 10 },
        { type: "forward", distance: 20 },
        { type: "forward", distance: 30 },
        { type: "forward", distance: 40 },
      ]);

      let stepCount = 0;
      const executor = createExecutor({
        onStep: () => {
          stepCount++;
          if (stepCount === 2) {
            executor.stop();
          }
        },
      });

      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe("Execution stopped by user");
      // Should have stopped after 2 steps (speed + first forward)
      expect(stepCount).toBe(2);
      expect(executor.isRunning()).toBe(false);
    });
  });

  describe("event callbacks", () => {
    it("fires onStart when execution begins", async () => {
      runtime.setCommands([]);
      const onStart = vi.fn();

      const executor = createExecutor({ onStart });
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(onStart).toHaveBeenCalledOnce();
    });

    it("fires onComplete when execution finishes", async () => {
      runtime.setCommands([{ type: "forward", distance: 10 }]);
      const onComplete = vi.fn();

      const executor = createExecutor({ onComplete });
      // Default speed is 5, which has a delay
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(onComplete).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledWith({ success: true });
    });

    it("fires onComplete with error on Lua failure", async () => {
      runtime.setFailure("runtime error");
      const onComplete = vi.fn();

      const executor = createExecutor({ onComplete });
      await executor.run("bad");

      expect(onComplete).toHaveBeenCalledWith({
        success: false,
        error: "runtime error",
      });
    });

    it("fires onPrint for print commands", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "print", message: "hello world" },
        { type: "print", message: "second line" },
      ]);
      const messages: string[] = [];
      const executor = createExecutor({
        onPrint: (msg) => messages.push(msg),
      });

      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(messages).toEqual(["hello world", "second line"]);
    });

    it("fires onStep for each command", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 10 },
        { type: "right", angle: 90 },
      ]);
      const onStep = vi.fn();

      const executor = createExecutor({ onStep });
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(onStep).toHaveBeenCalledTimes(3);
    });
  });

  describe("turtle state integration", () => {
    it("resets turtle state before each run", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 100 },
      ]);

      const executor = createExecutor();

      const p1 = executor.run("first");
      await vi.runAllTimersAsync();
      await p1;

      // Turtle should be at (0, -100) after forward(100)
      const state1 = executor.getMainState()!;
      expect(state1.x).toBeCloseTo(0);
      expect(state1.y).toBeCloseTo(-100);

      // Run again — state should reset
      const p2 = executor.run("second");
      await vi.runAllTimersAsync();
      await p2;

      // Same result because state was reset
      const state2 = executor.getMainState()!;
      expect(state2.x).toBeCloseTo(0);
      expect(state2.y).toBeCloseTo(-100);
    });

    it("handles clear command by removing turtle strokes", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 50 },
        { type: "clear" },
        { type: "forward", distance: 25 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      // After clear, only the second forward's stroke remains
      expect(doc.strokes.length).toBe(1);
      expect(doc.strokes[0].points).toHaveLength(2);
    });

    it("updates pen properties during execution", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "pencolor", color: "#ff0000" },
        { type: "penwidth", width: 5 },
        { type: "penopacity", opacity: 0.5 },
        { type: "forward", distance: 50 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.strokes.length).toBe(1);
      expect(doc.strokes[0].color).toBe("#ff0000");
      expect(doc.strokes[0].width).toBe(5); // zoom is 1
      expect(doc.strokes[0].opacity).toBe(0.5);
    });

    it("does not create strokes when pen is up", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "penup" },
        { type: "forward", distance: 100 },
        { type: "pendown" },
        { type: "forward", distance: 50 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.strokes.length).toBe(1);
      // Only the second forward creates a stroke
      expect(doc.strokes[0].points).toHaveLength(2);
    });
  });

  describe("registry integration", () => {
    it("creates main turtle in registry on run", async () => {
      runtime.setCommands([{ type: "speed", value: 0 }]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(registry.has(`${scriptId}:main`)).toBe(true);
    });

    it("clears spawned turtles on re-run but keeps main", async () => {
      runtime.setCommands([{ type: "speed", value: 0 }]);

      const executor = createExecutor();
      const p1 = executor.run("first");
      await vi.runAllTimersAsync();
      await p1;

      // Manually spawn an extra turtle to verify it gets cleaned up
      registry.spawn("extra", scriptId, doc);
      expect(registry.count()).toBe(2);

      const p2 = executor.run("second");
      await vi.runAllTimersAsync();
      await p2;

      // Only main should remain (extra was cleared), main state reference is stable
      expect(registry.count()).toBe(1);
      expect(registry.has(`${scriptId}:main`)).toBe(true);
    });

    it("preserves main turtle state reference across runs", async () => {
      runtime.setCommands([{ type: "speed", value: 0 }]);

      const executor = createExecutor();
      const p1 = executor.run("first");
      await vi.runAllTimersAsync();
      await p1;

      const stateRef1 = executor.getMainState();

      const p2 = executor.run("second");
      await vi.runAllTimersAsync();
      await p2;

      const stateRef2 = executor.getMainState();
      // Same object reference — stable for TurtleIndicator
      expect(stateRef2).toBe(stateRef1);
    });

    it("does not affect other scripts' turtles on re-run", async () => {
      // Create turtles for another script
      registry.createMain("other-script", doc);
      registry.spawn("child", "other-script", doc);

      runtime.setCommands([{ type: "speed", value: 0 }]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      // Other script's turtles are untouched
      expect(registry.has("other-script:main")).toBe(true);
      expect(registry.has("other-script:child")).toBe(true);
    });

    it("dispatches commands to correct turtle by turtleId", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 100 },
      ] as TurtleCommand[]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      const mainEntry = registry.get(`${scriptId}:main`)!;
      expect(mainEntry.state.y).toBeCloseTo(-100);
    });

    it("getMainState returns main turtle state", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 50 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      const mainState = executor.getMainState();
      expect(mainState).not.toBeNull();
      expect(mainState!.y).toBeCloseTo(-50);
    });

    it("getMainState returns null before first run", () => {
      const executor = createExecutor();
      expect(executor.getMainState()).toBeNull();
    });
  });

  describe("isRunning", () => {
    it("returns false when idle", () => {
      const executor = createExecutor();
      expect(executor.isRunning()).toBe(false);
    });

    it("returns true during execution", async () => {
      runtime.setCommands([
        { type: "speed", value: 5 },
        { type: "forward", distance: 10 },
      ]);

      let wasRunning = false;
      const executor = createExecutor({
        onStep: () => {
          wasRunning = executor.isRunning();
        },
      });

      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(wasRunning).toBe(true);
      expect(executor.isRunning()).toBe(false);
    });
  });
});
