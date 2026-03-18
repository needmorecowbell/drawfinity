# Phase 05: Rendering Polish, Performance, and Cross-Platform Verification

Optimize the WebGL rendering pipeline for smooth performance at any zoom level, add visual polish (cursor indicators, grid/dot background for spatial reference), and verify the app works correctly on Windows and macOS in addition to the primary Linux development machine. This phase takes Drawfinity from "working prototype" to "app that feels good to use."

## Tasks

- [x] Implement spatial indexing for efficient rendering at scale:
  - Create `src/renderer/SpatialIndex.ts` — a simple grid-based spatial index (or quadtree) that maps strokes to spatial buckets based on their bounding boxes
  - On each frame, query the spatial index with the camera's visible viewport to get only the strokes that are on screen
  - Skip rendering strokes that are entirely outside the viewport
  - Update the index when strokes are added or removed (hook into `DrawfinityDoc.onStrokesChanged`)
  - This is critical for performance when canvases grow to thousands of strokes — without it, every frame renders everything

- [x] Add level-of-detail (LOD) rendering for deep zoom:
  - When zoomed far out (many strokes visible but tiny), reduce point density for distant strokes — simplify polylines using Douglas-Peucker or similar algorithm based on current zoom level
  - When zoomed far in, render at full detail
  - Create `src/renderer/StrokeLOD.ts` — given a stroke and a zoom level, returns a simplified point array
  - Cache LOD results per stroke per zoom bracket (e.g., 4 LOD levels) to avoid re-computing every frame
  - Verify: zoom way out with many strokes → frame rate should stay smooth

- [x] Add visual canvas enhancements:
  - Dot grid background that scales with zoom — small dots at regular world-space intervals, giving spatial reference without being distracting. Render as a separate WebGL draw call (instanced points or a tiled texture)
  - Custom cursor that reflects the active tool and brush size:
    - Brush: circle outline matching current brush width (scaled by zoom)
    - Eraser: larger circle outline
    - Pan mode (middle mouse held): grab cursor via CSS
  - Smooth animated zoom (lerp toward target zoom over a few frames instead of instant snap)
  - Add a minimap or viewport indicator in the corner showing where you are relative to all content (optional — implement if time allows)

- [ ] Profile and optimize rendering performance:
  - Add a simple FPS counter to the HUD (toggled with a debug key, e.g., F3)
  - Create a stress test: programmatically generate 1000+ random strokes spread across a large area
  - Profile with browser dev tools (or Tauri's webview inspector):
    - Identify any frame drops during pan/zoom
    - Check GPU memory usage
    - Look for unnecessary re-renders or GC pauses
  - Optimizations to apply as needed:
    - Batch strokes into fewer draw calls (combine vertex buffers)
    - Use WebGL2 instanced rendering for the dot grid
    - Avoid re-uploading unchanged vertex data every frame (cache GPU buffers per stroke)
  - Target: 60fps with 1000 strokes visible at once

- [ ] Cross-platform build and verification:
  - Update `tauri.conf.json` with proper app metadata (name, version, window title, default window size)
  - Build for the current platform: `npm run tauri build`
  - Document any platform-specific issues encountered during build
  - Create `docs/cross-platform-notes.md` with front matter:
    - type: reference, tags: [build, cross-platform, compatibility]
    - Document: build commands per platform, known issues, Wacom/tablet input notes
  - Test checklist to verify on each platform:
    - App launches and displays canvas
    - Drawing with mouse works
    - Pan and zoom work
    - Strokes persist across app restart
    - Toolbar and keyboard shortcuts function
    - WebSocket collaboration connects and syncs (if server is running)
  - Fix any platform-specific issues found

- [ ] Final integration test and commit:
  - Run the full test suite
  - Perform a manual end-to-end walkthrough: launch app → draw with multiple brush types → change colors → erase → undo/redo → zoom in deep → zoom out far → save → reload → connect to server → draw collaboratively
  - Verify performance is acceptable (no obvious jank during normal use)
  - Commit all changes with a descriptive message
