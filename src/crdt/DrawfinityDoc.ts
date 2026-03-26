import * as Y from "yjs";
import { Stroke, DocumentModel } from "../model/Stroke";
import { Shape } from "../model/Shape";
import { CanvasItem } from "../model/Shape";
import { strokeToYMap, yMapToStroke } from "./StrokeAdapter";
import { shapeToYMap, yMapToShape } from "./ShapeAdapter";
import { CameraBookmark } from "../model/Bookmark";
import { bookmarkToYMap, yMapToBookmark } from "./BookmarkAdapter";

/** Default canvas background color used when no background color has been set. */
export const DEFAULT_BACKGROUND_COLOR = "#FAFAF8";

/**
 * Yjs CRDT document wrapper that serves as the single source of truth for all drawing data.
 *
 * DrawfinityDoc wraps a Yjs `Y.Doc` and exposes a typed API for managing strokes, shapes,
 * bookmarks, and document metadata. All mutations are performed inside Yjs transactions,
 * ensuring atomic updates and automatic conflict resolution during real-time collaboration.
 *
 * Internally the document uses three shared data structures:
 * - `"strokes"` — a `Y.Array` holding both strokes and shapes (distinguished by a `type` field)
 * - `"meta"` — a `Y.Map` for key-value metadata such as background color
 * - `"bookmarks"` — a `Y.Array` of camera bookmark entries
 *
 * @example
 * ```ts
 * // Create a standalone document
 * const doc = new DrawfinityDoc();
 * doc.addStroke({ id: "s1", points: [...], color: "#000", width: 2, timestamp: Date.now() });
 * console.log(doc.getStrokes()); // [{ id: "s1", ... }]
 *
 * // Wrap an existing Y.Doc (e.g. from a sync provider)
 * const shared = new DrawfinityDoc(existingYDoc);
 *
 * // Observe changes for re-rendering
 * doc.onStrokesChanged(() => renderer.redraw());
 * ```
 */
/** A turtle script shared by a collaborator via the Yjs document. */
export interface SharedScript {
  id: string;
  title: string;
  code: string;
  author: string;
  sharedAt: number;
}

export class DrawfinityDoc implements DocumentModel {
  private doc: Y.Doc;
  private items: Y.Array<Y.Map<unknown>>;
  private meta: Y.Map<string>;
  private bookmarks: Y.Array<Y.Map<unknown>>;
  private sharedScripts: Y.Map<string>;

  /**
   * Creates a new DrawfinityDoc, optionally wrapping an existing Yjs document.
   *
   * @param doc - An existing `Y.Doc` to wrap. If omitted, a new empty `Y.Doc` is created.
   *              Pass an existing doc when integrating with a sync provider such as y-websocket.
   */
  constructor(doc?: Y.Doc) {
    this.doc = doc ?? new Y.Doc();
    this.items = this.doc.getArray<Y.Map<unknown>>("strokes");
    this.meta = this.doc.getMap<string>("meta");
    this.bookmarks = this.doc.getArray<Y.Map<unknown>>("bookmarks");
    this.sharedScripts = this.doc.getMap<string>("shared-scripts");
  }

  /**
   * Adds a stroke to the document inside a Yjs transaction.
   *
   * @param stroke - The stroke to add, including its unique ID, points, color, width, and timestamp.
   */
  addStroke(stroke: Stroke): void {
    this.doc.transact(() => {
      const yMap = strokeToYMap(stroke);
      this.items.push([yMap]);
    });
  }

  /**
   * Removes a stroke by ID from the document.
   *
   * @param strokeId - The unique identifier of the stroke to remove.
   * @returns `true` if the stroke was found and removed, `false` otherwise.
   */
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

  /**
   * Atomically replaces a stroke with zero or more replacement strokes.
   *
   * Used by the eraser tool for partial stroke erasure — the original stroke is removed
   * and the surviving fragments are inserted at the same position to preserve draw order.
   *
   * @param strokeId - The unique identifier of the stroke to replace.
   * @param replacements - The replacement strokes to insert at the original stroke's position.
   * @returns `true` if the stroke was found and replaced, `false` otherwise.
   */
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

  /**
   * Adds a shape to the document inside a Yjs transaction.
   *
   * @param shape - The shape to add (rectangle, ellipse, polygon, or star).
   */
  addShape(shape: Shape): void {
    this.doc.transact(() => {
      const yMap = shapeToYMap(shape);
      this.items.push([yMap]);
    });
  }

  /**
   * Removes a shape by ID from the document.
   *
   * @param shapeId - The unique identifier of the shape to remove.
   * @returns `true` if the shape was found and removed, `false` otherwise.
   */
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

  /**
   * Returns all shapes in the document, filtering out stroke items.
   *
   * @returns An array of shapes in document order.
   */
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

  /**
   * Registers a callback that fires whenever the items array (strokes or shapes) changes.
   *
   * Uses Yjs `observeDeep` so the callback fires for both structural changes (add/remove)
   * and property-level changes within individual items.
   *
   * @param callback - A function invoked on every change to the items array.
   */
  onStrokesChanged(callback: () => void): void {
    this.items.observeDeep(callback);
  }

  /**
   * Returns the underlying Yjs document for use with sync providers or undo managers.
   *
   * @returns The wrapped `Y.Doc` instance.
   */
  getDoc(): Y.Doc {
    return this.doc;
  }

  /**
   * Returns the raw Yjs shared array backing all canvas items (strokes and shapes).
   *
   * Useful for wiring up a `Y.UndoManager` or other Yjs-level integrations.
   *
   * @returns The `Y.Array` containing all item `Y.Map` entries.
   */
  getStrokesArray(): Y.Array<Y.Map<unknown>> {
    return this.items;
  }

  /**
   * Returns the canvas background color, or {@link DEFAULT_BACKGROUND_COLOR} if none has been set.
   *
   * @returns A CSS color string (e.g. `"#FAFAF8"`).
   */
  getBackgroundColor(): string {
    return this.meta.get("backgroundColor") ?? DEFAULT_BACKGROUND_COLOR;
  }

  /**
   * Sets the canvas background color, stored in the shared metadata map.
   *
   * @param color - A CSS color string (e.g. `"#1a1a2e"`).
   */
  setBackgroundColor(color: string): void {
    this.doc.transact(() => {
      this.meta.set("backgroundColor", color);
    });
  }

  /**
   * Registers a callback that fires whenever document metadata changes (e.g. background color).
   *
   * @param callback - A function invoked on every change to the metadata map.
   */
  onMetaChanged(callback: () => void): void {
    this.meta.observe(callback);
  }

  /**
   * Returns the raw Yjs shared map backing document metadata.
   *
   * @returns The `Y.Map` containing metadata key-value pairs.
   */
  getMetaMap(): Y.Map<string> {
    return this.meta;
  }

  /**
   * Adds a camera bookmark to the document.
   *
   * @param bookmark - The bookmark to add, containing camera position, zoom, and label.
   */
  addBookmark(bookmark: CameraBookmark): void {
    this.doc.transact(() => {
      const yMap = bookmarkToYMap(bookmark);
      this.bookmarks.push([yMap]);
    });
  }

  /**
   * Removes a camera bookmark by ID.
   *
   * @param id - The unique identifier of the bookmark to remove.
   * @returns `true` if the bookmark was found and removed, `false` otherwise.
   */
  removeBookmark(id: string): boolean {
    let removed = false;
    this.doc.transact(() => {
      const arr = this.bookmarks.toArray();
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].get("id") === id) {
          this.bookmarks.delete(i, 1);
          removed = true;
          break;
        }
      }
    });
    return removed;
  }

  /**
   * Returns all camera bookmarks in the document.
   *
   * @returns An array of bookmarks in document order.
   */
  getBookmarks(): CameraBookmark[] {
    return this.bookmarks.toArray().map(yMapToBookmark);
  }

  /**
   * Partially updates a camera bookmark's properties.
   *
   * @param id - The unique identifier of the bookmark to update.
   * @param partial - An object containing the bookmark fields to update (excluding `id`).
   * @returns `true` if the bookmark was found and updated, `false` otherwise.
   */
  updateBookmark(id: string, partial: Partial<Omit<CameraBookmark, "id">>): boolean {
    let updated = false;
    this.doc.transact(() => {
      const arr = this.bookmarks.toArray();
      for (const yMap of arr) {
        if (yMap.get("id") === id) {
          for (const [key, value] of Object.entries(partial)) {
            yMap.set(key, value);
          }
          updated = true;
          break;
        }
      }
    });
    return updated;
  }

  /**
   * Registers a callback that fires whenever bookmarks are added, removed, or modified.
   *
   * @param callback - A function invoked on every change to the bookmarks array.
   */
  onBookmarksChanged(callback: () => void): void {
    this.bookmarks.observeDeep(callback);
  }

  /**
   * Returns the raw Yjs shared array backing camera bookmarks.
   *
   * @returns The `Y.Array` containing all bookmark `Y.Map` entries.
   */
  getBookmarksArray(): Y.Array<Y.Map<unknown>> {
    return this.bookmarks;
  }

  /**
   * Shares a turtle script into the document's shared-scripts map.
   *
   * @param script - The shared script entry including id, title, code, and author.
   */
  shareScript(script: SharedScript): void {
    this.doc.transact(() => {
      this.sharedScripts.set(script.id, JSON.stringify(script));
    });
  }

  /**
   * Removes a shared script by ID.
   *
   * @param id - The unique identifier of the shared script to remove.
   */
  removeSharedScript(id: string): void {
    this.doc.transact(() => {
      this.sharedScripts.delete(id);
    });
  }

  /**
   * Returns all shared scripts in the document.
   *
   * @returns An array of {@link SharedScript} objects.
   */
  getSharedScripts(): SharedScript[] {
    const scripts: SharedScript[] = [];
    this.sharedScripts.forEach((value) => {
      try {
        scripts.push(JSON.parse(value) as SharedScript);
      } catch {
        // Ignore corrupt entries
      }
    });
    return scripts.sort((a, b) => b.sharedAt - a.sharedAt);
  }

  /**
   * Registers a callback that fires whenever shared scripts change.
   *
   * @param callback - A function invoked on every change to the shared scripts map.
   */
  onSharedScriptsChanged(callback: () => void): void {
    this.sharedScripts.observe(callback);
  }

  /**
   * Returns the raw Yjs map backing shared scripts.
   */
  getSharedScriptsMap(): Y.Map<string> {
    return this.sharedScripts;
  }
}
