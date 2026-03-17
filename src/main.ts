import { Renderer } from "./renderer";
import { Camera, CameraController } from "./camera";
import { DrawfinityDoc, UndoManager } from "./crdt";
import { StrokeCapture } from "./input";

const canvas = document.getElementById("drawfinity-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

const renderer = new Renderer(canvas);
const camera = new Camera();
const cameraController = new CameraController(camera, canvas);
const doc = new DrawfinityDoc();
const strokeCapture = new StrokeCapture(camera, cameraController, doc, canvas);
const undoManager = new UndoManager(doc.getStrokesArray());

// Set initial viewport size
camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);

// Update camera viewport on resize
const resizeObserver = new ResizeObserver(() => {
  camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);
});
resizeObserver.observe(canvas);

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b, 1.0];
}

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

// Keyboard shortcuts for undo/redo
document.addEventListener("keydown", (e: KeyboardEvent) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;

  if (e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undoManager.undo();
    updateHudUndoRedo();
  } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
    e.preventDefault();
    undoManager.redo();
    updateHudUndoRedo();
  }
});

// Render loop
function frame(): void {
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

// Expose for debugging
(window as unknown as Record<string, unknown>).__drawfinity = {
  renderer, camera, cameraController, doc, strokeCapture, undoManager,
};
