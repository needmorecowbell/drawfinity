import { Renderer } from "./renderer";
import { Camera, CameraAnimator, CameraController } from "./camera";
import { DrawfinityDoc, UndoManager } from "./crdt";
import { StrokeCapture } from "./input";
import { loadDocument, getDefaultFilePath, AutoSave } from "./persistence";
import { ToolManager } from "./tools";

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

(async () => {
  // Load persisted document if it exists, otherwise start fresh
  let doc: DrawfinityDoc;
  let autoSave: AutoSave;

  try {
    const savePath = await getDefaultFilePath();
    const loadedDoc = await loadDocument(savePath);
    doc = new DrawfinityDoc(loadedDoc ?? undefined);
    autoSave = new AutoSave(doc.getDoc(), savePath);
    autoSave.start();
    if (loadedDoc) {
      console.log("Drawfinity: loaded saved document from", savePath);
    }
  } catch (err) {
    console.warn("Drawfinity: could not load saved document, starting fresh", err);
    doc = new DrawfinityDoc();
    const savePath = await getDefaultFilePath();
    autoSave = new AutoSave(doc.getDoc(), savePath);
    autoSave.start();
  }

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

  // HUD overlay
  const hudZoom = document.getElementById("hud-zoom");
  const hudUndo = document.getElementById("hud-undo");

  function updateHudUndoRedo(): void {
    if (hudUndo) {
      const parts: string[] = [];
      if (undoManager.canUndo()) parts.push("Undo");
      if (undoManager.canRedo()) parts.push("Redo");
      hudUndo.textContent = parts.length > 0 ? parts.join(" · ") : "";
    }
  }

  // Update HUD when undo/redo stack changes
  undoManager.onStackChange(updateHudUndoRedo);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;

    // Undo/Redo
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undoManager.undo();
      updateHudUndoRedo();
      return;
    }
    if (mod && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
      e.preventDefault();
      undoManager.redo();
      updateHudUndoRedo();
      return;
    }

    // Don't process tool shortcuts when a modifier is held
    if (mod) return;

    // Tool switching
    if (e.key === "e" || e.key === "E") {
      toolManager.setTool("eraser");
      strokeCapture.setTool("eraser");
    } else if (e.key === "b" || e.key === "B") {
      toolManager.setTool("brush");
      strokeCapture.setTool("brush");
      strokeCapture.setBrushConfig(toolManager.getBrush());
    }
  });

  // Render loop
  function frame(): void {
    // Advance smooth zoom/pan animations (momentum, animated transitions)
    cameraAnimator.tick();

    renderer.clear();
    renderer.setCameraMatrix(camera.getTransformMatrix());

    // Update HUD zoom display
    if (hudZoom) {
      hudZoom.textContent = `${Math.round(camera.zoom * 100)}%`;
    }

    // Draw all finalized strokes
    for (const stroke of doc.getStrokes()) {
      renderer.drawStroke(stroke.points, hexToRgba(stroke.color), stroke.width);
    }

    // Draw the in-progress stroke
    const active = strokeCapture.getActiveStroke();
    if (active) {
      renderer.drawStroke(
        active.points,
        hexToRgba(active.color),
        active.width,
      );
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Confirm WebGL is working — the off-white background should be visible
  console.log("Drawfinity: WebGL2 renderer initialized with camera system");

  // Save before closing
  window.addEventListener("beforeunload", () => {
    autoSave.saveNow();
  });

  // Expose for debugging
  (window as unknown as Record<string, unknown>).__drawfinity = {
    renderer, camera, cameraAnimator, cameraController, doc, strokeCapture, undoManager, autoSave, toolManager,
  };
})();
