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
    cursor.setBrushWidth(2);
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
    expect(canvas.style.cursor).toContain("circle");
  });

  it("updates cursor when tool changes to eraser", () => {
    cursor.setTool("eraser");
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
    expect(canvas.style.cursor).toContain("circle");
  });

  it("cursor size is independent of zoom level", () => {
    cursor.setBrushWidth(10);
    cursor.setZoom(1);
    const cursorAtZoom1 = canvas.style.cursor;

    cursor.setZoom(2);
    // Cursor stays the same — size reflects brush setting, not zoom
    expect(canvas.style.cursor).toBe(cursorAtZoom1);
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

  it("sets magnify cursor when tool is magnify", () => {
    cursor.setTool("magnify");
    expect(canvas.style.cursor).toContain("data:image/svg+xml");
    expect(canvas.style.cursor).toContain("zoom-in");
  });

  it("buildMagnifyCursor returns SVG data URI with magnifying glass", () => {
    const result = cursor.buildMagnifyCursor("default");
    expect(result).toContain("data:image/svg+xml");
    expect(result).toContain("circle");
  });

  it("buildMagnifyCursor 'in' mode includes plus symbol", () => {
    const result = cursor.buildMagnifyCursor("in");
    // Plus symbol has two lines (vertical + horizontal)
    const svg = decodeURIComponent(result);
    // Count line elements — "in" mode should have 3 lines (handle + 2 for plus)
    const lineCount = (svg.match(/<line /g) || []).length;
    expect(lineCount).toBe(3);
  });

  it("buildMagnifyCursor 'out' mode includes minus symbol", () => {
    const result = cursor.buildMagnifyCursor("out");
    const svg = decodeURIComponent(result);
    // "out" mode should have 2 lines (handle + 1 for minus)
    const lineCount = (svg.match(/<line /g) || []).length;
    expect(lineCount).toBe(2);
  });

  it("buildMagnifyCursor 'default' mode has no plus or minus", () => {
    const result = cursor.buildMagnifyCursor("default");
    const svg = decodeURIComponent(result);
    // "default" mode should have 1 line (handle only)
    const lineCount = (svg.match(/<line /g) || []).length;
    expect(lineCount).toBe(1);
  });

  it("setMagnifyMode updates cursor when tool is magnify", () => {
    cursor.setTool("magnify");
    const defaultCursor = canvas.style.cursor;

    cursor.setMagnifyMode("in");
    const inCursor = canvas.style.cursor;
    expect(inCursor).not.toBe(defaultCursor);

    cursor.setMagnifyMode("out");
    const outCursor = canvas.style.cursor;
    expect(outCursor).not.toBe(inCursor);
  });

  it("setMagnifyMode does not change cursor when tool is not magnify", () => {
    cursor.setTool("brush");
    const brushCursor = canvas.style.cursor;
    cursor.setMagnifyMode("in");
    expect(canvas.style.cursor).toBe(brushCursor);
  });
});
