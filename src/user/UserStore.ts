import type { UserProfile } from "./UserProfile";
import { readConfigFile, writeConfigFile } from "./ConfigFile";

const STORAGE_KEY = "drawfinity:user-profile";
const CONFIG_FILENAME = "profile.json";

const USER_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
  "#1abc9c", "#3498db", "#9b59b6", "#e91e63",
];

function generateId(): string {
  return crypto.randomUUID();
}

function randomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function createDefaultProfile(): UserProfile {
  return {
    id: generateId(),
    name: "Anonymous",
    color: randomColor(),
  };
}

/**
 * Loads the user profile from localStorage, creating a default profile if none exists.
 *
 * Attempts to parse the stored profile JSON. If the stored data is missing, corrupt,
 * or lacks required fields (`id`, `name`, `color`), a new default profile is generated
 * with a random UUID, the name "Anonymous", and a random color, then persisted automatically.
 *
 * @returns The user's profile, either loaded from storage or freshly created.
 */
export function loadProfile(): UserProfile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.id && parsed.name && parsed.color) {
        return parsed as UserProfile;
      }
    } catch {
      // Fall through to default
    }
  }
  const profile = createDefaultProfile();
  saveProfile(profile);
  return profile;
}

/**
 * Persists a user profile to both localStorage and the Tauri config file,
 * then notifies all registered profile-change listeners.
 *
 * The profile is serialized as JSON to localStorage for fast synchronous access,
 * and written to the config file asynchronously for cross-session persistence
 * in Tauri environments. Config file write failures are silently ignored.
 *
 * @param profile - The user profile to save.
 */
export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  writeConfigFile(CONFIG_FILENAME, JSON.stringify(profile)).catch(() => {});
  for (const listener of profileListeners) {
    listener(profile);
  }
}

/** Load profile from config file (Tauri) with localStorage fallback. */
export async function loadProfileAsync(): Promise<UserProfile> {
  const raw = await readConfigFile(CONFIG_FILENAME);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.id && parsed.name && parsed.color) {
        // Sync to localStorage for fast synchronous access next time
        localStorage.setItem(STORAGE_KEY, raw);
        return parsed as UserProfile;
      }
    } catch { /* fall through */ }
  }
  return loadProfile();
}

const profileListeners = new Set<(profile: UserProfile) => void>();

/**
 * Subscribes to profile change notifications triggered by {@link saveProfile}.
 *
 * The callback fires each time a profile is saved, receiving the updated
 * profile object. Use the returned unsubscribe function to remove the
 * listener when it is no longer needed.
 *
 * @param callback - Invoked with the updated {@link UserProfile} whenever
 *   a profile is saved.
 * @returns A cleanup function that removes the listener when called.
 *
 * @example
 * ```ts
 * const unsubscribe = onProfileChange((profile) => {
 *   console.log("Profile changed:", profile.name);
 * });
 *
 * // Later, stop listening:
 * unsubscribe();
 * ```
 */
export function onProfileChange(callback: (profile: UserProfile) => void): () => void {
  profileListeners.add(callback);
  return () => {
    profileListeners.delete(callback);
  };
}

export { USER_COLORS };
