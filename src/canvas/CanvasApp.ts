import { Renderer } from "../renderer";
import { SpatialIndex } from "../renderer/SpatialIndex";
import { getStrokeLOD, clearLODCache } from "../renderer/StrokeLOD";
import { generateShapeVertices } from "../renderer/ShapeMesh";
import { Camera, CameraAnimator, CameraController } from "../camera";
import { DrawfinityDoc, UndoManager } from "../crdt";
import { StrokeCapture, ShapeCapture } from "../input";
import { ToolManager, BRUSH_PRESETS, isShapeTool } from "../tools";
import type { ToolType } from "../tools";
import { Toolbar, ConnectionPanel, RemoteCursors, SettingsPanel } from "../ui";
import { CursorManager } from "../ui/CursorManager";
import { FpsCounter } from "../ui/FpsCounter";
import { SyncManager } from "../sync";
import { loadProfile, loadPreferences } from "../user";

export interface CanvasAppCallbacks {
  onGoHome?: () => void;
  onRenameDrawing?: (id: string, name: string) => void;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b, 1.0];
}

export class CanvasApp {
  private drawingId: string = "";
  private renderer!: Renderer;
  private camera!: Camera;
  private cameraAnimator!: CameraAnimator;
  private cameraController!: CameraController;
  private doc!: DrawfinityDoc;
  private spatialIndex!: SpatialIndex;
  private syncManager!: SyncManager;
  private toolManager!: ToolManager;
  private strokeCapture!: StrokeCapture;
  private shapeCapture!: ShapeCapture;
  private undoManager!: UndoManager;
  private toolbar!: Toolbar;
  private connectionPanel!: ConnectionPanel;
  private remoteCursors!: RemoteCursors;
  private settingsPanel!: SettingsPanel;
  private cursorManager!: CursorManager;
  private fpsCounter!: FpsCounter;
  private autoSave!: { start(): void; stop(): void; saveNow(): Promise<void> | void };
  private canvas!: HTMLCanvasElement;
  private resizeObserver!: ResizeObserver;
  private animFrameId = 0;
  private keydownHandler!: (e: KeyboardEvent) => void;
  private pointermoveHandler!: (e: PointerEvent) => void;
  private beforeUnloadHandler!: () => void;
  private settingsButton!: HTMLButtonElement;
  private userColorIndicator!: HTMLDivElement;
  private connectionStateUnsubscribe: (() => void) | null = null;
  private initialized = false;
  private callbacks: CanvasAppCallbacks = {};

  async init(drawingId: string, callbacks?: CanvasAppCallbacks): Promise<void> {
    this.callbacks = callbacks ?? {};
    this.drawingId = drawingId;

    const canvas = document.getElementById("drawfinity-canvas") as HTMLCanvasElement;
    if (!canvas) {
      throw new Error("Canvas element not found");
    }
    this.canvas = canvas;

    this.renderer = new Renderer(canvas);
    this.camera = new Camera();
    this.cameraAnimator = new CameraAnimator(this.camera);
    this.cameraController = new CameraController(this.camera, canvas, this.cameraAnimator);

    // Load persisted document
    try {
      const { loadDocumentById, getDefaultFilePath, AutoSave, DrawingManager } = await import("../persistence");
      const drawingManager = new DrawingManager();
      const loadedState = await loadDocumentById(drawingId, drawingManager);
      this.doc = new DrawfinityDoc(loadedState ?? undefined);
      const savePath = await getDefaultFilePath();
      this.autoSave = new AutoSave(this.doc.getDoc(), savePath, 2000, drawingId, drawingManager);
      this.autoSave.start();
    } catch (err) {
      console.warn("CanvasApp: persistence unavailable, running without auto-save", err);
      this.doc = new DrawfinityDoc();
      this.autoSave = { start() {}, stop() {}, async saveNow() {} };
    }

    this.spatialIndex = new SpatialIndex();
    this.spatialIndex.rebuildAll(this.doc.getStrokes(), this.doc.getShapes());

    this.doc.onStrokesChanged(() => {
      this.spatialIndex.rebuildAll(this.doc.getStrokes(), this.doc.getShapes());
      clearLODCache();
      this.renderer.vertexCache.clear();
      this.renderer.shapeVertexCache.clear();
    });

    this.syncManager = new SyncManager(this.doc.getDoc());
    this.toolManager = new ToolManager();

    let userProfile = loadProfile();
    let userPreferences = loadPreferences();

    this.syncManager.setUser(userProfile);

    if (userPreferences.defaultBrush >= 0 && userPreferences.defaultBrush < BRUSH_PRESETS.length) {
      this.toolManager.setBrush(BRUSH_PRESETS[userPreferences.defaultBrush]);
    }
    this.toolManager.setColor(userPreferences.defaultColor);

    this.strokeCapture = new StrokeCapture(this.camera, this.cameraController, this.doc, canvas);
    this.strokeCapture.setBrushConfig(this.toolManager.getBrush());
    this.shapeCapture = new ShapeCapture(this.camera, this.cameraController, this.doc, canvas);
    this.shapeCapture.setEnabled(false);
    this.undoManager = new UndoManager(this.doc.getStrokesArray());

    this.fpsCounter = new FpsCounter();
    this.camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);

    this.resizeObserver = new ResizeObserver(() => {
      this.camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);
    });
    this.resizeObserver.observe(canvas);

    // Cursor manager — must be created before Toolbar since selectBrush triggers callbacks
    this.cursorManager = new CursorManager(canvas);
    this.cursorManager.setBrushWidth(this.toolManager.getBrush().baseWidth);

    // Toolbar
    this.toolbar = new Toolbar({
      onBrushSelect: (brush) => {
        this.toolManager.setTool("brush");
        this.toolManager.setBrush(brush);
        this.strokeCapture.setTool("brush");
        this.strokeCapture.setBrushConfig(this.toolManager.getBrush());
        this.cursorManager.setTool("brush");
        this.cursorManager.setBrushWidth(this.toolManager.getBrush().baseWidth);
      },
      onColorChange: (color) => {
        this.toolManager.setColor(color);
        this.strokeCapture.setColor(color);
      },
      onToolChange: (tool: ToolType) => {
        this.switchTool(tool);
      },
      onUndo: () => this.doUndo(),
      onRedo: () => this.doRedo(),
      onBrushSizeChange: () => {},
      onHome: () => this.callbacks.onGoHome?.(),
      onRenameDrawing: (name) => {
        this.callbacks.onRenameDrawing?.(this.drawingId, name);
      },
      onShapeConfigChange: (config) => {
        this.toolManager.setShapeConfig(config);
        if (isShapeTool(this.toolManager.getTool())) {
          this.shapeCapture.setConfig({
            shapeType: this.toolManager.getTool() as "rectangle" | "ellipse" | "polygon" | "star",
            strokeColor: this.toolManager.getColor(),
            strokeWidth: this.toolManager.getBrush().baseWidth,
            fillColor: this.toolManager.getShapeConfig().fillColor,
            opacity: 1.0,
            sides: this.toolManager.getShapeConfig().sides,
            starInnerRadius: this.toolManager.getShapeConfig().starInnerRadius,
          });
        }
      },
    });

    this.toolbar.setShapeConfig(this.toolManager.getShapeConfig());

    if (userPreferences.defaultBrush >= 0 && userPreferences.defaultBrush < BRUSH_PRESETS.length) {
      this.toolbar.selectBrush(userPreferences.defaultBrush);
    }
    this.toolbar.setColorUI(userPreferences.defaultColor);

    // Connection panel
    this.connectionPanel = new ConnectionPanel(this.syncManager);

    // Remote cursors overlay
    this.remoteCursors = new RemoteCursors(document.body, this.camera);
    this.remoteCursors.attach(this.syncManager);

    // Settings panel
    this.settingsPanel = new SettingsPanel(userProfile, userPreferences, {
      onSave: (profile, preferences) => {
        userProfile = profile;
        userPreferences = preferences;
        this.syncManager.setUser(profile);
        if (preferences.defaultBrush >= 0 && preferences.defaultBrush < BRUSH_PRESETS.length) {
          this.toolManager.setBrush(BRUSH_PRESETS[preferences.defaultBrush]);
          this.strokeCapture.setBrushConfig(this.toolManager.getBrush());
          this.toolbar.selectBrush(preferences.defaultBrush);
          this.cursorManager.setBrushWidth(this.toolManager.getBrush().baseWidth);
        }
        this.toolManager.setColor(preferences.defaultColor);
        this.strokeCapture.setColor(preferences.defaultColor);
        this.toolbar.setColorUI(preferences.defaultColor);
        this.updateUserColorIndicator(userProfile);
      },
    });

    // Settings gear button
    this.settingsButton = document.createElement("button");
    this.settingsButton.className = "toolbar-btn settings-btn";
    this.settingsButton.title = "Settings (Ctrl+,)";
    this.settingsButton.textContent = "\u2699";
    this.settingsButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.settingsPanel.toggle();
    });
    const toolbarEl = document.getElementById("toolbar");
    if (toolbarEl) {
      toolbarEl.appendChild(this.settingsButton);
    }

    // User color indicator
    this.userColorIndicator = document.createElement("div");
    this.userColorIndicator.className = "user-color-indicator";
    this.userColorIndicator.style.display = "none";
    this.userColorIndicator.style.backgroundColor = userProfile.color;
    this.userColorIndicator.title = userProfile.name;
    if (toolbarEl) {
      toolbarEl.appendChild(this.userColorIndicator);
    }

    this.connectionStateUnsubscribe = this.syncManager.onConnectionStateChange((state) => {
      this.userColorIndicator.style.display = state === "connected" ? "" : "none";
    });

    // Wire pan state to cursor manager
    this.cameraController.onPanStateChange = (panning) => {
      this.cursorManager.setPanning(panning);
      if (!panning) this.cursorManager.updateCursor();
    };

    this.undoManager.onStackChange(() => this.updateUndoRedoState());

    // Pointer move for remote cursors
    this.pointermoveHandler = (e: PointerEvent) => {
      if (this.syncManager.getConnectionState() !== "connected") return;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const [vw, vh] = this.camera.getViewportSize();
      const worldX = (screenX - vw / 2) / this.camera.zoom + this.camera.x;
      const worldY = (screenY - vh / 2) / this.camera.zoom + this.camera.y;
      this.syncManager.updateCursorPosition(worldX, worldY);
    };
    canvas.addEventListener("pointermove", this.pointermoveHandler);

    // Keyboard shortcuts
    this.keydownHandler = (e: KeyboardEvent) => this.handleKeydown(e);
    document.addEventListener("keydown", this.keydownHandler);

    // Before unload
    this.beforeUnloadHandler = () => {
      this.remoteCursors.detach();
      this.syncManager.disconnect();
      this.autoSave.saveNow();
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);

    // Start render loop
    const frame = (now: number): void => {
      this.cameraAnimator.tick();
      this.renderer.clear();
      const cameraMatrix = this.camera.getTransformMatrix();
      this.renderer.setCameraMatrix(cameraMatrix);

      this.toolbar.updateZoom(this.camera.zoom * 100);
      this.cursorManager.setZoom(this.camera.zoom);
      this.remoteCursors.updatePositions();

      const viewportBounds = this.camera.getViewportBounds();
      this.renderer.drawDotGrid(cameraMatrix, viewportBounds, this.camera.zoom);

      const allStrokes = this.doc.getStrokes();
      const visibleStrokes = this.spatialIndex.query(viewportBounds);
      const currentZoom = this.camera.zoom;
      const vertexCache = this.renderer.vertexCache;

      // Shapes
      const visibleShapes = this.spatialIndex.queryShapes(viewportBounds);
      const shapeVertexCache = this.renderer.shapeVertexCache;
      const shapeFills: Float32Array[] = [];
      const shapeOutlines: Float32Array[] = [];
      for (const shape of visibleShapes) {
        const vd = shapeVertexCache.get(shape);
        if (vd.fill) shapeFills.push(vd.fill);
        if (vd.outline) shapeOutlines.push(vd.outline);
      }
      if (shapeFills.length > 0) this.renderer.drawShapeFillBatch(shapeFills);
      if (shapeOutlines.length > 0) this.renderer.drawShapeOutlineBatch(shapeOutlines);

      // Strokes
      const strips: Float32Array[] = [];
      for (const stroke of visibleStrokes) {
        const rgba = hexToRgba(stroke.color);
        rgba[3] = stroke.opacity ?? 1.0;
        const lodPoints = getStrokeLOD(stroke.id, stroke.points, currentZoom);
        const data = vertexCache.get(stroke.id, lodPoints, rgba, stroke.width, currentZoom);
        if (data) strips.push(data);
      }
      if (strips.length > 0) this.renderer.drawStrokeBatch(strips);

      // Active stroke preview
      const active = this.strokeCapture.getActiveStroke();
      if (active) {
        const rgba = hexToRgba(active.color);
        rgba[3] = active.opacity;
        this.renderer.drawStroke(active.points, rgba, active.width);
      }

      // Shape preview
      const previewShape = this.shapeCapture.getPreviewShape();
      if (previewShape) {
        const pvd = generateShapeVertices(previewShape);
        if (pvd.fill) this.renderer.drawShapeFillBatch([pvd.fill]);
        if (pvd.outline) this.renderer.drawShapeOutlineBatch([pvd.outline]);
      }

      this.fpsCounter.update(now, allStrokes.length, visibleStrokes.length);
      this.animFrameId = requestAnimationFrame(frame);
    };
    this.animFrameId = requestAnimationFrame(frame);

    this.initialized = true;
    console.log("CanvasApp: initialized for drawing", drawingId);
  }

  destroy(): void {
    if (!this.initialized) return;

    // Stop render loop
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }

    // Remove event listeners
    window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    document.removeEventListener("keydown", this.keydownHandler);
    this.canvas.removeEventListener("pointermove", this.pointermoveHandler);

    // Stop auto-save and save final state
    this.autoSave.stop();
    this.autoSave.saveNow();

    // Disconnect collaboration
    this.remoteCursors.detach();
    this.syncManager.disconnect();
    this.syncManager.destroy();

    // Clean up UI components
    this.toolbar.destroy();
    this.connectionPanel.destroy();
    this.settingsPanel.destroy();
    this.fpsCounter.destroy();
    this.settingsButton.remove();
    this.userColorIndicator.remove();

    if (this.connectionStateUnsubscribe) {
      this.connectionStateUnsubscribe();
      this.connectionStateUnsubscribe = null;
    }

    // Clean up input
    this.strokeCapture.destroy();
    this.shapeCapture.destroy();
    this.cameraController.destroy();

    // Clean up resize observer
    this.resizeObserver.disconnect();

    // Clean up renderer (WebGL context)
    this.renderer.destroy();

    this.initialized = false;
    console.log("CanvasApp: destroyed");
  }

  getCurrentDrawingId(): string {
    return this.drawingId;
  }

  getDoc(): DrawfinityDoc {
    return this.doc;
  }

  setDrawingName(name: string): void {
    this.toolbar.setDrawingName(name);
  }

  connectToRoom(serverUrl: string, roomId: string): void {
    this.syncManager.connect(serverUrl, roomId);
  }

  private switchTool(tool: ToolType): void {
    this.toolManager.setTool(tool);

    if (isShapeTool(tool)) {
      this.strokeCapture.setTool("brush");
      this.strokeCapture.setEnabled(false);
      this.shapeCapture.setEnabled(true);
      this.shapeCapture.setConfig({
        shapeType: tool,
        strokeColor: this.toolManager.getColor(),
        strokeWidth: this.toolManager.getBrush().baseWidth,
        fillColor: this.toolManager.getShapeConfig().fillColor,
        opacity: 1.0,
        sides: this.toolManager.getShapeConfig().sides,
        starInnerRadius: this.toolManager.getShapeConfig().starInnerRadius,
      });
      this.toolbar.setToolUI(tool);
      this.cursorManager.setTool("brush");
    } else {
      this.shapeCapture.setEnabled(false);
      this.strokeCapture.setEnabled(true);
      this.strokeCapture.setTool(tool as "brush" | "eraser");
      this.toolbar.setToolUI(tool);
      this.cursorManager.setTool(tool as "brush" | "eraser");
      if (tool === "brush") {
        this.strokeCapture.setBrushConfig(this.toolManager.getBrush());
      }
    }
  }

  private switchBrush(index: number): void {
    if (index < 0 || index >= BRUSH_PRESETS.length) return;
    const preset = BRUSH_PRESETS[index];
    this.toolManager.setBrush(preset);
    this.strokeCapture.setBrushConfig(this.toolManager.getBrush());
    this.toolbar.selectBrush(index);
    this.cursorManager.setBrushWidth(this.toolManager.getBrush().baseWidth);
  }

  private doUndo(): void {
    this.undoManager.undo();
    this.updateUndoRedoState();
  }

  private doRedo(): void {
    this.undoManager.redo();
    this.updateUndoRedoState();
  }

  private updateUndoRedoState(): void {
    this.toolbar.updateUndoRedo(this.undoManager.canUndo(), this.undoManager.canRedo());
  }

  private updateUserColorIndicator(profile: { color: string; name: string }): void {
    this.userColorIndicator.style.backgroundColor = profile.color;
    this.userColorIndicator.title = profile.name;
  }

  private handleKeydown(e: KeyboardEvent): void {
    const mod = e.ctrlKey || e.metaKey;

    if (e.key === "F3") {
      e.preventDefault();
      this.fpsCounter.toggle();
      return;
    }

    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      this.doUndo();
      return;
    }
    if (mod && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
      e.preventDefault();
      this.doRedo();
      return;
    }

    if (mod && e.key === "k") {
      e.preventDefault();
      this.connectionPanel.toggle();
      return;
    }

    if (mod && e.key === ",") {
      e.preventDefault();
      this.settingsPanel.toggle();
      return;
    }

    if (mod && e.key === "w") {
      e.preventDefault();
      this.callbacks.onGoHome?.();
      return;
    }

    if (mod) return;

    if (e.key === "Escape") {
      this.callbacks.onGoHome?.();
      return;
    }

    if (e.key === "e" || e.key === "E") {
      this.switchTool("eraser");
    } else if (e.key === "b" || e.key === "B") {
      this.switchTool("brush");
    } else if (e.key === "r" || e.key === "R") {
      this.switchTool("rectangle");
    } else if (e.key === "o" || e.key === "O") {
      this.switchTool("ellipse");
    } else if (e.key === "p" || e.key === "P") {
      this.switchTool("polygon");
    } else if (e.key === "s" || e.key === "S") {
      this.switchTool("star");
    }

    if (e.key >= "1" && e.key <= "4") {
      this.switchBrush(parseInt(e.key) - 1);
    }

    if (e.key === "[") {
      const brush = this.toolManager.getBrush();
      brush.baseWidth = Math.max(0.5, brush.baseWidth - 1);
      this.strokeCapture.setBrushConfig(brush);
      this.cursorManager.setBrushWidth(brush.baseWidth);
    } else if (e.key === "]") {
      const brush = this.toolManager.getBrush();
      brush.baseWidth = Math.min(64, brush.baseWidth + 1);
      this.strokeCapture.setBrushConfig(brush);
      this.cursorManager.setBrushWidth(brush.baseWidth);
    }
  }
}
