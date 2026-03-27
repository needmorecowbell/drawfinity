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
  createDefaultRecords,
  loadRecords,
  saveRecords,
  updateRecord,
} from "../CanvasRecords";

describe("CanvasRecords", () => {
  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  it("createDefaultRecords returns all-zero records", () => {
    const records = createDefaultRecords();
    for (const key of Object.keys(records) as (keyof typeof records)[]) {
      expect(records[key].value).toBe(0);
      expect(records[key].achievedAt).toBe(0);
    }
  });

  it("updateRecord updates when value is higher", () => {
    const records = createDefaultRecords();
    const updated = updateRecord(records, "longestSingleStroke", 42, "test stroke");
    expect(updated).toBe(true);
    expect(records.longestSingleStroke.value).toBe(42);
    expect(records.longestSingleStroke.context).toBe("test stroke");
    expect(records.longestSingleStroke.achievedAt).toBeGreaterThan(0);
  });

  it("updateRecord does not update when value is lower", () => {
    const records = createDefaultRecords();
    updateRecord(records, "longestSingleStroke", 100);
    const updated = updateRecord(records, "longestSingleStroke", 50);
    expect(updated).toBe(false);
    expect(records.longestSingleStroke.value).toBe(100);
  });

  it("updateRecord handles fastestTurtleCompletion (lower is better)", () => {
    const records = createDefaultRecords();
    // First value always wins (current is 0 = unset)
    expect(updateRecord(records, "fastestTurtleCompletion", 500)).toBe(true);
    expect(records.fastestTurtleCompletion.value).toBe(500);

    // Lower value is a new best
    expect(updateRecord(records, "fastestTurtleCompletion", 300)).toBe(true);
    expect(records.fastestTurtleCompletion.value).toBe(300);

    // Higher value is not a new best
    expect(updateRecord(records, "fastestTurtleCompletion", 400)).toBe(false);
    expect(records.fastestTurtleCompletion.value).toBe(300);
  });

  it("saveRecords + loadRecords roundtrips correctly", () => {
    const records = createDefaultRecords();
    updateRecord(records, "longestSingleStroke", 200);
    updateRecord(records, "deepestZoom", 1e8);
    saveRecords(records);

    const loaded = loadRecords();
    expect(loaded.longestSingleStroke.value).toBe(200);
    expect(loaded.deepestZoom.value).toBe(1e8);
    // Untouched records remain zero
    expect(loaded.widestBrushUsed.value).toBe(0);
  });

  it("loadRecords handles corrupted data gracefully", () => {
    storageMap.set("drawfinity:canvas-records", "not-json");
    const records = loadRecords();
    expect(records.longestSingleStroke.value).toBe(0);
  });

  it("loadRecords merges partial stored data with defaults", () => {
    storageMap.set(
      "drawfinity:canvas-records",
      JSON.stringify({ longestSingleStroke: { value: 77, achievedAt: 1000 } }),
    );
    const records = loadRecords();
    expect(records.longestSingleStroke.value).toBe(77);
    expect(records.widestBrushUsed.value).toBe(0);
  });
});
