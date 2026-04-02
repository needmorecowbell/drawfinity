import { ViewManager } from "./ui/ViewManager";
import { ThemeManager } from "./ui/ThemeManager";
import { createBrowserStorage } from "./persistence/BrowserStorage";
import type { DrawingMetadata } from "./persistence/DrawingManifest";

// Surface unhandled promise rejections (WebKitGTK swallows them silently)
window.addEventListener("unhandledrejection", (e) => {
  console.error("Drawfinity: unhandled rejection:", e.reason);
});

// Apply theme before any UI renders to avoid flash of wrong theme
const themeManager = new ThemeManager();
themeManager.init();

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
      "Drawfinity: Tauri not detected, using browser persistence",
    );

    const storage = await createBrowserStorage();
    const { memDrawings } = storage;

    viewManager = new ViewManager(canvasContainer, {
      listDrawings: async () => memDrawings,
      createDrawing: async (name) => {
        const drawing: DrawingMetadata = {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          fileName: "",
        };
        memDrawings.push(drawing);
        await storage.persistManifest();
        return drawing;
      },
      deleteDrawing: async (id) => {
        const idx = memDrawings.findIndex((d) => d.id === id);
        if (idx >= 0) memDrawings.splice(idx, 1);
        await storage.persistManifest();
        await storage.deleteDocState(id);
      },
      renameDrawing: async (id, name) => {
        const d = memDrawings.find((d) => d.id === id);
        if (d) {
          d.name = name;
          await storage.persistManifest();
        }
      },
      duplicateDrawing: async (id, newName) => {
        const dup: DrawingMetadata = {
          id: crypto.randomUUID(),
          name: newName,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          fileName: "",
        };
        memDrawings.push(dup);
        await storage.persistManifest();
        const srcState = await storage.loadDocState(id);
        if (srcState) {
          await storage.saveDocState(dup.id, srcState);
        }
        return dup;
      },
      getSaveDirectory: async () => `(browser — ${storage.storageLabel})`,
      getDrawingName: async (id) => {
        const d = memDrawings.find((d) => d.id === id);
        return d?.name ?? "Untitled";
      },
      browserStorage: storage,
    });
  }

  await viewManager.showHome();

  // Expose for debugging
  (window as unknown as Record<string, unknown>).__drawfinity = { viewManager, themeManager };

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
