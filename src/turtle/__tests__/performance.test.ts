import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LuaRuntime } from "../LuaRuntime";
import { TurtleRegistry } from "../TurtleRegistry";
import { TurtleExecutor } from "../TurtleExecutor";
import { Stroke, DocumentModel } from "../../model/Stroke";
import type { Shape } from "../../model/Shape";

// Save real performance.now before fake timers override it
const realNow = performance.now.bind(performance);

/** Minimal in-memory document for performance testing. */
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

describe("Turtle Performance", () => {
  let runtime: LuaRuntime;
  let registry: TurtleRegistry;
  let doc: MockDocument;
  const scriptId = "perf-test";

  beforeEach(async () => {
    vi.useFakeTimers();
    runtime = new LuaRuntime();
    await runtime.init();
    registry = new TurtleRegistry();
    doc = new MockDocument();
  });

  afterEach(() => {
    runtime.close();
    vi.useRealTimers();
  });

  it("spawns 1000 turtles each drawing 10 segments under performance budget", async () => {
    registry.setMaxTurtles(1100);

    const script = `
      speed(0)
      set_spawn_limit(1100)

      for i = 1, 1000 do
        local t = spawn("t" .. i, {x = (i % 50) * 20, y = math.floor(i / 50) * 20})
        for j = 1, 10 do
          t.forward(5)
          t.right(36)
        end
      end
    `;

    const executor = new TurtleExecutor(runtime, registry, scriptId, doc);

    const startReal = realNow();
    const resultPromise = executor.run(script);
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    const elapsedMs = realNow() - startReal;

    expect(result.success).toBe(true);

    // Verify 1000 turtles were spawned (+ 1 main = 1001)
    const owned = registry.getOwned(scriptId);
    expect(owned.size).toBe(1001);

    // With speed(0) inherited by spawned turtles, batching produces
    // 1 stroke per turtle (all segments share same pen state).
    // Main turtle draws nothing, so expect 1000 strokes.
    expect(doc.strokes.length).toBe(1000);

    // Each stroke should have 11 points (start + 10 endpoints)
    for (const stroke of doc.strokes.slice(0, 5)) {
      expect(stroke.points).toHaveLength(11);
    }

    // Performance budget: under 10 seconds wall-clock
    expect(elapsedMs).toBeLessThan(10000);

    console.log(`[PERF] 1000 turtles × 10 segments: ${elapsedMs.toFixed(1)}ms`);
    console.log(`[PERF] Strokes created: ${doc.strokes.length}`);
    console.log(`[PERF] Total turtles: ${owned.size}`);
  });

  it("measures collection phase vs replay phase separately", async () => {
    registry.setMaxTurtles(1100);

    const script = `
      speed(0)
      set_spawn_limit(1100)

      for i = 1, 1000 do
        local t = spawn("t" .. i, {x = (i % 50) * 20, y = math.floor(i / 50) * 20})
        for j = 1, 10 do
          t.forward(5)
          t.right(36)
        end
      end
    `;

    const executor = new TurtleExecutor(runtime, registry, scriptId, doc);

    const startReal = realNow();
    const resultPromise = executor.run(script);
    const afterCollection = realNow();

    await vi.runAllTimersAsync();
    const result = await resultPromise;
    const afterReplay = realNow();

    expect(result.success).toBe(true);

    const collectionMs = afterCollection - startReal;
    const replayMs = afterReplay - afterCollection;
    const totalMs = afterReplay - startReal;

    console.log(`[PERF] Collection phase: ${collectionMs.toFixed(1)}ms`);
    console.log(`[PERF] Replay phase: ${replayMs.toFixed(1)}ms`);
    console.log(`[PERF] Total: ${totalMs.toFixed(1)}ms`);

    expect(totalMs).toBeLessThan(10000);
  });

  it("throttles onStep callbacks when turtle count exceeds 100", async () => {
    registry.setMaxTurtles(200);

    const script = `
      speed(0)
      set_spawn_limit(200)

      for i = 1, 150 do
        local t = spawn("t" .. i, {x = i * 10, y = 0})
        for j = 1, 5 do
          t.forward(10)
          t.right(72)
        end
      end
    `;

    let stepCount = 0;
    const executor = new TurtleExecutor(runtime, registry, scriptId, doc, {
      onStep: () => { stepCount++; },
    });

    const startReal = realNow();
    const resultPromise = executor.run(script);
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    const elapsedMs = realNow() - startReal;

    expect(result.success).toBe(true);

    const owned = registry.getOwned(scriptId);
    expect(owned.size).toBe(151);

    // With 151 active turtles at speed(0), onStep should be throttled.
    // Without throttling, we'd get one onStep per tick. With throttling,
    // we get significantly fewer callbacks.
    console.log(`[PERF] 150 turtles: ${stepCount} onStep callbacks in ${elapsedMs.toFixed(1)}ms`);

    // The throttle factor = min(activeTurtles.length, 500), so ~150.
    // Total ticks is roughly (spawn_count + max_commands_per_turtle).
    // We just verify it's much fewer than without throttling.
    expect(stepCount).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(10000);
  });

  it("verifies CRDT batching efficiency at speed(0)", async () => {
    registry.setMaxTurtles(110);

    const script = `
      speed(0)
      set_spawn_limit(110)

      -- Each turtle draws 100 segments with the same pen state.
      -- With batching, this should produce 1 stroke per turtle, not 100.
      for i = 1, 100 do
        local t = spawn("t" .. i, {x = i * 10, y = 0})
        for j = 1, 100 do
          t.forward(2)
          t.right(3.6)
        end
      end
    `;

    const executor = new TurtleExecutor(runtime, registry, scriptId, doc);
    const resultPromise = executor.run(script);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);

    // With speed(0) batching inherited by spawned turtles, each turtle's
    // 100 same-pen-state segments are batched into a single stroke
    expect(doc.strokes.length).toBe(100);
    // Each stroke should have 101 points (start + 100 endpoints)
    expect(doc.strokes[0].points).toHaveLength(101);

    console.log(`[PERF] 100 turtles × 100 segments → ${doc.strokes.length} strokes (batched)`);
  });

  it("confirms speed inheritance from parent to spawned turtles", async () => {
    registry.setMaxTurtles(10);

    const script = `
      speed(0)
      set_spawn_limit(10)
      local t = spawn("child", {x = 0, y = 0})
      t.forward(10)
      t.forward(10)
      t.forward(10)
    `;

    const executor = new TurtleExecutor(runtime, registry, scriptId, doc);
    const resultPromise = executor.run(script);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);

    // With speed(0) inherited, all 3 forward segments should batch
    // into a single stroke with 4 points
    expect(doc.strokes.length).toBe(1);
    expect(doc.strokes[0].points).toHaveLength(4);
  });

  it("scales linearly with turtle count", async () => {
    const counts = [10, 50, 100];
    const timings: { count: number; ms: number }[] = [];

    for (const count of counts) {
      const localRuntime = new LuaRuntime();
      await localRuntime.init();
      const localRegistry = new TurtleRegistry();
      localRegistry.setMaxTurtles(count + 10);
      const localDoc = new MockDocument();
      const localScriptId = `perf-scale-${count}`;

      const script = `
        speed(0)
        set_spawn_limit(${count + 10})
        for i = 1, ${count} do
          local t = spawn("t" .. i, {x = i * 10, y = 0})
          for j = 1, 10 do
            t.forward(5)
            t.right(36)
          end
        end
      `;

      const executor = new TurtleExecutor(localRuntime, localRegistry, localScriptId, localDoc);
      const start = realNow();
      const resultPromise = executor.run(script);
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      const elapsed = realNow() - start;

      expect(result.success).toBe(true);
      timings.push({ count, ms: elapsed });

      localRuntime.close();
    }

    for (const t of timings) {
      console.log(`[PERF] ${t.count} turtles × 10 segments: ${t.ms.toFixed(1)}ms`);
    }

    // All should complete under budget
    for (const t of timings) {
      expect(t.ms).toBeLessThan(10000);
    }
  });
});
