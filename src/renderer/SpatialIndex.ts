import { Stroke } from "../model/Stroke";
import { Shape, CanvasItem } from "../model/Shape";
import type { CanvasImage } from "../model/Image";

/**
 * Axis-aligned bounding box used for spatial queries and viewport culling.
 *
 * Represents a rectangular region in world-space defined by its minimum and
 * maximum coordinates. Used by {@link SpatialIndex} to determine which strokes
 * and shapes are visible within a given viewport, and by functions like
 * {@link computeStrokeBounds} to compute the spatial extent of drawable items.
 *
 * @property minX - Left edge of the bounding box (world-space X coordinate)
 * @property minY - Top edge of the bounding box (world-space Y coordinate)
 * @property maxX - Right edge of the bounding box (world-space X coordinate)
 * @property maxY - Bottom edge of the bounding box (world-space Y coordinate)
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes the axis-aligned bounding box of a stroke, accounting for stroke width.
 *
 * Iterates over all points in the stroke to find the spatial extent, then
 * expands the bounds by half the stroke width in each direction to ensure
 * the full rendered area is enclosed.
 *
 * @param stroke - The stroke whose bounding box to compute. Must contain
 *   at least one point for meaningful results; an empty points array yields
 *   an inverted (infinite) AABB.
 * @returns An {@link AABB} that fully encloses the stroke's rendered area,
 *   including its width.
 */
export function computeStrokeBounds(stroke: Stroke): AABB {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of stroke.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const halfWidth = stroke.width / 2;
  return {
    minX: minX - halfWidth,
    minY: minY - halfWidth,
    maxX: maxX + halfWidth,
    maxY: maxY + halfWidth,
  };
}

/**
 * Computes the axis-aligned bounding box (AABB) of a shape, accounting for
 * rotation and stroke width.
 *
 * For unrotated shapes the bounds are computed directly from the shape's
 * center, dimensions, and stroke width. For rotated shapes the four corners
 * of the bounding rectangle are projected through the rotation and the
 * enclosing axis-aligned box is returned instead.
 *
 * @param shape - The shape whose bounding box should be computed. Uses `x`,
 *   `y` (center), `width`, `height`, `strokeWidth`, and `rotation` (radians).
 * @returns An {@link AABB} that fully encloses the shape, including its
 *   stroke outline.
 */
export function computeShapeBounds(shape: Shape): AABB {
  const hw = shape.width / 2;
  const hh = shape.height / 2;
  const halfStroke = shape.strokeWidth / 2;

  if (shape.rotation === 0) {
    return {
      minX: shape.x - hw - halfStroke,
      minY: shape.y - hh - halfStroke,
      maxX: shape.x + hw + halfStroke,
      maxY: shape.y + hh + halfStroke,
    };
  }

  // For rotated shapes, compute the AABB of the rotated rectangle corners
  const cos = Math.abs(Math.cos(shape.rotation));
  const sin = Math.abs(Math.sin(shape.rotation));
  const rotatedHalfW = hw * cos + hh * sin;
  const rotatedHalfH = hw * sin + hh * cos;

  return {
    minX: shape.x - rotatedHalfW - halfStroke,
    minY: shape.y - rotatedHalfH - halfStroke,
    maxX: shape.x + rotatedHalfW + halfStroke,
    maxY: shape.y + rotatedHalfH + halfStroke,
  };
}

/**
 * Computes the axis-aligned bounding box (AABB) of an image, accounting for
 * rotation around its center point.
 */
export function computeImageBounds(image: CanvasImage): AABB {
  const hw = image.width / 2;
  const hh = image.height / 2;

  if (image.rotation === 0) {
    return {
      minX: image.x - hw,
      minY: image.y - hh,
      maxX: image.x + hw,
      maxY: image.y + hh,
    };
  }

  const cos = Math.abs(Math.cos(image.rotation));
  const sin = Math.abs(Math.sin(image.rotation));
  const rotatedHalfW = hw * cos + hh * sin;
  const rotatedHalfH = hw * sin + hh * cos;

  return {
    minX: image.x - rotatedHalfW,
    minY: image.y - rotatedHalfH,
    maxX: image.x + rotatedHalfW,
    maxY: image.y + rotatedHalfH,
  };
}

interface CellEntry {
  stroke: Stroke;
  bounds: AABB;
}

interface ShapeCellEntry {
  shape: Shape;
  bounds: AABB;
}

interface ImageCellEntry {
  image: CanvasImage;
  bounds: AABB;
}

/**
 * Grid-based spatial index for efficient viewport culling of strokes, shapes, and images.
 * Divides world space into fixed-size cells and maps items to all cells
 * their bounding boxes overlap.
 */
export class SpatialIndex {
  private cellSize: number;
  private cells = new Map<string, CellEntry[]>();
  private strokeBounds = new Map<string, AABB>();
  private strokeMap = new Map<string, Stroke>();

  private shapeCells = new Map<string, ShapeCellEntry[]>();
  private shapeBoundsMap = new Map<string, AABB>();
  private shapeMap = new Map<string, Shape>();

  private imageCells = new Map<string, ImageCellEntry[]>();
  private imageBoundsMap = new Map<string, AABB>();
  private imageMap = new Map<string, CanvasImage>();

  constructor(cellSize = 500) {
    this.cellSize = cellSize;
  }

  private cellKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private getCellRange(bounds: AABB): { x0: number; y0: number; x1: number; y1: number } {
    return {
      x0: Math.floor(bounds.minX / this.cellSize),
      y0: Math.floor(bounds.minY / this.cellSize),
      x1: Math.floor(bounds.maxX / this.cellSize),
      y1: Math.floor(bounds.maxY / this.cellSize),
    };
  }

  /**
   * Adds a stroke to the spatial index for viewport culling queries.
   *
   * Computes the stroke's axis-aligned bounding box via {@link computeStrokeBounds},
   * then maps the stroke into every grid cell that its bounding box overlaps.
   * If the stroke already exists in the index (same `stroke.id`), a duplicate
   * entry will be created — call {@link remove} first to update an existing stroke.
   *
   * @param stroke - The stroke to index. Uses `stroke.id` as the unique key,
   *   `stroke.points` for spatial extent, and `stroke.width` for bounds expansion.
   */
  add(stroke: Stroke): void {
    const bounds = computeStrokeBounds(stroke);
    this.strokeBounds.set(stroke.id, bounds);
    this.strokeMap.set(stroke.id, stroke);

    const range = this.getCellRange(bounds);
    const entry: CellEntry = { stroke, bounds };
    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const key = this.cellKey(cx, cy);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(entry);
      }
    }
  }

  /**
   * Adds a shape to the spatial index for viewport culling queries.
   *
   * Computes the shape's axis-aligned bounding box via {@link computeShapeBounds},
   * then maps the shape into every grid cell that its bounding box overlaps.
   * If the shape already exists in the index (same `shape.id`), a duplicate
   * entry will be created — call {@link removeShape} first to update an existing shape.
   *
   * @param shape - The shape to index. Uses `shape.id` as the unique key,
   *   and the shape's center, dimensions, rotation, and stroke width for bounds
   *   computation.
   */
  addShape(shape: Shape): void {
    const bounds = computeShapeBounds(shape);
    this.shapeBoundsMap.set(shape.id, bounds);
    this.shapeMap.set(shape.id, shape);

    const range = this.getCellRange(bounds);
    const entry: ShapeCellEntry = { shape, bounds };
    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const key = this.cellKey(cx, cy);
        let cell = this.shapeCells.get(key);
        if (!cell) {
          cell = [];
          this.shapeCells.set(key, cell);
        }
        cell.push(entry);
      }
    }
  }

  /**
   * Adds an image to the spatial index for viewport culling queries.
   */
  addImage(image: CanvasImage): void {
    const bounds = computeImageBounds(image);
    this.imageBoundsMap.set(image.id, bounds);
    this.imageMap.set(image.id, image);

    const range = this.getCellRange(bounds);
    const entry: ImageCellEntry = { image, bounds };
    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const key = this.cellKey(cx, cy);
        let cell = this.imageCells.get(key);
        if (!cell) {
          cell = [];
          this.imageCells.set(key, cell);
        }
        cell.push(entry);
      }
    }
  }

  /**
   * Removes a stroke from the spatial index by its unique identifier.
   *
   * Looks up the stroke's previously computed bounding box, iterates over
   * all grid cells that the bounding box overlaps, and filters the stroke
   * out of each cell's entry list. Empty cells are deleted to free memory.
   * If the stroke ID is not found in the index, this method is a no-op.
   *
   * @param strokeId - The unique identifier of the stroke to remove
   *   (matches `stroke.id` passed to {@link add}).
   */
  remove(strokeId: string): void {
    const bounds = this.strokeBounds.get(strokeId);
    if (!bounds) return;

    const range = this.getCellRange(bounds);
    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const key = this.cellKey(cx, cy);
        const cell = this.cells.get(key);
        if (cell) {
          const filtered = cell.filter((e) => e.stroke.id !== strokeId);
          if (filtered.length === 0) {
            this.cells.delete(key);
          } else {
            this.cells.set(key, filtered);
          }
        }
      }
    }
    this.strokeBounds.delete(strokeId);
    this.strokeMap.delete(strokeId);
  }

  /**
   * Removes a shape from the spatial index by its unique identifier.
   *
   * Looks up the shape's previously computed bounding box, iterates over
   * all grid cells that the bounding box overlaps, and filters the shape
   * out of each cell's entry list. Empty cells are deleted to free memory.
   * If the shape ID is not found in the index, this method is a no-op.
   *
   * @param shapeId - The unique identifier of the shape to remove
   *   (matches `shape.id` passed to {@link addShape}).
   */
  removeShape(shapeId: string): void {
    const bounds = this.shapeBoundsMap.get(shapeId);
    if (!bounds) return;

    const range = this.getCellRange(bounds);
    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const key = this.cellKey(cx, cy);
        const cell = this.shapeCells.get(key);
        if (cell) {
          const filtered = cell.filter((e) => e.shape.id !== shapeId);
          if (filtered.length === 0) {
            this.shapeCells.delete(key);
          } else {
            this.shapeCells.set(key, filtered);
          }
        }
      }
    }
    this.shapeBoundsMap.delete(shapeId);
    this.shapeMap.delete(shapeId);
  }

  /**
   * Removes an image from the spatial index by its unique identifier.
   */
  removeImage(imageId: string): void {
    const bounds = this.imageBoundsMap.get(imageId);
    if (!bounds) return;

    const range = this.getCellRange(bounds);
    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const key = this.cellKey(cx, cy);
        const cell = this.imageCells.get(key);
        if (cell) {
          const filtered = cell.filter((e) => e.image.id !== imageId);
          if (filtered.length === 0) {
            this.imageCells.delete(key);
          } else {
            this.imageCells.set(key, filtered);
          }
        }
      }
    }
    this.imageBoundsMap.delete(imageId);
    this.imageMap.delete(imageId);
  }

  /**
   * Removes all strokes, shapes, and images from the spatial index.
   *
   * Clears every internal data structure — grid cells, bounding-box caches,
   * and item lookup maps — for strokes, shapes, and images. After calling this
   * method, {@link size}, {@link shapeSize}, and {@link imageSize} will return `0`
   * and all subsequent {@link query}, {@link queryShapes}, and {@link queryImages}
   * calls will return empty arrays until new items are added.
   *
   * This is called internally by {@link rebuild} and {@link rebuildAll}
   * before re-populating the index.
   */
  clear(): void {
    this.cells.clear();
    this.strokeBounds.clear();
    this.strokeMap.clear();
    this.shapeCells.clear();
    this.shapeBoundsMap.clear();
    this.shapeMap.clear();
    this.imageCells.clear();
    this.imageBoundsMap.clear();
    this.imageMap.clear();
  }

  /**
   * Rebuilds the entire spatial index from a complete set of strokes.
   *
   * Clears all existing index data (strokes, shapes, and grid cells) via
   * {@link clear}, then re-inserts every stroke. Use this when the stroke
   * collection has changed in a way that makes incremental updates impractical
   * (e.g., after a bulk undo/redo or document reload).
   *
   * For rebuilding with both strokes and shapes, use {@link rebuildAll} instead.
   *
   * @param strokes - The full array of strokes to index. Each stroke's bounding
   *   box is computed and mapped to the appropriate grid cells.
   */
  rebuild(strokes: Stroke[]): void {
    this.clear();
    for (const stroke of strokes) {
      this.add(stroke);
    }
  }

  /**
   * Clears all existing index data and re-indexes strokes, shapes, and images
   * from scratch. This is the combined equivalent of calling {@link rebuild}
   * for strokes followed by re-adding shapes and images, but performed in a single
   * pass after one {@link clear} call.
   *
   * Use this after bulk operations that invalidate both stroke and shape
   * spatial data simultaneously (e.g., full document reload, collaborative
   * sync merge, or undo/redo of mixed stroke-and-shape operations).
   *
   * @param strokes - The complete array of strokes to index. Each stroke's
   *   bounding box is computed via {@link computeStrokeBounds} and mapped to
   *   the appropriate grid cells.
   * @param shapes - The complete array of shapes to index. Each shape is
   *   inserted via {@link addShape}.
   * @param images - The complete array of images to index. Each image is
   *   inserted via {@link addImage}.
   */
  rebuildAll(strokes: Stroke[], shapes: Shape[], images: CanvasImage[] = []): void {
    this.clear();
    for (const stroke of strokes) {
      this.add(stroke);
    }
    for (const shape of shapes) {
      this.addShape(shape);
    }
    for (const image of images) {
      this.addImage(image);
    }
  }

  /**
   * Queries the spatial index for all strokes whose bounding boxes intersect
   * the given viewport rectangle. Strokes that span multiple grid cells are
   * deduplicated so each stroke appears at most once in the result.
   *
   * The returned array is sorted by document order (ascending timestamp)
   * so that newer strokes render on top of older ones.
   *
   * @param viewport - The axis-aligned bounding box defining the visible area to query.
   * @returns A deduplicated array of {@link Stroke} objects intersecting the viewport,
   *          sorted by timestamp in ascending order. Returns an empty array when no
   *          strokes fall within the viewport.
   */
  query(viewport: AABB): Stroke[] {
    const range = this.getCellRange(viewport);
    const seen = new Set<string>();
    const result: Stroke[] = [];

    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const cell = this.cells.get(this.cellKey(cx, cy));
        if (!cell) continue;
        for (const entry of cell) {
          if (seen.has(entry.stroke.id)) continue;
          seen.add(entry.stroke.id);
          // AABB intersection test
          if (
            entry.bounds.maxX >= viewport.minX &&
            entry.bounds.minX <= viewport.maxX &&
            entry.bounds.maxY >= viewport.minY &&
            entry.bounds.minY <= viewport.maxY
          ) {
            result.push(entry.stroke);
          }
        }
      }
    }

    // Sort by document order so newer strokes render on top of older ones
    result.sort((a, b) => a.timestamp - b.timestamp);
    return result;
  }

  /**
   * Queries the spatial index for all shapes whose bounding boxes intersect
   * the given viewport rectangle. Shapes that span multiple grid cells are
   * deduplicated so each shape appears at most once in the result.
   *
   * The returned array is sorted by document order (ascending timestamp)
   * so that newer shapes render on top of older ones.
   *
   * @param viewport - The axis-aligned bounding box defining the visible area to query.
   * @returns A deduplicated array of {@link Shape} objects intersecting the viewport,
   *          sorted by timestamp in ascending order. Returns an empty array when no
   *          shapes fall within the viewport.
   */
  queryShapes(viewport: AABB): Shape[] {
    const range = this.getCellRange(viewport);
    const seen = new Set<string>();
    const result: Shape[] = [];

    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const cell = this.shapeCells.get(this.cellKey(cx, cy));
        if (!cell) continue;
        for (const entry of cell) {
          if (seen.has(entry.shape.id)) continue;
          seen.add(entry.shape.id);
          if (
            entry.bounds.maxX >= viewport.minX &&
            entry.bounds.minX <= viewport.maxX &&
            entry.bounds.maxY >= viewport.minY &&
            entry.bounds.minY <= viewport.maxY
          ) {
            result.push(entry.shape);
          }
        }
      }
    }

    result.sort((a, b) => a.timestamp - b.timestamp);
    return result;
  }

  /**
   * Queries the spatial index for all images whose bounding boxes intersect
   * the given viewport rectangle. Images that span multiple grid cells are
   * deduplicated so each image appears at most once in the result.
   */
  queryImages(viewport: AABB): CanvasImage[] {
    const range = this.getCellRange(viewport);
    const seen = new Set<string>();
    const result: CanvasImage[] = [];

    for (let cx = range.x0; cx <= range.x1; cx++) {
      for (let cy = range.y0; cy <= range.y1; cy++) {
        const cell = this.imageCells.get(this.cellKey(cx, cy));
        if (!cell) continue;
        for (const entry of cell) {
          if (seen.has(entry.image.id)) continue;
          seen.add(entry.image.id);
          if (
            entry.bounds.maxX >= viewport.minX &&
            entry.bounds.minX <= viewport.maxX &&
            entry.bounds.maxY >= viewport.minY &&
            entry.bounds.minY <= viewport.maxY
          ) {
            result.push(entry.image);
          }
        }
      }
    }

    result.sort((a, b) => a.timestamp - b.timestamp);
    return result;
  }

  /**
   * Queries the spatial index for all strokes, shapes, and images whose bounding boxes
   * intersect the given viewport, returning them as a unified array sorted by
   * timestamp. This enables interleaved rendering in correct document order.
   */
  queryAll(viewport: AABB): CanvasItem[] {
    const strokes = this.query(viewport);
    const shapes = this.queryShapes(viewport);
    const images = this.queryImages(viewport);

    return [
      ...strokes.map((item) => ({ kind: "stroke" as const, item })),
      ...shapes.map((item) => ({ kind: "shape" as const, item })),
      ...images.map((item) => ({ kind: "image" as const, item })),
    ].sort((a, b) => a.item.timestamp - b.item.timestamp);
  }

  /** Returns the number of indexed strokes. */
  get size(): number {
    return this.strokeMap.size;
  }

  /** Returns the number of indexed shapes. */
  get shapeSize(): number {
    return this.shapeMap.size;
  }

  /** Returns the number of indexed images. */
  get imageSize(): number {
    return this.imageMap.size;
  }

  /** Check if a stroke is in the index. */
  has(strokeId: string): boolean {
    return this.strokeMap.has(strokeId);
  }

  /** Check if a shape is in the index. */
  hasShape(shapeId: string): boolean {
    return this.shapeMap.has(shapeId);
  }

  /** Check if an image is in the index. */
  hasImage(imageId: string): boolean {
    return this.imageMap.has(imageId);
  }
}
