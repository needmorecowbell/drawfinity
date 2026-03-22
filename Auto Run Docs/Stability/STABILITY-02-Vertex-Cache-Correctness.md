# Stability 02: Vertex Cache Correctness

Fix the vertex cache to correctly invalidate when rendering parameters change, preventing stale geometry from being drawn.

## Problems

**Cache key doesn't include width or color.** `StrokeVertexCache.get()` caches by `strokeId + lodBracket` only. The `width` and `color` parameters are used to generate the vertex data but are not part of the cache key. If a stroke is rendered with different effective parameters (e.g., due to a future stroke-editing feature, or if color/width change at render time), the cache returns stale geometry.

**This is currently low-impact** because strokes don't change their properties after creation. But it will become a real bug when:
- Stroke selection/editing is added (changing stroke color or width)
- Any rendering-time width adjustment is reintroduced (like the removed `minWorldWidth`)

## Tasks

- [ ] Add width and color to the vertex cache key:
  - Update `CacheEntry` to store the `width` and `color` that were used to generate the data
  - In `StrokeVertexCache.get()`, compare cached width and color against the incoming parameters
  - If they differ, regenerate the vertex data even if the LOD bracket matches
  - Consider: use a composite key string like `${strokeId}:${bracket}:${width}:${colorHash}` or store the values in the entry for comparison

- [ ] Do the same for `ShapeVertexCache`:
  - Verify that shape vertex data is correctly invalidated when shape properties change
  - Shape properties (color, strokeWidth, fillColor) should be part of the cache validation

- [ ] Tests:
  - Test: render a stroke, change its width, verify cache miss and new geometry
  - Test: render a stroke, change its color, verify cache miss and new geometry
  - Test: render with same parameters twice, verify cache hit (no regeneration)
