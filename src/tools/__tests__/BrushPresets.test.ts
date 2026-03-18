import { describe, it, expect } from "vitest";
import { PEN, PENCIL, MARKER, HIGHLIGHTER, BRUSH_PRESETS } from "../BrushPresets";
import { BrushConfig } from "../Brush";

describe("BrushPresets", () => {
  it("exports exactly 4 presets", () => {
    expect(BRUSH_PRESETS).toHaveLength(4);
    expect(BRUSH_PRESETS).toContain(PEN);
    expect(BRUSH_PRESETS).toContain(PENCIL);
    expect(BRUSH_PRESETS).toContain(MARKER);
    expect(BRUSH_PRESETS).toContain(HIGHLIGHTER);
  });

  it("each preset satisfies BrushConfig shape", () => {
    for (const preset of BRUSH_PRESETS) {
      expect(typeof preset.name).toBe("string");
      expect(typeof preset.baseWidth).toBe("number");
      expect(preset.baseWidth).toBeGreaterThan(0);
      expect(typeof preset.pressureCurve).toBe("function");
      expect(typeof preset.opacityCurve).toBe("function");
      expect(typeof preset.color).toBe("string");
      expect(typeof preset.smoothing).toBe("number");
    }
  });

  describe("Pen", () => {
    it("has consistent width regardless of pressure", () => {
      expect(PEN.pressureCurve(0)).toBe(1.0);
      expect(PEN.pressureCurve(0.5)).toBe(1.0);
      expect(PEN.pressureCurve(1.0)).toBe(1.0);
    });

    it("has full opacity regardless of pressure", () => {
      expect(PEN.opacityCurve(0)).toBe(1.0);
      expect(PEN.opacityCurve(1.0)).toBe(1.0);
    });

    it("has low smoothing", () => {
      expect(PEN.smoothing).toBeLessThanOrEqual(3);
    });
  });

  describe("Pencil", () => {
    it("width scales linearly with pressure", () => {
      expect(PENCIL.pressureCurve(0)).toBe(0);
      expect(PENCIL.pressureCurve(0.5)).toBeCloseTo(0.5);
      expect(PENCIL.pressureCurve(1.0)).toBe(1.0);
    });

    it("opacity varies with pressure but never zero", () => {
      expect(PENCIL.opacityCurve(0)).toBeGreaterThan(0);
      expect(PENCIL.opacityCurve(1.0)).toBeCloseTo(1.0);
    });

    it("has medium smoothing", () => {
      expect(PENCIL.smoothing).toBe(5);
    });
  });

  describe("Marker", () => {
    it("has wide base width", () => {
      expect(MARKER.baseWidth).toBeGreaterThanOrEqual(6);
    });

    it("has low pressure sensitivity for width", () => {
      const low = MARKER.pressureCurve(0);
      const high = MARKER.pressureCurve(1.0);
      // Range should be small
      expect(high - low).toBeLessThanOrEqual(0.4);
    });

    it("has high opacity", () => {
      expect(MARKER.opacityCurve(0)).toBe(1.0);
      expect(MARKER.opacityCurve(1.0)).toBe(1.0);
    });
  });

  describe("Highlighter", () => {
    it("has wide base width", () => {
      expect(HIGHLIGHTER.baseWidth).toBeGreaterThanOrEqual(12);
    });

    it("has no pressure sensitivity for width", () => {
      expect(HIGHLIGHTER.pressureCurve(0)).toBe(HIGHLIGHTER.pressureCurve(1.0));
    });

    it("is very transparent", () => {
      expect(HIGHLIGHTER.opacityCurve(0.5)).toBeLessThanOrEqual(0.4);
    });
  });
});
