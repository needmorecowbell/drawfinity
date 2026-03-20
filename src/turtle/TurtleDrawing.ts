import { DocumentModel, Stroke, generateStrokeId } from "../model/Stroke";
import { MovementSegment, PenState } from "./TurtleState";

/**
 * Converts turtle movement segments into CRDT strokes and adds them
 * to the document. Supports batching consecutive segments that share
 * the same pen state into a single stroke to reduce CRDT overhead.
 */
export class TurtleDrawing {
  private doc: DocumentModel;
  private zoom: number;
  /** IDs of all strokes created by this turtle session. */
  private strokeIds: string[] = [];
  /** Pending segments being batched into a single stroke. */
  private pendingSegments: MovementSegment[] = [];

  constructor(doc: DocumentModel, zoom: number) {
    this.doc = doc;
    this.zoom = zoom;
  }

  /** Update the current zoom level (affects pen width scaling). */
  setZoom(zoom: number): void {
    this.zoom = zoom;
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
  }

  /** Get IDs of all strokes created by this turtle session. */
  getStrokeIds(): string[] {
    return [...this.strokeIds];
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
      width: pen.width / this.zoom,
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
