import { CanvasApp } from "./canvas";

// Surface unhandled promise rejections (WebKitGTK swallows them silently)
window.addEventListener("unhandledrejection", (e) => {
  console.error("Drawfinity: unhandled rejection:", e.reason);
});

(async () => {
  console.log("Drawfinity: init starting");

  // Determine the drawing to open.
  // For now, use the default drawing ID from DrawingManager (or a fallback).
  let drawingId = "default";
  try {
    const { DrawingManager } = await import("./persistence");
    const drawingManager = new DrawingManager();
    const drawings = await drawingManager.listDrawings();
    if (drawings.length > 0) {
      drawingId = drawings[0].id;
    } else {
      const created = await drawingManager.createDrawing("Untitled Drawing");
      drawingId = created.id;
    }
  } catch {
    console.warn("Drawfinity: persistence unavailable, using default drawing ID");
  }

  const app = new CanvasApp();
  await app.init(drawingId);

  // Expose for debugging
  (window as unknown as Record<string, unknown>).__drawfinity = { app };

  console.log("Drawfinity: init complete");
})().catch((err) => {
  console.error("Drawfinity: fatal init error:", err);
});
