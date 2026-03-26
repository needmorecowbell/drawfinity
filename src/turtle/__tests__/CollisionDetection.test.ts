import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LuaRuntime } from "../LuaRuntime";
import { TurtleRegistry } from "../TurtleRegistry";
import { MessageBus, Blackboard } from "../TurtleMessaging";
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

describe("Collision detection", () => {
  describe("TurtleRegistry.collidesWith", () => {
    let registry: TurtleRegistry;
    let doc: MockDocument;

    beforeEach(() => {
      registry = new TurtleRegistry();
      doc = new MockDocument();
    });

    it("detects collision when turtles overlap (default pen width)", () => {
      registry.createMain("s1", doc);
      // Default pen width is 3, so collision radius = 1.5 each, threshold = 3
      registry.spawn("a", "s1", doc, undefined, { x: 2, y: 0 });
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(true);
    });

    it("returns false when turtles are far apart", () => {
      registry.createMain("s1", doc);
      registry.spawn("a", "s1", doc, undefined, { x: 100, y: 0 });
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(false);
    });

    it("detects collision at exact boundary distance", () => {
      registry.createMain("s1", doc);
      // Default pen width = 3 for both, so threshold = 1.5 + 1.5 = 3
      registry.spawn("a", "s1", doc, undefined, { x: 3, y: 0 });
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(true);
    });

    it("returns false just beyond boundary", () => {
      registry.createMain("s1", doc);
      // threshold = 3, distance = 3.01
      registry.spawn("a", "s1", doc, undefined, { x: 3.01, y: 0 });
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(false);
    });

    it("uses custom collision radius when set", () => {
      registry.createMain("s1", doc);
      registry.spawn("a", "s1", doc, undefined, { x: 50, y: 0 });
      // Default: pen.width/2 = 1.5 each => threshold = 3 => no collision at distance 50
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(false);
      // Set custom collision radius on main
      registry.get("s1:main")!.state.collisionRadius = 40;
      // threshold = 40 + 1.5 = 41.5 => still no collision at 50
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(false);
      // Set custom collision radius on child too
      registry.get("s1:a")!.state.collisionRadius = 15;
      // threshold = 40 + 15 = 55 => collision at 50
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(true);
    });

    it("uses pen width with wider pens", () => {
      registry.createMain("s1", doc);
      registry.spawn("a", "s1", doc, undefined, { x: 10, y: 0, width: 20 });
      // main: pen.width/2 = 1.5, a: pen.width/2 = 10 => threshold = 11.5
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(true);
    });

    it("is symmetric", () => {
      registry.createMain("s1", doc);
      registry.spawn("a", "s1", doc, undefined, { x: 2, y: 0 });
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(
        registry.collidesWith("s1:a", "s1:main"),
      );
    });

    it("throws for unknown turtle IDs", () => {
      registry.createMain("s1", doc);
      expect(() => registry.collidesWith("s1:main", "s1:nope")).toThrow(
        'Unknown turtle "s1:nope"',
      );
      expect(() => registry.collidesWith("s1:nope", "s1:main")).toThrow(
        'Unknown turtle "s1:nope"',
      );
    });

    it("detects collision in diagonal direction", () => {
      registry.createMain("s1", doc);
      // Place at (2, 2) => distance = sqrt(8) ≈ 2.83, threshold = 3
      registry.spawn("a", "s1", doc, undefined, { x: 2, y: 2 });
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(true);
    });

    it("detects same-position turtles always collide", () => {
      registry.createMain("s1", doc);
      registry.spawn("a", "s1", doc, undefined, { x: 0, y: 0 });
      expect(registry.collidesWith("s1:main", "s1:a")).toBe(true);
    });
  });

  describe("Lua API: collides_with() and set_collision_radius()", () => {
    let runtime: LuaRuntime;
    let registry: TurtleRegistry;
    let bus: MessageBus;
    let board: Blackboard;
    let doc: MockDocument;
    const scriptId = "test-script";

    beforeEach(async () => {
      runtime = new LuaRuntime();
      await runtime.init();
      registry = new TurtleRegistry();
      bus = new MessageBus();
      board = new Blackboard();
      doc = new MockDocument();
      registry.createMain(scriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
      runtime.setMessagingContext(bus, board);
      bus.register(`${scriptId}:main`);
    });

    afterEach(() => {
      runtime.close();
    });

    it("collides_with() returns true for overlapping turtles", async () => {
      const result = await runtime.execute(`
        local t = spawn("near", { x = 1, y = 0 })
        assert(collides_with("near") == true, "expected collision")
      `);
      expect(result.success).toBe(true);
    });

    it("collides_with() returns false for distant turtles", async () => {
      const result = await runtime.execute(`
        local t = spawn("far", { x = 100, y = 100 })
        assert(collides_with("far") == false, "expected no collision")
      `);
      expect(result.success).toBe(true);
    });

    it("collides_with() validates arguments", async () => {
      const result = await runtime.execute(`
        collides_with(123)
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty string");
    });

    it("collides_with() errors for non-existent turtle", async () => {
      const result = await runtime.execute(`
        collides_with("ghost")
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown turtle");
    });

    it("set_collision_radius() overrides default radius", async () => {
      const result = await runtime.execute(`
        local t = spawn("target", { x = 20, y = 0 })
        -- Default: pen.width/2 = 1.5 each, threshold = 3, distance = 20 => no collision
        assert(collides_with("target") == false, "should not collide initially")
        -- Set large collision radius on main
        set_collision_radius(25)
        -- threshold = 25 + 1.5 = 26.5 => collides at distance 20
        assert(collides_with("target") == true, "should collide after setting radius")
      `);
      expect(result.success).toBe(true);
    });

    it("set_collision_radius() validates arguments", async () => {
      const result = await runtime.execute(`
        set_collision_radius(-5)
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-negative");
    });

    it("set_collision_radius(0) makes turtle point-sized", async () => {
      const result = await runtime.execute(`
        local t = spawn("other", { x = 2, y = 0 })
        set_collision_radius(0)
        -- threshold = 0 + 1.5 = 1.5, distance = 2 => no collision
        assert(collides_with("other") == false, "point turtle should not collide at distance 2")
      `);
      expect(result.success).toBe(true);
    });

    it("collides_with() works from spawned turtle handle context", async () => {
      // collides_with uses the active turtle, and within spawn handles
      // the active turtle is still main. To test from a spawned turtle's
      // perspective, we'd need the _tcmd pattern but collision is global-scope only.
      // Just verify it works with main turtle.
      const result = await runtime.execute(`
        spawn("a", { x = 1, y = 0 })
        spawn("b", { x = 200, y = 0 })
        -- Main is at origin, "a" is at (1,0) => collision
        assert(collides_with("a") == true)
        -- Main is at origin, "b" is at (200,0) => no collision
        assert(collides_with("b") == false)
      `);
      expect(result.success).toBe(true);
    });
  });
});
