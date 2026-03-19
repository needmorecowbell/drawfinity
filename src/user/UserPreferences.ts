import { readConfigFile, writeConfigFile } from "./ConfigFile";

export type GridStyle = "dots" | "lines" | "none";

export interface UserPreferences {
  defaultBrush: number;
  defaultColor: string;
  gridStyle?: GridStyle;
  saveDirectory?: string;
  serverUrl?: string;
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
