import { readConfigFile, writeConfigFile } from "./ConfigFile";

/**
 * Cumulative stats tracking for gamification — badges, records, and awards
 * are all derived from this data. Persisted to localStorage and Tauri config.
 */
export interface UserStats {
  // Drawing stats
  totalStrokes: number;
  totalShapes: number;
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

export function createDefaultStats(): UserStats {
  return {
    totalStrokes: 0,
    totalShapes: 0,
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
    totalCollabSessions: 0,
    totalCollabRoomsCreated: 0,
    scriptsSharedToRoom: 0,
    toolUsage: {},
    firstSessionAt: Date.now(),
    lastSessionAt: 0,
    totalSessionDurationMs: 0,
  };
}

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

export function saveStats(stats: UserStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  writeConfigFile(CONFIG_FILENAME, JSON.stringify(stats)).catch(() => {});
}

export function incrementStat(key: keyof Omit<UserStats, "toolUsage" | "firstSessionAt" | "lastSessionAt">, amount: number = 1): void {
  const stats = loadStats();
  (stats[key] as number) += amount;
  saveStats(stats);
}

export function incrementToolUsage(tool: string): void {
  const stats = loadStats();
  stats.toolUsage[tool] = (stats.toolUsage[tool] ?? 0) + 1;
  saveStats(stats);
}
