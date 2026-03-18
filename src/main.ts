import { Renderer } from "./renderer";
import { Camera, CameraAnimator, CameraController } from "./camera";
import { DrawfinityDoc, UndoManager } from "./crdt";
import { StrokeCapture } from "./input";
import { ToolManager, BRUSH_PRESETS } from "./tools";
import { Toolbar } from "./ui";
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

  const syncManager = new SyncManager(doc.getDoc());
  const toolManager = new ToolManager();
  const strokeCapture = new StrokeCapture(camera, cameraController, doc, canvas);
  strokeCapture.setBrushConfig(toolManager.getBrush());
  const undoManager = new UndoManager(doc.getStrokesArray());

  // Set initial viewport size
  camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);

  // Update camera viewport on resize
  const resizeObserver = new ResizeObserver(() => {
    camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);
  });
  resizeObserver.observe(canvas);

  // Helper: sync tool state across ToolManager, StrokeCapture, and Toolbar
  function switchTool(tool: "brush" | "eraser"): void {
    toolManager.setTool(tool);
    strokeCapture.setTool(tool);
    toolbar.setToolUI(tool);
    if (tool === "brush") {
      strokeCapture.setBrushConfig(toolManager.getBrush());
    }
  }

  function switchBrush(index: number): void {
    if (index < 0 || index >= BRUSH_PRESETS.length) return;
    const preset = BRUSH_PRESETS[index];
    toolManager.setBrush(preset);
    strokeCapture.setBrushConfig(toolManager.getBrush());
    toolbar.selectBrush(index);
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
    },
    onColorChange: (color) => {
      toolManager.setColor(color);
      strokeCapture.setColor(color);
    },
    onToolChange: (tool) => {
      switchTool(tool);
    },
    onUndo: doUndo,
    onRedo: doRedo,
    onBrushSizeChange: (_delta) => {
      // Handled via keyboard shortcuts below
    },
  });

  // Update toolbar when undo/redo stack changes
  undoManager.onStackChange(updateUndoRedoState);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;

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

    // Don't process tool shortcuts when a modifier is held
    if (mod) return;

    // Tool switching
    if (e.key === "e" || e.key === "E") {
      switchTool("eraser");
    } else if (e.key === "b" || e.key === "B") {
      switchTool("brush");
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
    } else if (e.key === "]") {
      const brush = toolManager.getBrush();
      brush.baseWidth = Math.min(64, brush.baseWidth + 1);
      strokeCapture.setBrushConfig(brush);
    }
  });

  // Render loop
  function frame(): void {
    // Advance smooth zoom/pan animations (momentum, animated transitions)
    cameraAnimator.tick();

    renderer.clear();
    renderer.setCameraMatrix(camera.getTransformMatrix());

    // Update toolbar zoom display
    toolbar.updateZoom(camera.zoom * 100);

    // Draw all finalized strokes
    for (const stroke of doc.getStrokes()) {
      const rgba = hexToRgba(stroke.color);
      rgba[3] = stroke.opacity ?? 1.0;
      renderer.drawStroke(stroke.points, rgba, stroke.width);
    }

    // Draw the in-progress stroke
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
    renderer, camera, cameraAnimator, cameraController, doc, strokeCapture, undoManager, autoSave, toolManager, toolbar, syncManager,
  };

  console.log("Drawfinity: init complete, toolbar created");
})().catch((err) => {
  console.error("Drawfinity: fatal init error:", err);
});
