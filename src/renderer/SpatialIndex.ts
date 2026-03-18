import { Stroke, StrokePoint } from "../model/Stroke";

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

interface CellEntry {
  stroke: Stroke;
  bounds: AABB;
}

/**
 * Grid-based spatial index for efficient viewport culling of strokes.
 * Divides world space into fixed-size cells and maps strokes to all cells
 * their bounding boxes overlap.
 */
export class SpatialIndex {
  private cellSize: number;
  private cells = new Map<string, CellEntry[]>();
  private strokeBounds = new Map<string, AABB>();
  private strokeMap = new Map<string, Stroke>();

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

  /** Clear all entries. */
  clear(): void {
    this.cells.clear();
    this.strokeBounds.clear();
    this.strokeMap.clear();
  }

  /** Rebuild the index from a full set of strokes. */
  rebuild(strokes: Stroke[]): void {
    this.clear();
    for (const stroke of strokes) {
      this.add(stroke);
    }
  }

  /**
   * Query all strokes whose bounding boxes intersect the given viewport AABB.
   * Returns a deduplicated array of strokes.
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

    return result;
  }

  /** Returns the number of indexed strokes. */
  get size(): number {
    return this.strokeMap.size;
  }

  /** Check if a stroke is in the index. */
  has(strokeId: string): boolean {
    return this.strokeMap.has(strokeId);
  }
}
