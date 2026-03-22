# Stability 03: Rendering Edge Cases

Fix rendering inconsistencies and edge cases in the WebGL pipeline that affect visual correctness.

## Problems

**Shapes render in a separate pass from strokes.** The render loop draws all shapes first, then all strokes. This means a shape drawn AFTER a stroke still renders behind it. The correct behavior is interleaved draw order based on timestamp — the same ordering the spatial index now provides, but not used for cross-type rendering.

**Stroke smoothing can produce single-point strokes.** The `smoothStroke()` moving-average filter can collapse very short strokes (2-3 points that are very close together) into effectively a single point, producing a degenerate triangle strip. These render as nothing or a tiny artifact.

**Eraser effective radius doesn't account for screen-space stroke width.** The eraser uses `radius + stroke.width / 2` as its effective radius. But since strokes now use screen-space width (divided by zoom at capture time), the stored `stroke.width` is in world-space and may be very small at high zoom. The eraser may feel too sensitive or too insensitive depending on zoom level.

## Tasks

- [ ] Interleave stroke and shape rendering by document order:
  - Instead of separate shape-first then stroke-second passes, render all items in timestamp order
  - Use `DrawfinityDoc.getAllItems()` which returns `CanvasItem[]` in document order
  - For each item, generate and draw vertex data inline (fill for shapes, triangle strip for strokes)
  - This ensures a shape drawn after a stroke renders on top of it, matching user expectations
  - Performance consideration: this means more draw mode switches (TRIANGLES ↔ TRIANGLE_STRIP). Profile to ensure no regression. If needed, batch consecutive same-type items.

- [ ] Handle degenerate short strokes:
  - In `generateTriangleStrip()`, if after deduplication there are fewer than 2 points, return null (already handled)
  - In `StrokeCapture.handlePointerUp()`, add a minimum distance check: if the total stroke length (sum of segment distances) is less than `0.5 / zoom` (sub-pixel), treat it as a dot
  - For dots: generate a small circle/quad at the stroke position (2-triangle quad centered on the point)
  - Or: simply don't finalize strokes shorter than 1 screen pixel

- [ ] Adjust eraser radius for zoom-aware stroke widths:
  - The eraser radius is currently a fixed world-space value (default 10 units)
  - With screen-space stroke widths, the eraser should also scale: `effectiveRadius = this.config.radius / zoom`
  - This makes the eraser feel consistent regardless of zoom level — erasing at 100x zoom uses a proportionally smaller world-space radius
  - Update `StrokeCapture.eraseAt()` to pass the current zoom to the eraser
  - Update `EraserTool` or the calling code to apply zoom scaling

- [ ] Tests:
  - Test: shape drawn after stroke renders on top (verify draw order matches timestamps)
  - Test: very short stroke (< 1px) is handled gracefully (either rendered as dot or not finalized)
  - Test: eraser radius scales correctly with zoom level
