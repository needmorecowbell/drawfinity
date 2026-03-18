// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage since jsdom/node localStorage may not be fully functional
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

import { loadProfile, saveProfile, onProfileChange } from "../UserStore";

describe("UserStore", () => {
  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  it("generates a default profile on first load", () => {
    const profile = loadProfile();
    expect(profile.id).toBeTruthy();
    expect(profile.name).toBe("Anonymous");
    expect(profile.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("persists the default profile to localStorage on first load", () => {
    const profile = loadProfile();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "drawfinity:user-profile",
      expect.any(String),
    );
    const stored = JSON.parse(storageMap.get("drawfinity:user-profile")!);
    expect(stored.id).toBe(profile.id);
  });

  it("returns the same profile on subsequent loads", () => {
    const first = loadProfile();
    const second = loadProfile();
    expect(second.id).toBe(first.id);
    expect(second.name).toBe(first.name);
    expect(second.color).toBe(first.color);
  });

  it("saves and loads a modified profile", () => {
    const profile = loadProfile();
    profile.name = "Alice";
    profile.color = "#ff0000";
    saveProfile(profile);

    const loaded = loadProfile();
    expect(loaded.name).toBe("Alice");
    expect(loaded.color).toBe("#ff0000");
    expect(loaded.id).toBe(profile.id);
  });

  it("notifies listeners on save", () => {
    const listener = vi.fn();
    const unsubscribe = onProfileChange(listener);

    const profile = loadProfile();
    profile.name = "Bob";
    saveProfile(profile);

    expect(listener).toHaveBeenCalledWith(profile);
    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = onProfileChange(listener);
    unsubscribe();

    saveProfile({ id: "test", name: "Test", color: "#000000" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("handles corrupted localStorage data gracefully", () => {
    storageMap.set("drawfinity:user-profile", "not-json");
    const profile = loadProfile();
    expect(profile.id).toBeTruthy();
    expect(profile.name).toBe("Anonymous");
  });

  it("handles incomplete localStorage data gracefully", () => {
    storageMap.set("drawfinity:user-profile", JSON.stringify({ id: "x" }));
    const profile = loadProfile();
    expect(profile.name).toBe("Anonymous");
  });
});
