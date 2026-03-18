// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storageMap.set(key, value)),
  removeItem: vi.fn((key: string) => storageMap.delete(key)),
  clear: vi.fn(() => storageMap.clear()),
  get length() { return storageMap.size; },
  key: vi.fn((index: number) => [...storageMap.keys()][index] ?? null),
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

import { loadPreferences, savePreferences } from "../UserPreferences";
import type { UserPreferences } from "../UserPreferences";

describe("UserPreferences", () => {
  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  it("returns sensible defaults when no data is stored", () => {
    const prefs = loadPreferences();
    expect(prefs.defaultBrush).toBe(0);
    expect(prefs.defaultColor).toBe("#000000");
    expect(prefs.saveDirectory).toBeUndefined();
    expect(prefs.serverUrl).toBeUndefined();
    expect(prefs.lastRoomId).toBeUndefined();
  });

  it("saves and loads preferences", () => {
    const prefs: UserPreferences = {
      defaultBrush: 2,
      defaultColor: "#ff5500",
      serverUrl: "ws://localhost:8080",
      lastRoomId: "room-42",
    };
    savePreferences(prefs);

    const loaded = loadPreferences();
    expect(loaded.defaultBrush).toBe(2);
    expect(loaded.defaultColor).toBe("#ff5500");
    expect(loaded.serverUrl).toBe("ws://localhost:8080");
    expect(loaded.lastRoomId).toBe("room-42");
    expect(loaded.saveDirectory).toBeUndefined();
  });

  it("persists to localStorage with correct key", () => {
    savePreferences({ defaultBrush: 1, defaultColor: "#aabbcc" });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "drawfinity:user-preferences",
      expect.any(String),
    );
    const stored = JSON.parse(storageMap.get("drawfinity:user-preferences")!);
    expect(stored.defaultBrush).toBe(1);
  });

  it("merges partial stored data with defaults", () => {
    storageMap.set("drawfinity:user-preferences", JSON.stringify({ defaultBrush: 3 }));
    const prefs = loadPreferences();
    expect(prefs.defaultBrush).toBe(3);
    expect(prefs.defaultColor).toBe("#000000");
  });

  it("handles corrupted localStorage data gracefully", () => {
    storageMap.set("drawfinity:user-preferences", "not-json");
    const prefs = loadPreferences();
    expect(prefs.defaultBrush).toBe(0);
    expect(prefs.defaultColor).toBe("#000000");
  });

  it("preserves optional fields through save/load cycle", () => {
    const prefs: UserPreferences = {
      defaultBrush: 0,
      defaultColor: "#000000",
      saveDirectory: "/home/user/drawings",
      serverUrl: "wss://collab.example.com",
      lastRoomId: "design-session",
    };
    savePreferences(prefs);

    const loaded = loadPreferences();
    expect(loaded.saveDirectory).toBe("/home/user/drawings");
    expect(loaded.serverUrl).toBe("wss://collab.example.com");
    expect(loaded.lastRoomId).toBe("design-session");
  });
});
