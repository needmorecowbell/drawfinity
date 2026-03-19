import { Stroke } from "../model/Stroke";
import { Shape } from "../model/Shape";

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes the axis-aligned bounding box of a stroke, accounting for stroke width.
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
 * Computes the axis-aligned bounding box of a shape, accounting for rotation and stroke width.
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

  /** Add a stroke to the index. */
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

  /** Add a shape to the index. */
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
