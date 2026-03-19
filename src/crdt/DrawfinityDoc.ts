import * as Y from "yjs";
import { Stroke, DocumentModel } from "../model/Stroke";
import { Shape } from "../model/Shape";
import { CanvasItem } from "../model/Shape";
import { strokeToYMap, yMapToStroke } from "./StrokeAdapter";
import { shapeToYMap, yMapToShape } from "./ShapeAdapter";

export const DEFAULT_BACKGROUND_COLOR = "#FAFAF8";

export class DrawfinityDoc implements DocumentModel {
  private doc: Y.Doc;
  private items: Y.Array<Y.Map<unknown>>;
  private meta: Y.Map<string>;

  constructor(doc?: Y.Doc) {
    this.doc = doc ?? new Y.Doc();
    this.items = this.doc.getArray<Y.Map<unknown>>("strokes");
    this.meta = this.doc.getMap<string>("meta");
  }

  addStroke(stroke: Stroke): void {
    this.doc.transact(() => {
      const yMap = strokeToYMap(stroke);
      this.items.push([yMap]);
    });
  }

  removeStroke(strokeId: string): boolean {
    let removed = false;
    this.doc.transact(() => {
      const arr = this.items.toArray();
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].get("id") === strokeId) {
          this.items.delete(i, 1);
          removed = true;
          break;
        }
      }
    });
    return removed;
  }

  replaceStroke(strokeId: string, replacements: Stroke[]): boolean {
    let replaced = false;
    this.doc.transact(() => {
      const arr = this.items.toArray();
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].get("id") === strokeId) {
          this.items.delete(i, 1);
          const yMaps = replacements.map(strokeToYMap);
          this.items.insert(i, yMaps);
          replaced = true;
          break;
        }
      }
    });
    return replaced;
  }

  /**
   * Returns only stroke items. Items without a `type` field are treated as
   * strokes for backward compatibility with documents created before shapes
   * were introduced.
   */
  getStrokes(): Stroke[] {
    return this.items
      .toArray()
      .filter((yMap) => {
        const type = yMap.get("type") as string | undefined;
        return type === "stroke" || type === undefined;
      })
      .map(yMapToStroke);
  }

  addShape(shape: Shape): void {
    this.doc.transact(() => {
      const yMap = shapeToYMap(shape);
      this.items.push([yMap]);
    });
  }

  removeShape(shapeId: string): boolean {
    let removed = false;
    this.doc.transact(() => {
      const arr = this.items.toArray();
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].get("id") === shapeId) {
          this.items.delete(i, 1);
          removed = true;
          break;
        }
      }
    });
    return removed;
  }

  getShapes(): Shape[] {
    return this.items
      .toArray()
      .filter((yMap) => yMap.get("type") === "shape")
      .map(yMapToShape);
  }

  /**
   * Returns all canvas items (strokes and shapes) in document order.
   */
  getAllItems(): CanvasItem[] {
    return this.items.toArray().map((yMap) => {
      const type = yMap.get("type") as string | undefined;
      if (type === "shape") {
        return { kind: "shape" as const, item: yMapToShape(yMap) };
      }
      return { kind: "stroke" as const, item: yMapToStroke(yMap) };
    });
  }

  onStrokesChanged(callback: () => void): void {
    this.items.observeDeep(callback);
  }

  getDoc(): Y.Doc {
    return this.doc;
  }

  getStrokesArray(): Y.Array<Y.Map<unknown>> {
    return this.items;
  }

  getBackgroundColor(): string {
    return this.meta.get("backgroundColor") ?? DEFAULT_BACKGROUND_COLOR;
  }

  setBackgroundColor(color: string): void {
    this.doc.transact(() => {
      this.meta.set("backgroundColor", color);
    });
  }

  onMetaChanged(callback: () => void): void {
    this.meta.observe(callback);
  }

  getMetaMap(): Y.Map<string> {
    return this.meta;
  }
}
