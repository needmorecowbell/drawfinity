import { readConfigFile, writeConfigFile } from "../ConfigFile";

/**
 * Persisted record of a badge the user has earned.
 *
 * Stored as part of {@link BadgeState} and written to both localStorage
 * and Tauri config via {@link saveBadgeState}.
 *
 * @see BadgeState
 * @see BadgeEngine
 */
export interface EarnedBadge {
  /** Badge identifier, matching the corresponding {@link BadgeDefinition}.id. */
  id: string;
  /** Unix-millisecond timestamp of when the badge was earned. */
  earnedAt: number;
}

/**
 * Top-level persistence model for the badge/gamification system.
 *
 * Tracks which badges the user has unlocked and when the engine last
 * evaluated badge criteria. Persisted to both localStorage and Tauri
 * config via {@link saveBadgeState}, loaded via {@link loadBadgeState}
 * or {@link loadBadgeStateAsync}.
 *
 * @see EarnedBadge
 * @see BadgeEngine
 */
export interface BadgeState {
  /** List of all badges the user has earned so far. */
  earned: EarnedBadge[];
  /** Unix-millisecond timestamp of the last badge evaluation run. */
  lastCheckedAt: number;
}

const STORAGE_KEY = "drawfinity:badge-state";
const CONFIG_FILENAME = "badges.json";

function createDefaultBadgeState(): BadgeState {
  return { earned: [], lastCheckedAt: 0 };
}

/**
 * Reads persisted badge state from localStorage, merging stored values
 * over defaults for forward compatibility with new fields.
 *
 * Falls back to a fresh default state (empty earned list, lastCheckedAt 0)
 * if nothing is stored or the stored JSON is corrupt.
 *
 * @returns Badge state merged with defaults, or fresh defaults on failure.
 * @see loadBadgeStateAsync — async variant that reads from Tauri config first
 * @see saveBadgeState
 */
export function loadBadgeState(): BadgeState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...createDefaultBadgeState(), ...parsed };
    } catch {
      // Fall through to defaults
    }
  }
  return createDefaultBadgeState();
}

export async function loadBadgeStateAsync(): Promise<BadgeState> {
  const raw = await readConfigFile(CONFIG_FILENAME);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY, raw);
      return { ...createDefaultBadgeState(), ...parsed };
    } catch { /* fall through */ }
  }
  return loadBadgeState();
}

export function saveBadgeState(state: BadgeState): void {
  const json = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, json);
  writeConfigFile(CONFIG_FILENAME, json).catch(() => {});
}
