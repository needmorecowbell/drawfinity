import { Renderer } from "./renderer";
import { SpatialIndex } from "./renderer/SpatialIndex";
import { getStrokeLOD, clearLODCache } from "./renderer/StrokeLOD";
import { generateShapeVertices } from "./renderer/ShapeMesh";
import { Camera, CameraAnimator, CameraController } from "./camera";
import { DrawfinityDoc, UndoManager } from "./crdt";
import { StrokeCapture, ShapeCapture } from "./input";
import { ToolManager, BRUSH_PRESETS, isShapeTool } from "./tools";
import type { ToolType } from "./tools";
import { Toolbar, ConnectionPanel, RemoteCursors, SettingsPanel } from "./ui";
import { CursorManager } from "./ui/CursorManager";
import { FpsCounter } from "./ui/FpsCounter";
import { SyncManager } from "./sync";
import { loadProfile, loadPreferences } from "./user";

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
  // Build initial index from any persisted strokes and shapes
  spatialIndex.rebuildAll(doc.getStrokes(), doc.getShapes());
  // Keep index in sync when items change (add/remove/undo/redo/remote sync)
  doc.onStrokesChanged(() => {
    spatialIndex.rebuildAll(doc.getStrokes(), doc.getShapes());
    clearLODCache(); // Invalidate LOD cache when stroke set changes
    renderer.vertexCache.clear(); // Invalidate vertex cache when strokes change
    renderer.shapeVertexCache.clear(); // Invalidate shape vertex cache
  });

  const syncManager = new SyncManager(doc.getDoc());
  const toolManager = new ToolManager();

  // Load user profile and preferences
  let userProfile = loadProfile();
  let userPreferences = loadPreferences();

  // Pass user profile to SyncManager for awareness
  syncManager.setUser(userProfile);

  // Apply user preferences: default brush and default color
  if (userPreferences.defaultBrush >= 0 && userPreferences.defaultBrush < BRUSH_PRESETS.length) {
    toolManager.setBrush(BRUSH_PRESETS[userPreferences.defaultBrush]);
  }
  toolManager.setColor(userPreferences.defaultColor);

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
    onShapeConfigChange: (config) => {
      toolManager.setShapeConfig(config);
      // Re-apply config to active shape capture if a shape tool is selected
      if (isShapeTool(toolManager.getTool())) {
        shapeCapture.setConfig({
          shapeType: toolManager.getTool() as "rectangle" | "ellipse" | "polygon" | "star",
          strokeColor: toolManager.getColor(),
          strokeWidth: toolManager.getBrush().baseWidth,
          fillColor: toolManager.getShapeConfig().fillColor,
          opacity: 1.0,
          sides: toolManager.getShapeConfig().sides,
          starInnerRadius: toolManager.getShapeConfig().starInnerRadius,
        });
      }
    },
  });

  // Initialize toolbar shape config from ToolManager defaults
  toolbar.setShapeConfig(toolManager.getShapeConfig());

  // Initialize toolbar with user preferences
  if (userPreferences.defaultBrush >= 0 && userPreferences.defaultBrush < BRUSH_PRESETS.length) {
    toolbar.selectBrush(userPreferences.defaultBrush);
  }
  toolbar.setColorUI(userPreferences.defaultColor);

  // Connection panel
  const connectionPanel = new ConnectionPanel(syncManager);

  // Remote cursors overlay
  const remoteCursors = new RemoteCursors(document.body, camera);
  remoteCursors.attach(syncManager);

  // Settings panel
  const settingsPanel = new SettingsPanel(userProfile, userPreferences, {
    onSave: (profile, preferences) => {
      userProfile = profile;
      userPreferences = preferences;
      syncManager.setUser(profile);
      // Apply updated default brush/color
      if (preferences.defaultBrush >= 0 && preferences.defaultBrush < BRUSH_PRESETS.length) {
        toolManager.setBrush(BRUSH_PRESETS[preferences.defaultBrush]);
        strokeCapture.setBrushConfig(toolManager.getBrush());
        toolbar.selectBrush(preferences.defaultBrush);
        cursorManager.setBrushWidth(toolManager.getBrush().baseWidth);
      }
      toolManager.setColor(preferences.defaultColor);
      strokeCapture.setColor(preferences.defaultColor);
      toolbar.setColorUI(preferences.defaultColor);
      // Update user color indicator
      updateUserColorIndicator();
    },
  });

  // Settings gear button in toolbar
  const settingsButton = document.createElement("button");
  settingsButton.className = "toolbar-btn settings-btn";
  settingsButton.title = "Settings (Ctrl+,)";
  settingsButton.textContent = "\u2699"; // ⚙
  settingsButton.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    settingsPanel.toggle();
  });
  const toolbarEl = document.getElementById("toolbar");
  if (toolbarEl) {
    toolbarEl.appendChild(settingsButton);
  }

  // User color indicator (shown when connected to collaboration session)
  const userColorIndicator = document.createElement("div");
  userColorIndicator.className = "user-color-indicator";
  userColorIndicator.style.display = "none";
  userColorIndicator.style.backgroundColor = userProfile.color;
  userColorIndicator.title = userProfile.name;
  if (toolbarEl) {
    toolbarEl.appendChild(userColorIndicator);
  }

  function updateUserColorIndicator(): void {
    userColorIndicator.style.backgroundColor = userProfile.color;
    userColorIndicator.title = userProfile.name;
  }

  // Show/hide user color indicator based on connection state
  syncManager.onConnectionStateChange((state) => {
    userColorIndicator.style.display = state === "connected" ? "" : "none";
  });

  // Broadcast cursor position on pointermove when connected
  canvas.addEventListener("pointermove", (e) => {
    if (syncManager.getConnectionState() !== "connected") return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const [vw, vh] = camera.getViewportSize();
    const worldX = (screenX - vw / 2) / camera.zoom + camera.x;
    const worldY = (screenY - vh / 2) / camera.zoom + camera.y;
    syncManager.updateCursorPosition(worldX, worldY);
  });

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

    // Settings panel toggle
    if (mod && e.key === ",") {
      e.preventDefault();
      settingsPanel.toggle();
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

    // Reposition remote cursors on camera change
    remoteCursors.updatePositions();

    // Draw dot grid background
    const viewportBounds = camera.getViewportBounds();
    renderer.drawDotGrid(cameraMatrix, viewportBounds, camera.zoom);

    // Draw only strokes visible in the current viewport, with LOD simplification
    const allStrokes = doc.getStrokes();
    const visibleStrokes = spatialIndex.query(viewportBounds);
    const currentZoom = camera.zoom;
    const vertexCache = renderer.vertexCache;

    // Draw visible shapes (fills first, then outlines on top)
    const visibleShapes = spatialIndex.queryShapes(viewportBounds);
    const shapeVertexCache = renderer.shapeVertexCache;
    const shapeFills: Float32Array[] = [];
    const shapeOutlines: Float32Array[] = [];
    for (const shape of visibleShapes) {
      const vd = shapeVertexCache.get(shape);
      if (vd.fill) shapeFills.push(vd.fill);
      if (vd.outline) shapeOutlines.push(vd.outline);
    }
    if (shapeFills.length > 0) {
      renderer.drawShapeFillBatch(shapeFills);
    }
    if (shapeOutlines.length > 0) {
      renderer.drawShapeOutlineBatch(shapeOutlines);
    }

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

    // Draw the in-progress shape preview (not cached — it changes every frame)
    const previewShape = shapeCapture.getPreviewShape();
    if (previewShape) {
      const pvd = generateShapeVertices(previewShape);
      if (pvd.fill) {
        renderer.drawShapeFillBatch([pvd.fill]);
      }
      if (pvd.outline) {
        renderer.drawShapeOutlineBatch([pvd.outline]);
      }
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
    remoteCursors.detach();
    syncManager.disconnect();
    autoSave.saveNow();
  });

  // Expose for debugging
  (window as unknown as Record<string, unknown>).__drawfinity = {
    renderer, camera, cameraAnimator, cameraController, doc, strokeCapture, shapeCapture, undoManager, autoSave, toolManager, toolbar, syncManager, connectionPanel, spatialIndex, cursorManager, fpsCounter, remoteCursors, settingsPanel,
  };

  console.log("Drawfinity: init complete, toolbar created");
})().catch((err) => {
  console.error("Drawfinity: fatal init error:", err);
});
