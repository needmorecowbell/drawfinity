import { describe, it, expect, beforeEach } from "vitest";
import {
  TurtleRegistry,
  getTurtleRegistry,
  resetTurtleRegistry,
} from "../TurtleRegistry";
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

describe("TurtleRegistry", () => {
  let registry: TurtleRegistry;
  let doc: MockDocument;

  beforeEach(() => {
    registry = new TurtleRegistry();
    doc = new MockDocument();
  });

  describe("createMain", () => {
    it("creates a main turtle with the correct ID", () => {
      const id = registry.createMain("script1", doc);
      expect(id).toBe("script1:main");
      expect(registry.has(id)).toBe(true);
    });

    it("returns an entry with default TurtleState", () => {
      const id = registry.createMain("script1", doc);
      const entry = registry.get(id)!;
      expect(entry.state.x).toBe(0);
      expect(entry.state.y).toBe(0);
      expect(entry.state.angle).toBe(0);
      expect(entry.scriptId).toBe("script1");
      expect(entry.parentId).toBeNull();
    });

    it("errors on duplicate main turtle", () => {
      registry.createMain("script1", doc);
      expect(() => registry.createMain("script1", doc)).toThrow(
        'Turtle "script1:main" already exists',
      );
    });

    it("allows different scripts to have their own main turtle", () => {
      registry.createMain("script1", doc);
      registry.createMain("script2", doc);
      expect(registry.count()).toBe(2);
    });
  });

  describe("spawn", () => {
    beforeEach(() => {
      registry.createMain("s1", doc);
    });

    it("creates a spawned turtle with full ID", () => {
      const id = registry.spawn("child1", "s1", doc);
      expect(id).toBe("s1:child1");
      expect(registry.has(id)).toBe(true);
    });

    it("defaults parent to script's main turtle", () => {
      registry.spawn("child1", "s1", doc);
      const entry = registry.get("s1:child1")!;
      expect(entry.parentId).toBe("s1:main");
    });

    it("accepts explicit parent ID", () => {
      registry.spawn("child1", "s1", doc);
      registry.spawn("grandchild", "s1", doc, "s1:child1");
      const entry = registry.get("s1:grandchild")!;
      expect(entry.parentId).toBe("s1:child1");
    });

    it("applies spawn options to initial state", () => {
      registry.spawn("child1", "s1", doc, undefined, {
        x: 50,
        y: 100,
        heading: 90,
        color: "#ff0000",
        width: 5,
      });
      const entry = registry.get("s1:child1")!;
      expect(entry.state.x).toBe(50);
      expect(entry.state.y).toBe(100);
      expect(entry.state.angle).toBe(90);
      expect(entry.state.pen.color).toBe("#ff0000");
      expect(entry.state.pen.width).toBe(5);
    });

    it("applies partial spawn options", () => {
      registry.spawn("child1", "s1", doc, undefined, { x: 42 });
      const entry = registry.get("s1:child1")!;
      expect(entry.state.x).toBe(42);
      expect(entry.state.y).toBe(0); // default
      expect(entry.state.angle).toBe(0); // default
    });

    it("errors on duplicate turtle ID", () => {
      registry.spawn("child1", "s1", doc);
      expect(() => registry.spawn("child1", "s1", doc)).toThrow(
        'Turtle "s1:child1" already exists',
      );
    });

    it("errors when max turtles exceeded", () => {
      registry.setMaxTurtles(3);
      // Already have main (1), spawn 2 more to hit limit
      registry.spawn("a", "s1", doc);
      registry.spawn("b", "s1", doc);
      expect(() => registry.spawn("c", "s1", doc)).toThrow(
        "Maximum turtle limit reached (3)",
      );
    });

    it("errors when max depth exceeded", () => {
      registry.setMaxDepth(2);
      // main is depth 0, child1 is depth 1, grandchild would be depth 2
      registry.spawn("child1", "s1", doc, "s1:main");
      registry.spawn("grandchild", "s1", doc, "s1:child1");
      expect(() =>
        registry.spawn("great", "s1", doc, "s1:grandchild"),
      ).toThrow("Maximum spawn depth reached (2)");
    });

    it("allows spawning up to max depth", () => {
      registry.setMaxDepth(2);
      registry.spawn("child1", "s1", doc, "s1:main");
      // depth 2 — should succeed
      expect(() =>
        registry.spawn("grandchild", "s1", doc, "s1:child1"),
      ).not.toThrow();
    });
  });

  describe("get", () => {
    it("returns undefined for non-existent turtle", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });

    it("returns the correct entry", () => {
      registry.createMain("s1", doc);
      const entry = registry.get("s1:main");
      expect(entry).toBeDefined();
      expect(entry!.scriptId).toBe("s1");
    });
  });

  describe("has", () => {
    it("returns false for non-existent turtle", () => {
      expect(registry.has("nonexistent")).toBe(false);
    });

    it("returns true for existing turtle", () => {
      registry.createMain("s1", doc);
      expect(registry.has("s1:main")).toBe(true);
    });
  });

  describe("remove", () => {
    beforeEach(() => {
      registry.createMain("s1", doc);
      registry.spawn("child1", "s1", doc);
    });

    it("removes a turtle owned by the script", () => {
      expect(registry.remove("s1:child1", "s1")).toBe(true);
      expect(registry.has("s1:child1")).toBe(false);
    });

    it("returns false for non-existent turtle", () => {
      expect(registry.remove("nonexistent", "s1")).toBe(false);
    });

    it("refuses to remove turtle owned by another script", () => {
      registry.createMain("s2", doc);
      expect(registry.remove("s1:child1", "s2")).toBe(false);
      expect(registry.has("s1:child1")).toBe(true);
    });

    it("removes descendants when removing a parent", () => {
      registry.spawn("grandchild", "s1", doc, "s1:child1");
      expect(registry.remove("s1:child1", "s1")).toBe(true);
      expect(registry.has("s1:child1")).toBe(false);
      expect(registry.has("s1:grandchild")).toBe(false);
    });

    it("does not remove siblings when removing a turtle", () => {
      registry.spawn("child2", "s1", doc);
      registry.remove("s1:child1", "s1");
      expect(registry.has("s1:child2")).toBe(true);
    });
  });

  describe("getOwned", () => {
    it("returns empty map when no turtles for script", () => {
      const owned = registry.getOwned("nonexistent");
      expect(owned.size).toBe(0);
    });

    it("returns only turtles for the given script", () => {
      registry.createMain("s1", doc);
      registry.spawn("child1", "s1", doc);
      registry.createMain("s2", doc);

      const owned = registry.getOwned("s1");
      expect(owned.size).toBe(2);
      expect(owned.has("s1:main")).toBe(true);
      expect(owned.has("s1:child1")).toBe(true);
      expect(owned.has("s2:main")).toBe(false);
    });
  });

  describe("getAll", () => {
    it("returns empty map when empty", () => {
      expect(registry.getAll().size).toBe(0);
    });

    it("returns all turtles across scripts", () => {
      registry.createMain("s1", doc);
      registry.createMain("s2", doc);
      registry.spawn("child1", "s1", doc);

      const all = registry.getAll();
      expect(all.size).toBe(3);
    });

    it("returns a copy (not the internal map)", () => {
      registry.createMain("s1", doc);
      const all = registry.getAll();
      all.delete("s1:main");
      expect(registry.has("s1:main")).toBe(true);
    });
  });

  describe("clearScript", () => {
    it("removes all turtles belonging to a script", () => {
      registry.createMain("s1", doc);
      registry.spawn("child1", "s1", doc);
      registry.createMain("s2", doc);

      registry.clearScript("s1");
      expect(registry.has("s1:main")).toBe(false);
      expect(registry.has("s1:child1")).toBe(false);
      expect(registry.has("s2:main")).toBe(true);
    });

    it("is a no-op for non-existent script", () => {
      registry.createMain("s1", doc);
      registry.clearScript("nonexistent");
      expect(registry.count()).toBe(1);
    });
  });

  describe("clear", () => {
    it("removes all turtles", () => {
      registry.createMain("s1", doc);
      registry.createMain("s2", doc);
      registry.spawn("child1", "s1", doc);
      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });

  describe("count", () => {
    it("starts at 0", () => {
      expect(registry.count()).toBe(0);
    });

    it("tracks creates and removes", () => {
      registry.createMain("s1", doc);
      expect(registry.count()).toBe(1);
      registry.spawn("child1", "s1", doc);
      expect(registry.count()).toBe(2);
      registry.remove("s1:child1", "s1");
      expect(registry.count()).toBe(1);
    });
  });

  describe("limits", () => {
    it("defaults to 1000 max turtles", () => {
      expect(registry.getMaxTurtles()).toBe(1000);
    });

    it("defaults to 10 max depth", () => {
      expect(registry.getMaxDepth()).toBe(10);
    });

    it("setMaxTurtles updates the limit", () => {
      registry.setMaxTurtles(5);
      expect(registry.getMaxTurtles()).toBe(5);
    });

    it("setMaxDepth updates the limit", () => {
      registry.setMaxDepth(3);
      expect(registry.getMaxDepth()).toBe(3);
    });
  });

  describe("depth tracking", () => {
    beforeEach(() => {
      registry.createMain("s1", doc);
    });

    it("allows deep chains up to maxDepth", () => {
      registry.setMaxDepth(4);
      // main (0) -> c1 (1) -> c2 (2) -> c3 (3) -> c4 (4)
      registry.spawn("c1", "s1", doc, "s1:main");
      registry.spawn("c2", "s1", doc, "s1:c1");
      registry.spawn("c3", "s1", doc, "s1:c2");
      registry.spawn("c4", "s1", doc, "s1:c3");
      expect(registry.count()).toBe(5);
    });

    it("rejects deeper than maxDepth", () => {
      registry.setMaxDepth(3);
      registry.spawn("c1", "s1", doc, "s1:main");
      registry.spawn("c2", "s1", doc, "s1:c1");
      registry.spawn("c3", "s1", doc, "s1:c2");
      expect(() =>
        registry.spawn("c4", "s1", doc, "s1:c3"),
      ).toThrow("Maximum spawn depth reached (3)");
    });

    it("allows wide spawns (many children of main)", () => {
      for (let i = 0; i < 50; i++) {
        registry.spawn(`child${i}`, "s1", doc, "s1:main");
      }
      expect(registry.count()).toBe(51); // 50 children + main
    });
  });

  describe("cross-script isolation", () => {
    it("scripts can independently create main turtles", () => {
      registry.createMain("s1", doc);
      registry.createMain("s2", doc);
      expect(registry.get("s1:main")!.scriptId).toBe("s1");
      expect(registry.get("s2:main")!.scriptId).toBe("s2");
    });

    it("clearScript does not affect other scripts", () => {
      registry.createMain("s1", doc);
      registry.spawn("child1", "s1", doc);
      registry.createMain("s2", doc);
      registry.spawn("child1", "s2", doc);

      registry.clearScript("s1");
      expect(registry.count()).toBe(2);
      expect(registry.has("s2:main")).toBe(true);
      expect(registry.has("s2:child1")).toBe(true);
    });

    it("remove enforces script ownership", () => {
      registry.createMain("s1", doc);
      registry.spawn("target", "s1", doc);
      registry.createMain("s2", doc);

      // s2 cannot remove s1's turtle
      expect(registry.remove("s1:target", "s2")).toBe(false);
      expect(registry.has("s1:target")).toBe(true);

      // s1 can remove its own turtle
      expect(registry.remove("s1:target", "s1")).toBe(true);
    });
  });

  describe("singleton", () => {
    beforeEach(() => {
      resetTurtleRegistry();
    });

    it("getTurtleRegistry returns the same instance", () => {
      const a = getTurtleRegistry();
      const b = getTurtleRegistry();
      expect(a).toBe(b);
    });

    it("resetTurtleRegistry clears and creates a new instance", () => {
      const a = getTurtleRegistry();
      a.createMain("s1", doc);
      resetTurtleRegistry();
      const b = getTurtleRegistry();
      expect(b).not.toBe(a);
      expect(b.count()).toBe(0);
    });
  });
});
