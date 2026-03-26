import { describe, it, expect, beforeEach, vi } from "vitest";
import { TurtleExecutor, TurtleExecutorEvents } from "../TurtleExecutor";
import { TurtleRegistry } from "../TurtleRegistry";
import { TurtleCommand } from "../LuaRuntime";
import { Stroke, DocumentModel } from "../../model/Stroke";
import type { Shape } from "../../model/Shape";

/** Minimal in-memory document for testing. */
class MockDocument implements DocumentModel {
  strokes: Stroke[] = [];
  shapes: Shape[] = [];

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

  addShape(shape: Shape): void {
    this.shapes.push(shape);
  }

  getShapes(): Shape[] {
    return this.shapes;
  }

  removeShape(shapeId: string): boolean {
    const idx = this.shapes.findIndex((s) => s.id === shapeId);
    if (idx === -1) return false;
    this.shapes.splice(idx, 1);
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

  setActiveTurtle(): void {
    // no-op for testing
  }

  setSpawnContext(): void {
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

  describe("interleaved multi-turtle replay", () => {
    it("interleaves commands from multiple turtles one per tick", async () => {
      // Spawn a child turtle, then both main and child issue commands.
      // With interleaved replay, commands should alternate.
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "spawn", id: "t1" },
        { type: "forward", distance: 10 },                        // main
        { type: "forward", distance: 20, turtleId: "t1" },        // t1
        { type: "forward", distance: 30 },                        // main
        { type: "forward", distance: 40, turtleId: "t1" },        // t1
      ]);

      const stepLog: string[] = [];
      const executor = createExecutor({
        onStep: () => {
          const mainState = registry.get(`${scriptId}:main`)!.state;
          const t1Entry = registry.get(`${scriptId}:t1`);
          stepLog.push(
            `main:${mainState.y.toFixed(0)},t1:${t1Entry?.state.y.toFixed(0) ?? "N/A"}`,
          );
        },
      });

      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);

      // Tick 1: main processes speed(0) — only main active
      // Tick 2: main processes spawn("t1") — t1 becomes active next tick
      // Tick 3: main forward(10) + t1 forward(20) — interleaved
      // Tick 4: main forward(30) + t1 forward(40) — interleaved
      expect(stepLog).toHaveLength(4);

      // After tick 3: main y=-10, t1 y=-20
      expect(stepLog[2]).toBe("main:-10,t1:-20");
      // After tick 4: main y=-40, t1 y=-60
      expect(stepLog[3]).toBe("main:-40,t1:-60");
    });

    it("spawned turtle starts on the next tick after spawn command", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "spawn", id: "child" },
        { type: "speed", value: 0, turtleId: "child" },
        { type: "forward", distance: 50 },                          // main
        { type: "forward", distance: 100, turtleId: "child" },      // child
      ]);

      let tickCount = 0;
      let childStartedTick = -1;
      const executor = createExecutor({
        onStep: () => {
          tickCount++;
          const childEntry = registry.get(`${scriptId}:child`);
          // Child gets its first command (speed) when both are active
          if (childEntry && childEntry.state.y !== 0 && childStartedTick === -1) {
            childStartedTick = tickCount;
          }
        },
      });

      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      // Tick 1: speed(0) on main only
      // Tick 2: spawn("child") on main only — child activated
      // Tick 3: main forward(50) + child speed(0) — interleaved
      // Tick 4: child forward(100) — child only (main queue exhausted)
      expect(tickCount).toBe(4);
    });

    it("applies delay once per tick based on max across turtles", async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      // Main at speed 10 (1ms delay), child at speed 1 (100ms delay)
      runtime.setCommands([
        { type: "speed", value: 10 },
        { type: "spawn", id: "slow" },
        { type: "speed", value: 1, turtleId: "slow" },
        { type: "forward", distance: 10 },                       // main (1ms)
        { type: "forward", distance: 10, turtleId: "slow" },     // slow (100ms)
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      // During the interleaved tick where both turtles move,
      // the delay should be max(1, 100) = 100
      const delays = setTimeoutSpy.mock.calls
        .map((call: unknown[]) => call[1])
        .filter((d: unknown) => typeof d === "number" && d > 0);
      expect(delays).toContain(100);

      setTimeoutSpy.mockRestore();
    });

    it("continues until all turtle queues are empty", async () => {
      // Main has 2 commands, child has 4 — should keep going for child
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "spawn", id: "longer" },
        { type: "speed", value: 0, turtleId: "longer" },
        { type: "forward", distance: 10 },                            // main
        { type: "forward", distance: 10, turtleId: "longer" },        // longer
        { type: "forward", distance: 20, turtleId: "longer" },        // longer
        { type: "forward", distance: 30, turtleId: "longer" },        // longer
      ]);

      let tickCount = 0;
      const executor = createExecutor({
        onStep: () => tickCount++,
      });

      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);

      // Final state: main moved 10, longer moved 10+20+30=60
      const mainState = registry.get(`${scriptId}:main`)!.state;
      const longerState = registry.get(`${scriptId}:longer`)!.state;
      expect(mainState.y).toBeCloseTo(-10);
      expect(longerState.y).toBeCloseTo(-60);
    });

    it("handles commands for nonexistent turtles gracefully", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 50, turtleId: "ghost" },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Commands for unknown turtles are silently skipped
      expect(result.success).toBe(true);
    });

    it("flushes drawing for all owned turtles after interleaved replay", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "spawn", id: "drawer" },
        { type: "speed", value: 0, turtleId: "drawer" },
        { type: "forward", distance: 50 },                          // main draws
        { type: "forward", distance: 100, turtleId: "drawer" },     // drawer draws
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      // Both turtles' strokes should be flushed to the document
      expect(doc.strokes.length).toBe(2);
    });

    it("single-turtle scripts behave identically to before", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "forward", distance: 100 },
        { type: "right", angle: 90 },
        { type: "forward", distance: 50 },
      ]);

      let stepCount = 0;
      const executor = createExecutor({
        onStep: () => stepCount++,
      });

      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(stepCount).toBe(4); // One step per command, same as sequential
      expect(doc.strokes.length).toBe(1);
      expect(doc.strokes[0].points).toHaveLength(3);
    });
  });

  describe("kill and killall during replay", () => {
    it("kill command removes turtle from registry during replay", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "spawn", id: "doomed" },
        { type: "forward", distance: 10, turtleId: "doomed" },
        { type: "kill", id: "doomed" },
        { type: "forward", distance: 20, turtleId: "doomed" }, // should be skipped
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(registry.has(`${scriptId}:doomed`)).toBe(false);
    });

    it("kill deactivates turtle from interleaved replay", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "spawn", id: "temp" },
        { type: "speed", value: 0, turtleId: "temp" },
        { type: "forward", distance: 10 },                          // main
        { type: "forward", distance: 10, turtleId: "temp" },        // temp
        { type: "kill", id: "temp" },                                // main kills temp
        { type: "forward", distance: 20 },                          // main continues
        { type: "forward", distance: 20, turtleId: "temp" },        // temp: skipped
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(registry.has(`${scriptId}:temp`)).toBe(false);
      // Main should have moved: -10 + -20 = -30
      const mainState = registry.get(`${scriptId}:main`)!.state;
      expect(mainState.y).toBeCloseTo(-30);
    });

    it("killall removes all non-main turtles during replay", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "spawn", id: "a" },
        { type: "spawn", id: "b" },
        { type: "speed", value: 0, turtleId: "a" },
        { type: "speed", value: 0, turtleId: "b" },
        { type: "forward", distance: 10 },
        { type: "forward", distance: 10, turtleId: "a" },
        { type: "forward", distance: 10, turtleId: "b" },
        { type: "killall" },
        { type: "forward", distance: 20 },                          // main continues
        { type: "forward", distance: 20, turtleId: "a" },           // skipped
        { type: "forward", distance: 20, turtleId: "b" },           // skipped
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(registry.has(`${scriptId}:main`)).toBe(true);
      expect(registry.has(`${scriptId}:a`)).toBe(false);
      expect(registry.has(`${scriptId}:b`)).toBe(false);
    });

    it("hide and show commands are processed without error", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "hide" },
        { type: "forward", distance: 50 },
        { type: "show" },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      // Forward should still work after hide/show
      const mainState = registry.get(`${scriptId}:main`)!.state;
      expect(mainState.y).toBeCloseTo(-50);
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

  describe("shape creation during replay", () => {
    it("creates a rectangle shape at the turtle position", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "pencolor", color: "#ff0000" },
        { type: "penwidth", width: 2 },
        { type: "penopacity", opacity: 0.5 },
        { type: "fillcolor", color: "#00ff00" },
        { type: "rectangle", width: 100, height: 50 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.shapes).toHaveLength(1);
      const shape = doc.shapes[0];
      expect(shape.type).toBe("rectangle");
      expect(shape.width).toBe(100);
      expect(shape.height).toBe(50);
      expect(shape.strokeColor).toBe("#ff0000");
      expect(shape.strokeWidth).toBe(2);
      expect(shape.fillColor).toBe("#00ff00");
      expect(shape.opacity).toBe(0.5);
      expect(shape.x).toBe(0);
      expect(shape.y).toBe(0);
    });

    it("creates an ellipse shape", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "ellipse", width: 80, height: 40 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.shapes).toHaveLength(1);
      expect(doc.shapes[0].type).toBe("ellipse");
      expect(doc.shapes[0].width).toBe(80);
      expect(doc.shapes[0].height).toBe(40);
    });

    it("creates a polygon shape with sides", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "polygon", sides: 6, radius: 50 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.shapes).toHaveLength(1);
      const shape = doc.shapes[0];
      expect(shape.type).toBe("polygon");
      expect(shape.sides).toBe(6);
      // diameter = radius * 2
      expect(shape.width).toBe(100);
      expect(shape.height).toBe(100);
    });

    it("creates a star shape with inner radius ratio", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "star", points: 5, outerRadius: 50, innerRadius: 20 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.shapes).toHaveLength(1);
      const shape = doc.shapes[0];
      expect(shape.type).toBe("star");
      expect(shape.sides).toBe(5);
      expect(shape.width).toBe(100);
      expect(shape.starInnerRadius).toBeCloseTo(0.4);
    });

    it("positions shape at turtle's current world position", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "penup" },
        { type: "forward", distance: 100 },
        { type: "pendown" },
        { type: "rectangle", width: 20, height: 20 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.shapes).toHaveLength(1);
      // Turtle moved forward (heading 0 = up) by 100 → y = -100
      expect(doc.shapes[0].x).toBeCloseTo(0);
      expect(doc.shapes[0].y).toBeCloseTo(-100);
    });

    it("uses turtle heading as rotation", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "right", angle: 90 },
        { type: "rectangle", width: 50, height: 30 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.shapes).toHaveLength(1);
      // 90 degrees = π/2 radians
      expect(doc.shapes[0].rotation).toBeCloseTo(Math.PI / 2);
    });

    it("shapes do not move the turtle", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "rectangle", width: 100, height: 100 },
        { type: "forward", distance: 50 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      // Shape + stroke both created
      expect(doc.shapes).toHaveLength(1);
      expect(doc.strokes).toHaveLength(1);
      // Turtle should be at (0, -50), not affected by shape
      const state = executor.getMainState()!;
      expect(state.x).toBeCloseTo(0);
      expect(state.y).toBeCloseTo(-50);
    });

    it("clear() removes shapes created by the turtle", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "rectangle", width: 50, height: 50 },
        { type: "forward", distance: 10 },
        { type: "clear" },
        { type: "ellipse", width: 30, height: 30 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      // After clear, only the ellipse remains
      expect(doc.shapes).toHaveLength(1);
      expect(doc.shapes[0].type).toBe("ellipse");
      // Stroke from forward was also cleared
      expect(doc.strokes).toHaveLength(0);
    });

    it("fillcolor(null) creates shapes with no fill", async () => {
      runtime.setCommands([
        { type: "speed", value: 0 },
        { type: "fillcolor", color: "#ff0000" },
        { type: "rectangle", width: 50, height: 50 },
        { type: "fillcolor", color: null },
        { type: "rectangle", width: 30, height: 30 },
      ]);

      const executor = createExecutor();
      const resultPromise = executor.run("test");
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(doc.shapes).toHaveLength(2);
      expect(doc.shapes[0].fillColor).toBe("#ff0000");
      expect(doc.shapes[1].fillColor).toBeNull();
    });
  });
});
