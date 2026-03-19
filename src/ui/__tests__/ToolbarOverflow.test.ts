// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ToolbarOverflow } from "../ToolbarOverflow";
import type { ToolbarGroup } from "../Toolbar";

/** Helper: create a mock toolbar container with groups and dividers. */
function createToolbar(): {
  container: HTMLElement;
  groups: Map<ToolbarGroup, HTMLDivElement>;
} {
  const container = document.createElement("div");
  container.id = "toolbar";
  document.body.appendChild(container);

  const groupNames: ToolbarGroup[] = ["tools", "properties", "actions", "navigation", "panels"];
  const groups = new Map<ToolbarGroup, HTMLDivElement>();

  groupNames.forEach((name, i) => {
    if (i > 0) {
      const divider = document.createElement("div");
      divider.className = "toolbar-divider";
      container.appendChild(divider);
    }
    const group = document.createElement("div");
    group.className = "toolbar-group";
    group.dataset.group = name;
    // Add a button to each group to make it have content
    const btn = document.createElement("button");
    btn.className = "toolbar-btn";
    btn.textContent = name;
    group.appendChild(btn);
    groups.set(name, group);
    container.appendChild(group);
  });

  return { container, groups };
}

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  static instances: MockResizeObserver[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}

  trigger(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

describe("ToolbarOverflow", () => {
  let container: HTMLElement;
  let groups: Map<ToolbarGroup, HTMLDivElement>;
  let overflow: ToolbarOverflow;
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    MockResizeObserver.instances = [];
    originalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    const setup = createToolbar();
    container = setup.container;
    groups = setup.groups;
  });

  afterEach(() => {
    overflow?.destroy();
    container?.remove();
    window.ResizeObserver = originalResizeObserver;
  });

  it("creates an overflow button in the container", () => {
    overflow = new ToolbarOverflow({ container, groups });
    const btn = container.querySelector(".toolbar-overflow-btn");
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe("\u22EF");
  });

  it("overflow button is hidden by default when toolbar fits", () => {
    // In jsdom, scrollWidth defaults to 0 which is <= innerWidth
    overflow = new ToolbarOverflow({ container, groups });
    overflow.checkOverflow();
    const btn = overflow.getOverflowButton();
    expect(btn.classList.contains("visible")).toBe(false);
  });

  it("collapses groups when toolbar overflows viewport", () => {
    overflow = new ToolbarOverflow({ container, groups });

    // Simulate overflow: make scrollWidth > viewport
    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000) // initial check: too wide
        .mockReturnValueOnce(1500) // after collapsing panels: still too wide
        .mockReturnValueOnce(1000) // after collapsing navigation: still too wide
        .mockReturnValueOnce(500),  // after collapsing actions: fits
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });

    overflow.checkOverflow();

    const collapsed = overflow.getCollapsedGroups();
    expect(collapsed.has("panels")).toBe(true);
    expect(collapsed.has("navigation")).toBe(true);
    expect(collapsed.has("actions")).toBe(true);
    expect(collapsed.has("tools")).toBe(false);
    expect(collapsed.has("properties")).toBe(false);
  });

  it("shows overflow button when groups are collapsed", () => {
    overflow = new ToolbarOverflow({ container, groups });

    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(500),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });

    overflow.checkOverflow();
    expect(overflow.getOverflowButton().classList.contains("visible")).toBe(true);
  });

  it("restores groups when viewport expands", () => {
    overflow = new ToolbarOverflow({ container, groups });

    // First: collapse some groups
    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(500),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();
    expect(overflow.getCollapsedGroups().size).toBeGreaterThan(0);

    // Now: viewport expands, everything fits
    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn().mockReturnValue(700),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    overflow.checkOverflow();
    expect(overflow.getCollapsedGroups().size).toBe(0);
    expect(overflow.getOverflowButton().classList.contains("visible")).toBe(false);
  });

  it("collapsed groups have toolbar-collapsed class", () => {
    overflow = new ToolbarOverflow({ container, groups });

    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(500),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();

    expect(groups.get("navigation")!.classList.contains("toolbar-collapsed")).toBe(true);
  });

  it("collapsed group divider also gets toolbar-collapsed class", () => {
    overflow = new ToolbarOverflow({ container, groups });

    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(500),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();

    const navGroup = groups.get("navigation")!;
    const prevDivider = navGroup.previousElementSibling;
    expect(prevDivider?.classList.contains("toolbar-collapsed")).toBe(true);
  });

  it("opens overflow menu when button is clicked", () => {
    overflow = new ToolbarOverflow({ container, groups });

    // Collapse some groups first
    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(500),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();

    // Click overflow button
    overflow.getOverflowButton().dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true })
    );

    expect(overflow.isOpen()).toBe(true);
    expect(document.body.querySelector(".toolbar-overflow-menu")).not.toBeNull();
  });

  it("closes overflow menu on second click", () => {
    overflow = new ToolbarOverflow({ container, groups });

    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(500),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();

    const btn = overflow.getOverflowButton();
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(overflow.isOpen()).toBe(true);

    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(overflow.isOpen()).toBe(false);
  });

  it("closes overflow menu when clicking outside", () => {
    overflow = new ToolbarOverflow({ container, groups });

    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(500),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();

    overflow.getOverflowButton().dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true })
    );
    expect(overflow.isOpen()).toBe(true);

    // Click outside
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(overflow.isOpen()).toBe(false);
  });

  it("overflow menu contains clones of collapsed groups", () => {
    overflow = new ToolbarOverflow({ container, groups });

    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(500),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();

    overflow.getOverflowButton().dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true })
    );

    const menu = overflow.getOverflowMenu();
    const overflowGroups = menu.querySelectorAll("[data-overflow-group]");
    expect(overflowGroups.length).toBeGreaterThan(0);
    // Should contain the navigation group (first to be collapsed)
    expect(menu.querySelector('[data-overflow-group="navigation"]')).not.toBeNull();
  });

  it("does not open menu when no groups are collapsed", () => {
    overflow = new ToolbarOverflow({ container, groups });
    // No collapse needed

    overflow.getOverflowButton().dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true })
    );
    expect(overflow.isOpen()).toBe(false);
  });

  it("destroy cleans up resize observer and event listeners", () => {
    overflow = new ToolbarOverflow({ container, groups });
    const btn = container.querySelector(".toolbar-overflow-btn");
    expect(btn).not.toBeNull();

    overflow.destroy();
    expect(container.querySelector(".toolbar-overflow-btn")).toBeNull();
  });

  it("never collapses tools or properties groups", () => {
    overflow = new ToolbarOverflow({ container, groups });

    // Make everything overflow - even after collapsing all collapsible groups
    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn().mockReturnValue(2000),
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();

    const collapsed = overflow.getCollapsedGroups();
    expect(collapsed.has("tools")).toBe(false);
    expect(collapsed.has("properties")).toBe(false);
  });

  it("collapses groups in priority order: panels first, then navigation, then actions", () => {
    overflow = new ToolbarOverflow({ container, groups });

    // Only need to collapse one group (navigation is first in collapse order)
    Object.defineProperty(container, "scrollWidth", {
      get: vi.fn()
        .mockReturnValueOnce(900) // initial: too wide
        .mockReturnValueOnce(700), // after collapsing navigation: fits
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    overflow.checkOverflow();

    const collapsed = overflow.getCollapsedGroups();
    expect(collapsed.has("navigation")).toBe(true);
    expect(collapsed.has("actions")).toBe(false);
    expect(collapsed.has("panels")).toBe(false);
  });
});
