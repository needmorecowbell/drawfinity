// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StatsPanel, StatsPanelCallbacks } from "../StatsPanel";
import type { UserStats } from "../../user/UserStats";
import { createDefaultStats } from "../../user/UserStats";
import type { BadgeState } from "../../user/badges/BadgeState";
import type { CanvasRecords } from "../../user/CanvasRecords";
import { createDefaultRecords } from "../../user/CanvasRecords";

function makeStats(overrides: Partial<UserStats> = {}): UserStats {
  return { ...createDefaultStats(), ...overrides };
}

function makeBadgeState(earned: { id: string; earnedAt: number }[] = []): BadgeState {
  return { earned, lastCheckedAt: 0 };
}

function makeRecords(overrides: Partial<CanvasRecords> = {}): CanvasRecords {
  return { ...createDefaultRecords(), ...overrides };
}

describe("StatsPanel", () => {
  let panel: StatsPanel;
  let stats: UserStats;
  let badgeState: BadgeState;
  let records: CanvasRecords;
  let callbacks: StatsPanelCallbacks;

  beforeEach(() => {
    stats = makeStats({
      totalStrokes: 42,
      totalShapes: 5,
      totalTurtleRuns: 10,
      totalCollabSessions: 3,
      totalSessionDurationMs: 7320000, // 2h 2m
      firstSessionAt: 1711411200000, // 2024-03-26
    });
    badgeState = makeBadgeState([
      { id: "first-stroke", earnedAt: 1711411200000 },
    ]);
    records = makeRecords({
      longestSingleStroke: { value: 150, achievedAt: 1711411200000 },
    });
    callbacks = {
      onRefresh: vi.fn(() => ({ stats, badgeState, records })),
    };
    panel = new StatsPanel(stats, badgeState, records, callbacks);
  });

  afterEach(() => {
    panel.destroy();
  });

  // --- Basic panel lifecycle ---

  it("creates without errors", () => {
    expect(panel).toBeDefined();
    expect(panel.isVisible()).toBe(false);
  });

  it("is not visible by default", () => {
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("stats-overlay")).toBeNull();
  });

  it("show() adds overlay to DOM", () => {
    panel.show();
    expect(panel.isVisible()).toBe(true);
    expect(document.getElementById("stats-overlay")).not.toBeNull();
    expect(document.getElementById("stats-panel")).not.toBeNull();
  });

  it("hide() removes overlay from DOM", () => {
    panel.show();
    panel.hide();
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("stats-overlay")).toBeNull();
  });

  it("toggle() toggles visibility", () => {
    panel.toggle();
    expect(panel.isVisible()).toBe(true);
    panel.toggle();
    expect(panel.isVisible()).toBe(false);
  });

  it("clicking overlay background hides panel", () => {
    panel.show();
    const overlay = document.getElementById("stats-overlay")!;
    overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: false }));
    expect(panel.isVisible()).toBe(false);
  });

  it("close button hides panel", () => {
    panel.show();
    const closeBtn = document.querySelector(".stats-btn-secondary") as HTMLButtonElement;
    closeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(panel.isVisible()).toBe(false);
  });

  it("show() calls onRefresh to get latest data", () => {
    panel.show();
    expect(callbacks.onRefresh).toHaveBeenCalledOnce();
  });

  it("destroy removes overlay", () => {
    panel.show();
    panel.destroy();
    expect(document.getElementById("stats-overlay")).toBeNull();
  });

  // --- Tab switching ---

  it("renders three tab buttons", () => {
    panel.show();
    const tabs = document.querySelectorAll(".stats-tab-btn");
    expect(tabs.length).toBe(3);
    expect((tabs[0] as HTMLElement).textContent).toBe("Stats");
    expect((tabs[1] as HTMLElement).textContent).toBe("Badges");
    expect((tabs[2] as HTMLElement).textContent).toBe("Records");
  });

  it("Stats tab is active by default", () => {
    panel.show();
    const active = document.querySelector(".stats-tab-btn.active") as HTMLElement;
    expect(active.textContent).toBe("Stats");
  });

  it("clicking Badges tab switches to badges view", () => {
    panel.show();
    const tabs = document.querySelectorAll(".stats-tab-btn");
    (tabs[1] as HTMLButtonElement).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect((tabs[1] as HTMLElement).classList.contains("active")).toBe(true);
    expect((tabs[0] as HTMLElement).classList.contains("active")).toBe(false);
    // Badges tab renders filter buttons
    expect(document.querySelector(".stats-badge-filters")).not.toBeNull();
  });

  it("clicking Records tab switches to records view", () => {
    panel.show();
    const tabs = document.querySelectorAll(".stats-tab-btn");
    (tabs[2] as HTMLButtonElement).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect((tabs[2] as HTMLElement).classList.contains("active")).toBe(true);
    // Records tab renders a table
    expect(document.querySelector(".stats-records-table")).not.toBeNull();
  });

  it("showTab() switches to specified tab", () => {
    panel.show();
    panel.showTab("badges");
    const active = document.querySelector(".stats-tab-btn.active") as HTMLElement;
    expect(active.textContent).toBe("Badges");
    expect(document.querySelector(".stats-badge-filters")).not.toBeNull();
  });

  // --- Stats tab content ---

  it("renders stats values from data", () => {
    panel.show();
    const values = document.querySelectorAll(".stats-grid-value");
    const texts = Array.from(values).map((el) => el.textContent);
    // "42" should appear for totalStrokes
    expect(texts).toContain("42");
    // "5" for totalShapes
    expect(texts).toContain("5");
  });

  it("renders section headers", () => {
    panel.show();
    const headers = document.querySelectorAll(".stats-section-header");
    const headerTexts = Array.from(headers).map((el) => el.textContent);
    expect(headerTexts).toContain("Drawing");
    expect(headerTexts).toContain("Turtle Graphics");
    expect(headerTexts).toContain("Canvas");
    expect(headerTexts).toContain("Collaboration");
    expect(headerTexts).toContain("Time");
  });

  it("formats cumulative time correctly", () => {
    panel.show();
    const values = Array.from(document.querySelectorAll(".stats-grid-value")).map((el) => el.textContent);
    expect(values).toContain("2h 2m");
  });

  // --- Badges tab content ---

  it("renders badge cards", () => {
    panel.show();
    panel.showTab("badges");
    const cards = document.querySelectorAll(".stats-badge-card");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("earned badges have earned class", () => {
    panel.show();
    panel.showTab("badges");
    const earnedCards = document.querySelectorAll(".stats-badge-card.earned");
    expect(earnedCards.length).toBe(1); // Only first-stroke
  });

  it("locked badges have locked class", () => {
    panel.show();
    panel.showTab("badges");
    const lockedCards = document.querySelectorAll(".stats-badge-card.locked");
    expect(lockedCards.length).toBeGreaterThan(0);
  });

  it("badge filter buttons are rendered", () => {
    panel.show();
    panel.showTab("badges");
    const filters = document.querySelectorAll(".stats-badge-filter-btn");
    expect(filters.length).toBe(7); // all, drawing, turtle, turtle-awards, canvas, collaboration, dedication
  });

  it("clicking a category filter updates badge grid", () => {
    panel.show();
    panel.showTab("badges");
    const allCards = document.querySelectorAll(".stats-badge-card").length;

    const filters = document.querySelectorAll(".stats-badge-filter-btn");
    // Click "Drawing" filter (index 1)
    (filters[1] as HTMLButtonElement).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const filteredCards = document.querySelectorAll(".stats-badge-card").length;
    expect(filteredCards).toBeLessThan(allCards);
    expect(filteredCards).toBeGreaterThan(0);
  });

  it("locked badges show progress bars where calculable", () => {
    panel.show();
    panel.showTab("badges");
    // centurion badge: 42/100 strokes
    const progressLabels = Array.from(document.querySelectorAll(".stats-badge-progress-label")).map(
      (el) => el.textContent,
    );
    expect(progressLabels).toContain("42/100");
  });

  // --- Records tab content ---

  it("renders records table", () => {
    panel.show();
    panel.showTab("records");
    const table = document.querySelector(".stats-records-table");
    expect(table).not.toBeNull();
  });

  it("records with value show formatted value", () => {
    panel.show();
    panel.showTab("records");
    const cells = Array.from(document.querySelectorAll(".stats-records-table td")).map(
      (el) => el.textContent,
    );
    expect(cells).toContain("150 points");
  });

  it("records with value 0 show dash", () => {
    panel.show();
    panel.showTab("records");
    const cells = Array.from(document.querySelectorAll(".stats-records-table td")).map(
      (el) => el.textContent,
    );
    // Multiple records should show the em-dash
    const dashes = cells.filter((c) => c === "\u2014");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("records table has category group headers", () => {
    panel.show();
    panel.showTab("records");
    const catRows = document.querySelectorAll(".stats-records-category");
    const catTexts = Array.from(catRows).map((r) => r.textContent);
    expect(catTexts).toContain("Stroke");
    expect(catTexts).toContain("Turtle");
    expect(catTexts).toContain("Canvas");
  });
});
