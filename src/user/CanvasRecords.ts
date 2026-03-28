import { readConfigFile, writeConfigFile } from "./ConfigFile";

/**
 * A single personal-best record with its value, timestamp, and optional context.
 */
export interface CanvasRecord {
  value: number;
  achievedAt: number; // unix ms
  context?: string; // optional description, e.g. script name
}

/**
 * All trackable personal-best records for the canvas.
 */
export interface CanvasRecords {
  // Stroke records
  longestSingleStroke: CanvasRecord;
  widestBrushUsed: CanvasRecord;

  // Turtle records
  mostTurtlesInOneRun: CanvasRecord;
  longestTurtleDistance: CanvasRecord;
  mostTurtleTurns: CanvasRecord;
  fastestTurtleCompletion: CanvasRecord;
  longestTurtleRuntime: CanvasRecord;

  // Canvas records
  deepestZoom: CanvasRecord;
  widestZoom: CanvasRecord;
  longestPanInOneSession: CanvasRecord;

  // Collaboration records
  mostConcurrentCollaborators: CanvasRecord;

  // Session records
  longestSession: CanvasRecord;
  mostStrokesInOneSession: CanvasRecord;
}

const STORAGE_KEY = "drawfinity:canvas-records";
const CONFIG_FILENAME = "records.json";

function defaultRecord(): CanvasRecord {
  return { value: 0, achievedAt: 0 };
}

/**
 * Creates a fresh {@link CanvasRecords} object with every personal-best record
 * initialized to zeroed defaults (value 0, achievedAt 0).
 *
 * Used as the baseline when no persisted records exist, and as the merge target
 * when loading stored data to ensure forward-compatible shape.
 *
 * @returns A complete CanvasRecords with all 13 record fields set to `{ value: 0, achievedAt: 0 }`.
 * @see {@link loadRecords} — synchronous loader that falls back to this function
 * @see {@link loadRecordsAsync} — async Tauri loader that falls back to this function
 */
export function createDefaultRecords(): CanvasRecords {
  return {
    longestSingleStroke: defaultRecord(),
    widestBrushUsed: defaultRecord(),
    mostTurtlesInOneRun: defaultRecord(),
    longestTurtleDistance: defaultRecord(),
    mostTurtleTurns: defaultRecord(),
    fastestTurtleCompletion: defaultRecord(),
    longestTurtleRuntime: defaultRecord(),
    deepestZoom: defaultRecord(),
    widestZoom: defaultRecord(),
    longestPanInOneSession: defaultRecord(),
    mostConcurrentCollaborators: defaultRecord(),
    longestSession: defaultRecord(),
    mostStrokesInOneSession: defaultRecord(),
  };
}

function parseRecords(raw: string): CanvasRecords | null {
  try {
    const parsed = JSON.parse(raw);
    const defaults = createDefaultRecords();
    // Merge each record key individually to ensure shape
    for (const key of Object.keys(defaults) as (keyof CanvasRecords)[]) {
      if (parsed[key] && typeof parsed[key].value === "number") {
        defaults[key] = { ...defaultRecord(), ...parsed[key] };
      }
    }
    return defaults;
  } catch {
    return null;
  }
}

/**
 * Loads canvas personal-best records from localStorage, merging stored data
 * over {@link createDefaultRecords | defaults} to ensure forward compatibility
 * when new record fields are added.
 *
 * @returns Persisted {@link CanvasRecords} merged with defaults, or fresh defaults
 *   if nothing is stored or the stored data is corrupt.
 * @see {@link loadRecordsAsync} — async variant that reads from Tauri config first
 * @see {@link saveRecords} — persists records to localStorage and Tauri config
 */
export function loadRecords(): CanvasRecords {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = parseRecords(raw);
    if (parsed) return parsed;
  }
  return createDefaultRecords();
}

export async function loadRecordsAsync(): Promise<CanvasRecords> {
  const raw = await readConfigFile(CONFIG_FILENAME);
  if (raw) {
    const parsed = parseRecords(raw);
    if (parsed) {
      localStorage.setItem(STORAGE_KEY, raw);
      return parsed;
    }
  }
  return loadRecords();
}

export function saveRecords(records: CanvasRecords): void {
  const json = JSON.stringify(records);
  localStorage.setItem(STORAGE_KEY, json);
  writeConfigFile(CONFIG_FILENAME, json).catch(() => {});
}

/**
 * Update a record if the new value exceeds the current personal best.
 * For `fastestTurtleCompletion`, lower is better — handled via `lowerIsBetter`.
 * Returns true if this is a new personal best.
 */
export function updateRecord(
  records: CanvasRecords,
  key: keyof CanvasRecords,
  value: number,
  context?: string,
): boolean {
  const current = records[key];

  // For "fastest" records, lower is better (but 0 means unset)
  const lowerIsBetter = key === "fastestTurtleCompletion";
  const isNewBest = lowerIsBetter
    ? current.value === 0 || value < current.value
    : value > current.value;

  if (isNewBest) {
    records[key] = {
      value,
      achievedAt: Date.now(),
      context,
    };
    return true;
  }
  return false;
}
