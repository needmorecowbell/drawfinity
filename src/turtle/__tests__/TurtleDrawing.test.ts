import { describe, it, expect, beforeEach } from "vitest";
import { TurtleDrawing } from "../TurtleDrawing";
import { MovementSegment, PenState } from "../TurtleState";
import { Stroke, DocumentModel } from "../../model/Stroke";

/** Minimal in-memory document for testing. */
class MockDocument implements DocumentModel {
  strokes: Stroke[] = [];

  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
  }

  getStrokes(): Stroke[] {
    return this.strokes;
  }

  removeStroke(strokeId: string): boolean {
    const idx = this.strokes.findIndex((s) => s.id === strokeId);
    if (idx === -1) return false;
    this.strokes.splice(idx, 1);
    return true;
  }
}

function makePen(overrides: Partial<PenState> = {}): PenState {
  return { down: true, color: "#000000", width: 3, opacity: 1.0, ...overrides };
}

function makeSegment(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  pen?: Partial<PenState>,
): MovementSegment {
  return { fromX, fromY, toX, toY, pen: makePen(pen) };
}

describe("TurtleDrawing", () => {
  let doc: MockDocument;
  let drawing: TurtleDrawing;

  beforeEach(() => {
    doc = new MockDocument();
    drawing = new TurtleDrawing(doc, 1.0);
  });

  describe("single segment (no batching)", () => {
    it("creates a stroke with two points from one segment", () => {
      const seg = makeSegment(0, 0, 100, 0);
      drawing.addSegment(seg, false);

      expect(doc.strokes).toHaveLength(1);
      const stroke = doc.strokes[0];
      expect(stroke.points).toHaveLength(2);
      expect(stroke.points[0]).toEqual({ x: 0, y: 0, pressure: 1 });
      expect(stroke.points[1]).toEqual({ x: 100, y: 0, pressure: 1 });
    });

    it("uses pen color, width, and opacity", () => {
      const seg = makeSegment(0, 0, 50, 50, {
        color: "#ff0000",
        width: 5,
        opacity: 0.7,
      });
      drawing.addSegment(seg, false);

      const stroke = doc.strokes[0];
      expect(stroke.color).toBe("#ff0000");
      expect(stroke.width).toBe(5);
      expect(stroke.opacity).toBe(0.7);
    });

    it("divides pen width by zoom", () => {
      drawing.setZoom(2.0);
      const seg = makeSegment(0, 0, 10, 10, { width: 6 });
      drawing.addSegment(seg, false);

      expect(doc.strokes[0].width).toBe(3); // 6 / 2
    });

    it("each non-batched segment creates a separate stroke", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0), false);
      drawing.addSegment(makeSegment(10, 0, 20, 0), false);

      expect(doc.strokes).toHaveLength(2);
    });
  });

  describe("batching", () => {
    it("batches consecutive segments with same pen state", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0), true);
      drawing.addSegment(makeSegment(10, 0, 20, 0), true);
      drawing.addSegment(makeSegment(20, 0, 30, 0), true);

      // Not committed yet
      expect(doc.strokes).toHaveLength(0);

      drawing.flush();

      expect(doc.strokes).toHaveLength(1);
      const stroke = doc.strokes[0];
      // 3 segments → 4 points (from + 3 to points)
      expect(stroke.points).toHaveLength(4);
      expect(stroke.points[0]).toEqual({ x: 0, y: 0, pressure: 1 });
      expect(stroke.points[1]).toEqual({ x: 10, y: 0, pressure: 1 });
      expect(stroke.points[2]).toEqual({ x: 20, y: 0, pressure: 1 });
      expect(stroke.points[3]).toEqual({ x: 30, y: 0, pressure: 1 });
    });

    it("flushes when pen state changes", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0, { color: "#ff0000" }), true);
      drawing.addSegment(makeSegment(10, 0, 20, 0, { color: "#ff0000" }), true);
      // Color change forces flush of previous segments
      drawing.addSegment(makeSegment(20, 0, 30, 0, { color: "#00ff00" }), true);

      // First batch was auto-flushed
      expect(doc.strokes).toHaveLength(1);
      expect(doc.strokes[0].color).toBe("#ff0000");
      expect(doc.strokes[0].points).toHaveLength(3);

      drawing.flush();

      expect(doc.strokes).toHaveLength(2);
      expect(doc.strokes[1].color).toBe("#00ff00");
    });

    it("flushes when width changes", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0, { width: 2 }), true);
      drawing.addSegment(makeSegment(10, 0, 20, 0, { width: 5 }), true);

      expect(doc.strokes).toHaveLength(1);
      expect(doc.strokes[0].width).toBe(2);

      drawing.flush();
      expect(doc.strokes).toHaveLength(2);
    });

    it("flushes when opacity changes", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0, { opacity: 1.0 }), true);
      drawing.addSegment(makeSegment(10, 0, 20, 0, { opacity: 0.5 }), true);

      expect(doc.strokes).toHaveLength(1);
      drawing.flush();
      expect(doc.strokes).toHaveLength(2);
    });

    it("flush with no pending segments is a no-op", () => {
      drawing.flush();
      expect(doc.strokes).toHaveLength(0);
    });
  });

  describe("clearTurtleStrokes", () => {
    it("removes all turtle-created strokes from the document", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0), false);
      drawing.addSegment(makeSegment(10, 0, 20, 0), false);
      expect(doc.strokes).toHaveLength(2);

      drawing.clearTurtleStrokes();
      expect(doc.strokes).toHaveLength(0);
    });

    it("does not remove non-turtle strokes", () => {
      // Add a manual stroke first
      doc.addStroke({
        id: "manual-stroke",
        points: [
          { x: 0, y: 0, pressure: 1 },
          { x: 50, y: 50, pressure: 1 },
        ],
        color: "#000000",
        width: 2,
        timestamp: Date.now(),
      });

      drawing.addSegment(makeSegment(0, 0, 10, 0), false);
      expect(doc.strokes).toHaveLength(2);

      drawing.clearTurtleStrokes();
      expect(doc.strokes).toHaveLength(1);
      expect(doc.strokes[0].id).toBe("manual-stroke");
    });

    it("flushes pending segments before clearing", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0), true);
      drawing.addSegment(makeSegment(10, 0, 20, 0), true);

      drawing.clearTurtleStrokes();
      expect(doc.strokes).toHaveLength(0);
    });

    it("resets stroke ID tracking after clear", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0), false);
      drawing.clearTurtleStrokes();

      expect(drawing.getStrokeIds()).toHaveLength(0);
    });
  });

  describe("getStrokeIds", () => {
    it("tracks all created stroke IDs", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0), false);
      drawing.addSegment(makeSegment(10, 0, 20, 0), false);

      const ids = drawing.getStrokeIds();
      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it("returns a copy (not the internal array)", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0), false);
      const ids = drawing.getStrokeIds();
      ids.push("fake");
      expect(drawing.getStrokeIds()).toHaveLength(1);
    });
  });

  describe("zoom interaction", () => {
    it("applies zoom at the time of stroke creation", () => {
      drawing.setZoom(1.0);
      drawing.addSegment(makeSegment(0, 0, 10, 0, { width: 4 }), true);

      drawing.setZoom(2.0);
      drawing.flush();

      // Width should use zoom=2.0 (the zoom at flush time)
      expect(doc.strokes[0].width).toBe(2); // 4 / 2
    });

    it("non-batched segment uses current zoom", () => {
      drawing.setZoom(4.0);
      drawing.addSegment(makeSegment(0, 0, 10, 0, { width: 8 }), false);

      expect(doc.strokes[0].width).toBe(2); // 8 / 4
    });
  });

  describe("switching between batching and non-batching", () => {
    it("flushes pending batch when switching to non-batched mode", () => {
      drawing.addSegment(makeSegment(0, 0, 10, 0), true);
      drawing.addSegment(makeSegment(10, 0, 20, 0), true);

      // Non-batched segment flushes the pending batch first
      drawing.addSegment(makeSegment(20, 0, 30, 0), false);

      expect(doc.strokes).toHaveLength(2);
      // First stroke from the flushed batch
      expect(doc.strokes[0].points).toHaveLength(3);
      // Second stroke from the non-batched segment
      expect(doc.strokes[1].points).toHaveLength(2);
    });
  });
});
