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

import {
  createDefaultStats,
  loadStats,
  saveStats,
  incrementStat,
  incrementToolUsage,
} from "../UserStats";

describe("UserStats", () => {
  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  it("loadStats returns defaults when localStorage is empty", () => {
    const stats = loadStats();
    expect(stats.totalStrokes).toBe(0);
    expect(stats.totalShapes).toBe(0);
    expect(stats.totalEraseActions).toBe(0);
    expect(stats.totalUndos).toBe(0);
    expect(stats.totalRedos).toBe(0);
    expect(stats.totalExports).toBe(0);
    expect(stats.totalDrawingSessions).toBe(0);
    expect(stats.toolUsage).toEqual({});
    expect(stats.firstSessionAt).toBeGreaterThan(0);
    expect(stats.lastSessionAt).toBe(0);
    expect(stats.totalSessionDurationMs).toBe(0);
  });

  it("saveStats + loadStats roundtrips correctly", () => {
    const stats = createDefaultStats();
    stats.totalStrokes = 42;
    stats.totalShapes = 7;
    stats.maxZoomLevel = 100;
    stats.toolUsage = { pen: 10, marker: 5 };
    saveStats(stats);

    const loaded = loadStats();
    expect(loaded.totalStrokes).toBe(42);
    expect(loaded.totalShapes).toBe(7);
    expect(loaded.maxZoomLevel).toBe(100);
    expect(loaded.toolUsage).toEqual({ pen: 10, marker: 5 });
  });

  it("incrementStat increments the correct field", () => {
    const stats = createDefaultStats();
    stats.totalStrokes = 5;
    saveStats(stats);

    incrementStat("totalStrokes");
    expect(loadStats().totalStrokes).toBe(6);

    incrementStat("totalStrokes", 10);
    expect(loadStats().totalStrokes).toBe(16);
  });

  it("incrementToolUsage tracks tool counts", () => {
    incrementToolUsage("pen");
    incrementToolUsage("pen");
    incrementToolUsage("marker");

    const stats = loadStats();
    expect(stats.toolUsage.pen).toBe(2);
    expect(stats.toolUsage.marker).toBe(1);
  });

  it("handles corrupted localStorage data gracefully", () => {
    storageMap.set("drawfinity:user-stats", "not-json");
    const stats = loadStats();
    expect(stats.totalStrokes).toBe(0);
    expect(stats.toolUsage).toEqual({});
  });

  it("merges partial stored data with defaults", () => {
    storageMap.set("drawfinity:user-stats", JSON.stringify({ totalStrokes: 99 }));
    const stats = loadStats();
    expect(stats.totalStrokes).toBe(99);
    expect(stats.totalShapes).toBe(0);
    expect(stats.toolUsage).toEqual({});
  });

  it("persists to localStorage with correct key", () => {
    saveStats(createDefaultStats());
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "drawfinity:user-stats",
      expect.any(String),
    );
  });
});
