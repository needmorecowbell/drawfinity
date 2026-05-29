import { DocumentModel, Stroke, generateStrokeId } from "../model/Stroke";
import { generateShapeId } from "../model/Shape";
import type { Shape, ShapeType } from "../model/Shape";
import type { SelectionPoint, SelectionRegion } from "../model";
import { pointInRegion } from "../model";
import { MovementSegment, PenState } from "./TurtleState";
import { lineIntersectsStroke } from "./turtleEraseUtils";

/**
 * Converts turtle movement segments into CRDT strokes and adds them
 * to the document. Supports batching consecutive segments that share
 * the same pen state into a single stroke to reduce CRDT overhead.
 */
export class TurtleDrawing {
  private doc: DocumentModel;
  /** IDs of all strokes created by this turtle session. */
  private strokeIds: string[] = [];
  /** IDs of all shapes created by this turtle session. */
  private shapeIds: string[] = [];
  /** Pending segments being batched into a single stroke. */
  private pendingSegments: MovementSegment[] = [];
  /** Active selection region that constrains turtle drawing, if any. */
  private selectionRegion: SelectionRegion | null = null;

  constructor(doc: DocumentModel) {
    this.doc = doc;
  }

  /** Constrain future turtle stroke segments to the given selection region. */
  setSelectionRegion(region: SelectionRegion | null): void {
    this.selectionRegion = region;
    if (this.pendingSegments.length > 0) {
      this.flush();
    }
  }

  /**
   * Add a movement segment. When batching is enabled (instant/fast speed),
   * segments with matching pen state are accumulated; call `flush()` to
   * commit them as a stroke.
   *
   * When batching is disabled, each segment becomes its own stroke immediately.
   */
  addSegment(segment: MovementSegment, batching: boolean): void {
    const clipped = this.clipSegmentToSelection(segment);
    if (!clipped) {
      if (batching) {
        this.flush();
      }
      return;
    }

    if (batching) {
      if (
        this.pendingSegments.length > 0 &&
        !penStatesMatch(
          this.pendingSegments[0].pen,
          clipped.pen,
        )
      ) {
        this.flush();
      }
      if (
        this.selectionRegion &&
        this.pendingSegments.length > 0 &&
        !segmentsAreContiguous(this.pendingSegments[this.pendingSegments.length - 1], clipped)
      ) {
        this.flush();
      }
      this.pendingSegments.push(clipped);
    } else {
      this.flush();
      this.commitSegments([clipped]);
    }
  }

  /** Flush any pending batched segments into a stroke. */
  flush(): void {
    if (this.pendingSegments.length === 0) return;
    this.commitSegments(this.pendingSegments);
    this.pendingSegments = [];
  }

  /**
   * Remove all strokes created by this turtle session from the document.
   * Used to implement the `clear()` turtle command.
   */
  clearTurtleStrokes(): void {
    this.flush();
    for (const id of this.strokeIds) {
      this.doc.removeStroke?.(id);
    }
    this.strokeIds = [];
    for (const id of this.shapeIds) {
      this.doc.removeShape?.(id);
    }
    this.shapeIds = [];
  }

  /** Get IDs of all strokes created by this turtle session. */
  getStrokeIds(): string[] {
    return [...this.strokeIds];
  }

  /** Get IDs of all shapes created by this turtle session. */
  getShapeIds(): string[] {
    return [...this.shapeIds];
  }

  /**
   * Create a shape at the given position and add it to the document.
   * Tracks the shape ID so `clear()` can remove it.
   */
  createShape(opts: {
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    strokeColor: string;
    strokeWidth: number;
    fillColor: string | null;
    opacity: number;
    sides?: number;
    starInnerRadius?: number;
  }): void {
    if (!this.doc.addShape) return;
    const shape: Shape = {
      id: generateShapeId(),
      type: opts.type,
      x: opts.x,
      y: opts.y,
      width: opts.width,
      height: opts.height,
      rotation: opts.rotation,
      strokeColor: opts.strokeColor,
      strokeWidth: opts.strokeWidth,
      fillColor: opts.fillColor,
      opacity: opts.opacity,
      sides: opts.sides,
      starInnerRadius: opts.starInnerRadius,
      timestamp: Date.now(),
    };
    this.doc.addShape(shape);
    this.shapeIds.push(shape.id);
  }

  /**
   * Erase strokes along a movement segment. Finds all strokes within
   * `radius` of the line from (fromX,fromY) to (toX,toY) and removes
   * or splits them.
   *
   * @param segment - The movement segment defining the erase path.
   * @param radius - The erase radius (typically pen width / 2).
   * @param turtleStrokeIds - When provided, only erase strokes whose IDs
   *   are in this set (for turtle_only mode). When null, erase all strokes.
   */
  eraseAlongSegment(
    segment: MovementSegment,
    radius: number,
    turtleStrokeIds: Set<string> | null,
  ): void {
    // Flush pending segments so they can be erased too
    this.flush();
    const strokes = this.doc.getStrokes();
    const erasedIds: string[] = [];

    for (const stroke of strokes) {
      if (turtleStrokeIds && !turtleStrokeIds.has(stroke.id)) {
        continue;
      }
      if (
        lineIntersectsStroke(
          segment.fromX, segment.fromY,
          segment.toX, segment.toY,
          stroke,
          radius,
        )
      ) {
        erasedIds.push(stroke.id);
      }
    }

    for (const id of erasedIds) {
      if (this.doc.removeStroke) {
        this.doc.removeStroke(id);
      }
      // Remove from our tracked stroke IDs if it was a turtle stroke
      const idx = this.strokeIds.indexOf(id);
      if (idx !== -1) {
        this.strokeIds.splice(idx, 1);
      }
    }
  }

  private commitSegments(segments: MovementSegment[]): void {
    if (segments.length === 0) return;

    const pen = segments[0].pen;
    const points = [
      { x: segments[0].fromX, y: segments[0].fromY, pressure: 1 },
    ];
    for (const seg of segments) {
      points.push({ x: seg.toX, y: seg.toY, pressure: 1 });
    }

    const stroke: Stroke = {
      id: generateStrokeId(),
      points,
      color: pen.color,
      width: pen.width,
      opacity: pen.opacity,
      timestamp: Date.now(),
    };

    this.doc.addStroke(stroke);
    this.strokeIds.push(stroke.id);
  }

  private clipSegmentToSelection(segment: MovementSegment): MovementSegment | null {
    if (!this.selectionRegion) return segment;

    const clipped = clipLineSegment(
      { x: segment.fromX, y: segment.fromY },
      { x: segment.toX, y: segment.toY },
      this.selectionRegion,
    );
    if (!clipped) return null;

    return {
      ...segment,
      fromX: clipped.from.x,
      fromY: clipped.from.y,
      toX: clipped.to.x,
      toY: clipped.to.y,
    };
  }
}

/** Check if two pen states are visually identical (same color, width, opacity). */
function penStatesMatch(a: PenState, b: PenState): boolean {
  return a.color === b.color && a.width === b.width && a.opacity === b.opacity;
}

function segmentsAreContiguous(a: MovementSegment, b: MovementSegment): boolean {
  return nearlyEqual(a.toX, b.fromX) && nearlyEqual(a.toY, b.fromY);
}

function clipLineSegment(
  from: SelectionPoint,
  to: SelectionPoint,
  region: SelectionRegion,
): { from: SelectionPoint; to: SelectionPoint } | null {
  if (region.type === "rect") {
    return clipLineToRect(from, to, region.bounds);
  }
  if (region.type === "ellipse") {
    return clipLineToEllipse(from, to, region);
  }
  return clipLineToPolygon(from, to, region);
}

function clipLineToRect(
  from: SelectionPoint,
  to: SelectionPoint,
  bounds: SelectionRegion["bounds"],
): { from: SelectionPoint; to: SelectionPoint } | null {
  const minX = Math.min(bounds.x, bounds.x + bounds.width);
  const maxX = Math.max(bounds.x, bounds.x + bounds.width);
  const minY = Math.min(bounds.y, bounds.y + bounds.height);
  const maxY = Math.max(bounds.y, bounds.y + bounds.height);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let t0 = 0;
  let t1 = 1;

  const edges: Array<[number, number]> = [
    [-dx, from.x - minX],
    [dx, maxX - from.x],
    [-dy, from.y - minY],
    [dy, maxY - from.y],
  ];

  for (const [p, q] of edges) {
    if (nearlyEqual(p, 0)) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }

  return makeClippedSegment(from, to, t0, t1);
}

function clipLineToEllipse(
  from: SelectionPoint,
  to: SelectionPoint,
  region: Extract<SelectionRegion, { type: "ellipse" }>,
): { from: SelectionPoint; to: SelectionPoint } | null {
  const { bounds } = region;
  if (bounds.width === 0 || bounds.height === 0) return null;

  const rx = Math.abs(bounds.width) / 2;
  const ry = Math.abs(bounds.height) / 2;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const fx = from.x - cx;
  const fy = from.y - cy;

  const a = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  const b = 2 * ((fx * dx) / (rx * rx) + (fy * dy) / (ry * ry));
  const c = (fx * fx) / (rx * rx) + (fy * fy) / (ry * ry) - 1;
  const intervals = intervalFromInsideFlags(
    pointInRegion(from, region),
    pointInRegion(to, region),
    solveQuadraticInUnitInterval(a, b, c),
  );

  if (!intervals) return null;
  return makeClippedSegment(from, to, intervals[0], intervals[1]);
}

function clipLineToPolygon(
  from: SelectionPoint,
  to: SelectionPoint,
  region: Extract<SelectionRegion, { type: "lasso" }>,
): { from: SelectionPoint; to: SelectionPoint } | null {
  if (region.points.length < 3) return null;

  const intersections: number[] = [];
  for (let i = 0, j = region.points.length - 1; i < region.points.length; j = i++) {
    const t = segmentIntersectionParameter(from, to, region.points[j], region.points[i]);
    if (t !== null) {
      intersections.push(t);
    }
  }

  const intervals = firstInsidePolygonInterval(from, to, region, intersections);
  if (!intervals) return null;
  return makeClippedSegment(from, to, intervals[0], intervals[1]);
}

function firstInsidePolygonInterval(
  from: SelectionPoint,
  to: SelectionPoint,
  region: Extract<SelectionRegion, { type: "lasso" }>,
  rawIntersections: number[],
): [number, number] | null {
  const values = uniqueSortedUnitValues([0, ...rawIntersections, 1]);
  for (let i = 0; i < values.length - 1; i++) {
    const start = values[i];
    const end = values[i + 1];
    if (nearlyEqual(start, end)) continue;
    const midpoint = interpolate(from, to, (start + end) / 2);
    if (pointInRegion(midpoint, region)) {
      return [start, end];
    }
  }

  if (pointInRegion(from, region) && pointInRegion(to, region)) {
    return [0, 1];
  }
  return null;
}

function intervalFromInsideFlags(
  fromInside: boolean,
  toInside: boolean,
  rawIntersections: number[],
): [number, number] | null {
  const intersections = uniqueSortedUnitValues(rawIntersections);

  if (fromInside && toInside) {
    return [0, 1];
  }
  if (fromInside) {
    return [0, intersections[0] ?? 1];
  }
  if (toInside) {
    return [intersections[intersections.length - 1] ?? 0, 1];
  }
  if (intersections.length >= 2) {
    return [intersections[0], intersections[intersections.length - 1]];
  }
  return null;
}

function solveQuadraticInUnitInterval(a: number, b: number, c: number): number[] {
  if (nearlyEqual(a, 0)) {
    if (nearlyEqual(b, 0)) return [];
    const t = -c / b;
    return t >= 0 && t <= 1 ? [t] : [];
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < -1e-9) return [];
  if (nearlyEqual(discriminant, 0)) {
    const t = -b / (2 * a);
    return t >= 0 && t <= 1 ? [t] : [];
  }

  const sqrt = Math.sqrt(Math.max(0, discriminant));
  const t1 = (-b - sqrt) / (2 * a);
  const t2 = (-b + sqrt) / (2 * a);
  return [t1, t2].filter((t) => t >= 0 && t <= 1);
}

function segmentIntersectionParameter(
  a: SelectionPoint,
  b: SelectionPoint,
  c: SelectionPoint,
  d: SelectionPoint,
): number | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denominator = cross(r, s);
  const cma = { x: c.x - a.x, y: c.y - a.y };

  if (nearlyEqual(denominator, 0)) {
    return null;
  }

  const t = cross(cma, s) / denominator;
  const u = cross(cma, r) / denominator;
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) {
    return null;
  }

  return clamp(t, 0, 1);
}

function makeClippedSegment(
  from: SelectionPoint,
  to: SelectionPoint,
  t0: number,
  t1: number,
): { from: SelectionPoint; to: SelectionPoint } | null {
  if (t1 < t0 || nearlyEqual(t0, t1)) return null;

  return {
    from: interpolate(from, to, t0),
    to: interpolate(from, to, t1),
  };
}

function interpolate(from: SelectionPoint, to: SelectionPoint, t: number): SelectionPoint {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

function uniqueSortedUnitValues(values: number[]): number[] {
  return values
    .filter((value) => value >= -1e-9 && value <= 1 + 1e-9)
    .map((value) => clamp(value, 0, 1))
    .sort((a, b) => a - b)
    .filter((value, index, sorted) => index === 0 || !nearlyEqual(value, sorted[index - 1]));
}

function cross(a: SelectionPoint, b: SelectionPoint): number {
  return a.x * b.y - a.y * b.x;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9;
}
