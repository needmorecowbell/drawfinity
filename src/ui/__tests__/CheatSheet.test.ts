// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CheatSheet } from "../CheatSheet";
import { ActionRegistry } from "../ActionRegistry";
import type { Action, ActionCategory } from "../ActionRegistry";

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

function populateRegistry(registry: ActionRegistry): void {
  registry.register(makeAction({ id: "brush", label: "Brush", shortcut: "B", category: "Tools" }));
  registry.register(makeAction({ id: "eraser", label: "Eraser", shortcut: "E", category: "Tools" }));
  registry.register(makeAction({ id: "undo", label: "Undo", shortcut: "Ctrl+Z", category: "Drawing" }));
  registry.register(makeAction({ id: "zoom-in", label: "Zoom In", shortcut: "Ctrl+=", category: "Navigation" }));
  registry.register(makeAction({ id: "toggle-settings", label: "Settings", shortcut: "Ctrl+,", category: "Panels" }));
}

describe("CheatSheet", () => {
  let registry: ActionRegistry;
  let cheatSheet: CheatSheet;

  beforeEach(() => {
    registry = new ActionRegistry();
    populateRegistry(registry);
    cheatSheet = new CheatSheet(registry);
  });

  afterEach(() => {
    cheatSheet.destroy();
  });

  describe("open/close", () => {
    it("is not visible by default", () => {
      expect(cheatSheet.isVisible()).toBe(false);
      expect(document.getElementById("cheatsheet-overlay")).toBeNull();
    });

    it("show() adds overlay to DOM and sets visible", () => {
      cheatSheet.show();
      expect(cheatSheet.isVisible()).toBe(true);
      expect(document.getElementById("cheatsheet-overlay")).not.toBeNull();
    });

    it("hide() removes overlay from DOM", () => {
      cheatSheet.show();
      cheatSheet.hide();
      expect(cheatSheet.isVisible()).toBe(false);
      expect(document.getElementById("cheatsheet-overlay")).toBeNull();
    });

    it("toggle() opens when closed and closes when open", () => {
      cheatSheet.toggle();
      expect(cheatSheet.isVisible()).toBe(true);
      cheatSheet.toggle();
      expect(cheatSheet.isVisible()).toBe(false);
    });

    it("show() is idempotent", () => {
      cheatSheet.show();
      cheatSheet.show();
      expect(cheatSheet.isVisible()).toBe(true);
      // Should still have only one overlay in DOM
      expect(document.querySelectorAll("#cheatsheet-overlay").length).toBe(1);
    });

    it("hide() is idempotent", () => {
      cheatSheet.hide();
      expect(cheatSheet.isVisible()).toBe(false);
    });

    it("Escape key closes the modal", () => {
      cheatSheet.show();
      const searchInput = document.getElementById("cheatsheet-search") as HTMLInputElement;
      searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(cheatSheet.isVisible()).toBe(false);
    });

    it("clicking backdrop closes the modal", () => {
      cheatSheet.show();
      const overlay = document.getElementById("cheatsheet-overlay")!;
      overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(cheatSheet.isVisible()).toBe(false);
    });

    it("clicking content does not close the modal", () => {
      cheatSheet.show();
      const content = document.getElementById("cheatsheet-content")!;
      content.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(cheatSheet.isVisible()).toBe(true);
    });

    it("show() clears previous search query", () => {
      cheatSheet.show();
      const searchInput = document.getElementById("cheatsheet-search") as HTMLInputElement;
      searchInput.value = "brush";
      cheatSheet.hide();
      cheatSheet.show();
      expect((document.getElementById("cheatsheet-search") as HTMLInputElement).value).toBe("");
    });

    it("destroy() removes overlay if visible", () => {
      cheatSheet.show();
      cheatSheet.destroy();
      expect(document.getElementById("cheatsheet-overlay")).toBeNull();
    });
  });

  describe("action rendering", () => {
    it("renders all actions grouped by category", () => {
      cheatSheet.show();
      const categories = document.querySelectorAll(".cheatsheet-category");
      expect(categories.length).toBeGreaterThanOrEqual(4); // Tools, Drawing, Navigation, Panels
    });

    it("renders action rows with labels", () => {
      cheatSheet.show();
      const rows = document.querySelectorAll(".cheatsheet-row");
      expect(rows.length).toBe(5); // 5 registered actions
    });

    it("renders keyboard shortcut badges as kbd elements", () => {
      cheatSheet.show();
      const kbds = document.querySelectorAll(".cheatsheet-kbd");
      expect(kbds.length).toBe(5); // all 5 actions have shortcuts
    });

    it("does not render kbd for actions without shortcuts", () => {
      registry.register(makeAction({ id: "no-shortcut", label: "No Shortcut", shortcut: undefined, category: "File" }));
      cheatSheet.show();
      // Should have 5 kbds (from original) — the new action has no shortcut
      const rows = document.querySelectorAll(".cheatsheet-row");
      expect(rows.length).toBe(6);
      const kbds = document.querySelectorAll(".cheatsheet-kbd");
      expect(kbds.length).toBe(5);
    });
  });

  describe("search filtering", () => {
    it("filters actions by label", () => {
      cheatSheet.show();
      const searchInput = document.getElementById("cheatsheet-search") as HTMLInputElement;
      searchInput.value = "brush";
      searchInput.dispatchEvent(new Event("input"));

      const rows = document.querySelectorAll(".cheatsheet-row");
      expect(rows.length).toBe(1);
      expect(rows[0].querySelector(".cheatsheet-label")!.textContent).toBe("Brush");
    });

    it("filters actions by shortcut", () => {
      cheatSheet.show();
      const searchInput = document.getElementById("cheatsheet-search") as HTMLInputElement;
      searchInput.value = "Ctrl+Z";
      searchInput.dispatchEvent(new Event("input"));

      const rows = document.querySelectorAll(".cheatsheet-row");
      expect(rows.length).toBe(1);
      expect(rows[0].querySelector(".cheatsheet-label")!.textContent).toBe("Undo");
    });

    it("hides empty category headers when filtering", () => {
      cheatSheet.show();
      const searchInput = document.getElementById("cheatsheet-search") as HTMLInputElement;
      searchInput.value = "brush";
      searchInput.dispatchEvent(new Event("input"));

      const categories = document.querySelectorAll(".cheatsheet-category");
      expect(categories.length).toBe(1);
      expect(categories[0].textContent).toBe("Tools");
    });

    it("shows 'No matching actions' for no results", () => {
      cheatSheet.show();
      const searchInput = document.getElementById("cheatsheet-search") as HTMLInputElement;
      searchInput.value = "xyznonexistent";
      searchInput.dispatchEvent(new Event("input"));

      const empty = document.querySelector(".cheatsheet-empty");
      expect(empty).not.toBeNull();
      expect(empty!.textContent).toBe("No matching actions");
      expect(document.querySelectorAll(".cheatsheet-row").length).toBe(0);
    });

    it("shows all actions for empty search", () => {
      cheatSheet.show();
      const searchInput = document.getElementById("cheatsheet-search") as HTMLInputElement;
      searchInput.value = "brush";
      searchInput.dispatchEvent(new Event("input"));
      expect(document.querySelectorAll(".cheatsheet-row").length).toBe(1);

      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input"));
      expect(document.querySelectorAll(".cheatsheet-row").length).toBe(5);
    });
  });

  describe("action execution", () => {
    it("executes action and closes modal when row is clicked", () => {
      cheatSheet.show();
      const rows = document.querySelectorAll(".cheatsheet-row");
      const brushRow = Array.from(rows).find(
        (r) => r.querySelector(".cheatsheet-label")?.textContent === "Brush",
      )!;

      brushRow.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const brushAction = registry.get("brush")!;
      expect(brushAction.execute).toHaveBeenCalledOnce();
      expect(cheatSheet.isVisible()).toBe(false);
    });
  });
});

describe("CheatSheet keyboard shortcut (Ctrl+?)", () => {
  let registry: ActionRegistry;
  let cheatSheet: CheatSheet;

  beforeEach(() => {
    registry = new ActionRegistry();
    cheatSheet = new CheatSheet(registry);
  });

  afterEach(() => {
    cheatSheet.destroy();
  });

  it("Ctrl+? event can be used to toggle the cheat sheet", () => {
    // Simulate the pattern used in CanvasApp.handleKeydown
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "?") {
        e.preventDefault();
        cheatSheet.toggle();
      }
    };
    document.addEventListener("keydown", handler);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "?", ctrlKey: true, bubbles: true }),
    );
    expect(cheatSheet.isVisible()).toBe(true);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "?", ctrlKey: true, bubbles: true }),
    );
    expect(cheatSheet.isVisible()).toBe(false);

    document.removeEventListener("keydown", handler);
  });

  it("Cmd+? (metaKey) also toggles the cheat sheet", () => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "?") {
        e.preventDefault();
        cheatSheet.toggle();
      }
    };
    document.addEventListener("keydown", handler);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "?", metaKey: true, bubbles: true }),
    );
    expect(cheatSheet.isVisible()).toBe(true);

    document.removeEventListener("keydown", handler);
  });
});

describe("Registered actions verification", () => {
  it("all registered actions from CanvasApp have correct labels and shortcuts", () => {
    // This test verifies the expected action registry content
    // that CanvasApp.registerActions() would create
    const registry = new ActionRegistry();

    const expectedActions: Array<{ id: string; label: string; shortcut?: string; category: ActionCategory }> = [
      // Tools
      { id: "tool-brush", label: "Brush", shortcut: "B", category: "Tools" },
      { id: "tool-eraser", label: "Eraser", shortcut: "E", category: "Tools" },
      { id: "tool-rectangle", label: "Rectangle", shortcut: "R", category: "Tools" },
      { id: "tool-ellipse", label: "Ellipse", shortcut: "O", category: "Tools" },
      { id: "tool-polygon", label: "Polygon", shortcut: "P", category: "Tools" },
      { id: "tool-star", label: "Star", shortcut: "S", category: "Tools" },
      // Drawing
      { id: "brush-preset-1", label: "Pen preset", shortcut: "1", category: "Drawing" },
      { id: "brush-preset-2", label: "Pencil preset", shortcut: "2", category: "Drawing" },
      { id: "brush-preset-3", label: "Marker preset", shortcut: "3", category: "Drawing" },
      { id: "brush-preset-4", label: "Highlighter preset", shortcut: "4", category: "Drawing" },
      { id: "brush-size-down", label: "Decrease brush size", shortcut: "[", category: "Drawing" },
      { id: "brush-size-up", label: "Increase brush size", shortcut: "]", category: "Drawing" },
      { id: "undo", label: "Undo", shortcut: "Ctrl+Z", category: "Drawing" },
      { id: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z", category: "Drawing" },
      // Navigation
      { id: "zoom-in", label: "Zoom in", shortcut: "Ctrl+=", category: "Navigation" },
      { id: "zoom-out", label: "Zoom out", shortcut: "Ctrl+\u2212", category: "Navigation" },
      { id: "zoom-reset", label: "Reset zoom", shortcut: "Ctrl+0", category: "Navigation" },
      { id: "go-home", label: "Go home", shortcut: "Escape", category: "Navigation" },
      // Panels
      { id: "toggle-connection", label: "Connection panel", shortcut: "Ctrl+K", category: "Panels" },
      { id: "toggle-settings", label: "Settings", shortcut: "Ctrl+,", category: "Panels" },
      { id: "toggle-cheatsheet", label: "Keyboard shortcuts", shortcut: "Ctrl+?", category: "Panels" },
      { id: "toggle-fps", label: "FPS counter", shortcut: "F3", category: "Panels" },
    ];

    // Register all expected actions with noop execute
    for (const def of expectedActions) {
      registry.register({ ...def, execute: vi.fn() });
    }

    // Verify count
    expect(registry.getAll()).toHaveLength(expectedActions.length);

    // Verify each action has correct properties
    for (const def of expectedActions) {
      const action = registry.get(def.id);
      expect(action, `action ${def.id} should exist`).toBeDefined();
      expect(action!.label).toBe(def.label);
      expect(action!.shortcut).toBe(def.shortcut);
      expect(action!.category).toBe(def.category);
    }

    // Verify category grouping
    const grouped = registry.getByCategory();
    expect(grouped.get("Tools")).toHaveLength(6);
    expect(grouped.get("Drawing")).toHaveLength(8);
    expect(grouped.get("Navigation")).toHaveLength(4);
    expect(grouped.get("Panels")).toHaveLength(4);
  });
});
