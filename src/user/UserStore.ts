import type { UserProfile } from "./UserProfile";

const STORAGE_KEY = "drawfinity:user-profile";

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

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  for (const listener of profileListeners) {
    listener(profile);
  }
}

const profileListeners = new Set<(profile: UserProfile) => void>();

export function onProfileChange(callback: (profile: UserProfile) => void): () => void {
  profileListeners.add(callback);
  return () => {
    profileListeners.delete(callback);
  };
}

export { USER_COLORS };
