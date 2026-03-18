import { describe, it, expect } from "vitest";
import { smoothStroke } from "../StrokeSmoothing";
import type { StrokePoint } from "../../model/Stroke";

describe("StrokeSmoothing.smoothStroke", () => {
  it("returns a copy for 2 or fewer points", () => {
    const pts: StrokePoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 10, pressure: 0.8 },
    ];
    const result = smoothStroke(pts, 5);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(pts[0]);
    expect(result[1]).toEqual(pts[1]);
    // Verify it's a copy, not the same reference
    expect(result[0]).not.toBe(pts[0]);
  });

  it("returns a copy when windowSize is 1 (no smoothing)", () => {
    const pts: StrokePoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 5, y: 5, pressure: 0.6 },
      { x: 10, y: 10, pressure: 0.7 },
    ];
    const result = smoothStroke(pts, 1);
    expect(result).toHaveLength(3);
    for (let i = 0; i < pts.length; i++) {
      expect(result[i].x).toBe(pts[i].x);
      expect(result[i].y).toBe(pts[i].y);
      expect(result[i].pressure).toBe(pts[i].pressure);
    }
  });

  it("preserves first and last points exactly", () => {
    const pts: StrokePoint[] = [
      { x: 0, y: 0, pressure: 0.3 },
      { x: 100, y: 0, pressure: 0.5 },
      { x: 0, y: 100, pressure: 0.5 },
      { x: 50, y: 50, pressure: 0.9 },
    ];
    const result = smoothStroke(pts, 3);
    expect(result[0].x).toBe(0);
    expect(result[0].y).toBe(0);
    expect(result[result.length - 1].x).toBe(50);
    expect(result[result.length - 1].y).toBe(50);
  });

  it("preserves pressure values (does not smooth pressure)", () => {
    const pts: StrokePoint[] = [
      { x: 0, y: 0, pressure: 0.1 },
      { x: 5, y: 5, pressure: 0.9 },
      { x: 10, y: 10, pressure: 0.3 },
      { x: 15, y: 15, pressure: 0.7 },
    ];
    const result = smoothStroke(pts, 5);
    for (let i = 0; i < pts.length; i++) {
      expect(result[i].pressure).toBe(pts[i].pressure);
    }
  });

  it("smooths interior points using moving average", () => {
    // A zigzag pattern: the middle point should be pulled toward the average
    const pts: StrokePoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 5, y: 10, pressure: 0.5 }, // outlier point
      { x: 10, y: 0, pressure: 0.5 },
    ];
    const result = smoothStroke(pts, 3);
    // Middle point averaged: x = (0+5+10)/3 ≈ 5, y = (0+10+0)/3 ≈ 3.33
    expect(result[1].x).toBeCloseTo(5);
    expect(result[1].y).toBeCloseTo(10 / 3);
  });

  it("handles large window sizes by clamping to array bounds", () => {
    const pts: StrokePoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 5, y: 10, pressure: 0.5 },
      { x: 10, y: 0, pressure: 0.5 },
    ];
    // Window of 99 is clamped to 3 (length of array), and made odd
    const result = smoothStroke(pts, 99);
    expect(result).toHaveLength(3);
    expect(result[1].x).toBeCloseTo(5);
    expect(result[1].y).toBeCloseTo(10 / 3);
  });

  it("returns same length array as input", () => {
    const pts: StrokePoint[] = [];
    for (let i = 0; i < 20; i++) {
      pts.push({ x: i * 10, y: Math.sin(i) * 50, pressure: 0.5 });
    }
    const result = smoothStroke(pts, 5);
    expect(result).toHaveLength(20);
  });

  it("reduces variance of noisy input", () => {
    // Create a noisy line along x-axis
    const pts: StrokePoint[] = [];
    for (let i = 0; i < 10; i++) {
      pts.push({
        x: i * 10,
        y: (i % 2 === 0 ? 5 : -5), // alternating +5 / -5
        pressure: 0.5,
      });
    }

    const raw = smoothStroke(pts, 1);
    const smoothed = smoothStroke(pts, 5);

    // Compute variance of y for interior points
    function yVariance(arr: StrokePoint[]): number {
      const interior = arr.slice(1, -1);
      const mean = interior.reduce((s, p) => s + p.y, 0) / interior.length;
      return interior.reduce((s, p) => s + (p.y - mean) ** 2, 0) / interior.length;
    }

    expect(yVariance(smoothed)).toBeLessThan(yVariance(raw));
  });

  it("handles empty array", () => {
    const result = smoothStroke([], 3);
    expect(result).toHaveLength(0);
  });

  it("handles single point", () => {
    const pts: StrokePoint[] = [{ x: 5, y: 5, pressure: 0.5 }];
    const result = smoothStroke(pts, 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(pts[0]);
  });
});
