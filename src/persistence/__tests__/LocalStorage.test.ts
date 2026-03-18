import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Y from "yjs";

// Mock Tauri fs plugin
vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock Tauri path API
vi.mock("@tauri-apps/api/path", () => ({
  documentDir: vi.fn(async () => "/home/user/Documents"),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

import { readFile, writeFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import {
  saveDocument,
  loadDocument,
  saveDocumentById,
  loadDocumentById,
  getDefaultSavePath,
  getDefaultFilePath,
} from "../LocalStorage";
import { strokeToYMap } from "../../crdt/StrokeAdapter";
import { Stroke } from "../../model/Stroke";

function makeStroke(id: string): Stroke {
  return {
    id,
    color: "#ff0000",
    width: 3,
    timestamp: 1000,
    points: [
      { x: 1, y: 2, pressure: 0.5 },
      { x: 3, y: 4, pressure: 0.8 },
    ],
  };
}

describe("LocalStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDefaultSavePath", () => {
    it("returns a path under the user documents folder", async () => {
      const path = await getDefaultSavePath();
      expect(path).toBe("/home/user/Documents/Drawfinity");
    });
  });

  describe("getDefaultFilePath", () => {
    it("returns the default file path", async () => {
      const path = await getDefaultFilePath();
      expect(path).toBe("/home/user/Documents/Drawfinity/drawing.drawfinity");
    });
  });

  describe("saveDocument", () => {
    it("encodes Y.Doc and writes to disk", async () => {
      const doc = new Y.Doc();
      const strokes = doc.getArray<Y.Map<unknown>>("strokes");
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s1"))]);
      });

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await saveDocument(doc, "/tmp/test/drawing.drawfinity");

      expect(writeFile).toHaveBeenCalledOnce();
      const [path, data] = vi.mocked(writeFile).mock.calls[0];
      expect(path).toBe("/tmp/test/drawing.drawfinity");
      expect(data).toBeInstanceOf(Uint8Array);
      expect((data as Uint8Array).length).toBeGreaterThan(0);
    });

    it("creates parent directory if it does not exist", async () => {
      const doc = new Y.Doc();
      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await saveDocument(doc, "/tmp/newdir/drawing.drawfinity");

      expect(mkdir).toHaveBeenCalledWith("/tmp/newdir", { recursive: true });
    });
  });

  describe("loadDocument", () => {
    it("returns null if file does not exist", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const result = await loadDocument("/nonexistent/file.drawfinity");
      expect(result).toBeNull();
    });

    it("loads and applies update to a new Y.Doc", async () => {
      // Create a doc with data, encode it
      const originalDoc = new Y.Doc();
      const strokes = originalDoc.getArray<Y.Map<unknown>>("strokes");
      originalDoc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s1"))]);
        strokes.push([strokeToYMap(makeStroke("s2"))]);
      });
      const encoded = Y.encodeStateAsUpdate(originalDoc);

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(encoded);

      const loaded = await loadDocument("/tmp/test.drawfinity");
      expect(loaded).not.toBeNull();

      const loadedStrokes = loaded!.getArray<Y.Map<unknown>>("strokes");
      expect(loadedStrokes.length).toBe(2);
    });

    it("round-trips stroke data correctly", async () => {
      const originalDoc = new Y.Doc();
      const strokes = originalDoc.getArray<Y.Map<unknown>>("strokes");
      const stroke = makeStroke("roundtrip-1");
      originalDoc.transact(() => {
        strokes.push([strokeToYMap(stroke)]);
      });
      const encoded = Y.encodeStateAsUpdate(originalDoc);

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(encoded);

      const loaded = await loadDocument("/tmp/test.drawfinity");
      const loadedStrokes = loaded!.getArray<Y.Map<unknown>>("strokes");
      const loadedMap = loadedStrokes.get(0);

      expect(loadedMap.get("id")).toBe("roundtrip-1");
      expect(loadedMap.get("color")).toBe("#ff0000");
      expect(loadedMap.get("width")).toBe(3);
    });
  });

  describe("saveDocumentById", () => {
    it("delegates to DrawingManager.saveDrawing", async () => {
      const doc = new Y.Doc();
      const strokes = doc.getArray<Y.Map<unknown>>("strokes");
      doc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("s1"))]);
      });

      const mockManager = {
        saveDrawing: vi.fn(async () => {}),
      };

      await saveDocumentById(
        doc,
        "drawing-123",
        mockManager as unknown as import("../DrawingManager").DrawingManager,
      );

      expect(mockManager.saveDrawing).toHaveBeenCalledOnce();
      expect(mockManager.saveDrawing).toHaveBeenCalledWith(
        "drawing-123",
        expect.any(Uint8Array),
      );
      // Verify the state bytes are non-empty
      const stateArg = mockManager.saveDrawing.mock.calls[0][1] as Uint8Array;
      expect(stateArg.length).toBeGreaterThan(0);
    });
  });

  describe("loadDocumentById", () => {
    it("loads document from DrawingManager and returns Y.Doc", async () => {
      const originalDoc = new Y.Doc();
      const strokes = originalDoc.getArray<Y.Map<unknown>>("strokes");
      originalDoc.transact(() => {
        strokes.push([strokeToYMap(makeStroke("loaded-1"))]);
      });
      const encoded = Y.encodeStateAsUpdate(originalDoc);

      const mockManager = {
        openDrawing: vi.fn(async () => encoded),
      };

      const loaded = await loadDocumentById(
        "drawing-456",
        mockManager as unknown as import("../DrawingManager").DrawingManager,
      );

      expect(loaded).not.toBeNull();
      const loadedStrokes = loaded!.getArray<Y.Map<unknown>>("strokes");
      expect(loadedStrokes.length).toBe(1);
      expect(loadedStrokes.get(0).get("id")).toBe("loaded-1");
    });

    it("returns null when drawing state is empty", async () => {
      const mockManager = {
        openDrawing: vi.fn(async () => new Uint8Array(0)),
      };

      const loaded = await loadDocumentById(
        "drawing-empty",
        mockManager as unknown as import("../DrawingManager").DrawingManager,
      );

      expect(loaded).toBeNull();
    });
  });
});
