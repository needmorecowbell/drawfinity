// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BadgeToast } from "../BadgeToast";
import type { BadgeDefinition } from "../../user/badges/BadgeCatalog";
import type { BadgeUnlockEvent } from "../../user/badges/BadgeEngine";

function makeBadge(overrides: Partial<BadgeDefinition> = {}): BadgeDefinition {
  return {
    id: "test-badge",
    name: "Test Badge",
    description: "A test badge",
    tier: "bronze",
    icon: "\u2B50",
    category: "drawing",
    criteria: () => true,
    ...overrides,
  };
}

function fireUnlockEvent(unlocked: BadgeUnlockEvent[]): void {
  window.dispatchEvent(
    new CustomEvent("drawfinity:badge-unlocked", { detail: unlocked }),
  );
}

describe("BadgeToast", () => {
  let toast: BadgeToast;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    toast?.destroy();
    vi.useRealTimers();
  });

  it("creates container element on construction", () => {
    toast = new BadgeToast();
    const container = document.querySelector(".badge-toast-container");
    expect(container).not.toBeNull();
  });

  it("shows a toast when badge-unlocked event fires", () => {
    toast = new BadgeToast();
    const badge = makeBadge();
    fireUnlockEvent([{ badge, earnedAt: Date.now() }]);

    const toastEl = document.querySelector(".badge-toast");
    expect(toastEl).not.toBeNull();
    expect(toastEl!.textContent).toContain("Badge Unlocked!");
    expect(toastEl!.textContent).toContain("Test Badge");
    expect(toastEl!.textContent).toContain("bronze");
  });

  it("displays badge icon and tier color", () => {
    toast = new BadgeToast();
    const badge = makeBadge({ tier: "gold", icon: "\uD83C\uDFC6" });
    fireUnlockEvent([{ badge, earnedAt: Date.now() }]);

    const icon = document.querySelector(".badge-toast-icon");
    expect(icon!.textContent).toBe("\uD83C\uDFC6");

    const toastEl = document.querySelector(".badge-toast") as HTMLElement;
    expect(toastEl.style.borderColor).toBe("rgb(255, 215, 0)");
    expect(toastEl.dataset.tier).toBe("gold");
  });

  it("auto-dismisses after 5 seconds", () => {
    toast = new BadgeToast();
    fireUnlockEvent([{ badge: makeBadge(), earnedAt: Date.now() }]);

    expect(document.querySelector(".badge-toast")).not.toBeNull();

    // After 5s, the exit class should be added
    vi.advanceTimersByTime(5000);
    const toastEl = document.querySelector(".badge-toast");
    expect(toastEl?.classList.contains("badge-toast-exit")).toBe(true);

    // After fade-out completes (400ms), toast is removed
    vi.advanceTimersByTime(400);
    expect(document.querySelector(".badge-toast")).toBeNull();
  });

  it("clicking toast calls onOpenBadges callback", () => {
    const onOpenBadges = vi.fn();
    toast = new BadgeToast({ onOpenBadges });
    fireUnlockEvent([{ badge: makeBadge(), earnedAt: Date.now() }]);

    const toastEl = document.querySelector(".badge-toast") as HTMLElement;
    toastEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(onOpenBadges).toHaveBeenCalledOnce();
  });

  it("clicking toast removes it from DOM", () => {
    toast = new BadgeToast({ onOpenBadges: () => {} });
    fireUnlockEvent([{ badge: makeBadge(), earnedAt: Date.now() }]);

    const toastEl = document.querySelector(".badge-toast") as HTMLElement;
    toastEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(document.querySelector(".badge-toast")).toBeNull();
  });

  it("stacks multiple badges with staggered timing", () => {
    toast = new BadgeToast();
    const badges: BadgeUnlockEvent[] = [
      { badge: makeBadge({ id: "b1", name: "Badge 1" }), earnedAt: Date.now() },
      { badge: makeBadge({ id: "b2", name: "Badge 2" }), earnedAt: Date.now() },
      { badge: makeBadge({ id: "b3", name: "Badge 3" }), earnedAt: Date.now() },
    ];
    fireUnlockEvent(badges);

    // First badge appears immediately
    expect(document.querySelectorAll(".badge-toast").length).toBe(1);

    // Second appears after 300ms
    vi.advanceTimersByTime(300);
    expect(document.querySelectorAll(".badge-toast").length).toBe(2);

    // Third appears after another 300ms
    vi.advanceTimersByTime(300);
    expect(document.querySelectorAll(".badge-toast").length).toBe(3);
  });

  it("removes event listener and container on destroy", () => {
    toast = new BadgeToast();
    toast.destroy();

    expect(document.querySelector(".badge-toast-container")).toBeNull();

    // Firing event after destroy should not create toasts
    fireUnlockEvent([{ badge: makeBadge(), earnedAt: Date.now() }]);
    expect(document.querySelector(".badge-toast")).toBeNull();
  });
});
