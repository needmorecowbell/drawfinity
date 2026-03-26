import { describe, it, expect, beforeEach, vi } from "vitest";
import { TurtleExecutor, TurtleExecutorEvents } from "../TurtleExecutor";
import { TurtleRegistry } from "../TurtleRegistry";
import { TurtleCommand } from "../LuaRuntime";
import { Stroke, DocumentModel } from "../../model/Stroke";
import { lineIntersectsStroke, segmentToSegmentDistance } from "../turtleEraseUtils";
import { TurtleDrawing } from "../TurtleDrawing";
import { MovementSegment, PenState } from "../TurtleState";

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
 * Fake LuaRuntime that returns preconfigured commands.
 */
class FakeLuaRuntime {
  private commands: TurtleCommand[] = [];

  setCommands(cmds: TurtleCommand[]): void {
    this.commands = cmds;
  }

  setStateQuery(): void {}
  setActiveTurtle(): void {}
  setSpawnContext(): void {}
  setMessagingContext(): void {}
  setSyncManager(): void {}

  async execute() {
    return { success: true as const };
  }

  getCommands(): TurtleCommand[] {
    return this.commands;
  }

  close(): void {}
}

function makePen(overrides: Partial<PenState> = {}): PenState {
  return { down: true, color: "#000000", width: 3, opacity: 1.0, ...overrides };
}

function makeSegment(
  fromX: number, fromY: number, toX: number, toY: number,
  pen?: Partial<PenState>,
): MovementSegment {
  return { fromX, fromY, toX, toY, pen: makePen(pen) };
}

describe("segmentToSegmentDistance", () => {
  it("returns 0 for overlapping segments", () => {
    const dist = segmentToSegmentDistance(0, 0, 10, 0, 5, 0, 15, 0);
    expect(dist).toBe(0);
  });

  it("returns distance between parallel segments", () => {
    const dist = segmentToSegmentDistance(0, 0, 10, 0, 0, 5, 10, 5);
    expect(dist).toBe(5);
  });

  it("returns distance between perpendicular non-intersecting segments", () => {
    const dist = segmentToSegmentDistance(0, 0, 10, 0, 5, 3, 5, 10);
    expect(dist).toBe(3);
  });

  it("returns 0 for crossing segments", () => {
    const dist = segmentToSegmentDistance(0, -5, 0, 5, -5, 0, 5, 0);
    expect(dist).toBe(0);
  });

  it("returns correct distance for point-like segments", () => {
    const dist = segmentToSegmentDistance(0, 0, 0, 0, 3, 4, 3, 4);
    expect(dist).toBeCloseTo(5);
  });
});

describe("lineIntersectsStroke", () => {
  it("detects intersection when line passes through stroke", () => {
    const stroke: Stroke = {
      id: "s1",
      points: [{ x: 0, y: 0, pressure: 1 }, { x: 100, y: 0, pressure: 1 }],
      color: "#000", width: 2, timestamp: 0,
    };
    // Line crosses perpendicular
    expect(lineIntersectsStroke(50, -10, 50, 10, stroke, 1)).toBe(true);
  });

  it("detects no intersection when line is far away", () => {
    const stroke: Stroke = {
      id: "s1",
      points: [{ x: 0, y: 0, pressure: 1 }, { x: 100, y: 0, pressure: 1 }],
      color: "#000", width: 2, timestamp: 0,
    };
    expect(lineIntersectsStroke(50, 50, 50, 100, stroke, 1)).toBe(false);
  });

  it("accounts for stroke width in hit-testing", () => {
    const stroke: Stroke = {
      id: "s1",
      points: [{ x: 0, y: 0, pressure: 1 }, { x: 100, y: 0, pressure: 1 }],
      color: "#000", width: 10, timestamp: 0,
    };
    // Line is 4 units away from stroke center, but within stroke half-width (5) + radius (1) = 6
    expect(lineIntersectsStroke(50, 4, 60, 4, stroke, 1)).toBe(true);
  });

  it("handles single-point strokes", () => {
    const stroke: Stroke = {
      id: "s1",
      points: [{ x: 5, y: 5, pressure: 1 }],
      color: "#000", width: 2, timestamp: 0,
    };
    // Line passes near the point
    expect(lineIntersectsStroke(0, 5, 10, 5, stroke, 1)).toBe(true);
    // Line is far from the point
    expect(lineIntersectsStroke(0, 50, 10, 50, stroke, 1)).toBe(false);
  });

  it("handles empty stroke", () => {
    const stroke: Stroke = {
      id: "s1", points: [], color: "#000", width: 2, timestamp: 0,
    };
    expect(lineIntersectsStroke(0, 0, 10, 10, stroke, 5)).toBe(false);
  });
});

describe("TurtleDrawing.eraseAlongSegment", () => {
  let doc: MockDocument;
  let drawing: TurtleDrawing;

  beforeEach(() => {
    doc = new MockDocument();
    drawing = new TurtleDrawing(doc);
  });

  it("erases strokes along a movement segment", () => {
    // Add a hand-drawn stroke at y=0 from x=0 to x=100
    doc.addStroke({
      id: "hand-1",
      points: [{ x: 0, y: 0, pressure: 1 }, { x: 100, y: 0, pressure: 1 }],
      color: "#000", width: 2, timestamp: 0,
    });

    const seg = makeSegment(50, -10, 50, 10);
    drawing.eraseAlongSegment(seg, 5, null);

    expect(doc.strokes).toHaveLength(0);
  });

  it("does not erase strokes that are far from the path", () => {
    doc.addStroke({
      id: "far-away",
      points: [{ x: 0, y: 100, pressure: 1 }, { x: 100, y: 100, pressure: 1 }],
      color: "#000", width: 2, timestamp: 0,
    });

    const seg = makeSegment(0, 0, 100, 0);
    drawing.eraseAlongSegment(seg, 5, null);

    expect(doc.strokes).toHaveLength(1);
  });

  it("only erases turtle strokes when turtleStrokeIds is provided", () => {
    // Hand-drawn stroke
    doc.addStroke({
      id: "hand-1",
      points: [{ x: 0, y: 0, pressure: 1 }, { x: 50, y: 0, pressure: 1 }],
      color: "#000", width: 2, timestamp: 0,
    });
    // Turtle stroke
    doc.addStroke({
      id: "turtle-1",
      points: [{ x: 50, y: 0, pressure: 1 }, { x: 100, y: 0, pressure: 1 }],
      color: "#000", width: 2, timestamp: 0,
    });

    const seg = makeSegment(25, -5, 75, -5);
    const turtleIds = new Set(["turtle-1"]);
    drawing.eraseAlongSegment(seg, 5, turtleIds);

    // Only turtle stroke should be removed
    expect(doc.strokes).toHaveLength(1);
    expect(doc.strokes[0].id).toBe("hand-1");
  });

  it("removes erased IDs from tracked strokeIds", () => {
    // Create a turtle stroke via the drawing
    drawing.addSegment(makeSegment(0, 0, 100, 0), false);
    expect(drawing.getStrokeIds()).toHaveLength(1);

    // Erase it
    const seg = makeSegment(50, -10, 50, 10);
    drawing.eraseAlongSegment(seg, 5, null);

    expect(doc.strokes).toHaveLength(0);
    expect(drawing.getStrokeIds()).toHaveLength(0);
  });
});

describe("TurtleExecutor erase mode integration", () => {
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

  it("default erase mode erases all strokes under the path", async () => {
    // Pre-populate with a hand-drawn stroke crossing the turtle's path
    doc.addStroke({
      id: "hand-drawn",
      points: [
        { x: -50, y: -50, pressure: 1 },
        { x: 50, y: -50, pressure: 1 },
      ],
      color: "#000", width: 2, timestamp: 0,
    });

    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "penmode", mode: "erase", turtleOnly: false },
      { type: "forward", distance: 100 },  // moves from (0,0) to (0,-100), crossing the stroke at y=-50
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    // The hand-drawn stroke should be erased
    expect(doc.strokes).toHaveLength(0);
  });

  it("erase mode does not create strokes", async () => {
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "penmode", mode: "erase", turtleOnly: false },
      { type: "forward", distance: 100 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    await resultPromise;

    // No strokes should be created in erase mode
    expect(doc.strokes).toHaveLength(0);
  });

  it("turtle_only flag only erases turtle-drawn strokes", async () => {
    // Pre-populate with a hand-drawn stroke
    doc.addStroke({
      id: "hand-drawn",
      points: [
        { x: -50, y: -50, pressure: 1 },
        { x: 50, y: -50, pressure: 1 },
      ],
      color: "#000", width: 2, timestamp: 0,
    });

    runtime.setCommands([
      { type: "speed", value: 0 },
      // First draw a turtle stroke that crosses x-axis at y=-50
      { type: "forward", distance: 50 },  // stroke from (0,0) to (0,-50)
      // Switch to erase mode with turtle_only
      { type: "penmode", mode: "erase", turtleOnly: true },
      // Move back over the same area
      { type: "penup" },
      { type: "home" as "goto", x: 0, y: 0 } as TurtleCommand,
    ]);

    // Need to go back and erase. Let me simplify: draw a stroke, then erase over it
    // with turtle_only, and verify only turtle strokes are removed.
    runtime.setCommands([
      { type: "speed", value: 0 },
      // Draw a turtle stroke along x-axis
      { type: "right", angle: 90 },       // point right
      { type: "forward", distance: 100 },  // (0,0) → (100,0)
      // Now switch to erase and go back over it
      { type: "penmode", mode: "erase", turtleOnly: true },
      { type: "backward", distance: 100 }, // (100,0) → (0,0), erasing along same path
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    await resultPromise;

    // The hand-drawn stroke at y=-50 should survive (it's not a turtle stroke)
    // The turtle-drawn stroke at y=0 should be erased
    const remaining = doc.strokes.map(s => s.id);
    expect(remaining).toContain("hand-drawn");
    // Turtle stroke should have been erased
    expect(doc.strokes).toHaveLength(1);
  });

  it("hand-drawn strokes survive when turtle_only is set", async () => {
    // Place a hand-drawn stroke right on the path the turtle will erase
    doc.addStroke({
      id: "hand-drawn",
      points: [
        { x: 0, y: 0, pressure: 1 },
        { x: 0, y: -100, pressure: 1 },
      ],
      color: "#000", width: 2, timestamp: 0,
    });

    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "penmode", mode: "erase", turtleOnly: true },
      { type: "forward", distance: 100 },  // same path as hand-drawn stroke
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    await resultPromise;

    // Hand-drawn stroke should survive because turtle_only is set
    // and there are no turtle strokes to erase
    expect(doc.strokes).toHaveLength(1);
    expect(doc.strokes[0].id).toBe("hand-drawn");
  });

  it("switching back to draw mode creates strokes again", async () => {
    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "penmode", mode: "erase", turtleOnly: false },
      { type: "forward", distance: 50 },
      { type: "penmode", mode: "draw", turtleOnly: false },
      { type: "forward", distance: 50 },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    await resultPromise;

    // Only the second forward (in draw mode) should create a stroke
    expect(doc.strokes).toHaveLength(1);
  });

  it("erase mode works with pen up (no erasure when pen is up)", async () => {
    doc.addStroke({
      id: "target",
      points: [
        { x: 0, y: 0, pressure: 1 },
        { x: 0, y: -100, pressure: 1 },
      ],
      color: "#000", width: 2, timestamp: 0,
    });

    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "penmode", mode: "erase", turtleOnly: false },
      { type: "penup" },
      { type: "forward", distance: 100 },  // pen is up, no segment produced
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    await resultPromise;

    // Stroke should survive because pen was up
    expect(doc.strokes).toHaveLength(1);
  });

  it("erased turtle strokes are not removed again by clear()", async () => {
    runtime.setCommands([
      { type: "speed", value: 0 },
      // Draw a stroke
      { type: "forward", distance: 50 },
      // Erase it
      { type: "penmode", mode: "erase", turtleOnly: false },
      { type: "backward", distance: 50 },
      // Clear should not error even though stroke is already gone
      { type: "clear" },
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(doc.strokes).toHaveLength(0);
  });

  it("erase mode with goto command works", async () => {
    doc.addStroke({
      id: "target",
      points: [
        { x: 25, y: -10, pressure: 1 },
        { x: 25, y: 10, pressure: 1 },
      ],
      color: "#000", width: 2, timestamp: 0,
    });

    runtime.setCommands([
      { type: "speed", value: 0 },
      { type: "penmode", mode: "erase", turtleOnly: false },
      { type: "goto", x: 50, y: 0 },  // line from (0,0) to (50,0), crossing stroke at x=25
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(doc.strokes).toHaveLength(0);
  });

  it("multi-turtle erase: spawned turtle can erase main turtle strokes with turtle_only", async () => {
    runtime.setCommands([
      { type: "speed", value: 0 },
      // Main turtle draws a horizontal line
      { type: "right", angle: 90 },
      { type: "forward", distance: 100 },  // main draws (0,0)→(100,0)
      // Spawn eraser turtle at (50, 10)
      { type: "spawn", id: "eraser", x: 50, y: 10 },
      { type: "speed", value: 0, turtleId: "eraser" },
      { type: "penmode", mode: "erase", turtleOnly: true, turtleId: "eraser" },
      // Eraser moves down, crossing main's stroke
      { type: "forward", distance: 30, turtleId: "eraser" },  // (50,10)→(50,-20)
    ]);

    const executor = createExecutor();
    const resultPromise = executor.run("test");
    await vi.runAllTimersAsync();
    await resultPromise;

    // Main turtle's stroke should be erased because it's a turtle stroke
    // (turtle_only considers ALL turtle strokes across all turtles)
    expect(doc.strokes).toHaveLength(0);
  });
});
