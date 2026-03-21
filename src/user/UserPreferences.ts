import { readConfigFile, writeConfigFile } from "./ConfigFile";

/**
 * Canvas background grid rendering style.
 *
 * Controls how the infinite canvas background grid is displayed:
 * - `"dots"` — Evenly spaced dot pattern (default when grid is enabled)
 * - `"lines"` — Traditional graph-paper line grid
 * - `"none"` — No grid, plain background
 *
 * Used by {@link UserPreferences.gridStyle} and the {@link Renderer.setGridStyle} method.
 */
export type GridStyle = "dots" | "lines" | "none";

/**
 * Core user settings persisted to localStorage and (when available) to a Tauri config file.
 *
 * All optional fields default to `undefined` and are filled with sensible defaults
 * by {@link loadPreferences} when missing. The interface is serialized as JSON, so
 * all values must be JSON-compatible primitives.
 *
 * @example
 * ```ts
 * const prefs = loadPreferences();
 * prefs.gridStyle = "lines";
 * savePreferences(prefs);
 * ```
 */
export interface UserPreferences {
  /** Index into {@link BRUSH_PRESETS} selecting the default brush on app start (default: `0` — Pen). */
  defaultBrush: number;
  /** CSS hex color string used as the initial stroke color (default: `"#000000"`). */
  defaultColor: string;
  /** Background grid rendering style. When omitted, the renderer uses its own default. */
  gridStyle?: GridStyle;
  /** Filesystem directory path for saving drawings (Tauri only). */
  saveDirectory?: string;
  /** WebSocket URL of the collaboration server (e.g. `"ws://localhost:3030"`). */
  serverUrl?: string;
  /** ID of the last joined collaboration room, used for quick-reconnect. */
  lastRoomId?: string;
}

const STORAGE_KEY = "drawfinity:user-preferences";
const CONFIG_FILENAME = "preferences.json";

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultBrush: 0,
  defaultColor: "#000000",
};

/**
 * Loads user preferences from localStorage, applying defaults for any missing fields.
 *
 * Reads the serialized JSON from the `"drawfinity:user-preferences"` localStorage key.
 * If the entry is missing or contains invalid JSON, returns a fresh copy of the
 * default preferences. For Tauri environments where config files are available,
 * use {@link loadPreferencesAsync} instead to read from disk first.
 *
 * @returns A complete {@link UserPreferences} object with defaults merged in for
 *          any fields not present in the stored data.
 *
 * @example
 * ```ts
 * const prefs = loadPreferences();
 * console.log(prefs.defaultBrush); // 0 (default Pen preset)
 * ```
 *
 * @see {@link savePreferences} to persist changes
 * @see {@link loadPreferencesAsync} for Tauri config-file–aware loading
 */
export function loadPreferences(): UserPreferences {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch {
      // Fall through to defaults
    }
  }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Persists user preferences to localStorage and (best-effort) to the Tauri config file.
 *
 * The localStorage write is synchronous and always succeeds in a browser context.
 * A background write to the Tauri config file (`preferences.json`) is attempted but
 * failures are silently ignored — this allows the function to work in both browser-only
 * and Tauri desktop environments without callers needing to handle platform differences.
 *
 * @param prefs - The complete {@link UserPreferences} object to persist.
 *                All fields are serialized to JSON; partial updates should first
 *                be merged with the result of {@link loadPreferences}.
 *
 * @example
 * ```ts
 * const prefs = loadPreferences();
 * prefs.gridStyle = "lines";
 * savePreferences(prefs);
 * ```
 *
 * @see {@link loadPreferences} to retrieve the current settings
 */
export function savePreferences(prefs: UserPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  writeConfigFile(CONFIG_FILENAME, JSON.stringify(prefs)).catch(() => {});
}

/**
 * Loads user preferences from the Tauri config file, falling back to localStorage.
 *
 * Attempts to read `preferences.json` from the Tauri config directory. On success,
 * the localStorage cache is also updated to keep both stores in sync. If the config
 * file is missing or unreadable (e.g. running in browser-only mode), delegates to
 * the synchronous {@link loadPreferences} which reads from localStorage only.
 *
 * @returns A complete {@link UserPreferences} object with defaults merged in.
 *
 * @see {@link loadPreferences} for synchronous localStorage-only loading
 * @see {@link savePreferences} to persist changes
 */
export async function loadPreferencesAsync(): Promise<UserPreferences> {
  const raw = await readConfigFile(CONFIG_FILENAME);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY, raw);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch { /* fall through */ }
  }
  return loadPreferences();
}
