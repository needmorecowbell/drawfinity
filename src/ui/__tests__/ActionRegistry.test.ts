import { describe, it, expect, beforeEach, vi } from "vitest";
import { ActionRegistry } from "../ActionRegistry";
import type { Action } from "../ActionRegistry";

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: "test-action",
    label: "Test Action",
    shortcut: "T",
    category: "Tools",
    execute: vi.fn(),
    ...overrides,
  };
}

describe("ActionRegistry", () => {
  let registry: ActionRegistry;

  beforeEach(() => {
    registry = new ActionRegistry();
  });

  describe("register", () => {
    it("adds an action", () => {
      registry.register(makeAction());
      expect(registry.getAll()).toHaveLength(1);
    });

    it("overwrites duplicate ids", () => {
      registry.register(makeAction({ label: "First" }));
      registry.register(makeAction({ label: "Second" }));
      expect(registry.getAll()).toHaveLength(1);
      expect(registry.getAll()[0].label).toBe("Second");
    });
  });

  describe("getAll", () => {
    it("returns empty array when no actions registered", () => {
      expect(registry.getAll()).toEqual([]);
    });

    it("returns all registered actions", () => {
      registry.register(makeAction({ id: "a" }));
      registry.register(makeAction({ id: "b" }));
      registry.register(makeAction({ id: "c" }));
      expect(registry.getAll()).toHaveLength(3);
    });
  });

  describe("get", () => {
    it("returns action by id", () => {
      const action = makeAction({ id: "brush" });
      registry.register(action);
      expect(registry.get("brush")).toBe(action);
    });

    it("returns undefined for unknown id", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });
  });

  describe("getByCategory", () => {
    it("groups actions by category", () => {
      registry.register(makeAction({ id: "a", category: "Tools" }));
      registry.register(makeAction({ id: "b", category: "Tools" }));
      registry.register(makeAction({ id: "c", category: "Navigation" }));
      registry.register(makeAction({ id: "d", category: "Panels" }));

      const grouped = registry.getByCategory();
      expect(grouped.get("Tools")).toHaveLength(2);
      expect(grouped.get("Navigation")).toHaveLength(1);
      expect(grouped.get("Panels")).toHaveLength(1);
    });

    it("omits empty categories", () => {
      registry.register(makeAction({ id: "a", category: "Tools" }));
      const grouped = registry.getByCategory();
      expect(grouped.has("Tools")).toBe(true);
      expect(grouped.has("File")).toBe(false);
    });

    it("orders categories: Tools, Drawing, Navigation, Panels, File", () => {
      registry.register(makeAction({ id: "a", category: "File" }));
      registry.register(makeAction({ id: "b", category: "Tools" }));
      registry.register(makeAction({ id: "c", category: "Navigation" }));
      registry.register(makeAction({ id: "d", category: "Drawing" }));
      registry.register(makeAction({ id: "e", category: "Panels" }));

      const keys = Array.from(registry.getByCategory().keys());
      expect(keys).toEqual(["Tools", "Drawing", "Navigation", "Panels", "File"]);
    });
  });

  describe("search", () => {
    beforeEach(() => {
      registry.register(makeAction({ id: "brush", label: "Brush Tool", shortcut: "B", category: "Tools" }));
      registry.register(makeAction({ id: "eraser", label: "Eraser Tool", shortcut: "E", category: "Tools" }));
      registry.register(makeAction({ id: "undo", label: "Undo", shortcut: "Ctrl+Z", category: "Drawing" }));
      registry.register(makeAction({ id: "zoom-in", label: "Zoom In", shortcut: "Ctrl+=", category: "Navigation" }));
    });

    it("returns all actions for empty query", () => {
      expect(registry.search("")).toHaveLength(4);
      expect(registry.search("  ")).toHaveLength(4);
    });

    it("matches on label", () => {
      const results = registry.search("brush");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("brush");
    });

    it("matches on shortcut text", () => {
      const results = registry.search("Ctrl+Z");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("undo");
    });

    it("matches on category", () => {
      const results = registry.search("tools");
      expect(results).toHaveLength(2);
    });

    it("matches on id", () => {
      const results = registry.search("zoom-in");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("zoom-in");
    });

    it("is case insensitive", () => {
      expect(registry.search("BRUSH")).toHaveLength(1);
      expect(registry.search("brush")).toHaveLength(1);
    });

    it("supports multi-word queries (AND logic)", () => {
      const results = registry.search("tool brush");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("brush");
    });

    it("returns empty for no matches", () => {
      expect(registry.search("xyznonexistent")).toHaveLength(0);
    });
  });

  describe("execute", () => {
    it("calls execute on the matching action", () => {
      const action = makeAction({ id: "test" });
      registry.register(action);
      const result = registry.execute("test");
      expect(result).toBe(true);
      expect(action.execute).toHaveBeenCalledOnce();
    });

    it("returns false for unknown id", () => {
      expect(registry.execute("nonexistent")).toBe(false);
    });
  });
});
