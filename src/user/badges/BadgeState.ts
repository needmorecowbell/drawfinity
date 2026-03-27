import { readConfigFile, writeConfigFile } from "../ConfigFile";

export interface EarnedBadge {
  id: string;
  earnedAt: number;
}

export interface BadgeState {
  earned: EarnedBadge[];
  lastCheckedAt: number;
}

const STORAGE_KEY = "drawfinity:badge-state";
const CONFIG_FILENAME = "badges.json";

function createDefaultBadgeState(): BadgeState {
  return { earned: [], lastCheckedAt: 0 };
}

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
