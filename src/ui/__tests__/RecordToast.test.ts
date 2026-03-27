// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RecordToast } from "../RecordToast";
import type { RecordBrokenEvent } from "../RecordToast";

function fireRecordEvent(detail: RecordBrokenEvent): void {
  window.dispatchEvent(
    new CustomEvent("drawfinity:record-broken", { detail }),
  );
}

describe("RecordToast", () => {
  let toast: RecordToast;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    toast?.destroy();
    vi.useRealTimers();
  });

  it("creates container element on construction", () => {
    toast = new RecordToast();
    const container = document.querySelector(".record-toast-container");
    expect(container).not.toBeNull();
  });

  it("shows a toast when record-broken event fires", () => {
    toast = new RecordToast();
    fireRecordEvent({ key: "longestSingleStroke", newValue: 500, oldValue: 200 });

    const toastEl = document.querySelector(".record-toast");
    expect(toastEl).not.toBeNull();
    expect(toastEl!.textContent).toContain("New Record!");
    expect(toastEl!.textContent).toContain("Longest Stroke");
    expect(toastEl!.textContent).toContain("500");
  });

  it("auto-dismisses after 3 seconds", () => {
    toast = new RecordToast();
    fireRecordEvent({ key: "mostTurtlesInOneRun", newValue: 10, oldValue: 5 });

    expect(document.querySelector(".record-toast")).not.toBeNull();

    // After 3s, the exit class should be added
    vi.advanceTimersByTime(3000);
    const toastEl = document.querySelector(".record-toast");
    expect(toastEl?.classList.contains("record-toast-exit")).toBe(true);

    // After fade-out completes (300ms), toast is removed
    vi.advanceTimersByTime(300);
    expect(document.querySelector(".record-toast")).toBeNull();
  });

  it("replaces existing toast instead of stacking", () => {
    toast = new RecordToast();
    fireRecordEvent({ key: "deepestZoom", newValue: 0.001, oldValue: 0 });
    fireRecordEvent({ key: "widestZoom", newValue: 1000, oldValue: 0 });

    const toasts = document.querySelectorAll(".record-toast");
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toContain("Widest Zoom");
  });

  it("formats zoom values with scientific notation", () => {
    toast = new RecordToast();
    fireRecordEvent({ key: "deepestZoom", newValue: 0.00123, oldValue: 0 });

    const value = document.querySelector(".record-toast-value");
    expect(value!.textContent).toBe("1.2e-3x");
  });

  it("formats time values as minutes and seconds", () => {
    toast = new RecordToast();
    fireRecordEvent({ key: "longestSession", newValue: 185000, oldValue: 0 });

    const value = document.querySelector(".record-toast-value");
    expect(value!.textContent).toBe("3m 5s");
  });

  it("formats large distance values with k suffix", () => {
    toast = new RecordToast();
    fireRecordEvent({ key: "longestTurtleDistance", newValue: 2500, oldValue: 0 });

    const value = document.querySelector(".record-toast-value");
    expect(value!.textContent).toBe("2.5k");
  });

  it("removes event listener and container on destroy", () => {
    toast = new RecordToast();
    toast.destroy();

    expect(document.querySelector(".record-toast-container")).toBeNull();

    // Firing event after destroy should not create toasts
    fireRecordEvent({ key: "mostTurtlesInOneRun", newValue: 5, oldValue: 0 });
    expect(document.querySelector(".record-toast")).toBeNull();
  });
});
