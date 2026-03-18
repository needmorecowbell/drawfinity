import { generateShapeVertices } from "./ShapeMesh";
import type { ShapeVertexData } from "./ShapeMesh";
import type { Shape } from "../model/Shape";

/**
 * Caches generated vertex data (outline + fill) per shape.
 * Since shapes are parameterized geometry (not point arrays), there is no
 * LOD bracketing — vertex data is regenerated only when the shape changes.
 */
export class ShapeVertexCache {
  private cache = new Map<string, ShapeVertexData>();

  /**
   * Get or generate vertex data for a shape.
   * Returns cached data if available.
   */
  get(shape: Shape): ShapeVertexData {
    const existing = this.cache.get(shape.id);
    if (existing) return existing;

    const data = generateShapeVertices(shape);
    this.cache.set(shape.id, data);
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
