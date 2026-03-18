import * as Y from "yjs";
import { Stroke, DocumentModel } from "../model/Stroke";
import { strokeToYMap, yMapToStroke } from "./StrokeAdapter";

export class DrawfinityDoc implements DocumentModel {
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

  removeStroke(strokeId: string): boolean {
    let removed = false;
    this.doc.transact(() => {
      const arr = this.strokes.toArray();
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].get("id") === strokeId) {
          this.strokes.delete(i, 1);
          removed = true;
          break;
        }
      }
    });
    return removed;
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
