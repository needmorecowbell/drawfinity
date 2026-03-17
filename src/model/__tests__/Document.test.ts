import { describe, it, expect } from "vitest";
import { DrawDocument } from "../Document";
import { Stroke } from "../Stroke";

function makeStroke(id: string): Stroke {
  return {
    id,
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 10, pressure: 0.5 },
    ],
    color: "#000000",
    width: 2,
    timestamp: Date.now(),
  };
}

describe("DrawDocument", () => {
  it("starts empty", () => {
    const doc = new DrawDocument();
    expect(doc.getStrokes()).toHaveLength(0);
  });

  it("adds and retrieves strokes", () => {
    const doc = new DrawDocument();
    const s1 = makeStroke("s1");
    const s2 = makeStroke("s2");
    doc.addStroke(s1);
    doc.addStroke(s2);
    expect(doc.getStrokes()).toHaveLength(2);
    expect(doc.getStrokes()[0].id).toBe("s1");
    expect(doc.getStrokes()[1].id).toBe("s2");
  });

  it("clears all strokes", () => {
    const doc = new DrawDocument();
    doc.addStroke(makeStroke("s1"));
    doc.addStroke(makeStroke("s2"));
    doc.clear();
    expect(doc.getStrokes()).toHaveLength(0);
  });
});
