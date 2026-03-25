// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { showStorageNotification } from "../StorageNotification";

describe("StorageNotification", () => {
  beforeEach(() => {
    // Clean up any existing notification containers
    document.getElementById("storage-notifications")?.remove();
  });

  it("creates notification container and shows a toast", () => {
    showStorageNotification("Test message", "warning");

    const container = document.getElementById("storage-notifications");
    expect(container).toBeTruthy();

    const toasts = container!.querySelectorAll(".storage-toast");
    expect(toasts).toHaveLength(1);
    expect(toasts[0].classList.contains("storage-toast--warning")).toBe(true);
    expect(toasts[0].textContent).toContain("Test message");
  });

  it("shows error toast with dismiss button", () => {
    showStorageNotification("Save failed", "error", 0);

    const toast = document.querySelector(".storage-toast--error");
    expect(toast).toBeTruthy();

    const dismissBtn = toast!.querySelector(".storage-toast__dismiss");
    expect(dismissBtn).toBeTruthy();
  });

  it("can show multiple toasts", () => {
    showStorageNotification("First", "info");
    showStorageNotification("Second", "warning");

    const toasts = document.querySelectorAll(".storage-toast");
    expect(toasts).toHaveLength(2);
  });

  it("removes toast when dismiss button is clicked", () => {
    showStorageNotification("Dismissable", "error", 0);

    const toast = document.querySelector(".storage-toast--error")!;
    const dismissBtn = toast.querySelector(".storage-toast__dismiss") as HTMLButtonElement;

    dismissBtn.click();

    // Toast should be removed (or in removal animation)
    // The remove happens after transitionend or fallback timeout
    // In jsdom, transitionend won't fire so we check the class removal
    expect(toast.classList.contains("storage-toast--visible")).toBe(false);
  });

  it("auto-dismisses after duration", () => {
    vi.useFakeTimers();

    showStorageNotification("Auto dismiss", "info", 5000);

    const toast = document.querySelector(".storage-toast")!;
    expect(toast).toBeTruthy();

    // Advance past the auto-dismiss timer
    vi.advanceTimersByTime(5000);

    // Toast should have visibility class removed
    expect(toast.classList.contains("storage-toast--visible")).toBe(false);

    // Advance past the fallback removal timer
    vi.advanceTimersByTime(400);
    expect(document.querySelectorAll(".storage-toast")).toHaveLength(0);

    vi.useRealTimers();
  });

  it("escapes HTML in messages", () => {
    showStorageNotification("<script>alert('xss')</script>", "error");

    const message = document.querySelector(".storage-toast__message");
    expect(message!.innerHTML).not.toContain("<script>");
    expect(message!.textContent).toContain("<script>");
  });
});
