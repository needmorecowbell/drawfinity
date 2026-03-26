import { describe, it, expect, beforeEach } from "vitest";
import { TurtleState } from "../TurtleState";
import { TurtleRegistry } from "../TurtleRegistry";
import { TurtleExecutor } from "../TurtleExecutor";
import { LuaRuntime } from "../LuaRuntime";
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

describe("TurtleState scaleFactor", () => {
  let state: TurtleState;

  beforeEach(() => {
    state = new TurtleState();
  });

  it("defaults scaleFactor to 1.0", () => {
    expect(state.scaleFactor).toBe(1.0);
  });

  it("defaults scalePen to false", () => {
    expect(state.scalePen).toBe(false);
  });

  it("scales forward distance by scaleFactor", () => {
    state.scaleFactor = 0.5;
    state.applyCommand({ type: "forward", distance: 100 });
    // Heading 0 = up, so Y decreases
    expect(state.x).toBeCloseTo(0);
    expect(state.y).toBeCloseTo(-50); // 100 * 0.5
  });

  it("scales backward distance by scaleFactor", () => {
    state.scaleFactor = 2.0;
    state.applyCommand({ type: "backward", distance: 30 });
    expect(state.y).toBeCloseTo(60); // 30 * 2.0
  });

  it("scales distance with heading applied", () => {
    state.scaleFactor = 0.5;
    state.applyCommand({ type: "right", angle: 90 });
    state.applyCommand({ type: "forward", distance: 100 });
    expect(state.x).toBeCloseTo(50); // 100 * 0.5
    expect(state.y).toBeCloseTo(0);
  });

  it("does NOT scale pen width by default", () => {
    state.scaleFactor = 0.5;
    state.pen.width = 10;
    const seg = state.applyCommand({ type: "forward", distance: 100 });
    expect(seg).not.toBeNull();
    // Pen width should NOT be scaled (scalePen is false)
    expect(seg!.pen.width).toBe(10);
  });

  it("scales pen width when scalePen is enabled", () => {
    state.scaleFactor = 0.5;
    state.scalePen = true;
    state.pen.width = 10;
    const seg = state.applyCommand({ type: "forward", distance: 100 });
    expect(seg).not.toBeNull();
    expect(seg!.pen.width).toBe(5); // 10 * 0.5
  });

  it("applies scale_pen command", () => {
    state.applyCommand({ type: "scale_pen", enabled: true } as TurtleCommand);
    expect(state.scalePen).toBe(true);
    state.applyCommand({ type: "scale_pen", enabled: false } as TurtleCommand);
    expect(state.scalePen).toBe(false);
  });

  it("resets scaleFactor and scalePen on reset", () => {
    state.scaleFactor = 3.0;
    state.scalePen = true;
    state.reset();
    expect(state.scaleFactor).toBe(1.0);
    expect(state.scalePen).toBe(false);
  });

  it("does not scale goto coordinates (goto sets absolute position)", () => {
    state.scaleFactor = 2.0;
    state.applyCommand({ type: "goto", x: 50, y: 50 });
    // goto sets position absolutely, not scaled
    expect(state.x).toBe(50);
    expect(state.y).toBe(50);
  });
});

describe("TurtleRegistry scale inheritance", () => {
  let registry: TurtleRegistry;
  let doc: MockDocument;

  beforeEach(() => {
    registry = new TurtleRegistry();
    doc = new MockDocument();
  });

  it("sets scaleFactor from spawn options", () => {
    registry.createMain("s1", doc);
    registry.spawn("child", "s1", doc, undefined, { scale: 0.5 });
    const child = registry.get("s1:child")!;
    expect(child.state.scaleFactor).toBe(0.5);
  });

  it("compounds parent scale with child scale", () => {
    registry.createMain("s1", doc);
    // Parent scale is 1.0 (default), child scale is 0.5
    registry.spawn("child", "s1", doc, undefined, { scale: 0.5 });
    const child = registry.get("s1:child")!;
    expect(child.state.scaleFactor).toBe(0.5); // 1.0 * 0.5

    // Grandchild of child with scale 0.3
    registry.spawn("grandchild", "s1", doc, "s1:child", { scale: 0.3 });
    const grandchild = registry.get("s1:grandchild")!;
    expect(grandchild.state.scaleFactor).toBeCloseTo(0.15); // 0.5 * 0.3
  });

  it("uses parent scale as base when no child scale specified", () => {
    registry.createMain("s1", doc);
    const main = registry.get("s1:main")!;
    main.state.scaleFactor = 2.0;
    registry.spawn("child", "s1", doc, undefined, {});
    const child = registry.get("s1:child")!;
    expect(child.state.scaleFactor).toBe(2.0); // parent 2.0 * default 1.0
  });
});

describe("LuaRuntime scale integration", () => {
  let runtime: LuaRuntime;
  let registry: TurtleRegistry;
  let doc: MockDocument;

  beforeEach(async () => {
    runtime = new LuaRuntime();
    await runtime.init();
    registry = new TurtleRegistry();
    doc = new MockDocument();
    registry.createMain("test", doc);
    const mainEntry = registry.get("test:main")!;
    runtime.setStateQuery(mainEntry.state);
    runtime.setSpawnContext(registry, "test", doc);
    const { MessageBus, Blackboard } = await import("../TurtleMessaging");
    const bus = new MessageBus();
    const board = new Blackboard();
    bus.register("test:main");
    runtime.setMessagingContext(bus, board);
    runtime.setActiveTurtle("main");
  });

  it("passes scale option through spawn command", async () => {
    const result = await runtime.execute(`
      local t = spawn("s1", {x = 10, y = 20, scale = 0.5})
    `);
    expect(result.success).toBe(true);
    const cmds = runtime.getCommands();
    const spawnCmd = cmds.find((c) => c.type === "spawn");
    expect(spawnCmd).toBeDefined();
    expect((spawnCmd as any).scale).toBe(0.5);
  });

  it("spawn_at_scale creates turtle with correct scale", async () => {
    const result = await runtime.execute(`
      local t = spawn_at_scale("s2", 0.25, 5, 10)
    `);
    expect(result.success).toBe(true);
    const cmds = runtime.getCommands();
    const spawnCmd = cmds.find((c) => c.type === "spawn");
    expect(spawnCmd).toBeDefined();
    expect((spawnCmd as any).scale).toBe(0.25);
    expect((spawnCmd as any).x).toBe(5);
    expect((spawnCmd as any).y).toBe(10);
  });

  it("scale_pen command is produced", async () => {
    const result = await runtime.execute(`
      scale_pen(true)
    `);
    expect(result.success).toBe(true);
    const cmds = runtime.getCommands();
    expect(cmds).toContainEqual({ type: "scale_pen", enabled: true });
  });

  it("scale_pen on spawned turtle handle", async () => {
    const result = await runtime.execute(`
      local t = spawn("s3", {scale = 0.5})
      t.scale_pen(true)
    `);
    expect(result.success).toBe(true);
    const cmds = runtime.getCommands();
    const scalePenCmd = cmds.find((c) => c.type === "scale_pen" && c.turtleId === "s3");
    expect(scalePenCmd).toBeDefined();
    expect((scalePenCmd as any).enabled).toBe(true);
  });

  it("spawned turtle forward uses compounded scale", async () => {
    const result = await runtime.execute(`
      local t = spawn("s4", {scale = 0.5})
      t.forward(100)
    `);
    expect(result.success).toBe(true);
    // Verify the spawned turtle's state has the correct scale
    const entry = registry.get("test:s4");
    expect(entry).toBeDefined();
    expect(entry!.state.scaleFactor).toBe(0.5);
  });
});

describe("TurtleExecutor scale replay", () => {
  let doc: MockDocument;
  let registry: TurtleRegistry;

  beforeEach(() => {
    doc = new MockDocument();
    registry = new TurtleRegistry();
  });

  it("shapes are scaled by scaleFactor during replay", async () => {
    const runtime = new LuaRuntime();
    await runtime.init();

    registry.createMain("test", doc);
    const executor = new TurtleExecutor(
      runtime as any,
      registry,
      "test",
      doc,
    );

    const result = await executor.run(`
      speed(0)
      local t = spawn("scaled", {x = 0, y = 0, scale = 0.5})
      t.speed(0)
      t.fillcolor("#ff0000")
      t.rectangle(100, 100)
    `);

    expect(result.success).toBe(true);
    // The shape should have dimensions scaled by 0.5
    const shapes = doc.getShapes();
    const scaledShape = shapes.find((s) => s.type === "rectangle");
    expect(scaledShape).toBeDefined();
    // width = 100 * zoomScale(1) * scaleFactor(0.5) = 50
    expect(scaledShape!.width).toBeCloseTo(50);
    expect(scaledShape!.height).toBeCloseTo(50);
  });

  it("strokes from scaled turtle have scaled distance", async () => {
    const runtime = new LuaRuntime();
    await runtime.init();

    registry.createMain("test", doc);
    const executor = new TurtleExecutor(
      runtime as any,
      registry,
      "test",
      doc,
    );

    const result = await executor.run(`
      speed(0)
      local t = spawn("scaled", {x = 0, y = 0, scale = 0.5})
      t.speed(0)
      t.forward(200)
    `);

    expect(result.success).toBe(true);
    // The spawned turtle should have moved 200 * 0.5 = 100 logical units
    const entry = registry.get("test:scaled")!;
    expect(entry.state.y).toBeCloseTo(entry.state.getOrigin().y - 100);
  });

  it("scale_pen affects stroke pen width during replay", async () => {
    const runtime = new LuaRuntime();
    await runtime.init();

    registry.createMain("test", doc);
    const executor = new TurtleExecutor(
      runtime as any,
      registry,
      "test",
      doc,
    );

    const result = await executor.run(`
      speed(0)
      local t = spawn("scaled", {x = 0, y = 0, scale = 0.5})
      t.speed(0)
      t.penwidth(10)
      t.scale_pen(true)
      t.forward(100)
    `);

    expect(result.success).toBe(true);
    // With scale_pen enabled: pen width should be 10 * 0.5 = 5
    // Check the stroke was created with scaled pen width
    const strokes = doc.getStrokes();
    expect(strokes.length).toBeGreaterThan(0);
    // The stroke should have width = 10 * zoomScale(1) * presetWidthMultiplier(1) * scaleFactor(0.5) = 5
    const scaledStroke = strokes[strokes.length - 1];
    expect(scaledStroke.width).toBeCloseTo(5);
  });
});
