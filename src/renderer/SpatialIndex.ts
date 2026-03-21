import { Stroke } from "../model/Stroke";
import { Shape } from "../model/Shape";

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

interface CellEntry {
  stroke: Stroke;
  bounds: AABB;
}

interface ShapeCellEntry {
  shape: Shape;
  bounds: AABB;
}

/**
 * Grid-based spatial index for efficient viewport culling of strokes and shapes.
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

  /** Remove a stroke from the index by ID. */
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

  /** Remove a shape from the index by ID. */
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

  /** Clear all entries. */
  clear(): void {
    this.cells.clear();
    this.strokeBounds.clear();
    this.strokeMap.clear();
    this.shapeCells.clear();
    this.shapeBoundsMap.clear();
    this.shapeMap.clear();
  }

  /** Rebuild the index from a full set of strokes. */
  rebuild(strokes: Stroke[]): void {
    this.clear();
    for (const stroke of strokes) {
      this.add(stroke);
    }
  }

  /** Rebuild the index from strokes and shapes. */
  rebuildAll(strokes: Stroke[], shapes: Shape[]): void {
    this.clear();
    for (const stroke of strokes) {
      this.add(stroke);
    }
    for (const shape of shapes) {
      this.addShape(shape);
    }
  }

  /**
   * Query all strokes whose bounding boxes intersect the given viewport AABB.
   * Returns a deduplicated array of strokes sorted by document order (timestamp).
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
   * Query all shapes whose bounding boxes intersect the given viewport AABB.
   * Returns a deduplicated array of shapes.
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

  /** Returns the number of indexed strokes. */
  get size(): number {
    return this.strokeMap.size;
  }

  /** Returns the number of indexed shapes. */
  get shapeSize(): number {
    return this.shapeMap.size;
  }

  /** Check if a stroke is in the index. */
  has(strokeId: string): boolean {
    return this.strokeMap.has(strokeId);
  }

  /** Check if a shape is in the index. */
  hasShape(shapeId: string): boolean {
    return this.shapeMap.has(shapeId);
  }
}
