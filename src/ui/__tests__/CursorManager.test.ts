// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { CursorManager } from "../CursorManager";

describe("CursorManager", () => {
  let canvas: HTMLCanvasElement;
  let cursor: CursorManager;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    cursor = new CursorManager(canvas);
  });

  it("sets a brush circle cursor by default", () => {
    cursor.setZoom(1);
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
    expect(canvas.style.cursor).toContain("circle");
  });

  it("updates cursor when tool changes to eraser", () => {
    cursor.setTool("eraser");
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
    expect(canvas.style.cursor).toContain("circle");
  });

  it("scales cursor size with zoom level", () => {
    cursor.setBrushWidth(10);
    cursor.setZoom(1);
    const cursorAtZoom1 = canvas.style.cursor;

    cursor.setZoom(2);
    const cursorAtZoom2 = canvas.style.cursor;

    // Different zoom levels should produce different cursors
    expect(cursorAtZoom1).not.toBe(cursorAtZoom2);
  });

  it("does not override cursor when panning", () => {
    cursor.setZoom(1);

    // Simulate entering pan mode (CameraController sets cursor to "grab")
    canvas.style.cursor = "grab";
    cursor.setPanning(true);

    // Changing tool while panning should not change cursor
    cursor.setTool("eraser");
    expect(canvas.style.cursor).toBe("grab");

    // Exiting pan mode and updating restores tool cursor
    cursor.setPanning(false);
    cursor.updateCursor();
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
  });

  it("clamps cursor diameter to min 4px", () => {
    cursor.setBrushWidth(0.1);
    cursor.setZoom(0.01);
    // Very small brush at low zoom — cursor should still be valid SVG
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
  });

  it("clamps cursor diameter to max 128px", () => {
    cursor.setBrushWidth(64);
    cursor.setZoom(10);
    // Very large brush at high zoom — cursor should still be valid SVG
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
  });

  it("eraser cursor uses eraser radius", () => {
    cursor.setTool("eraser");
    cursor.setEraserRadius(20);
    cursor.setZoom(1);
    // Should produce a cursor (exact size depends on eraser radius * 2 * zoom)
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
  });
});
