import * as Y from "yjs";
import { Stroke } from "../model/Stroke";
import { strokeToYMap, yMapToStroke } from "./StrokeAdapter";

export class DrawfinityDoc {
  private doc: Y.Doc;
  private strokes: Y.Array<Y.Map<unknown>>;

  constructor(doc?: Y.Doc) {
    this.doc = doc ?? new Y.Doc();
    this.strokes = this.doc.getArray<Y.Map<unknown>>("strokes");
  }

  addStroke(stroke: Stroke): void {
    this.doc.transact(() => {
      const yMap = strokeToYMap(stroke);
      this.strokes.push([yMap]);
    });
  }

  getStrokes(): Stroke[] {
    return this.strokes.toArray().map(yMapToStroke);
  }

  onStrokesChanged(callback: () => void): void {
    this.strokes.observeDeep(callback);
  }

  getDoc(): Y.Doc {
    return this.doc;
  }

  getStrokesArray(): Y.Array<Y.Map<unknown>> {
    return this.strokes;
  }
}
