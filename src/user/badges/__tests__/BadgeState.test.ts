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

import { loadBadgeState, saveBadgeState } from "../BadgeState";
import type { BadgeState } from "../BadgeState";

describe("BadgeState", () => {
  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  it("loadBadgeState returns defaults when localStorage is empty", () => {
    const state = loadBadgeState();
    expect(state.earned).toEqual([]);
    expect(state.lastCheckedAt).toBe(0);
  });

  it("saveBadgeState + loadBadgeState roundtrips correctly", () => {
    const state: BadgeState = {
      earned: [{ id: "first-stroke", earnedAt: 1000 }],
      lastCheckedAt: 2000,
    };
    saveBadgeState(state);

    const loaded = loadBadgeState();
    expect(loaded.earned).toEqual([{ id: "first-stroke", earnedAt: 1000 }]);
    expect(loaded.lastCheckedAt).toBe(2000);
  });

  it("handles corrupted localStorage data gracefully", () => {
    storageMap.set("drawfinity:badge-state", "not-json");
    const state = loadBadgeState();
    expect(state.earned).toEqual([]);
    expect(state.lastCheckedAt).toBe(0);
  });

  it("merges partial stored data with defaults", () => {
    storageMap.set("drawfinity:badge-state", JSON.stringify({ lastCheckedAt: 5000 }));
    const state = loadBadgeState();
    expect(state.earned).toEqual([]);
    expect(state.lastCheckedAt).toBe(5000);
  });
});
