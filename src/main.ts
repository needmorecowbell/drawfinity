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
    // Verify Tauri runtime is present before using persistence
    if (!(globalThis as Record<string, unknown>).__TAURI_INTERNALS__) {
      throw new Error("Tauri runtime not available");
    }

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
      drawingManager,
    });
  } catch {
    console.log(
      "Drawfinity: Tauri not detected, using browser localStorage for persistence",
    );

    // Browser-only mode: persist drawing list to localStorage
    const DRAWINGS_KEY = "drawfinity:drawings";

    function loadDrawings(): Array<{
      id: string;
      name: string;
      createdAt: string;
      modifiedAt: string;
      fileName: string;
    }> {
      try {
        const raw = localStorage.getItem(DRAWINGS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function saveDrawings(drawings: typeof memDrawings): void {
      try { localStorage.setItem(DRAWINGS_KEY, JSON.stringify(drawings)); } catch { /* quota */ }
    }

    const memDrawings = loadDrawings();

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
        saveDrawings(memDrawings);
        return drawing;
      },
      deleteDrawing: async (id) => {
        const idx = memDrawings.findIndex((d) => d.id === id);
        if (idx >= 0) memDrawings.splice(idx, 1);
        saveDrawings(memDrawings);
        // Also remove the drawing's Yjs state
        localStorage.removeItem(`drawfinity:doc:${id}`);
      },
      renameDrawing: async (id, name) => {
        const d = memDrawings.find((d) => d.id === id);
        if (d) {
          d.name = name;
          saveDrawings(memDrawings);
        }
      },
      duplicateDrawing: async (id, newName) => {
        const dup = {
          id: crypto.randomUUID(),
          name: newName,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          fileName: "",
        };
        memDrawings.push(dup);
        saveDrawings(memDrawings);
        // Copy the Yjs doc state too
        const srcState = localStorage.getItem(`drawfinity:doc:${id}`);
        if (srcState) {
          try { localStorage.setItem(`drawfinity:doc:${dup.id}`, srcState); } catch { /* quota */ }
        }
        return dup;
      },
      getSaveDirectory: async () => "(browser — localStorage)",
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
  // Show error visually instead of white screen
  document.body.innerHTML = `<div style="padding:40px;font-family:system-ui,sans-serif">
    <h2>Drawfinity failed to start</h2>
    <pre style="color:#c00">${err?.message ?? err}</pre>
    <p style="color:#666">Check the browser console for details.</p>
  </div>`;
});
