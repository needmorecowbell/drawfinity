// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { computeContentBounds, renderExport, downloadCanvas } from "../ExportRenderer";
import type { Stroke } from "../../model/Stroke";
import type { Shape } from "../../model/Shape";

function makeStroke(overrides: Partial<Stroke> = {}): Stroke {
  return {
    id: "s1",
    points: [
      { x: 10, y: 20, pressure: 0.5 },
      { x: 30, y: 40, pressure: 0.5 },
    ],
    color: "#000000",
    width: 2,
    timestamp: 1,
    ...overrides,
  };
}

function makeShape(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "sh1",
    type: "rectangle",
    x: 50,
    y: 50,
    width: 40,
    height: 20,
    rotation: 0,
    strokeColor: "#FF0000",
    strokeWidth: 2,
    fillColor: "#00FF00",
    opacity: 1,
    timestamp: 1,
    ...overrides,
  };
}

describe("computeContentBounds", () => {
  it("returns null for empty content", () => {
    expect(computeContentBounds([], [])).toBeNull();
  });

  it("computes bounds from stroke points accounting for width", () => {
    const stroke = makeStroke({ width: 4 });
    const bounds = computeContentBounds([stroke], []);
    expect(bounds).not.toBeNull();
    // Points at (10,20) and (30,40), width 4 → half-width 2
    expect(bounds!.minX).toBe(8);   // 10 - 2
    expect(bounds!.minY).toBe(18);  // 20 - 2
    expect(bounds!.maxX).toBe(32);  // 30 + 2
    expect(bounds!.maxY).toBe(42);  // 40 + 2
  });

  it("computes bounds from shapes", () => {
    const shape = makeShape({ x: 100, y: 100, width: 60, height: 40, strokeWidth: 0, rotation: 0 });
    const bounds = computeContentBounds([], [shape]);
    expect(bounds).not.toBeNull();
    expect(bounds!.minX).toBe(70);   // 100 - 30
    expect(bounds!.maxX).toBe(130);  // 100 + 30
    expect(bounds!.minY).toBe(80);   // 100 - 20
    expect(bounds!.maxY).toBe(120);  // 100 + 20
  });

  it("accounts for shape stroke width", () => {
    const shape = makeShape({ x: 0, y: 0, width: 10, height: 10, strokeWidth: 4, rotation: 0 });
    const bounds = computeContentBounds([], [shape]);
    // half-width = 10/2 + 4/2 = 7, half-height same
    expect(bounds!.minX).toBe(-7);
    expect(bounds!.maxX).toBe(7);
  });

  it("combines strokes and shapes", () => {
    const stroke = makeStroke({ points: [{ x: -100, y: -100, pressure: 0.5 }], width: 0 });
    const shape = makeShape({ x: 200, y: 200, width: 10, height: 10, strokeWidth: 0, rotation: 0 });
    const bounds = computeContentBounds([stroke], [shape]);
    expect(bounds!.minX).toBe(-100);
    expect(bounds!.maxX).toBe(205);
    expect(bounds!.minY).toBe(-100);
    expect(bounds!.maxY).toBe(205);
  });

  it("handles rotated shapes", () => {
    // 90 degree rotation swaps width/height contribution
    const shape = makeShape({
      x: 0, y: 0,
      width: 100, height: 20,
      strokeWidth: 0,
      rotation: Math.PI / 2,
    });
    const bounds = computeContentBounds([], [shape]);
    // With 90° rotation: half-extents swap
    // cos(90°) ≈ 0, sin(90°) ≈ 1
    // rotatedHalfW = 50*0 + 10*1 = 10
    // rotatedHalfH = 50*1 + 10*0 = 50
    expect(bounds!.minX).toBeCloseTo(-10, 5);
    expect(bounds!.maxX).toBeCloseTo(10, 5);
    expect(bounds!.minY).toBeCloseTo(-50, 5);
    expect(bounds!.maxY).toBeCloseTo(50, 5);
  });
});

describe("renderExport", () => {
  it("returns null for fitAll with no content", () => {
    const result = renderExport([], [], {
      scope: "fitAll",
      scale: 1,
      includeBackground: true,
    });
    expect(result).toBeNull();
  });

  it("returns null for viewport scope without required options", () => {
    const result = renderExport([makeStroke()], [], {
      scope: "viewport",
      scale: 1,
      includeBackground: true,
      // Missing viewportSize and viewportMatrix
    });
    expect(result).toBeNull();
  });

  it("returns null for viewport scope with missing viewportMatrix", () => {
    const result = renderExport([makeStroke()], [], {
      scope: "viewport",
      scale: 1,
      includeBackground: true,
      viewportSize: [800, 600],
    });
    expect(result).toBeNull();
  });

  // Note: Full WebGL rendering tests require a real WebGL2 context.
  // jsdom does not support WebGL, so renderExport returns null when
  // canvas.getContext("webgl2") is unavailable.
  it("returns null when WebGL2 is not available (jsdom)", () => {
    const result = renderExport([makeStroke()], [], {
      scope: "fitAll",
      scale: 1,
      includeBackground: true,
    });
    // jsdom doesn't support webgl2, so getContext returns null
    expect(result).toBeNull();
  });
});

describe("downloadCanvas", () => {
  it("creates and clicks a download link", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;

    // Mock toBlob to call callback immediately
    canvas.toBlob = vi.fn((callback) => {
      callback(new Blob(["fake-png"], { type: "image/png" }));
    });

    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(clickSpy);
      }
      return el;
    });

    downloadCanvas(canvas, "test-export.png");

    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("does nothing if toBlob returns null", () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = vi.fn((callback) => {
      callback(null);
    });

    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

    downloadCanvas(canvas, "test.png");

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    createObjectURLSpy.mockRestore();
  });
});
