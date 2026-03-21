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

export function savePreferences(prefs: UserPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  writeConfigFile(CONFIG_FILENAME, JSON.stringify(prefs)).catch(() => {});
}

/** Load preferences from config file (Tauri) with localStorage fallback. */
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
