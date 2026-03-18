import { generateTriangleStrip } from "./StrokeMesh";
import type { StrokePoint } from "./StrokeRenderer";

interface CacheEntry {
  data: Float32Array;
  lodBracket: number;
}

/**
 * Caches generated triangle strip vertex data per stroke,
 * keyed by stroke ID and LOD bracket.
 * Avoids re-generating geometry every frame for unchanged strokes.
 */
export class StrokeVertexCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get or generate vertex data for a stroke.
   * Returns cached data if the LOD bracket hasn't changed.
   */
  get(
    strokeId: string,
    points: readonly StrokePoint[],
    color: [number, number, number, number],
    width: number,
    zoom: number,
  ): Float32Array | null {
    const bracket = this.getLODBracket(zoom);
    const entry = this.cache.get(strokeId);

    if (entry && entry.lodBracket === bracket) {
      return entry.data;
    }

    const data = generateTriangleStrip(points, width, color);
    if (!data) return null;

    this.cache.set(strokeId, { data, lodBracket: bracket });
    return data;
  }

  /** Remove a stroke from the cache. */
  invalidate(strokeId: string): void {
    this.cache.delete(strokeId);
  }

  /** Clear the entire cache (e.g., when strokes are added/removed). */
  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  /** Match the LOD bracket logic from StrokeLOD.ts */
  private getLODBracket(zoom: number): number {
    if (zoom <= 0.05) return 0;
    if (zoom <= 0.15) return 1;
    if (zoom <= 0.4) return 2;
    if (zoom <= 1.0) return 3;
    return 4;
  }
}
