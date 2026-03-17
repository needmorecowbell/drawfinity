import { describe, it, expect } from "vitest";
import { generateStrokeId } from "../Stroke";

describe("generateStrokeId", () => {
  it("returns unique IDs", () => {
    const id1 = generateStrokeId();
    const id2 = generateStrokeId();
    expect(id1).not.toBe(id2);
  });

  it("starts with 'stroke-' prefix", () => {
    const id = generateStrokeId();
    expect(id).toMatch(/^stroke-/);
  });
});
