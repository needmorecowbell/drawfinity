import { test } from "@playwright/test";
import {
  navigateToCanvas,
  addStroke,
  addShape,
  setCamera,
  togglePanel,
  waitForRender,
  captureScreenshot,
} from "./helpers";

test("Badges and stats screenshot", async ({ page }) => {
  // Seed rich stats and badge state via localStorage before app loads
  await page.addInitScript(() => {
    const stats = {
      totalStrokes: 247,
      totalShapes: 38,
      totalTurtleStrokes: 156,
      totalEraseActions: 22,
      totalUndos: 65,
      totalRedos: 18,
      totalExports: 4,
      totalDrawingSessions: 12,
      longestStrokePoints: 340,
      maxZoomLevel: 150000,
      minZoomLevel: 0.0005,
      totalPanDistance: 15200,
      bookmarksCreated: 6,
      totalTurtleRuns: 53,
      totalTurtleErrors: 8,
      totalTurtlesSpawned: 82,
      totalTurtleForwardDistance: 42000,
      totalTurtleTurns: 3100,
      longestTurtleScript: 2500,
      exchangeScriptsImported: 5,
      uniquePenColors: 4,
      consecutiveCleanRuns: 12,
      turtleApiBreadth: 6,
      maxSpawnDepth: 4,
      fastestTurtleCompletionMs: 800,
      longestTurtleRuntimeMs: 65000,
      mostTurtlesInSingleRun: 45,
      totalCollabSessions: 3,
      totalCollabRoomsCreated: 1,
      scriptsSharedToRoom: 2,
      toolUsage: {
        brush: 180,
        eraser: 45,
        rectangle: 12,
        ellipse: 10,
        polygon: 8,
        star: 8,
      },
      firstSessionAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      lastSessionAt: Date.now(),
      totalSessionDurationMs: 14 * 60 * 60 * 1000,
    };
    localStorage.setItem("drawfinity:user-stats", JSON.stringify(stats));

    const now = Date.now();
    const badgeState = {
      earned: [
        { id: "first-stroke", earnedAt: now - 7 * 86400000 },
        { id: "centurion", earnedAt: now - 5 * 86400000 },
        { id: "shape-maker", earnedAt: now - 5 * 86400000 },
        { id: "clean-slate", earnedAt: now - 4 * 86400000 },
        { id: "time-traveler", earnedAt: now - 4 * 86400000 },
        { id: "tool-explorer", earnedAt: now - 3 * 86400000 },
        { id: "all-brushes", earnedAt: now - 3 * 86400000 },
        { id: "first-turtle", earnedAt: now - 6 * 86400000 },
        { id: "turtle-veteran", earnedAt: now - 2 * 86400000 },
        { id: "herd-leader", earnedAt: now - 2 * 86400000 },
        { id: "marathon-turtle", earnedAt: now - 1 * 86400000 },
        { id: "script-collector", earnedAt: now - 1 * 86400000 },
        { id: "debug-warrior", earnedAt: now - 86400000 },
        { id: "novelist", earnedAt: now - 86400000 },
        { id: "color-painter", earnedAt: now - 86400000 },
        { id: "error-free-streak", earnedAt: now - 43200000 },
        { id: "polyglot-turtle", earnedAt: now - 43200000 },
        { id: "fractal-explorer", earnedAt: now - 43200000 },
        { id: "deep-zoom", earnedAt: now - 3 * 86400000 },
        { id: "explorer", earnedAt: now - 2 * 86400000 },
        { id: "cartographer", earnedAt: now - 86400000 },
        { id: "exporter", earnedAt: now - 86400000 },
        { id: "social-butterfly", earnedAt: now - 2 * 86400000 },
        { id: "getting-started", earnedAt: now - 7 * 86400000 },
        { id: "regular", earnedAt: now - 3 * 86400000 },
        { id: "marathon-session", earnedAt: now - 86400000 },
      ],
      lastCheckedAt: now,
    };
    localStorage.setItem("drawfinity:badge-state", JSON.stringify(badgeState));

    const records = {
      longestSingleStroke: { value: 340, achievedAt: now - 4 * 86400000 },
      widestBrushUsed: { value: 40, achievedAt: now - 3 * 86400000 },
      mostTurtlesInOneRun: { value: 45, achievedAt: now - 86400000 },
      longestTurtleDistance: { value: 18500, achievedAt: now - 2 * 86400000 },
      mostTurtleTurns: { value: 850, achievedAt: now - 2 * 86400000 },
      fastestTurtleCompletion: { value: 800, achievedAt: now - 86400000 },
      longestTurtleRuntime: { value: 65000, achievedAt: now - 86400000 },
      deepestZoom: { value: 150000, achievedAt: now - 3 * 86400000 },
      widestZoom: { value: 2000, achievedAt: now - 2 * 86400000 },
      longestPanInOneSession: { value: 5400, achievedAt: now - 86400000 },
      mostConcurrentCollaborators: { value: 3, achievedAt: now - 2 * 86400000 },
      longestSession: { value: 5400000, achievedAt: now - 86400000 },
      mostStrokesInOneSession: { value: 84, achievedAt: now - 4 * 86400000 },
    };
    localStorage.setItem(
      "drawfinity:canvas-records",
      JSON.stringify(records)
    );
  });

  await page.goto("/");
  await navigateToCanvas(page);

  // Add a few strokes and shapes to make the canvas look active
  await addStroke(page, {
    color: "#2563EB",
    width: 6,
    points: [
      { x: -80, y: -40, pressure: 0.5 },
      { x: -40, y: -60, pressure: 0.6 },
      { x: 0, y: -50, pressure: 0.7 },
      { x: 40, y: -30, pressure: 0.6 },
      { x: 80, y: -40, pressure: 0.5 },
    ],
  });

  await addStroke(page, {
    color: "#16A34A",
    width: 4,
    points: [
      { x: -60, y: 20, pressure: 0.4 },
      { x: -20, y: 40, pressure: 0.55 },
      { x: 20, y: 35, pressure: 0.65 },
      { x: 60, y: 50, pressure: 0.5 },
    ],
  });

  await addShape(page, {
    type: "star",
    x: -100,
    y: -80,
    width: 60,
    height: 60,
    strokeColor: "#F59E0B",
    fillColor: "#F59E0B",
    sides: 5,
    starInnerRadius: 0.4,
  });

  await addShape(page, {
    type: "ellipse",
    x: 100,
    y: 20,
    width: 80,
    height: 50,
    strokeColor: "#EC4899",
    fillColor: "#FBCFE8",
    strokeWidth: 2,
  });

  await setCamera(page, { x: 0, y: 0, zoom: 1.0 });

  // Open stats/achievements panel via Ctrl+Shift+S
  await togglePanel(page, "stats");
  await waitForRender(page);

  // Switch to badges tab for a more visually interesting screenshot
  await page.evaluate(() => {
    const badgesTab = document.querySelector(
      '.stats-tab-btn[data-tab="badges"]'
    ) as HTMLElement | null;
    if (badgesTab) badgesTab.click();
  });
  await waitForRender(page);

  // Capture the gamification screenshot
  await captureScreenshot(page, "gamification");
});
