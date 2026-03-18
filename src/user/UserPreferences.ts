export interface UserPreferences {
  defaultBrush: number;
  defaultColor: string;
  saveDirectory?: string;
  serverUrl?: string;
  lastRoomId?: string;
}

const STORAGE_KEY = "drawfinity:user-preferences";

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
}
