# Stability 01: Undo & Transaction Integrity

Fix undo granularity issues and ensure all CRDT operations produce correct, user-expected undo behavior.

## Problems

**Eraser undo is too granular.** Each `removeStroke`/`replaceStroke` call during a single erase gesture is its own Yjs transaction (because `captureTimeout: 0`). Dragging the eraser across 5 strokes creates 5 undo steps. The user expects a single undo to reverse the entire erase gesture.

**Shape preview flickers at high zoom.** `ShapeCapture.computeShape()` divides `strokeWidth` by `camera.zoom` on every call, including for the live preview. If zoom changes mid-drag, the outline width jitters. Should capture zoom at `pointerdown` like `StrokeCapture` does.

## Tasks

- [ ] Batch eraser transactions into a single undo step:
  - Wrap the entire erase gesture (pointerdown → pointerup) in a single Yjs transaction
  - In `StrokeCapture.ts`, add `beginEraseGesture()` / `endEraseGesture()` that call `doc.transact()` around the full gesture
  - Each individual `removeStroke`/`replaceStroke` within the gesture should NOT create its own transaction — they should all be sub-operations of the outer transaction
  - Verify: erase 5 strokes in one drag, undo once, all 5 strokes reappear
  - Verify: erase across strokes and shapes in one gesture, undo restores all

- [ ] Fix shape preview zoom jitter:
  - Capture `camera.zoom` at `pointerdown` in `ShapeCapture` (like `StrokeCapture.activeStrokeWorldWidth`)
  - Use the captured zoom for `strokeWidth / zoom` in both `computeShape()` and `getPreviewShape()`
  - Verify: start drawing a shape, zoom mid-drag, outline width stays consistent

- [ ] Audit all Yjs transactions for atomicity:
  - Review every `doc.transact()` call in `DrawfinityDoc.ts`
  - Ensure that logically grouped operations (e.g., `replaceStroke` = delete + insert) are atomic
  - Document any remaining non-atomic operations as known limitations

- [ ] Tests:
  - Test: erase 3 strokes in one gesture, undo once → all 3 restored
  - Test: erase mix of strokes and shapes, undo once → all restored
  - Test: shape preview width stays constant during zoom change mid-drag
