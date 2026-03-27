import { describe, it, expect } from "vitest";
import { BadgeEngine } from "../BadgeEngine";
import { BADGE_CATALOG } from "../BadgeCatalog";
import type { BadgeState } from "../BadgeState";
import { createDefaultStats } from "../../UserStats";

function emptyState(): BadgeState {
  return { earned: [], lastCheckedAt: 0 };
}

describe("BadgeEngine", () => {
  const engine = new BadgeEngine(BADGE_CATALOG);

  it("evaluate returns empty for default stats", () => {
    const stats = createDefaultStats();
    const result = engine.evaluate(stats, emptyState());
    expect(result).toEqual([]);
  });

  it("evaluate returns first-stroke after setting totalStrokes=1", () => {
    const stats = createDefaultStats();
    stats.totalStrokes = 1;
    const result = engine.evaluate(stats, emptyState());

    const ids = result.map((e) => e.badge.id);
    expect(ids).toContain("first-stroke");
    expect(result[0].earnedAt).toBeGreaterThan(0);
  });

  it("evaluate does not re-return already earned badges", () => {
    const stats = createDefaultStats();
    stats.totalStrokes = 1;

    const state: BadgeState = {
      earned: [{ id: "first-stroke", earnedAt: 1000 }],
      lastCheckedAt: 1000,
    };

    const result = engine.evaluate(stats, state);
    const ids = result.map((e) => e.badge.id);
    expect(ids).not.toContain("first-stroke");
  });

  it("getCategoryProgress returns correct counts", () => {
    const stats = createDefaultStats();
    const state: BadgeState = {
      earned: [{ id: "first-stroke", earnedAt: 1000 }],
      lastCheckedAt: 1000,
    };

    const progress = engine.getCategoryProgress("drawing", stats, state);
    const totalDrawing = BADGE_CATALOG.filter((b) => b.category === "drawing").length;
    expect(progress.earned).toBe(1);
    expect(progress.total).toBe(totalDrawing);
    expect(progress.nextUnearned).not.toBeNull();
    expect(progress.nextUnearned!.id).not.toBe("first-stroke");
  });

  it("getEarnedBadges returns matching badge definitions", () => {
    const state: BadgeState = {
      earned: [
        { id: "first-stroke", earnedAt: 1000 },
        { id: "first-turtle", earnedAt: 2000 },
      ],
      lastCheckedAt: 2000,
    };

    const earned = engine.getEarnedBadges(state);
    expect(earned).toHaveLength(2);
    expect(earned.map((b) => b.id)).toEqual(["first-stroke", "first-turtle"]);
  });

  it("evaluate returns multiple badges when multiple criteria are met", () => {
    const stats = createDefaultStats();
    stats.totalStrokes = 1;
    stats.totalDrawingSessions = 1;

    const result = engine.evaluate(stats, emptyState());
    const ids = result.map((e) => e.badge.id);
    expect(ids).toContain("first-stroke");
    expect(ids).toContain("getting-started");
  });
});
