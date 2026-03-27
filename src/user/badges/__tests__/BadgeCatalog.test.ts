import { describe, it, expect } from "vitest";
import { BADGE_CATALOG } from "../BadgeCatalog";
import { createDefaultStats } from "../../UserStats";

describe("BadgeCatalog", () => {
  it("all badge IDs are unique", () => {
    const ids = BADGE_CATALOG.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all criteria return false for default stats", () => {
    const stats = createDefaultStats();
    for (const badge of BADGE_CATALOG) {
      expect(badge.criteria(stats)).toBe(false);
    }
  });

  it("first-stroke badge returns true when totalStrokes >= 1", () => {
    const stats = createDefaultStats();
    const badge = BADGE_CATALOG.find((b) => b.id === "first-stroke")!;
    expect(badge).toBeDefined();

    stats.totalStrokes = 1;
    expect(badge.criteria(stats)).toBe(true);

    stats.totalStrokes = 100;
    expect(badge.criteria(stats)).toBe(true);
  });

  it("all-brushes badge requires all four brush presets", () => {
    const stats = createDefaultStats();
    const badge = BADGE_CATALOG.find((b) => b.id === "all-brushes")!;

    stats.toolUsage = { pen: 1, pencil: 1, marker: 1 };
    expect(badge.criteria(stats)).toBe(false);

    stats.toolUsage = { pen: 1, pencil: 1, marker: 1, highlighter: 1 };
    expect(badge.criteria(stats)).toBe(true);
  });

  it("error-free-streak badge requires consecutiveCleanRuns >= 10", () => {
    const stats = createDefaultStats();
    const badge = BADGE_CATALOG.find((b) => b.id === "error-free-streak")!;
    expect(badge).toBeDefined();

    stats.consecutiveCleanRuns = 9;
    expect(badge.criteria(stats)).toBe(false);

    stats.consecutiveCleanRuns = 10;
    expect(badge.criteria(stats)).toBe(true);
  });

  it("color-painter badge requires turtle runs and 2+ unique pen colors", () => {
    const stats = createDefaultStats();
    const badge = BADGE_CATALOG.find((b) => b.id === "color-painter")!;
    expect(badge).toBeDefined();

    stats.totalTurtleRuns = 1;
    stats.uniquePenColors = 1;
    expect(badge.criteria(stats)).toBe(false);

    stats.uniquePenColors = 2;
    expect(badge.criteria(stats)).toBe(true);
  });

  it("speed-demon badge requires fastestTurtleCompletionMs > 0 and <= 1000", () => {
    const stats = createDefaultStats();
    const badge = BADGE_CATALOG.find((b) => b.id === "speed-demon")!;
    expect(badge).toBeDefined();

    // Unset (0) should not earn
    expect(badge.criteria(stats)).toBe(false);

    stats.fastestTurtleCompletionMs = 1500;
    expect(badge.criteria(stats)).toBe(false);

    stats.fastestTurtleCompletionMs = 1000;
    expect(badge.criteria(stats)).toBe(true);

    stats.fastestTurtleCompletionMs = 500;
    expect(badge.criteria(stats)).toBe(true);
  });

  it("turtle-army badge requires mostTurtlesInSingleRun >= 100", () => {
    const stats = createDefaultStats();
    const badge = BADGE_CATALOG.find((b) => b.id === "turtle-army")!;
    expect(badge).toBeDefined();

    stats.mostTurtlesInSingleRun = 99;
    expect(badge.criteria(stats)).toBe(false);

    stats.mostTurtlesInSingleRun = 100;
    expect(badge.criteria(stats)).toBe(true);
  });

  it("all turtle-awards badges exist in the catalog", () => {
    const turtleAwards = BADGE_CATALOG.filter((b) => b.category === "turtle-awards");
    const ids = turtleAwards.map((b) => b.id);
    expect(ids).toContain("color-painter");
    expect(ids).toContain("speed-demon");
    expect(ids).toContain("patient-artist");
    expect(ids).toContain("error-free-streak");
    expect(ids).toContain("polyglot-turtle");
    expect(ids).toContain("fractal-explorer");
    expect(ids).toContain("turtle-army");
    expect(turtleAwards).toHaveLength(7);
  });

  it("wide-view badge requires minZoomLevel > 0 and <= 1e-3", () => {
    const stats = createDefaultStats();
    const badge = BADGE_CATALOG.find((b) => b.id === "wide-view")!;

    // Default minZoomLevel is 0, should not earn
    expect(badge.criteria(stats)).toBe(false);

    stats.minZoomLevel = 0.0005;
    expect(badge.criteria(stats)).toBe(true);
  });
});
