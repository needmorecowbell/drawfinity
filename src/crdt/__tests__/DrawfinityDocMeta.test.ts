import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Y from "yjs";
import { DrawfinityDoc } from "../DrawfinityDoc";
import { DEFAULT_BACKGROUND_COLOR } from "../DrawfinityDoc";

describe("DrawfinityDoc metadata", () => {
  let drawDoc: DrawfinityDoc;

  beforeEach(() => {
    drawDoc = new DrawfinityDoc();
  });

  describe("getBackgroundColor", () => {
    it("returns default color when not set", () => {
      expect(drawDoc.getBackgroundColor()).toBe(DEFAULT_BACKGROUND_COLOR);
    });

    it("returns set color", () => {
      drawDoc.setBackgroundColor("#112233");
      expect(drawDoc.getBackgroundColor()).toBe("#112233");
    });

    it("overwrites previous color", () => {
      drawDoc.setBackgroundColor("#111111");
      drawDoc.setBackgroundColor("#222222");
      expect(drawDoc.getBackgroundColor()).toBe("#222222");
    });
  });

  describe("setBackgroundColor", () => {
    it("writes to the meta map", () => {
      drawDoc.setBackgroundColor("#abcdef");
      const meta = drawDoc.getMetaMap();
      expect(meta.get("backgroundColor")).toBe("#abcdef");
    });
  });

  describe("onMetaChanged", () => {
    it("fires when background color is set", () => {
      const callback = vi.fn();
      drawDoc.onMetaChanged(callback);
      drawDoc.setBackgroundColor("#ff0000");
      expect(callback).toHaveBeenCalled();
    });

    it("fires on each change", () => {
      const callback = vi.fn();
      drawDoc.onMetaChanged(callback);
      drawDoc.setBackgroundColor("#ff0000");
      drawDoc.setBackgroundColor("#00ff00");
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe("undo/redo does not affect background color", () => {
    it("background color is not reverted by undo on strokes", () => {
      const um = new Y.UndoManager(drawDoc.getStrokesArray());

      drawDoc.setBackgroundColor("#000000");
      drawDoc.addStroke({
        id: "s1",
        color: "#ff0000",
        width: 3,
        timestamp: 1000,
        points: [{ x: 0, y: 0, pressure: 0.5 }],
      });

      um.undo(); // should undo the stroke, not the background color
      expect(drawDoc.getStrokes()).toHaveLength(0);
      expect(drawDoc.getBackgroundColor()).toBe("#000000");
    });
  });

  describe("syncing background color between docs", () => {
    it("syncs background color via Yjs state updates", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      doc1.setBackgroundColor("#123456");

      const update = Y.encodeStateAsUpdate(doc1.getDoc());
      Y.applyUpdate(doc2.getDoc(), update);

      expect(doc2.getBackgroundColor()).toBe("#123456");
    });

    it("propagates changes bidirectionally", () => {
      const doc1 = new DrawfinityDoc();
      const doc2 = new DrawfinityDoc();

      doc1.setBackgroundColor("#aaaaaa");
      Y.applyUpdate(doc2.getDoc(), Y.encodeStateAsUpdate(doc1.getDoc()));
      expect(doc2.getBackgroundColor()).toBe("#aaaaaa");

      doc2.setBackgroundColor("#bbbbbb");
      Y.applyUpdate(doc1.getDoc(), Y.encodeStateAsUpdate(doc2.getDoc()));
      expect(doc1.getBackgroundColor()).toBe("#bbbbbb");
    });
  });
});
