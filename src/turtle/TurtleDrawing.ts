import { DocumentModel, Stroke, generateStrokeId } from "../model/Stroke";
import { generateShapeId } from "../model/Shape";
import type { Shape, ShapeType } from "../model/Shape";
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

  constructor(doc: DocumentModel) {
    this.doc = doc;
  }

  /**
   * Add a movement segment. When batching is enabled (instant/fast speed),
   * segments with matching pen state are accumulated; call `flush()` to
   * commit them as a stroke.
   *
   * When batching is disabled, each segment becomes its own stroke immediately.
   */
  addSegment(segment: MovementSegment, batching: boolean): void {
    if (batching) {
      if (
        this.pendingSegments.length > 0 &&
        !penStatesMatch(
          this.pendingSegments[0].pen,
          segment.pen,
        )
      ) {
        this.flush();
      }
      this.pendingSegments.push(segment);
    } else {
      this.flush();
      this.commitSegments([segment]);
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
}

/** Check if two pen states are visually identical (same color, width, opacity). */
function penStatesMatch(a: PenState, b: PenState): boolean {
  return a.color === b.color && a.width === b.width && a.opacity === b.opacity;
}
