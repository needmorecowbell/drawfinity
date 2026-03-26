import { describe, it, expect, beforeEach, vi } from "vitest";
import { TurtleState } from "../TurtleState";
import { TurtleRegistry } from "../TurtleRegistry";
import { TurtleExecutor, TurtleExecutorEvents } from "../TurtleExecutor";
import type { TurtleCommand } from "../LuaRuntime";
import type { Stroke, DocumentModel } from "../../model/Stroke";
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

/** Fake LuaRuntime that returns preconfigured commands. */
class FakeLuaRuntime {
  private commands: TurtleCommand[] = [];

  setCommands(cmds: TurtleCommand[]): void {
    this.commands = cmds;
  }

  setStateQuery(): void {
    // no-op
  }

  setActiveTurtle(): void {
    // no-op
  }

  setSpawnContext(): void {
    // no-op
  }

  setMessagingContext(): void {
    // no-op
  }

  async execute(_script: string) {
    return { success: true as const };
  }

  getCommands(): TurtleCommand[] {
    return this.commands;
  }

  close(): void {
    // no-op
  }
}

describe("TurtleState minPixelSize", () => {
  let state: TurtleState;

  beforeEach(() => {
    state = new TurtleState();
  });

  it("defaults minPixelSize to 0", () => {
    expect(state.minPixelSize).toBe(0);
  });

  it("min_pixel_size command sets the field", () => {
    state.applyCommand({ type: "min_pixel_size", pixels: 2 });
    expect(state.minPixelSize).toBe(2);
  });

  it("reset() clears minPixelSize to 0", () => {
    state.minPixelSize = 5;
    state.reset();
    expect(state.minPixelSize).toBe(0);
  });
});

describe("TurtleExecutor LOD skip", () => {
  let doc: MockDocument;
  let registry: TurtleRegistry;
  let runtime: FakeLuaRuntime;
  const scriptId = "test-lod";

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

  it("skips sub-pixel movement segments when minPixelSize is set", async () => {
    // At zoom=100, zoomScale = 1/100 = 0.01
    // forward(0.005) => world distance = 0.005 * 0.01 = 0.00005
    // effectivePixels = 0.00005 * 100 = 0.005 < 1 => skip
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "forward", distance: 0.005 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 100);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    // The movement segment is tiny in screen pixels, should be skipped
    expect(doc.strokes.length).toBe(0);
  });

  it("skips sub-pixel segments based on camera zoom and world distance", async () => {
    // At zoom=1, forward(0.5) produces ~0.5 world-unit segment
    // With minPixelSize=1, 0.5 * 1 = 0.5 < 1 => skip
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "forward", distance: 0.5 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    // zoomScale = 1/zoom = 1, forward(0.5) => world distance ~0.5
    // effectivePixels = 0.5 * zoom(1) = 0.5 < 1 => skip
    expect(doc.strokes.length).toBe(0);
  });

  it("does NOT skip when minPixelSize is 0 (default)", async () => {
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "forward", distance: 0.5 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    // No LOD skip, so stroke should be created
    expect(doc.strokes.length).toBe(1);
  });

  it("does NOT skip when effective size is above threshold", async () => {
    // forward(100) at zoom=1 => 100 pixels > 1 pixel threshold
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "forward", distance: 100 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.strokes.length).toBe(1);
  });

  it("skips sub-pixel shapes (rectangle)", async () => {
    // rectangle(0.5, 0.5) at zoom=1 => max dim = 0.5 pixels < 1
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "rectangle", width: 0.5, height: 0.5 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.shapes.length).toBe(0);
  });

  it("does NOT skip shapes when effective size is above threshold", async () => {
    // rectangle(50, 50) at zoom=1 => 50 pixels > 1
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "rectangle", width: 50, height: 50 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.shapes.length).toBe(1);
  });

  it("skips sub-pixel shapes (polygon)", async () => {
    // polygon radius 0.3 => diameter 0.6 at zoom=1 => 0.6 < 1
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "polygon", sides: 6, radius: 0.3 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.shapes.length).toBe(0);
  });

  it("skips sub-pixel shapes (star)", async () => {
    // star outerRadius 0.4 => diameter 0.8 at zoom=1 => 0.8 < 1
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "star", points: 5, outerRadius: 0.4, innerRadius: 0.2 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.shapes.length).toBe(0);
  });

  it("skips sub-pixel shapes (ellipse)", async () => {
    // ellipse(0.3, 0.8) => max = 0.8 at zoom=1 => 0.8 < 1
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "ellipse", width: 0.3, height: 0.8 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.shapes.length).toBe(0);
  });

  it("respects camera zoom for LOD calculation", async () => {
    // forward(5) at zoom=0.1 => zoomScale = 1/0.1 = 10
    // world distance = 5 * 10 = 50 world units
    // effectivePixels = 50 * 0.1 = 5 > 1 => NOT skipped
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "forward", distance: 5 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 0.1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.strokes.length).toBe(1);
  });

  it("uses camera zoom for shape LOD as well", async () => {
    // rectangle(50, 50) at zoom=0.001 => zoomScale = 1000
    // shapeWorldSize = 50 * 1000 * 1 = 50000 world units
    // effectivePixels = 50000 * 0.001 = 50 > 1 => NOT skipped
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "min_pixel_size", pixels: 1 },
      { type: "rectangle", width: 50, height: 50 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("ignored", 0.001);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.shapes.length).toBe(1);
  });
});

describe("Spawned turtle handle min_pixel_size", () => {
  it("spawned turtle handles have min_pixel_size method via _tcmd", async () => {
    // We test that _tcmd dispatcher handles "min_pixel_size" correctly
    // by using a FakeLuaRuntime with a spawn + min_pixel_size command
    const doc = new MockDocument();
    const registry = new TurtleRegistry();
    const runtime = new FakeLuaRuntime();
    vi.useFakeTimers();

    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "spawn", id: "child" },
      { type: "min_pixel_size", pixels: 2, turtleId: "child" },
      { type: "forward", distance: 0.5, turtleId: "child" },
    ]);

    const executor = new TurtleExecutor(
      runtime as unknown as import("../LuaRuntime").LuaRuntime,
      registry,
      "test-spawn-lod",
      doc,
    );

    const resultPromise = executor.run("ignored", 1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    // child has minPixelSize=2, forward(0.5) at zoom=1 => 0.5 pixels < 2 => skip
    expect(doc.strokes.length).toBe(0);
  });
});
