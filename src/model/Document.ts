import { Stroke, DocumentModel } from "./Stroke";

/**
 * In-memory implementation of {@link DocumentModel} for local, non-collaborative drawing.
 *
 * `DrawDocument` stores strokes in a plain array and provides the minimal stroke
 * lifecycle required by the rendering pipeline and drawing tools. It is used as the
 * default document backend when no CRDT/collaboration layer is active.
 *
 * For collaborative editing, use {@link DrawfinityDoc} (Yjs-backed) instead — both
 * implement {@link DocumentModel}, so consumers can work with either transparently.
 *
 * @example
 * ```ts
 * const doc = new DrawDocument();
 * doc.addStroke({ id: "s1", points: [{ x: 0, y: 0, pressure: 0.5 }], color: "#000", width: 2, timestamp: Date.now() });
 * console.log(doc.getStrokes().length); // 1
 * doc.clear();
 * console.log(doc.getStrokes().length); // 0
 * ```
 */
export class DrawDocument implements DocumentModel {
  private strokes: Stroke[] = [];

  /** {@inheritDoc DocumentModel.addStroke} */
  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
  }

  /** {@inheritDoc DocumentModel.getStrokes} */
  getStrokes(): Stroke[] {
    return this.strokes;
  }

  /**
   * Remove all strokes from the document, resetting it to an empty state.
   *
   * This is not part of the {@link DocumentModel} contract — it is a convenience
   * method specific to the in-memory implementation.
   */
  clear(): void {
    this.strokes = [];
  }
}
