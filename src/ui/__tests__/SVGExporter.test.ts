import { describe, it, expect } from "vitest";
import { exportSVG, strokeToSVG, shapeToSVG, computeStrokeOutline } from "../SVGExporter";
import type { Stroke } from "../../model/Stroke";
import type { Shape } from "../../model/Shape";
import type { CanvasItem } from "../../model/Shape";
import type { ExportOptions } from "../ExportRenderer";

function makeStroke(overrides: Partial<Stroke> = {}): Stroke {
  return {
    id: "s1",
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 100, y: 0, pressure: 0.5 },
    ],
    color: "#ff0000",
    width: 10,
    timestamp: 1000,
    ...overrides,
  };
}

function makeShape(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "sh1",
    type: "rectangle",
    x: 50,
    y: 50,
    width: 100,
    height: 60,
    rotation: 0,
    strokeColor: "#000000",
    strokeWidth: 2,
    fillColor: "#00ff00",
    opacity: 1,
    timestamp: 2000,
    ...overrides,
  };
}

function defaultOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    scope: "fitAll",
    scale: 1,
    includeBackground: false,
    ...overrides,
  };
}

describe("SVGExporter", () => {
  describe("exportSVG", () => {
    it("returns null for empty content in fitAll mode", () => {
      const result = exportSVG([], defaultOptions());
      expect(result).toBeNull();
    });

    it("returns null for viewport mode without viewportBounds", () => {
      const result = exportSVG(
        [{ kind: "stroke", item: makeStroke() }],
        defaultOptions({ scope: "viewport" }),
      );
      expect(result).toBeNull();
    });

    it("produces valid SVG with viewBox for fitAll mode", () => {
      const items: CanvasItem[] = [{ kind: "stroke", item: makeStroke() }];
      const svg = exportSVG(items, defaultOptions());
      expect(svg).not.toBeNull();
      expect(svg).toContain("<svg xmlns=");
      expect(svg).toContain("viewBox=");
      expect(svg).toContain("</svg>");
    });

    it("includes background rect when includeBackground is true", () => {
      const items: CanvasItem[] = [{ kind: "stroke", item: makeStroke() }];
      const svg = exportSVG(items, defaultOptions({ includeBackground: true }));
      expect(svg).toContain('fill="#FAFAF8"');
    });

    it("does not include background rect when includeBackground is false", () => {
      const items: CanvasItem[] = [{ kind: "stroke", item: makeStroke() }];
      const svg = exportSVG(items, defaultOptions({ includeBackground: false }));
      // The only fill should be from the stroke path, not a background rect
      expect(svg).not.toContain('fill="#FAFAF8"');
    });

    it("uses viewportBounds for viewport scope", () => {
      const items: CanvasItem[] = [{ kind: "stroke", item: makeStroke() }];
      const svg = exportSVG(
        items,
        defaultOptions({
          scope: "viewport",
          viewportBounds: { minX: 10, minY: 20, maxX: 210, maxY: 120 },
        }),
      );
      expect(svg).toContain("viewBox=\"10 20 200 100\"");
    });
  });

  describe("strokeToSVG", () => {
    it("produces a closed path for a 2-point straight stroke", () => {
      const stroke = makeStroke();
      const svg = strokeToSVG(stroke);
      expect(svg).toContain("<path");
      expect(svg).toContain('fill="#ff0000"');
      // Path should be closed with Z
      expect(svg).toContain(" Z");
      // Should contain M and L commands
      expect(svg).toMatch(/M\s/);
      expect(svg).toMatch(/L\s/);
    });

    it("produces varying width for pressure-varying stroke", () => {
      const stroke = makeStroke({
        points: [
          { x: 0, y: 0, pressure: 0.2 },
          { x: 50, y: 0, pressure: 0.8 },
          { x: 100, y: 0, pressure: 0.2 },
        ],
      });

      const outline = computeStrokeOutline(stroke.points, stroke.width);

      // At point 0 (pressure 0.2), halfWidth = 10 * 0.2 / 2 = 1
      // Left edge should be at y = 1, right at y = -1
      expect(Math.abs(outline.left[0].y)).toBeCloseTo(1, 1);

      // At point 1 (pressure 0.8), halfWidth = 10 * 0.8 / 2 = 4
      expect(Math.abs(outline.left[1].y)).toBeCloseTo(4, 1);

      // At point 2 (pressure 0.2), halfWidth = 10 * 0.2 / 2 = 1
      expect(Math.abs(outline.left[2].y)).toBeCloseTo(1, 1);

      // The SVG path should exist and be a valid path
      const svg = strokeToSVG(stroke);
      expect(svg).toContain("<path");
    });

    it("produces a circle for single-point stroke", () => {
      const stroke = makeStroke({
        points: [{ x: 50, y: 50, pressure: 0.5 }],
      });
      const svg = strokeToSVG(stroke);
      expect(svg).toContain("<circle");
      expect(svg).toContain('cx="50"');
      expect(svg).toContain('cy="50"');
    });

    it("includes opacity attribute when opacity < 1", () => {
      const stroke = makeStroke({ opacity: 0.5 });
      const svg = strokeToSVG(stroke);
      expect(svg).toContain('opacity="0.5"');
    });

    it("omits opacity attribute when opacity is 1", () => {
      const stroke = makeStroke({ opacity: 1 });
      const svg = strokeToSVG(stroke);
      expect(svg).not.toContain("opacity=");
    });

    it("returns empty string for stroke with no points", () => {
      const stroke = makeStroke({ points: [] });
      const svg = strokeToSVG(stroke);
      expect(svg).toBe("");
    });

    it("deduplicates consecutive identical points", () => {
      const stroke = makeStroke({
        points: [
          { x: 0, y: 0, pressure: 0.5 },
          { x: 0, y: 0, pressure: 0.5 },
          { x: 100, y: 0, pressure: 0.5 },
        ],
      });
      const svg = strokeToSVG(stroke);
      // Should produce a path (not a circle), because there are 2 unique points
      expect(svg).toContain("<path");
    });
  });

  describe("shapeToSVG", () => {
    it("produces a rect for rectangle shape", () => {
      const shape = makeShape({ type: "rectangle" });
      const svg = shapeToSVG(shape);
      expect(svg).toContain("<rect");
      expect(svg).toContain('fill="#00ff00"');
      expect(svg).toContain('stroke="#000000"');
      expect(svg).toContain('stroke-width="2"');
    });

    it("includes rotation transform for rotated rectangle", () => {
      const shape = makeShape({ type: "rectangle", rotation: Math.PI / 4 });
      const svg = shapeToSVG(shape);
      expect(svg).toContain("<rect");
      expect(svg).toContain("transform=\"rotate(45");
    });

    it("produces an ellipse for ellipse shape", () => {
      const shape = makeShape({ type: "ellipse" });
      const svg = shapeToSVG(shape);
      expect(svg).toContain("<ellipse");
      expect(svg).toContain('cx="50"');
      expect(svg).toContain('cy="50"');
      expect(svg).toContain('rx="50"');
      expect(svg).toContain('ry="30"');
    });

    it("includes rotation transform for rotated ellipse", () => {
      const shape = makeShape({ type: "ellipse", rotation: Math.PI / 2 });
      const svg = shapeToSVG(shape);
      expect(svg).toContain("transform=\"rotate(90");
    });

    it("produces a polygon for polygon shape", () => {
      const shape = makeShape({ type: "polygon", sides: 6 });
      const svg = shapeToSVG(shape);
      expect(svg).toContain("<polygon");
      expect(svg).toContain("points=");
    });

    it("produces a polygon for star shape", () => {
      const shape = makeShape({ type: "star", sides: 5, starInnerRadius: 0.4 });
      const svg = shapeToSVG(shape);
      expect(svg).toContain("<polygon");
      expect(svg).toContain("points=");
    });

    it("uses fill=none when fillColor is null", () => {
      const shape = makeShape({ fillColor: null });
      const svg = shapeToSVG(shape);
      expect(svg).toContain('fill="none"');
    });

    it("includes opacity when less than 1", () => {
      const shape = makeShape({ opacity: 0.5 });
      const svg = shapeToSVG(shape);
      expect(svg).toContain('opacity="0.5"');
    });

    it("omits stroke attrs when strokeWidth is 0", () => {
      const shape = makeShape({ strokeWidth: 0 });
      const svg = shapeToSVG(shape);
      expect(svg).not.toContain("stroke=");
    });
  });

  describe("document order", () => {
    it("preserves document order in SVG element order", () => {
      const stroke1 = makeStroke({ id: "s1", timestamp: 1000 });
      const shape1 = makeShape({ id: "sh1", timestamp: 2000, type: "rectangle" });
      const stroke2 = makeStroke({
        id: "s2",
        timestamp: 3000,
        color: "#0000ff",
        points: [
          { x: 200, y: 200, pressure: 0.5 },
          { x: 300, y: 200, pressure: 0.5 },
        ],
      });

      const items: CanvasItem[] = [
        { kind: "stroke", item: stroke1 },
        { kind: "shape", item: shape1 },
        { kind: "stroke", item: stroke2 },
      ];

      const svg = exportSVG(items, defaultOptions())!;
      expect(svg).not.toBeNull();

      // Find positions of elements
      const firstStroke = svg.indexOf('fill="#ff0000"');
      const rectPos = svg.indexOf("<rect");
      const secondStroke = svg.indexOf('fill="#0000ff"');

      expect(firstStroke).toBeGreaterThan(-1);
      expect(rectPos).toBeGreaterThan(-1);
      expect(secondStroke).toBeGreaterThan(-1);

      // Order should be: stroke1 < shape1 < stroke2
      expect(firstStroke).toBeLessThan(rectPos);
      expect(rectPos).toBeLessThan(secondStroke);
    });

    it("sorts items by timestamp regardless of input order", () => {
      // Pass items out of timestamp order: shape (t=2000), stroke2 (t=3000), stroke1 (t=1000)
      const stroke1 = makeStroke({ id: "s1", timestamp: 1000 });
      const shape1 = makeShape({ id: "sh1", timestamp: 2000, type: "rectangle" });
      const stroke2 = makeStroke({
        id: "s2",
        timestamp: 3000,
        color: "#0000ff",
        points: [
          { x: 200, y: 200, pressure: 0.5 },
          { x: 300, y: 200, pressure: 0.5 },
        ],
      });

      // Deliberately pass in wrong order
      const items: CanvasItem[] = [
        { kind: "stroke", item: stroke2 },
        { kind: "shape", item: shape1 },
        { kind: "stroke", item: stroke1 },
      ];

      const svg = exportSVG(items, defaultOptions())!;
      expect(svg).not.toBeNull();

      // Despite being passed out of order, SVG elements should be sorted by timestamp
      const firstStroke = svg.indexOf('fill="#ff0000"');
      const rectPos = svg.indexOf("<rect");
      const secondStroke = svg.indexOf('fill="#0000ff"');

      expect(firstStroke).toBeGreaterThan(-1);
      expect(rectPos).toBeGreaterThan(-1);
      expect(secondStroke).toBeGreaterThan(-1);

      // Timestamp order: stroke1 (1000) < shape1 (2000) < stroke2 (3000)
      expect(firstStroke).toBeLessThan(rectPos);
      expect(rectPos).toBeLessThan(secondStroke);
    });
  });

  describe("computeStrokeOutline", () => {
    it("produces left and right edges for a straight horizontal stroke", () => {
      const points = [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 100, y: 0, pressure: 0.5 },
      ];
      const { left, right } = computeStrokeOutline(points, 10);

      // For horizontal stroke, normals point up/down
      // halfWidth = 10 * 0.5 / 2 = 2.5
      expect(left).toHaveLength(2);
      expect(right).toHaveLength(2);

      // Left edge offset along normal (+nx direction)
      // For rightward stroke: normal = (0, -1) * 0 wait... direction (100,0), normal (-0,100)/100 = (0,1)
      // Actually: dx=100, dy=0, normal = (-dy/len, dx/len) = (0, 1)
      // So left = point + normal * halfWidth = (x, y + 2.5)
      expect(left[0].y).toBeCloseTo(2.5, 5);
      expect(left[1].y).toBeCloseTo(2.5, 5);

      // Right edge: point - normal * halfWidth = (x, y - 2.5)
      expect(right[0].y).toBeCloseTo(-2.5, 5);
      expect(right[1].y).toBeCloseTo(-2.5, 5);

      // X coordinates should match the original points
      expect(left[0].x).toBeCloseTo(0, 5);
      expect(left[1].x).toBeCloseTo(100, 5);
    });
  });
});
