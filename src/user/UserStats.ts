import { readConfigFile, writeConfigFile } from "./ConfigFile";

/**
 * Cumulative stats tracking for gamification — badges, records, and awards
 * are all derived from this data. Persisted to localStorage and Tauri config.
 */
export interface UserStats {
  // Drawing stats
  totalStrokes: number; // hand-drawn strokes only
  totalShapes: number;
  totalTurtleStrokes: number; // strokes created by turtle scripts
  totalEraseActions: number;
  totalUndos: number;
  totalRedos: number;
  totalExports: number;
  totalDrawingSessions: number;

  // Canvas stats
  longestStrokePoints: number;
  maxZoomLevel: number;
  minZoomLevel: number;
  totalPanDistance: number;
  bookmarksCreated: number;

  // Turtle stats
  totalTurtleRuns: number;
  totalTurtleErrors: number;
  totalTurtlesSpawned: number;
  totalTurtleForwardDistance: number;
  totalTurtleTurns: number;
  longestTurtleScript: number;
  exchangeScriptsImported: number;

  // Turtle award stats
  uniquePenColors: number;
  consecutiveCleanRuns: number;
  turtleApiBreadth: number;
  maxSpawnDepth: number;
  fastestTurtleCompletionMs: number; // best (lowest) for 100+ cmd runs, 0 = unset
  longestTurtleRuntimeMs: number; // best (highest) single-run runtime
  mostTurtlesInSingleRun: number; // best (highest) spawned in one run

  // Collaboration stats
  totalCollabSessions: number;
  totalCollabRoomsCreated: number;
  scriptsSharedToRoom: number;

  // Tool usage (count per tool)
  toolUsage: Record<string, number>;

  // Timestamps
  firstSessionAt: number;
  lastSessionAt: number;
  totalSessionDurationMs: number;
}

const STORAGE_KEY = "drawfinity:user-stats";
const CONFIG_FILENAME = "stats.json";

/**
 * Creates a {@link UserStats} object with all counters zeroed and timestamps initialized.
 *
 * Used as the base template when no persisted stats exist, and as a merge target
 * for forward-compatible deserialization (new fields get sensible defaults).
 *
 * @returns A fresh `UserStats` with every numeric field set to `0`,
 *          `toolUsage` set to an empty record, and `firstSessionAt` set to `Date.now()`.
 *
 * @see {@link loadStats} — merges persisted data over these defaults
 * @see {@link loadStatsAsync} — async variant that reads from Tauri config first
 */
export function createDefaultStats(): UserStats {
  return {
    totalStrokes: 0,
    totalShapes: 0,
    totalTurtleStrokes: 0,
    totalEraseActions: 0,
    totalUndos: 0,
    totalRedos: 0,
    totalExports: 0,
    totalDrawingSessions: 0,
    longestStrokePoints: 0,
    maxZoomLevel: 0,
    minZoomLevel: 0,
    totalPanDistance: 0,
    bookmarksCreated: 0,
    totalTurtleRuns: 0,
    totalTurtleErrors: 0,
    totalTurtlesSpawned: 0,
    totalTurtleForwardDistance: 0,
    totalTurtleTurns: 0,
    longestTurtleScript: 0,
    exchangeScriptsImported: 0,
    uniquePenColors: 0,
    consecutiveCleanRuns: 0,
    turtleApiBreadth: 0,
    maxSpawnDepth: 0,
    fastestTurtleCompletionMs: 0,
    longestTurtleRuntimeMs: 0,
    mostTurtlesInSingleRun: 0,
    totalCollabSessions: 0,
    totalCollabRoomsCreated: 0,
    scriptsSharedToRoom: 0,
    toolUsage: {},
    firstSessionAt: Date.now(),
    lastSessionAt: 0,
    totalSessionDurationMs: 0,
  };
}

/**
 * Loads user stats synchronously from `localStorage`, merging stored values
 * over {@link createDefaultStats | defaults} for forward compatibility —
 * newly added stat fields receive sensible zero-values even when reading
 * data saved by an older version of the app.
 *
 * @returns The persisted {@link UserStats} merged with defaults,
 *          or a fresh default object if nothing is stored or the data is corrupt.
 *
 * @see {@link loadStatsAsync} — async variant that reads from Tauri config first
 * @see {@link saveStats} — persists stats to both localStorage and Tauri config
 */
export function loadStats(): UserStats {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...createDefaultStats(), ...parsed };
    } catch {
      // Fall through to defaults
    }
  }
  return createDefaultStats();
}

/**
 * Loads user stats asynchronously from the Tauri config file (`stats.json`),
 * falling back to {@link loadStats | localStorage} when the config file is
 * unavailable (e.g. in browser-only mode). When a Tauri config read succeeds,
 * the result is also written back to `localStorage` so that subsequent
 * synchronous {@link loadStats} calls stay in sync.
 *
 * Like {@link loadStats}, stored values are merged over
 * {@link createDefaultStats | defaults} for forward compatibility.
 *
 * @returns The persisted {@link UserStats} from Tauri config or localStorage,
 *          merged with defaults.
 *
 * @see {@link loadStats} — synchronous localStorage-only variant
 * @see {@link saveStats} — dual-writes to both localStorage and Tauri config
 */
export async function loadStatsAsync(): Promise<UserStats> {
  const raw = await readConfigFile(CONFIG_FILENAME);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY, raw);
      return { ...createDefaultStats(), ...parsed };
    } catch { /* fall through */ }
  }
  return loadStats();
}

/**
 * Persists user stats to both `localStorage` and the Tauri config file
 * (`stats.json`), ensuring the two storage backends stay in sync.
 *
 * The Tauri config write is fire-and-forget — failures (e.g. in browser-only
 * mode) are silently ignored so the localStorage write always succeeds.
 *
 * @param stats - The {@link UserStats} object to persist.
 *
 * @see {@link loadStats} — synchronous reader (localStorage)
 * @see {@link loadStatsAsync} — async reader (Tauri config with localStorage fallback)
 */
export function saveStats(stats: UserStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  writeConfigFile(CONFIG_FILENAME, JSON.stringify(stats)).catch(() => {});
}

/**
 * Loads the current stats, increments a single numeric field by the given
 * amount, and persists the result via {@link saveStats}.
 *
 * The `key` parameter is constrained to numeric counter fields — non-numeric
 * fields (`toolUsage`, `firstSessionAt`, `lastSessionAt`) are excluded at
 * the type level.
 *
 * @param key - The stat field to increment (must be a numeric counter, not
 *              `toolUsage`, `firstSessionAt`, or `lastSessionAt`).
 * @param amount - The value to add (defaults to `1`).
 *
 * @see {@link incrementToolUsage} — per-tool usage counter variant
 * @see {@link saveStats} — underlying persistence call
 */
export function incrementStat(key: keyof Omit<UserStats, "toolUsage" | "firstSessionAt" | "lastSessionAt">, amount: number = 1): void {
  const stats = loadStats();
  (stats[key] as number) += amount;
  saveStats(stats);
}

/**
 * Increments the usage counter for a specific tool in the `toolUsage` record.
 *
 * Loads current stats, initializes the tool's counter to `0` if it doesn't
 * exist yet, adds one, and persists the result via {@link saveStats}.
 *
 * @param tool - The tool name key to increment (e.g. `"brush"`, `"eraser"`).
 *
 * @see {@link incrementStat} — numeric stat field variant
 * @see {@link saveStats} — underlying persistence call
 */
export function incrementToolUsage(tool: string): void {
  const stats = loadStats();
  stats.toolUsage[tool] = (stats.toolUsage[tool] ?? 0) + 1;
  saveStats(stats);
}
