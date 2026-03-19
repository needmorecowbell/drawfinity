// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SubToolPicker, SubToolOption } from "../SubToolPicker";

const TEST_OPTIONS: SubToolOption[] = [
  { id: "a", label: "A", title: "Tool A" },
  { id: "b", label: "B", title: "Tool B" },
  { id: "c", label: "C", title: "Tool C" },
];

describe("SubToolPicker", () => {
  let picker: SubToolPicker;
  let button: HTMLButtonElement;
  let onSelect: ReturnType<typeof vi.fn<(id: string) => void>>;

  beforeEach(() => {
    onSelect = vi.fn<(id: string) => void>();
    button = document.createElement("button");
    document.body.appendChild(button);
  });

  afterEach(() => {
    picker?.destroy();
    button.remove();
    // Clean up any remaining popovers
    document.querySelectorAll(".subtool-popover").forEach(el => el.remove());
  });

  function createPicker(holdDelay = 300): SubToolPicker {
    picker = new SubToolPicker({
      options: TEST_OPTIONS,
      onSelect,
      holdDelay,
    });
    picker.attach(button);
    return picker;
  }

  it("updates button text and title to first option on attach", () => {
    createPicker();
    expect(button.textContent).toBe("A");
    expect(button.title).toBe("Tool A");
  });

  it("quick click (pointerdown + immediate pointerup) selects last-used sub-tool", () => {
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith("a");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("quick click does not show popover", () => {
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(document.querySelector(".subtool-popover")).toBeNull();
    expect(picker.isOpen()).toBe(false);
  });

  it("hold shows popover after delay", () => {
    vi.useFakeTimers();
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    expect(document.querySelector(".subtool-popover")).not.toBeNull();
    expect(picker.isOpen()).toBe(true);
    vi.useRealTimers();
  });

  it("popover contains all sub-tool options", () => {
    vi.useFakeTimers();
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    const options = document.querySelectorAll(".subtool-option");
    expect(options.length).toBe(3);
    expect(options[0].textContent).toBe("A");
    expect(options[1].textContent).toBe("B");
    expect(options[2].textContent).toBe("C");
    vi.useRealTimers();
  });

  it("popover highlights the last-used option", () => {
    vi.useFakeTimers();
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    const options = document.querySelectorAll(".subtool-option");
    expect(options[0].classList.contains("active")).toBe(true);
    expect(options[1].classList.contains("active")).toBe(false);
    vi.useRealTimers();
  });

  it("clicking a popover option selects it, updates button, and hides popover", () => {
    vi.useFakeTimers();
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);

    const options = document.querySelectorAll(".subtool-option");
    options[1].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(onSelect).toHaveBeenCalledWith("b");
    expect(button.textContent).toBe("B");
    expect(button.title).toBe("Tool B");
    expect(picker.isOpen()).toBe(false);
    expect(document.querySelector(".subtool-popover")).toBeNull();
    vi.useRealTimers();
  });

  it("after selecting sub-tool via popover, quick click uses the new last-used", () => {
    vi.useFakeTimers();
    createPicker();

    // Hold and select "c"
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    const options = document.querySelectorAll(".subtool-option");
    options[2].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    onSelect.mockClear();

    vi.useRealTimers();

    // Quick click
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith("c");
  });

  it("setLastUsedId updates button and last-used state", () => {
    createPicker();
    picker.setLastUsedId("b");
    expect(button.textContent).toBe("B");
    expect(button.title).toBe("Tool B");
    expect(picker.getLastUsedId()).toBe("b");
  });

  it("setLastUsedId ignores unknown ids", () => {
    createPicker();
    picker.setLastUsedId("unknown");
    expect(button.textContent).toBe("A");
    expect(picker.getLastUsedId()).toBe("a");
  });

  it("getLastUsedId returns current last-used id", () => {
    createPicker();
    expect(picker.getLastUsedId()).toBe("a");
  });

  it("hold that is released before delay does not show popover", () => {
    vi.useFakeTimers();
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(200);
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    vi.advanceTimersByTime(200);
    expect(document.querySelector(".subtool-popover")).toBeNull();
    expect(onSelect).toHaveBeenCalledWith("a"); // quick click fires
    vi.useRealTimers();
  });

  it("detach removes event listeners and cleans up popover", () => {
    vi.useFakeTimers();
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    expect(picker.isOpen()).toBe(true);

    picker.detach();
    expect(picker.isOpen()).toBe(false);
    expect(document.querySelector(".subtool-popover")).toBeNull();

    // Events should no longer fire
    onSelect.mockClear();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("destroy cleans up everything", () => {
    createPicker();
    picker.destroy();
    expect(document.querySelector(".subtool-popover")).toBeNull();
  });

  it("pointerup while popover is visible does not fire quick-click select", () => {
    vi.useFakeTimers();
    createPicker();
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    expect(picker.isOpen()).toBe(true);

    // Release after popover shown — should NOT trigger quick click
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
