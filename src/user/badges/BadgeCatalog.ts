import type { UserStats } from "../UserStats";

/**
 * Badge rarity tiers representing ascending levels of achievement difficulty.
 *
 * Used by {@link BadgeDefinition} to classify badges and by UI components
 * to render tier-appropriate colors and icons.
 *
 * - `"bronze"` — entry-level achievements (e.g. first stroke, first session)
 * - `"silver"` — moderate milestones (e.g. 100 strokes, 50 turtle runs)
 * - `"gold"` — significant accomplishments (e.g. 1,000 strokes, 50 sessions)
 * - `"platinum"` — exceptional feats (e.g. 10,000 strokes, 100 turtles in one run)
 */
export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: string;
  category: "drawing" | "turtle" | "turtle-awards" | "canvas" | "collaboration" | "dedication";
  criteria: (stats: UserStats) => boolean;
}

/**
 * Complete catalog of all achievable badges in the gamification system.
 *
 * Contains {@link BadgeDefinition} entries organized into six categories:
 * - **drawing** — stroke, shape, eraser, undo, and tool-usage milestones
 * - **turtle** — turtle script runs, spawns, distance, imports, and errors
 * - **turtle-awards** — creative coding feats (speed, depth, colors, clean runs)
 * - **canvas** — zoom extremes, pan distance, bookmarks, and exports
 * - **collaboration** — session joins and script sharing
 * - **dedication** — session count and cumulative drawing time
 *
 * Each badge's {@link BadgeDefinition.criteria} function is evaluated by
 * {@link BadgeEngine.evaluate} against the current {@link UserStats}.
 *
 * @see {@link BadgeEngine} for evaluation logic
 * @see {@link BadgeTier} for tier definitions
 */
export const BADGE_CATALOG: BadgeDefinition[] = [
  // --- Drawing badges ---
  {
    id: "first-stroke",
    name: "First Mark",
    description: "Draw your first stroke",
    tier: "bronze",
    icon: "\u270F\uFE0F",
    category: "drawing",
    criteria: (s) => s.totalStrokes >= 1,
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Draw 100 strokes",
    tier: "silver",
    icon: "\uD83C\uDFA8",
    category: "drawing",
    criteria: (s) => s.totalStrokes >= 100,
  },
  {
    id: "thousand-strokes",
    name: "Stroke Master",
    description: "Draw 1,000 strokes",
    tier: "gold",
    icon: "\uD83D\uDD8C\uFE0F",
    category: "drawing",
    criteria: (s) => s.totalStrokes >= 1000,
  },
  {
    id: "ten-thousand-strokes",
    name: "Ink Ocean",
    description: "Draw 10,000 strokes",
    tier: "platinum",
    icon: "\uD83C\uDF0A",
    category: "drawing",
    criteria: (s) => s.totalStrokes >= 10000,
  },
  {
    id: "shape-maker",
    name: "Shape Maker",
    description: "Draw your first shape",
    tier: "bronze",
    icon: "\u25B3",
    category: "drawing",
    criteria: (s) => s.totalShapes >= 1,
  },
  {
    id: "geometry-buff",
    name: "Geometry Buff",
    description: "Draw 50 shapes",
    tier: "silver",
    icon: "\u2B21",
    category: "drawing",
    criteria: (s) => s.totalShapes >= 50,
  },
  {
    id: "clean-slate",
    name: "Clean Slate",
    description: "Use the eraser for the first time",
    tier: "bronze",
    icon: "\uD83E\uDDF9",
    category: "drawing",
    criteria: (s) => s.totalEraseActions >= 1,
  },
  {
    id: "serial-eraser",
    name: "Serial Eraser",
    description: "Erase 100 times",
    tier: "silver",
    icon: "\u2716\uFE0F",
    category: "drawing",
    criteria: (s) => s.totalEraseActions >= 100,
  },
  {
    id: "time-traveler",
    name: "Time Traveler",
    description: "Undo 10 times",
    tier: "bronze",
    icon: "\u23EA",
    category: "drawing",
    criteria: (s) => s.totalUndos >= 10,
  },
  {
    id: "undo-addict",
    name: "Undo Addict",
    description: "Undo 500 times",
    tier: "gold",
    icon: "\uD83D\uDD04",
    category: "drawing",
    criteria: (s) => s.totalUndos >= 500,
  },
  {
    id: "tool-explorer",
    name: "Tool Explorer",
    description: "Use at least 6 different tools",
    tier: "silver",
    icon: "\uD83E\uDDF0",
    category: "drawing",
    criteria: (s) => Object.keys(s.toolUsage).length >= 6,
  },
  {
    id: "all-brushes",
    name: "Brush Collector",
    description: "Use all 4 brush presets",
    tier: "bronze",
    icon: "\uD83D\uDD8D\uFE0F",
    category: "drawing",
    criteria: (s) =>
      !!s.toolUsage["pen"] &&
      !!s.toolUsage["pencil"] &&
      !!s.toolUsage["marker"] &&
      !!s.toolUsage["highlighter"],
  },

  // --- Turtle badges ---
  {
    id: "first-turtle",
    name: "Hello Turtle",
    description: "Run your first turtle script",
    tier: "bronze",
    icon: "\uD83D\uDC22",
    category: "turtle",
    criteria: (s) => s.totalTurtleRuns >= 1,
  },
  {
    id: "turtle-veteran",
    name: "Turtle Veteran",
    description: "Run 50 turtle scripts",
    tier: "silver",
    icon: "\uD83D\uDC22",
    category: "turtle",
    criteria: (s) => s.totalTurtleRuns >= 50,
  },
  {
    id: "turtle-master",
    name: "Turtle Master",
    description: "Run 200 turtle scripts",
    tier: "gold",
    icon: "\uD83D\uDC22",
    category: "turtle",
    criteria: (s) => s.totalTurtleRuns >= 200,
  },
  {
    id: "herd-leader",
    name: "Herd Leader",
    description: "Spawn your first turtle",
    tier: "bronze",
    icon: "\uD83E\uDD8E",
    category: "turtle",
    criteria: (s) => s.totalTurtlesSpawned >= 1,
  },
  {
    id: "turtle-rancher",
    name: "Turtle Rancher",
    description: "Spawn 50 turtles",
    tier: "silver",
    icon: "\uD83E\uDD8E",
    category: "turtle",
    criteria: (s) => s.totalTurtlesSpawned >= 50,
  },
  {
    id: "mega-herd",
    name: "Mega Herd",
    description: "Spawn 500 turtles",
    tier: "gold",
    icon: "\uD83E\uDD8E",
    category: "turtle",
    criteria: (s) => s.totalTurtlesSpawned >= 500,
  },
  {
    id: "marathon-turtle",
    name: "Marathon Turtle",
    description: "Move turtles a total of 100,000 units",
    tier: "silver",
    icon: "\uD83C\uDFC3",
    category: "turtle",
    criteria: (s) => s.totalTurtleForwardDistance >= 100000,
  },
  {
    id: "script-collector",
    name: "Script Collector",
    description: "Import 3 scripts from the exchange",
    tier: "bronze",
    icon: "\uD83D\uDCE5",
    category: "turtle",
    criteria: (s) => s.exchangeScriptsImported >= 3,
  },
  {
    id: "exchange-connoisseur",
    name: "Exchange Connoisseur",
    description: "Import 10 scripts from the exchange",
    tier: "silver",
    icon: "\uD83C\uDFAD",
    category: "turtle",
    criteria: (s) => s.exchangeScriptsImported >= 10,
  },
  {
    id: "debug-warrior",
    name: "Debug Warrior",
    description: "Encounter 10 turtle script errors",
    tier: "bronze",
    icon: "\uD83D\uDC1B",
    category: "turtle",
    criteria: (s) => s.totalTurtleErrors >= 10,
  },
  {
    id: "novelist",
    name: "Novelist",
    description: "Write a turtle script at least 2,000 characters long",
    tier: "silver",
    icon: "\uD83D\uDCDD",
    category: "turtle",
    criteria: (s) => s.longestTurtleScript >= 2000,
  },

  // --- Turtle awards (creative coding achievements) ---
  {
    id: "color-painter",
    name: "Color Painter",
    description: "Use at least 2 different pen colors in turtle scripts",
    tier: "bronze",
    icon: "\uD83C\uDFA8",
    category: "turtle-awards",
    criteria: (s) => s.totalTurtleRuns >= 1 && s.uniquePenColors >= 2,
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    description: "Complete a 100+ command script in under 1 second",
    tier: "silver",
    icon: "\u26A1",
    category: "turtle-awards",
    criteria: (s) => s.fastestTurtleCompletionMs > 0 && s.fastestTurtleCompletionMs <= 1000,
  },
  {
    id: "patient-artist",
    name: "Patient Artist",
    description: "Run a single turtle script for 60+ seconds",
    tier: "silver",
    icon: "\u23F3",
    category: "turtle-awards",
    criteria: (s) => s.longestTurtleRuntimeMs >= 60000,
  },
  {
    id: "error-free-streak",
    name: "Clean Coder",
    description: "Complete 10 consecutive turtle runs without an error",
    tier: "gold",
    icon: "\u2728",
    category: "turtle-awards",
    criteria: (s) => s.consecutiveCleanRuns >= 10,
  },
  {
    id: "polyglot-turtle",
    name: "Polyglot Turtle",
    description: "Use 5+ different API categories in a single turtle script",
    tier: "gold",
    icon: "\uD83C\uDF10",
    category: "turtle-awards",
    criteria: (s) => s.turtleApiBreadth >= 5,
  },
  {
    id: "fractal-explorer",
    name: "Fractal Explorer",
    description: "Use spawn_at_scale() at least 3 levels deep",
    tier: "gold",
    icon: "\uD83C\uDF00",
    category: "turtle-awards",
    criteria: (s) => s.maxSpawnDepth >= 3,
  },
  {
    id: "turtle-army",
    name: "Turtle Army",
    description: "Spawn 100+ turtles in a single run",
    tier: "platinum",
    icon: "\uD83D\uDC22",
    category: "turtle-awards",
    criteria: (s) => s.mostTurtlesInSingleRun >= 100,
  },

  // --- Canvas badges ---
  {
    id: "deep-zoom",
    name: "Deep Zoom",
    description: "Zoom in to at least 100,000x",
    tier: "silver",
    icon: "\uD83D\uDD0D",
    category: "canvas",
    criteria: (s) => s.maxZoomLevel >= 1e5,
  },
  {
    id: "infinity-zoom",
    name: "Infinity Zoom",
    description: "Zoom in to at least 100,000,000x",
    tier: "gold",
    icon: "\uD83D\uDD2C",
    category: "canvas",
    criteria: (s) => s.maxZoomLevel >= 1e8,
  },
  {
    id: "wide-view",
    name: "Wide View",
    description: "Zoom out to 0.001x or less",
    tier: "silver",
    icon: "\uD83C\uDF0D",
    category: "canvas",
    criteria: (s) => s.minZoomLevel > 0 && s.minZoomLevel <= 1e-3,
  },
  {
    id: "explorer",
    name: "Explorer",
    description: "Pan a total of 10,000 units",
    tier: "bronze",
    icon: "\uD83E\uDDED",
    category: "canvas",
    criteria: (s) => s.totalPanDistance >= 10000,
  },
  {
    id: "cartographer",
    name: "Cartographer",
    description: "Create 5 bookmarks",
    tier: "silver",
    icon: "\uD83D\uDCCD",
    category: "canvas",
    criteria: (s) => s.bookmarksCreated >= 5,
  },
  {
    id: "exporter",
    name: "Exporter",
    description: "Export a drawing as PNG",
    tier: "bronze",
    icon: "\uD83D\uDCBE",
    category: "canvas",
    criteria: (s) => s.totalExports >= 1,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Export 10 drawings",
    tier: "silver",
    icon: "\uD83D\uDCC1",
    category: "canvas",
    criteria: (s) => s.totalExports >= 10,
  },

  // --- Collaboration badges ---
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Join your first collaboration session",
    tier: "bronze",
    icon: "\uD83E\uDD8B",
    category: "collaboration",
    criteria: (s) => s.totalCollabSessions >= 1,
  },
  {
    id: "regular-collaborator",
    name: "Regular Collaborator",
    description: "Join 10 collaboration sessions",
    tier: "silver",
    icon: "\uD83E\uDD1D",
    category: "collaboration",
    criteria: (s) => s.totalCollabSessions >= 10,
  },
  {
    id: "script-sharer",
    name: "Script Sharer",
    description: "Share a script to a collaboration room",
    tier: "bronze",
    icon: "\uD83D\uDCE4",
    category: "collaboration",
    criteria: (s) => s.scriptsSharedToRoom >= 1,
  },

  // --- Dedication badges ---
  {
    id: "getting-started",
    name: "Getting Started",
    description: "Complete your first drawing session",
    tier: "bronze",
    icon: "\uD83C\uDF1F",
    category: "dedication",
    criteria: (s) => s.totalDrawingSessions >= 1,
  },
  {
    id: "regular",
    name: "Regular",
    description: "Complete 10 drawing sessions",
    tier: "silver",
    icon: "\u2B50",
    category: "dedication",
    criteria: (s) => s.totalDrawingSessions >= 10,
  },
  {
    id: "dedicated",
    name: "Dedicated",
    description: "Complete 50 drawing sessions",
    tier: "gold",
    icon: "\uD83C\uDFC6",
    category: "dedication",
    criteria: (s) => s.totalDrawingSessions >= 50,
  },
  {
    id: "marathon-session",
    name: "Marathon Session",
    description: "Spend 1 hour drawing (cumulative)",
    tier: "silver",
    icon: "\u23F0",
    category: "dedication",
    criteria: (s) => s.totalSessionDurationMs >= 3600000,
  },
  {
    id: "power-user",
    name: "Power User",
    description: "Spend 10 hours drawing (cumulative)",
    tier: "gold",
    icon: "\u26A1",
    category: "dedication",
    criteria: (s) => s.totalSessionDurationMs >= 36000000,
  },
];
