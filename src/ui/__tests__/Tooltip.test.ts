// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Tooltip } from "../Tooltip";

describe("Tooltip", () => {
  let tooltip: Tooltip;

  beforeEach(() => {
    Tooltip.resetInstance();
    tooltip = Tooltip.getInstance();
  });

  afterEach(() => {
    Tooltip.resetInstance();
  });

  it("returns the same singleton instance", () => {
    const a = Tooltip.getInstance();
    const b = Tooltip.getInstance();
    expect(a).toBe(b);
  });

  it("creates a tooltip DOM element with correct class", () => {
    const el = tooltip.getElement();
    expect(el.className).toBe("toolbar-tooltip");
    expect(el.getAttribute("role")).toBe("tooltip");
    expect(document.body.contains(el)).toBe(true);
  });

  it("is initially hidden", () => {
    expect(tooltip.isVisible()).toBe(false);
  });

  it("removes native title attribute when attached", () => {
    const btn = document.createElement("button");
    btn.title = "Some title";
    tooltip.attach(btn, "Test tooltip");
    expect(btn.hasAttribute("title")).toBe(false);
  });

  it("shows tooltip after 500ms hover delay", () => {
    vi.useFakeTimers();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    tooltip.attach(btn, "Brush (B)");

    btn.dispatchEvent(new PointerEvent("pointerenter"));
    expect(tooltip.isVisible()).toBe(false);

    vi.advanceTimersByTime(499);
    expect(tooltip.isVisible()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(tooltip.isVisible()).toBe(true);
    expect(tooltip.getElement().textContent).toBe("Brush (B)");

    btn.remove();
    vi.useRealTimers();
  });

  it("hides tooltip on pointerleave", () => {
    vi.useFakeTimers();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    tooltip.attach(btn, "Test");

    btn.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.isVisible()).toBe(true);

    btn.dispatchEvent(new PointerEvent("pointerleave"));
    expect(tooltip.isVisible()).toBe(false);

    btn.remove();
    vi.useRealTimers();
  });

  it("hides tooltip on pointerdown", () => {
    vi.useFakeTimers();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    tooltip.attach(btn, "Test");

    btn.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.isVisible()).toBe(true);

    btn.dispatchEvent(new PointerEvent("pointerdown"));
    expect(tooltip.isVisible()).toBe(false);

    btn.remove();
    vi.useRealTimers();
  });

  it("cancels pending tooltip on pointerleave before delay", () => {
    vi.useFakeTimers();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    tooltip.attach(btn, "Test");

    btn.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(300);
    btn.dispatchEvent(new PointerEvent("pointerleave"));
    vi.advanceTimersByTime(200);

    expect(tooltip.isVisible()).toBe(false);

    btn.remove();
    vi.useRealTimers();
  });

  it("detach removes tooltip behavior from element", () => {
    vi.useFakeTimers();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    tooltip.attach(btn, "Test");
    tooltip.detach(btn);

    btn.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(600);
    expect(tooltip.isVisible()).toBe(false);

    btn.remove();
    vi.useRealTimers();
  });

  it("can attach to multiple elements independently", () => {
    vi.useFakeTimers();
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);
    tooltip.attach(btn1, "First");
    tooltip.attach(btn2, "Second");

    btn1.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.getElement().textContent).toBe("First");

    btn1.dispatchEvent(new PointerEvent("pointerleave"));
    btn2.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.getElement().textContent).toBe("Second");

    btn1.remove();
    btn2.remove();
    vi.useRealTimers();
  });

  it("re-attaching updates the tooltip text", () => {
    vi.useFakeTimers();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    tooltip.attach(btn, "Old text");
    tooltip.attach(btn, "New text");

    btn.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.getElement().textContent).toBe("New text");

    btn.remove();
    vi.useRealTimers();
  });

  it("destroy removes the DOM element", () => {
    const el = tooltip.getElement();
    expect(document.body.contains(el)).toBe(true);
    tooltip.destroy();
    expect(document.body.contains(el)).toBe(false);
  });

  it("destroy cleans up all registered targets", () => {
    vi.useFakeTimers();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    tooltip.attach(btn, "Test");
    tooltip.destroy();

    // After destroy, hovering should not show anything
    btn.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(600);
    // Element removed from DOM, so isVisible check would fail anyway
    expect(tooltip.isVisible()).toBe(false);

    btn.remove();
    vi.useRealTimers();
  });

  it("resetInstance allows creating a fresh singleton", () => {
    const first = Tooltip.getInstance();
    Tooltip.resetInstance();
    const second = Tooltip.getInstance();
    expect(first).not.toBe(second);
  });

  it("positions tooltip below target element", () => {
    vi.useFakeTimers();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    // Mock getBoundingClientRect
    vi.spyOn(btn, "getBoundingClientRect").mockReturnValue({
      top: 10, bottom: 42, left: 100, right: 132, width: 32, height: 32,
      x: 100, y: 10, toJSON: () => {},
    });
    tooltip.attach(btn, "Test position");

    btn.dispatchEvent(new PointerEvent("pointerenter"));
    vi.advanceTimersByTime(500);

    const el = tooltip.getElement();
    // top should be bottom + 6 = 48
    expect(el.style.top).toBe("48px");

    btn.remove();
    vi.useRealTimers();
  });
});
