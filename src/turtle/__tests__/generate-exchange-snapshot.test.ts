import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExchangeSnapshot } from "../exchange/ExchangeTypes";

const SNAPSHOT_PATH = join(
  __dirname,
  "../../turtle/exchange/exchange-snapshot.json",
);

describe("exchange-snapshot.json", () => {
  it("exists and is valid JSON", () => {
    const raw = readFileSync(SNAPSHOT_PATH, "utf-8");
    const snapshot: ExchangeSnapshot = JSON.parse(raw);
    expect(snapshot).toBeDefined();
  });

  it("has a version field (ISO timestamp)", () => {
    const raw = readFileSync(SNAPSHOT_PATH, "utf-8");
    const snapshot: ExchangeSnapshot = JSON.parse(raw);
    expect(snapshot.version).toBeDefined();
    expect(typeof snapshot.version).toBe("string");
    // Should be parseable as a date
    expect(new Date(snapshot.version).getTime()).not.toBeNaN();
  });

  it("contains scripts with required fields", () => {
    const raw = readFileSync(SNAPSHOT_PATH, "utf-8");
    const snapshot: ExchangeSnapshot = JSON.parse(raw);
    expect(snapshot.scripts.length).toBeGreaterThan(0);

    for (const script of snapshot.scripts) {
      expect(script.id).toBeDefined();
      expect(script.title).toBeDefined();
      expect(script.description).toBeDefined();
      expect(script.author).toBeDefined();
      expect(script.tags).toBeInstanceOf(Array);
      expect(script.path).toBeDefined();
      expect(script.version).toBeDefined();
      expect(script.code).toBeDefined();
      expect(typeof script.code).toBe("string");
      expect(script.code.length).toBeGreaterThan(0);
    }
  });

  it("contains the expected 8 seeded scripts", () => {
    const raw = readFileSync(SNAPSHOT_PATH, "utf-8");
    const snapshot: ExchangeSnapshot = JSON.parse(raw);
    const ids = snapshot.scripts.map((s) => s.id).sort();
    expect(ids).toEqual([
      "fractal-zoom-tree",
      "game-of-life",
      "koch-curve",
      "sierpinski-triangle",
      "sierpinski-zoom",
      "spiral",
      "star",
      "tree",
    ]);
  });

  it("scripts have non-empty Lua code", () => {
    const raw = readFileSync(SNAPSHOT_PATH, "utf-8");
    const snapshot: ExchangeSnapshot = JSON.parse(raw);
    for (const script of snapshot.scripts) {
      // All scripts should contain at least one turtle command
      expect(script.code).toMatch(
        /forward|right|left|pencolor|penwidth|penup|pendown/,
      );
    }
  });
});
