import { ViewManager } from "./ui/ViewManager";

// Surface unhandled promise rejections (WebKitGTK swallows them silently)
window.addEventListener("unhandledrejection", (e) => {
  console.error("Drawfinity: unhandled rejection:", e.reason);
});

(async () => {
  console.log("Drawfinity: init starting");

  const canvasContainer = document.getElementById("canvas-view");
  if (!canvasContainer) {
    throw new Error("Canvas view container not found");
  }

  let viewManager: ViewManager;

  try {
    const { DrawingManager } = await import("./persistence");
    const drawingManager = new DrawingManager();

    viewManager = new ViewManager(canvasContainer, {
      listDrawings: () => drawingManager.listDrawings(),
      createDrawing: (name) => drawingManager.createDrawing(name),
      deleteDrawing: (id) => drawingManager.deleteDrawing(id),
      renameDrawing: (id, name) => drawingManager.renameDrawing(id, name),
      duplicateDrawing: (id, newName) =>
        drawingManager.duplicateDrawing(id, newName),
      getSaveDirectory: () => drawingManager.getSaveDirectory(),
      getDrawingName: (id) => drawingManager.getDrawingName(id),
    });
  } catch {
    console.warn(
      "Drawfinity: persistence unavailable, using in-memory stubs",
    );

    // Provide in-memory stubs for browser-only mode
    const memDrawings: Array<{
      id: string;
      name: string;
      createdAt: string;
      modifiedAt: string;
      fileName: string;
    }> = [];

    viewManager = new ViewManager(canvasContainer, {
      listDrawings: async () => memDrawings,
      createDrawing: async (name) => {
        const drawing = {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          fileName: "",
        };
        memDrawings.push(drawing);
        return drawing;
      },
      deleteDrawing: async (id) => {
        const idx = memDrawings.findIndex((d) => d.id === id);
        if (idx >= 0) memDrawings.splice(idx, 1);
      },
      renameDrawing: async (id, name) => {
        const d = memDrawings.find((d) => d.id === id);
        if (d) d.name = name;
      },
      duplicateDrawing: async (id, newName) => {
        const src = memDrawings.find((d) => d.id === id);
        const dup = {
          id: crypto.randomUUID(),
          name: newName,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          fileName: "",
        };
        if (src) memDrawings.push(dup);
        return dup;
      },
      getSaveDirectory: async () => "(browser mode)",
      getDrawingName: async (id) => {
        const d = memDrawings.find((d) => d.id === id);
        return d?.name ?? "Untitled";
      },
    });
  }

  await viewManager.showHome();

  // Expose for debugging
  (window as unknown as Record<string, unknown>).__drawfinity = { viewManager };

  console.log("Drawfinity: init complete");
})().catch((err) => {
  console.error("Drawfinity: fatal init error:", err);
});
