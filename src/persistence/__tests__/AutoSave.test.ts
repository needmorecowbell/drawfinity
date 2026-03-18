import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Y from "yjs";
import { AutoSave } from "../AutoSave";
import { strokeToYMap } from "../../crdt/StrokeAdapter";
import { Stroke } from "../../model/Stroke";

// Mock the LocalStorage module
vi.mock("../LocalStorage", () => ({
  saveDocument: vi.fn(async () => {}),
}));

import { saveDocument } from "../LocalStorage";

function makeStroke(id: string): Stroke {
  return {
    id,
    color: "#000000",
    width: 2,
    timestamp: Date.now(),
    points: [{ x: 0, y: 0, pressure: 0.5 }],
  };
}

describe("AutoSave", () => {
  let doc: Y.Doc;
  let autoSave: AutoSave;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    doc = new Y.Doc();
    autoSave = new AutoSave(doc, "/tmp/test.drawfinity", 500);
  });

  afterEach(() => {
    autoSave.stop();
    vi.useRealTimers();
  });

  it("does not save when not started", () => {
    const strokes = doc.getArray<Y.Map<unknown>>("strokes");
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });

    vi.advanceTimersByTime(1000);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("saves after debounce period when started", async () => {
    autoSave.start();

    const strokes = doc.getArray<Y.Map<unknown>>("strokes");
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });

    // Not yet saved
    vi.advanceTimersByTime(400);
    expect(saveDocument).not.toHaveBeenCalled();

    // Now the debounce triggers
    vi.advanceTimersByTime(200);
    expect(saveDocument).toHaveBeenCalledOnce();
    expect(saveDocument).toHaveBeenCalledWith(doc, "/tmp/test.drawfinity");
  });

  it("debounces rapid changes", async () => {
    autoSave.start();

    const strokes = doc.getArray<Y.Map<unknown>>("strokes");

    // Multiple rapid changes
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });
    vi.advanceTimersByTime(200);

    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s2"))]);
    });
    vi.advanceTimersByTime(200);

    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s3"))]);
    });

    // Still hasn't saved (debounce keeps resetting)
    expect(saveDocument).not.toHaveBeenCalled();

    // Wait for full debounce after last change
    vi.advanceTimersByTime(600);
    expect(saveDocument).toHaveBeenCalledOnce();
  });

  it("saveNow triggers immediate save", async () => {
    autoSave.start();
    await autoSave.saveNow();
    expect(saveDocument).toHaveBeenCalledOnce();
  });

  it("stop prevents further saves", () => {
    autoSave.start();

    const strokes = doc.getArray<Y.Map<unknown>>("strokes");
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });

    autoSave.stop();
    vi.advanceTimersByTime(1000);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("setFilePath updates the save path", async () => {
    autoSave.start();
    autoSave.setFilePath("/tmp/new-path.drawfinity");

    await autoSave.saveNow();
    expect(saveDocument).toHaveBeenCalledWith(doc, "/tmp/new-path.drawfinity");
  });

  it("getFilePath returns current path", () => {
    expect(autoSave.getFilePath()).toBe("/tmp/test.drawfinity");
    autoSave.setFilePath("/other/path.drawfinity");
    expect(autoSave.getFilePath()).toBe("/other/path.drawfinity");
  });

  it("start is idempotent", () => {
    autoSave.start();
    autoSave.start(); // second call should not register a second listener

    const strokes = doc.getArray<Y.Map<unknown>>("strokes");
    doc.transact(() => {
      strokes.push([strokeToYMap(makeStroke("s1"))]);
    });

    vi.advanceTimersByTime(600);
    // Should only save once, not twice
    expect(saveDocument).toHaveBeenCalledOnce();
  });

  describe("DrawingManager mode", () => {
    let managerAutoSave: AutoSave;
    let mockManager: { saveDrawing: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockManager = {
        saveDrawing: vi.fn(async () => {}),
      };
      managerAutoSave = new AutoSave(
        doc,
        "/fallback/path.drawfinity",
        500,
        "drawing-abc",
        mockManager as unknown as import("../DrawingManager").DrawingManager,
      );
    });

    afterEach(() => {
      managerAutoSave.stop();
    });

    it("saves via DrawingManager when drawingId and manager are set", async () => {
      managerAutoSave.start();
      await managerAutoSave.saveNow();

      expect(mockManager.saveDrawing).toHaveBeenCalledOnce();
      expect(mockManager.saveDrawing).toHaveBeenCalledWith(
        "drawing-abc",
        expect.any(Uint8Array),
      );
      // Should NOT use the file-based save
      expect(saveDocument).not.toHaveBeenCalled();
    });

    it("debounces saves via DrawingManager", () => {
      managerAutoSave.start();

      const strokes = doc.getArray<Y.Map<unknown>>("strokes");
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s1"))]);
      });

      vi.advanceTimersByTime(600);
      expect(mockManager.saveDrawing).toHaveBeenCalledOnce();
      expect(saveDocument).not.toHaveBeenCalled();
    });

    it("setDrawingId updates the target drawing", async () => {
      managerAutoSave.start();
      managerAutoSave.setDrawingId("drawing-xyz");
      await managerAutoSave.saveNow();

      expect(mockManager.saveDrawing).toHaveBeenCalledWith(
        "drawing-xyz",
        expect.any(Uint8Array),
      );
    });

    it("getDrawingId returns current drawing ID", () => {
      expect(managerAutoSave.getDrawingId()).toBe("drawing-abc");
      managerAutoSave.setDrawingId("new-id");
      expect(managerAutoSave.getDrawingId()).toBe("new-id");
    });
  });
});
