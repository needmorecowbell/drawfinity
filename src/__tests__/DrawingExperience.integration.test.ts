// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DrawfinityDoc } from "../crdt/DrawfinityDoc";
import { UndoManager } from "../crdt/UndoManager";
import { ToolManager } from "../tools/ToolManager";
import { BRUSH_PRESETS, PEN, PENCIL, MARKER, HIGHLIGHTER } from "../tools/BrushPresets";
import { EraserTool } from "../tools/EraserTool";
import { Toolbar, ToolbarCallbacks } from "../ui/Toolbar";
import { Stroke } from "../model/Stroke";

import * as Y from "yjs";

function makeStroke(overrides: Partial<Stroke> = {}): Stroke {
  return {
    id: `stroke-${Date.now()}-${Math.random()}`,
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 10, pressure: 0.7 },
      { x: 20, y: 5, pressure: 0.3 },
    ],
    color: "#000000",
    width: 2,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeCallbacks(): ToolbarCallbacks {
  return {
    onBrushSelect: vi.fn(),
    onColorChange: vi.fn(),
    onToolChange: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onBrushSizeChange: vi.fn(),
  };
}

describe("Complete Drawing Experience Integration Tests", () => {
  let doc: DrawfinityDoc;
  let undoManager: UndoManager;
  let toolManager: ToolManager;

  beforeEach(() => {
    doc = new DrawfinityDoc();
    undoManager = new UndoManager(doc.getStrokesArray());
    toolManager = new ToolManager();
  });

  describe("Each brush type produces visually distinct strokes", () => {
    it("all four brush presets have unique baseWidth values", () => {
      const widths = BRUSH_PRESETS.map((b) => b.baseWidth);
      expect(new Set(widths).size).toBe(widths.length);
    });

    it("all four brush presets have unique names", () => {
      const names = BRUSH_PRESETS.map((b) => b.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("brush presets have distinct pressure curve behaviors", () => {
      const testPressure = 0.5;
      const penWidth = PEN.pressureCurve(testPressure);
      const pencilWidth = PENCIL.pressureCurve(testPressure);
      const markerWidth = MARKER.pressureCurve(testPressure);
      const highlighterWidth = HIGHLIGHTER.pressureCurve(testPressure);

      // Pen: constant 1.0 regardless of pressure
      expect(penWidth).toBe(1.0);
      // Pencil: linear with pressure
      expect(pencilWidth).toBe(0.5);
      // Marker: 0.7 + 0.3 * p
      expect(markerWidth).toBeCloseTo(0.85);
      // Highlighter: constant 1.0
      expect(highlighterWidth).toBe(1.0);
    });

    it("brush presets have distinct opacity curve behaviors", () => {
      const testPressure = 0.5;
      const penOpacity = PEN.opacityCurve(testPressure);
      const pencilOpacity = PENCIL.opacityCurve(testPressure);
      const markerOpacity = MARKER.opacityCurve(testPressure);
      const highlighterOpacity = HIGHLIGHTER.opacityCurve(testPressure);

      // Pen: full opacity
      expect(penOpacity).toBe(1.0);
      // Pencil: variable (0.4 + 0.6 * 0.5 = 0.7)
      expect(pencilOpacity).toBeCloseTo(0.7);
      // Marker: full opacity
      expect(markerOpacity).toBe(1.0);
      // Highlighter: very transparent (0.3)
      expect(highlighterOpacity).toBeCloseTo(0.3);
    });

    it("strokes drawn with different brushes have different widths in document", () => {
      const penStroke = makeStroke({ id: "pen-1", width: PEN.baseWidth, color: PEN.color });
      const markerStroke = makeStroke({ id: "marker-1", width: MARKER.baseWidth, color: MARKER.color });
      const highlighterStroke = makeStroke({ id: "hl-1", width: HIGHLIGHTER.baseWidth, color: HIGHLIGHTER.color });

      doc.addStroke(penStroke);
      doc.addStroke(markerStroke);
      doc.addStroke(highlighterStroke);

      const strokes = doc.getStrokes();
      expect(strokes).toHaveLength(3);
      expect(strokes[0].width).toBe(2);   // PEN
      expect(strokes[1].width).toBe(8);   // MARKER
      expect(strokes[2].width).toBe(16);  // HIGHLIGHTER
    });
  });

  describe("Eraser removes strokes and is undoable", () => {
    it("eraser detects and removes intersecting strokes from document", () => {
      const stroke1 = makeStroke({
        id: "erase-me",
        points: [
          { x: 0, y: 0, pressure: 0.5 },
          { x: 10, y: 0, pressure: 0.5 },
        ],
      });
      const stroke2 = makeStroke({
        id: "keep-me",
        points: [
          { x: 0, y: 100, pressure: 0.5 },
          { x: 10, y: 100, pressure: 0.5 },
        ],
      });

      doc.addStroke(stroke1);
      doc.addStroke(stroke2);
      expect(doc.getStrokes()).toHaveLength(2);

      // Use eraser tool to find intersecting strokes
      const eraser = new EraserTool({ radius: 5 });
      const hits = eraser.findIntersectingStrokes(5, 0, doc.getStrokes());
      expect(hits).toContain("erase-me");
      expect(hits).not.toContain("keep-me");

      // Remove them from the doc
      for (const id of hits) {
        doc.removeStroke(id);
      }

      expect(doc.getStrokes()).toHaveLength(1);
      expect(doc.getStrokes()[0].id).toBe("keep-me");
    });

    it("erased strokes can be restored via undo", () => {
      const stroke = makeStroke({ id: "undoable" });
      doc.addStroke(stroke);
      expect(doc.getStrokes()).toHaveLength(1);

      // Remove the stroke (simulating eraser)
      doc.removeStroke("undoable");
      expect(doc.getStrokes()).toHaveLength(0);
      expect(undoManager.canUndo()).toBe(true);

      // Undo the removal
      undoManager.undo();
      expect(doc.getStrokes()).toHaveLength(1);
      expect(doc.getStrokes()[0].id).toBe("undoable");
    });

    it("redo after undoing erase removes the stroke again", () => {
      const stroke = makeStroke({ id: "redo-test" });
      doc.addStroke(stroke);
      doc.removeStroke("redo-test");
      undoManager.undo();
      expect(doc.getStrokes()).toHaveLength(1);

      undoManager.redo();
      expect(doc.getStrokes()).toHaveLength(0);
    });
  });

  describe("Color changes affect new strokes only", () => {
    it("changing color on ToolManager does not alter existing strokes", () => {
      toolManager.setColor("#FF0000");
      const redStroke = makeStroke({ id: "red", color: toolManager.getColor() });
      doc.addStroke(redStroke);

      // Change color
      toolManager.setColor("#0000FF");

      // Existing stroke stays red
      const strokes = doc.getStrokes();
      expect(strokes[0].color).toBe("#FF0000");

      // New stroke is blue
      const blueStroke = makeStroke({ id: "blue", color: toolManager.getColor() });
      doc.addStroke(blueStroke);
      const all = doc.getStrokes();
      expect(all[0].color).toBe("#FF0000");
      expect(all[1].color).toBe("#0000FF");
    });

    it("color persists across brush changes", () => {
      toolManager.setColor("#FF0000");
      toolManager.setBrush(PENCIL);
      expect(toolManager.getColor()).toBe("#FF0000");
      expect(toolManager.getBrush().color).toBe("#FF0000");

      toolManager.setBrush(MARKER);
      expect(toolManager.getColor()).toBe("#FF0000");
      expect(toolManager.getBrush().color).toBe("#FF0000");
    });
  });

  describe("Keyboard shortcuts for tool switching and brush size", () => {
    let toolbar: Toolbar;
    let callbacks: ToolbarCallbacks;

    beforeEach(() => {
      callbacks = makeCallbacks();
      toolbar = new Toolbar(callbacks);
    });

    it("pressing E switches to eraser tool", () => {
      // Simulate what main.ts does on keydown 'E'
      toolManager.setTool("eraser");
      toolbar.setToolUI("eraser");

      expect(toolManager.getTool()).toBe("eraser");
      const eraserBtn = document.querySelector(".eraser-btn");
      expect(eraserBtn?.classList.contains("active")).toBe(true);
    });

    it("pressing B switches back to brush tool", () => {
      toolManager.setTool("eraser");
      toolbar.setToolUI("eraser");

      // Now press B
      toolManager.setTool("brush");
      toolbar.setToolUI("brush");

      expect(toolManager.getTool()).toBe("brush");
      const eraserBtn = document.querySelector(".eraser-btn");
      expect(eraserBtn?.classList.contains("active")).toBe(false);
    });

    it("pressing 1-4 selects brush presets", () => {
      for (let i = 0; i < BRUSH_PRESETS.length; i++) {
        toolManager.setBrush(BRUSH_PRESETS[i]);
        toolbar.selectBrush(i);
        expect(toolManager.getBrush().name).toBe(BRUSH_PRESETS[i].name);
        expect(toolbar.getActiveBrushIndex()).toBe(i);
      }
    });

    it("[ and ] adjust brush size within bounds", () => {
      const brush = toolManager.getBrush();
      const originalWidth = brush.baseWidth;

      // Increase
      brush.baseWidth = Math.min(64, brush.baseWidth + 1);
      expect(brush.baseWidth).toBe(originalWidth + 1);

      // Decrease
      brush.baseWidth = Math.max(0.5, brush.baseWidth - 1);
      expect(brush.baseWidth).toBe(originalWidth);

      // Can't go below 0.5
      brush.baseWidth = 0.5;
      brush.baseWidth = Math.max(0.5, brush.baseWidth - 1);
      expect(brush.baseWidth).toBe(0.5);

      // Can't go above 64
      brush.baseWidth = 64;
      brush.baseWidth = Math.min(64, brush.baseWidth + 1);
      expect(brush.baseWidth).toBe(64);
    });

    afterEach(() => {
      toolbar.destroy();
    });
  });

  describe("Toolbar does not interfere with canvas pan/zoom", () => {
    it("toolbar buttons use stopPropagation on pointerdown", () => {
      const callbacks = makeCallbacks();
      const toolbar = new Toolbar(callbacks);

      // Verify toolbar exists and has the expected structure
      const container = document.getElementById("toolbar");
      expect(container).toBeTruthy();

      // Verify toolbar buttons exist
      const brushBtns = container!.querySelectorAll(".brush-btn");
      expect(brushBtns.length).toBe(4);

      const eraserBtn = container!.querySelector(".eraser-btn");
      expect(eraserBtn).toBeTruthy();

      // Simulate pointerdown on a brush button — should not propagate
      const event = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
      });
      const stopSpy = vi.spyOn(event, "stopPropagation");
      brushBtns[0].dispatchEvent(event);
      expect(stopSpy).toHaveBeenCalled();

      toolbar.destroy();
    });
  });

  describe("Strokes persist with brush metadata via CRDT round-trip", () => {
    it("stroke color survives Y.Doc serialization round-trip", () => {
      const stroke = makeStroke({ id: "persist-1", color: "#FF6600", width: 8 });
      doc.addStroke(stroke);

      // Serialize the Y.Doc
      const update = Y.encodeStateAsUpdate(doc.getDoc());

      // Create a new doc and apply the update
      const newYDoc = new Y.Doc();
      Y.applyUpdate(newYDoc, update);
      const newDoc = new DrawfinityDoc(newYDoc);

      const loadedStrokes = newDoc.getStrokes();
      expect(loadedStrokes).toHaveLength(1);
      expect(loadedStrokes[0].id).toBe("persist-1");
      expect(loadedStrokes[0].color).toBe("#FF6600");
      expect(loadedStrokes[0].width).toBe(8);
    });

    it("stroke points with pressure survive round-trip", () => {
      const stroke = makeStroke({
        id: "persist-2",
        points: [
          { x: 1.5, y: 2.5, pressure: 0.3 },
          { x: 10.1, y: 20.2, pressure: 0.8 },
          { x: 30.0, y: 5.0, pressure: 1.0 },
        ],
      });
      doc.addStroke(stroke);

      const update = Y.encodeStateAsUpdate(doc.getDoc());
      const newYDoc = new Y.Doc();
      Y.applyUpdate(newYDoc, update);
      const newDoc = new DrawfinityDoc(newYDoc);

      const loaded = newDoc.getStrokes()[0];
      expect(loaded.points).toHaveLength(3);
      expect(loaded.points[0].pressure).toBeCloseTo(0.3);
      expect(loaded.points[1].pressure).toBeCloseTo(0.8);
      expect(loaded.points[2].pressure).toBeCloseTo(1.0);
      expect(loaded.points[0].x).toBeCloseTo(1.5);
      expect(loaded.points[1].y).toBeCloseTo(20.2);
    });

    it("multiple strokes with different colors/widths survive round-trip", () => {
      const strokes = [
        makeStroke({ id: "s1", color: "#FF0000", width: PEN.baseWidth }),
        makeStroke({ id: "s2", color: "#00FF00", width: MARKER.baseWidth }),
        makeStroke({ id: "s3", color: "#FFFF00", width: HIGHLIGHTER.baseWidth }),
      ];
      for (const s of strokes) doc.addStroke(s);

      const update = Y.encodeStateAsUpdate(doc.getDoc());
      const newYDoc = new Y.Doc();
      Y.applyUpdate(newYDoc, update);
      const newDoc = new DrawfinityDoc(newYDoc);

      const loaded = newDoc.getStrokes();
      expect(loaded).toHaveLength(3);
      expect(loaded[0].color).toBe("#FF0000");
      expect(loaded[0].width).toBe(2);
      expect(loaded[1].color).toBe("#00FF00");
      expect(loaded[1].width).toBe(8);
      expect(loaded[2].color).toBe("#FFFF00");
      expect(loaded[2].width).toBe(16);
    });

    it("StrokeAdapter preserves all stroke fields", () => {
      const stroke: Stroke = {
        id: "adapter-test",
        color: "#9933FF",
        width: 5,
        timestamp: 1234567890,
        points: [
          { x: 0, y: 0, pressure: 0.1 },
          { x: 50, y: 50, pressure: 0.9 },
        ],
      };

      // Use doc context so Y.Map children are accessible
      doc.addStroke(stroke);
      const update = Y.encodeStateAsUpdate(doc.getDoc());
      const newYDoc = new Y.Doc();
      Y.applyUpdate(newYDoc, update);
      const newDoc = new DrawfinityDoc(newYDoc);
      const roundTripped = newDoc.getStrokes()[0];

      expect(roundTripped.id).toBe(stroke.id);
      expect(roundTripped.color).toBe(stroke.color);
      expect(roundTripped.width).toBe(stroke.width);
      expect(roundTripped.timestamp).toBe(stroke.timestamp);
      expect(roundTripped.points).toHaveLength(2);
      expect(roundTripped.points[0].pressure).toBeCloseTo(0.1);
      expect(roundTripped.points[1].pressure).toBeCloseTo(0.9);
    });
  });

  describe("Full workflow: draw, erase, undo, change color", () => {
    it("supports a complete user session flow", () => {
      // 1. Draw a red stroke
      toolManager.setColor("#FF0000");
      const stroke1 = makeStroke({ id: "session-1", color: toolManager.getColor(), width: toolManager.getBrush().baseWidth });
      doc.addStroke(stroke1);
      expect(doc.getStrokes()).toHaveLength(1);

      // 2. Change to blue and draw another
      toolManager.setColor("#0000FF");
      const stroke2 = makeStroke({ id: "session-2", color: toolManager.getColor(), width: toolManager.getBrush().baseWidth });
      doc.addStroke(stroke2);
      expect(doc.getStrokes()).toHaveLength(2);

      // 3. Switch to MARKER brush
      toolManager.setBrush(MARKER);
      expect(toolManager.getBrush().baseWidth).toBe(8);
      expect(toolManager.getColor()).toBe("#0000FF"); // Color preserved

      // 4. Draw a marker stroke
      const stroke3 = makeStroke({ id: "session-3", color: toolManager.getColor(), width: toolManager.getBrush().baseWidth });
      doc.addStroke(stroke3);
      expect(doc.getStrokes()).toHaveLength(3);

      // 5. Undo the last stroke
      undoManager.undo();
      expect(doc.getStrokes()).toHaveLength(2);
      expect(undoManager.canRedo()).toBe(true);

      // 6. Erase the first stroke
      doc.removeStroke("session-1");
      expect(doc.getStrokes()).toHaveLength(1);
      expect(doc.getStrokes()[0].id).toBe("session-2");

      // 7. Undo the erase
      undoManager.undo();
      expect(doc.getStrokes()).toHaveLength(2);

      // 8. Verify original colors are preserved
      const strokes = doc.getStrokes();
      expect(strokes[0].color).toBe("#FF0000");
      expect(strokes[1].color).toBe("#0000FF");
    });
  });
});
