// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  showSessionSummary,
  SessionEventCollector,
  hasSessionActivity,
  buildSessionData,
} from "../SessionSummary";
import type { SessionSnapshot, SessionSummaryData } from "../SessionSummary";
import { createDefaultStats } from "../../user/UserStats";
import type { UserStats } from "../../user/UserStats";
import type { BadgeDefinition } from "../../user/badges/BadgeCatalog";

function makeStats(overrides: Partial<UserStats> = {}): UserStats {
  return { ...createDefaultStats(), ...overrides };
}

const MOCK_BADGE: BadgeDefinition = {
  id: "test-badge",
  name: "Test Badge",
  description: "A test badge",
  tier: "gold",
  icon: "\u2B50",
  category: "drawing",
  criteria: () => true,
};

describe("hasSessionActivity", () => {
  it("returns false when session is empty", () => {
    const data: SessionSummaryData = {
      durationMs: 60_000,
      strokesDrawn: 0,
      shapesCreated: 0,
      turtleScriptsRun: 0,
      turtlesSpawned: 0,
      badgesEarned: [],
      recordsBroken: [],
    };
    expect(hasSessionActivity(data)).toBe(false);
  });

  it("returns true when session has strokes", () => {
    const data: SessionSummaryData = {
      durationMs: 60_000,
      strokesDrawn: 5,
      shapesCreated: 0,
      turtleScriptsRun: 0,
      turtlesSpawned: 0,
      badgesEarned: [],
      recordsBroken: [],
    };
    expect(hasSessionActivity(data)).toBe(true);
  });

  it("returns true when session has turtle runs", () => {
    const data: SessionSummaryData = {
      durationMs: 60_000,
      strokesDrawn: 0,
      shapesCreated: 0,
      turtleScriptsRun: 3,
      turtlesSpawned: 0,
      badgesEarned: [],
      recordsBroken: [],
    };
    expect(hasSessionActivity(data)).toBe(true);
  });
});

describe("buildSessionData", () => {
  it("computes diff from snapshot to current stats", () => {
    const snapshot: SessionSnapshot = {
      totalStrokes: 10,
      totalShapes: 2,
      totalTurtleRuns: 5,
      totalTurtlesSpawned: 10,
    };
    const current = makeStats({
      totalStrokes: 15,
      totalShapes: 4,
      totalTurtleRuns: 8,
      totalTurtlesSpawned: 25,
    });
    const data = buildSessionData(snapshot, current, 120_000, [MOCK_BADGE], []);
    expect(data.strokesDrawn).toBe(5);
    expect(data.shapesCreated).toBe(2);
    expect(data.turtleScriptsRun).toBe(3);
    expect(data.turtlesSpawned).toBe(15);
    expect(data.durationMs).toBe(120_000);
    expect(data.badgesEarned).toHaveLength(1);
    expect(data.badgesEarned[0].id).toBe("test-badge");
  });
});

describe("SessionEventCollector", () => {
  let collector: SessionEventCollector;

  beforeEach(() => {
    collector = new SessionEventCollector();
  });

  afterEach(() => {
    collector.destroy();
  });

  it("collects badge events", () => {
    window.dispatchEvent(
      new CustomEvent("drawfinity:badge-unlocked", {
        detail: [{ badge: MOCK_BADGE, earnedAt: Date.now() }],
      }),
    );
    const badges = collector.getBadges();
    expect(badges).toHaveLength(1);
    expect(badges[0].id).toBe("test-badge");
  });

  it("collects record events", () => {
    window.dispatchEvent(
      new CustomEvent("drawfinity:record-broken", {
        detail: { key: "longestSingleStroke", newValue: 200, oldValue: 100 },
      }),
    );
    const records = collector.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].key).toBe("longestSingleStroke");
    expect(records[0].newValue).toBe(200);
  });

  it("stops collecting after destroy", () => {
    collector.destroy();
    window.dispatchEvent(
      new CustomEvent("drawfinity:badge-unlocked", {
        detail: [{ badge: MOCK_BADGE, earnedAt: Date.now() }],
      }),
    );
    expect(collector.getBadges()).toHaveLength(0);
  });
});

describe("showSessionSummary", () => {
  afterEach(() => {
    // Clean up any leftover overlays
    document.querySelectorAll(".session-summary-overlay").forEach((el) => el.remove());
  });

  it("shows overlay when session has activity", async () => {
    const data: SessionSummaryData = {
      durationMs: 120_000,
      strokesDrawn: 10,
      shapesCreated: 3,
      turtleScriptsRun: 2,
      turtlesSpawned: 5,
      badgesEarned: [MOCK_BADGE],
      recordsBroken: [{ key: "longestSingleStroke", newValue: 200, oldValue: 100 }],
    };

    const promise = showSessionSummary(data);

    // Overlay should exist (with opacity 0 initially)
    const overlay = document.querySelector(".session-summary-overlay") as HTMLElement;
    expect(overlay).toBeTruthy();

    // Wait for the 200ms delay
    vi.useFakeTimers();
    vi.advanceTimersByTime(200);
    vi.useRealTimers();

    // Check content rendered
    const title = overlay.querySelector(".session-summary__title");
    expect(title?.textContent).toBe("Session Summary");

    const statValues = overlay.querySelectorAll(".session-summary__stat-value");
    expect(statValues.length).toBe(4); // 4 non-zero stats

    const badgeCards = overlay.querySelectorAll(".session-summary__badge-card");
    expect(badgeCards.length).toBe(1);

    const recordItems = overlay.querySelectorAll(".session-summary__record-item");
    expect(recordItems.length).toBe(1);

    // Click continue to dismiss
    const btn = overlay.querySelector(".session-summary__continue-btn") as HTMLButtonElement;
    btn.click();

    await promise;

    // Overlay should be removed
    expect(document.querySelector(".session-summary-overlay")).toBeNull();
  });

  it("skips zero-value activity stats", async () => {
    const data: SessionSummaryData = {
      durationMs: 60_000,
      strokesDrawn: 5,
      shapesCreated: 0,
      turtleScriptsRun: 0,
      turtlesSpawned: 0,
      badgesEarned: [],
      recordsBroken: [],
    };

    const promise = showSessionSummary(data);
    const overlay = document.querySelector(".session-summary-overlay") as HTMLElement;

    const statValues = overlay.querySelectorAll(".session-summary__stat-value");
    expect(statValues.length).toBe(1); // Only "Strokes drawn"

    const emptyMsg = overlay.querySelector(".session-summary__empty");
    expect(emptyMsg?.textContent).toBe("No new badges this session.");

    // No records section
    const recordItems = overlay.querySelectorAll(".session-summary__record-item");
    expect(recordItems.length).toBe(0);

    // Dismiss
    const btn = overlay.querySelector(".session-summary__continue-btn") as HTMLButtonElement;
    btn.click();
    await promise;
  });

  it("dismisses on Escape key after delay", async () => {
    vi.useFakeTimers();

    const data: SessionSummaryData = {
      durationMs: 60_000,
      strokesDrawn: 5,
      shapesCreated: 0,
      turtleScriptsRun: 0,
      turtlesSpawned: 0,
      badgesEarned: [],
      recordsBroken: [],
    };

    const promise = showSessionSummary(data);

    // Advance past the 200ms delay so keyboard handler is attached
    vi.advanceTimersByTime(200);

    // Dispatch Escape key (use capture: true since the handler uses capture)
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    vi.useRealTimers();

    await promise;
    expect(document.querySelector(".session-summary-overlay")).toBeNull();
  });
});
