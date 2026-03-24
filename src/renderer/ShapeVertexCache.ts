import { generateShapeVertices } from "./ShapeMesh";
import type { ShapeVertexData } from "./ShapeMesh";
import type { Shape } from "../model/Shape";

interface ShapeCacheEntry {
  data: ShapeVertexData;
  key: string;
}

function shapePropsKey(shape: Shape): string {
  return `${shape.type}:${shape.x}:${shape.y}:${shape.width}:${shape.height}:${shape.rotation}:${shape.strokeColor}:${shape.strokeWidth}:${shape.fillColor}:${shape.opacity}:${shape.sides}:${shape.starInnerRadius}`;
}

/**
 * Caches generated vertex data (outline + fill) per shape.
 * Since shapes are parameterized geometry (not point arrays), there is no
 * LOD bracketing — vertex data is regenerated only when the shape changes.
 */
export class ShapeVertexCache {
  private cache = new Map<string, ShapeCacheEntry>();

  /**
   * Get or generate vertex data for a shape.
   * Returns cached data if the shape properties haven't changed.
   */
  get(shape: Shape): ShapeVertexData {
    const key = shapePropsKey(shape);
    const existing = this.cache.get(shape.id);
    if (existing && existing.key === key) return existing.data;

    const data = generateShapeVertices(shape);
    this.cache.set(shape.id, { data, key });
    return data;
  }

  /** Remove a shape from the cache. */
  invalidate(shapeId: string): void {
    this.cache.delete(shapeId);
  }

  /** Clear the entire cache (e.g., when shapes are added/removed). */
  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
