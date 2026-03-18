import { Renderer } from "./renderer";
import { SpatialIndex } from "./renderer/SpatialIndex";
import { getStrokeLOD, clearLODCache } from "./renderer/StrokeLOD";
import { Camera, CameraAnimator, CameraController } from "./camera";
import { DrawfinityDoc, UndoManager } from "./crdt";
import { StrokeCapture, ShapeCapture } from "./input";
import { ToolManager, BRUSH_PRESETS, isShapeTool } from "./tools";
import type { ToolType } from "./tools";
import { Toolbar, ConnectionPanel } from "./ui";
import { CursorManager } from "./ui/CursorManager";
import { FpsCounter } from "./ui/FpsCounter";
import { SyncManager } from "./sync";

const canvas = document.getElementById("drawfinity-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

const renderer = new Renderer(canvas);
const camera = new Camera();
const cameraAnimator = new CameraAnimator(camera);
const cameraController = new CameraController(camera, canvas, cameraAnimator);

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b, 1.0];
}

// Surface unhandled promise rejections (WebKitGTK swallows them silently)
window.addEventListener("unhandledrejection", (e) => {
  console.error("Drawfinity: unhandled rejection:", e.reason);
});

(async () => {
  console.log("Drawfinity: async init starting");
  // Load persisted document if it exists, otherwise start fresh.
  // Persistence imports are dynamic so the app works outside Tauri (browser dev mode).
  let doc: DrawfinityDoc;
  let autoSave: { start(): void; stop(): void; saveNow(): void };

  try {
    const { loadDocument, getDefaultFilePath, AutoSave } = await import("./persistence");
    const savePath = await getDefaultFilePath();
    const loadedDoc = await loadDocument(savePath);
    doc = new DrawfinityDoc(loadedDoc ?? undefined);
    autoSave = new AutoSave(doc.getDoc(), savePath);
    autoSave.start();
    if (loadedDoc) {
      console.log("Drawfinity: loaded saved document from", savePath);
    }
  } catch (err) {
    console.warn("Drawfinity: persistence unavailable, running without auto-save", err);
    doc = new DrawfinityDoc();
    autoSave = { start() {}, stop() {}, saveNow() {} };
  }

  const spatialIndex = new SpatialIndex();
  // Build initial index from any persisted strokes
  spatialIndex.rebuild(doc.getStrokes());
  // Keep index in sync when strokes change (add/remove/undo/redo/remote sync)
  doc.onStrokesChanged(() => {
    spatialIndex.rebuild(doc.getStrokes());
    clearLODCache(); // Invalidate LOD cache when stroke set changes
    renderer.vertexCache.clear(); // Invalidate vertex cache when strokes change
  });

  const syncManager = new SyncManager(doc.getDoc());
  const toolManager = new ToolManager();
  const strokeCapture = new StrokeCapture(camera, cameraController, doc, canvas);
  strokeCapture.setBrushConfig(toolManager.getBrush());
  const shapeCapture = new ShapeCapture(camera, cameraController, doc, canvas);
  shapeCapture.setEnabled(false);
  const undoManager = new UndoManager(doc.getStrokesArray());

  // FPS counter (toggled with F3)
  const fpsCounter = new FpsCounter();

  // Set initial viewport size
  camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);

  // Update camera viewport on resize
  const resizeObserver = new ResizeObserver(() => {
    camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);
  });
  resizeObserver.observe(canvas);

  // Helper: sync tool state across ToolManager, StrokeCapture, ShapeCapture, and Toolbar
  function switchTool(tool: ToolType): void {
    toolManager.setTool(tool);

    if (isShapeTool(tool)) {
      // Enable shape capture, disable stroke capture
      strokeCapture.setTool("brush"); // deactivate eraser mode
      strokeCapture.setEnabled(false);
      shapeCapture.setEnabled(true);
      shapeCapture.setConfig({
        shapeType: tool,
        strokeColor: toolManager.getColor(),
        strokeWidth: toolManager.getBrush().baseWidth,
        fillColor: toolManager.getShapeConfig().fillColor,
        opacity: 1.0,
        sides: toolManager.getShapeConfig().sides,
        starInnerRadius: toolManager.getShapeConfig().starInnerRadius,
      });
      toolbar.setToolUI(tool);
      cursorManager.setTool("brush"); // crosshair-like cursor for shapes
    } else {
      // Brush or eraser — disable shape capture, enable stroke capture
      shapeCapture.setEnabled(false);
      strokeCapture.setEnabled(true);
      strokeCapture.setTool(tool as "brush" | "eraser");
      toolbar.setToolUI(tool);
      cursorManager.setTool(tool as "brush" | "eraser");
      if (tool === "brush") {
        strokeCapture.setBrushConfig(toolManager.getBrush());
      }
    }
  }

  function switchBrush(index: number): void {
    if (index < 0 || index >= BRUSH_PRESETS.length) return;
    const preset = BRUSH_PRESETS[index];
    toolManager.setBrush(preset);
    strokeCapture.setBrushConfig(toolManager.getBrush());
    toolbar.selectBrush(index);
    cursorManager.setBrushWidth(toolManager.getBrush().baseWidth);
  }

  function doUndo(): void {
    undoManager.undo();
    updateUndoRedoState();
  }

  function doRedo(): void {
    undoManager.redo();
    updateUndoRedoState();
  }

  function updateUndoRedoState(): void {
    toolbar.updateUndoRedo(undoManager.canUndo(), undoManager.canRedo());
  }

  // Toolbar
  const toolbar = new Toolbar({
    onBrushSelect: (brush) => {
      toolManager.setTool("brush");
      toolManager.setBrush(brush);
      strokeCapture.setTool("brush");
      strokeCapture.setBrushConfig(toolManager.getBrush());
      cursorManager.setTool("brush");
      cursorManager.setBrushWidth(toolManager.getBrush().baseWidth);
    },
    onColorChange: (color) => {
      toolManager.setColor(color);
      strokeCapture.setColor(color);
    },
    onToolChange: (tool: ToolType) => {
      switchTool(tool);
    },
    onUndo: doUndo,
    onRedo: doRedo,
    onBrushSizeChange: (_delta) => {
      // Handled via keyboard shortcuts below
    },
  });

  // Connection panel
  const connectionPanel = new ConnectionPanel(syncManager);

  // Cursor manager — reflects active tool and brush size
  const cursorManager = new CursorManager(canvas);
  cursorManager.setBrushWidth(toolManager.getBrush().baseWidth);
  cameraController.onPanStateChange = (panning) => {
    cursorManager.setPanning(panning);
    if (!panning) cursorManager.updateCursor();
  };

  // Update toolbar when undo/redo stack changes
  undoManager.onStackChange(updateUndoRedoState);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;

    // FPS counter toggle
    if (e.key === "F3") {
      e.preventDefault();
      fpsCounter.toggle();
      return;
    }

    // Undo/Redo
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      doUndo();
      return;
    }
    if (mod && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
      e.preventDefault();
      doRedo();
      return;
    }

    // Connection panel toggle
    if (mod && e.key === "k") {
      e.preventDefault();
      connectionPanel.toggle();
      return;
    }

    // Don't process tool shortcuts when a modifier is held
    if (mod) return;

    // Tool switching
    if (e.key === "e" || e.key === "E") {
      switchTool("eraser");
    } else if (e.key === "b" || e.key === "B") {
      switchTool("brush");
    } else if (e.key === "r" || e.key === "R") {
      switchTool("rectangle");
    } else if (e.key === "o" || e.key === "O") {
      switchTool("ellipse");
    } else if (e.key === "p" || e.key === "P") {
      switchTool("polygon");
    } else if (e.key === "s" || e.key === "S") {
      switchTool("star");
    }

    // Brush preset selection (1-4)
    if (e.key >= "1" && e.key <= "4") {
      switchBrush(parseInt(e.key) - 1);
    }

    // Brush size adjustment ([ and ])
    if (e.key === "[") {
      const brush = toolManager.getBrush();
      brush.baseWidth = Math.max(0.5, brush.baseWidth - 1);
      strokeCapture.setBrushConfig(brush);
      cursorManager.setBrushWidth(brush.baseWidth);
    } else if (e.key === "]") {
      const brush = toolManager.getBrush();
      brush.baseWidth = Math.min(64, brush.baseWidth + 1);
      strokeCapture.setBrushConfig(brush);
      cursorManager.setBrushWidth(brush.baseWidth);
    }
  });

  // Render loop
  function frame(now: number): void {
    // Advance smooth zoom/pan animations (momentum, animated transitions)
    cameraAnimator.tick();

    renderer.clear();
    const cameraMatrix = camera.getTransformMatrix();
    renderer.setCameraMatrix(cameraMatrix);

    // Update toolbar zoom display and cursor size
    toolbar.updateZoom(camera.zoom * 100);
    cursorManager.setZoom(camera.zoom);

    // Draw dot grid background
    const viewportBounds = camera.getViewportBounds();
    renderer.drawDotGrid(cameraMatrix, viewportBounds, camera.zoom);

    // Draw only strokes visible in the current viewport, with LOD simplification
    const allStrokes = doc.getStrokes();
    const visibleStrokes = spatialIndex.query(viewportBounds);
    const currentZoom = camera.zoom;
    const vertexCache = renderer.vertexCache;

    // Batch all visible strokes into a single draw call
    const strips: Float32Array[] = [];
    for (const stroke of visibleStrokes) {
      const rgba = hexToRgba(stroke.color);
      rgba[3] = stroke.opacity ?? 1.0;
      const lodPoints = getStrokeLOD(stroke.id, stroke.points, currentZoom);
      const data = vertexCache.get(stroke.id, lodPoints, rgba, stroke.width, currentZoom);
      if (data) {
        strips.push(data);
      }
    }
    if (strips.length > 0) {
      renderer.drawStrokeBatch(strips);
    }

    // Draw the in-progress stroke (not cached — it changes every frame)
    const active = strokeCapture.getActiveStroke();
    if (active) {
      const rgba = hexToRgba(active.color);
      rgba[3] = active.opacity;
      renderer.drawStroke(
        active.points,
        rgba,
        active.width,
      );
    }

    // Update FPS counter
    fpsCounter.update(now, allStrokes.length, visibleStrokes.length);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Confirm WebGL is working — the off-white background should be visible
  console.log("Drawfinity: WebGL2 renderer initialized with camera system");

  // Clean up before closing
  window.addEventListener("beforeunload", () => {
    syncManager.disconnect();
    autoSave.saveNow();
  });

  // Expose for debugging
  (window as unknown as Record<string, unknown>).__drawfinity = {
    renderer, camera, cameraAnimator, cameraController, doc, strokeCapture, shapeCapture, undoManager, autoSave, toolManager, toolbar, syncManager, connectionPanel, spatialIndex, cursorManager, fpsCounter,
  };

  console.log("Drawfinity: init complete, toolbar created");
})().catch((err) => {
  console.error("Drawfinity: fatal init error:", err);
});
