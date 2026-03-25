import { Renderer } from "../renderer";
import { SpatialIndex } from "../renderer/SpatialIndex";
import { getStrokeLOD, clearLODCache } from "../renderer/StrokeLOD";
import { generateShapeVertices } from "../renderer/ShapeMesh";
import { Camera, CameraAnimator, CameraController } from "../camera";
import * as Y from "yjs";
import { DrawfinityDoc, UndoManager } from "../crdt";
import { StrokeCapture, ShapeCapture, MagnifyCapture } from "../input";
import { ToolManager, BRUSH_PRESETS, isShapeTool } from "../tools";
import type { ToolType } from "../tools";
import { Toolbar, ConnectionPanel, RemoteCursors, SettingsPanel, TurtlePanel, BookmarkPanel } from "../ui";
import { LuaRuntime, TurtleState, TurtleDrawing, TurtleExecutor, TurtleIndicator } from "../turtle";
import { ICONS } from "../ui/ToolbarIcons";
import { renderExport, downloadCanvas } from "../ui/ExportRenderer";
import type { ExportDialogResult } from "../ui/ExportDialog";
import { ActionRegistry } from "../ui/ActionRegistry";
import { CheatSheet } from "../ui/CheatSheet";
import { CursorManager } from "../ui/CursorManager";
import { FpsCounter } from "../ui/FpsCounter";
import { SyncManager } from "../sync";
import { loadProfileAsync, loadPreferencesAsync, savePreferences, type UserPreferences, type GridStyle } from "../user";

/**
 * Callbacks for CanvasApp lifecycle events, provided by the parent view manager.
 *
 * @property onGoHome - Called when the user navigates back to the home screen.
 * @property onRenameDrawing - Called when the user renames the current drawing.
 */
export interface CanvasAppCallbacks {
  onGoHome?: () => void;
  onRenameDrawing?: (id: string, name: string) => void;
  /** When provided, CanvasApp reuses this DrawingManager instead of creating its own. */
  drawingManager?: unknown;
  /** When provided, CanvasApp uses this browser storage adapter (IndexedDB/localStorage). */
  browserStorage?: unknown;
}

/** Encode Uint8Array to base64 without spread operator (safe for large arrays). */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode base64 to Uint8Array. */
function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b, 1.0];
}

/**
 * Central application orchestrator that owns and coordinates all drawing subsystems.
 *
 * CanvasApp manages the full lifecycle of an infinite-canvas drawing session: WebGL
 * rendering, camera controls, input capture, CRDT document state, collaboration,
 * persistence, toolbar UI, and keyboard shortcuts. It is created once per drawing
 * session and must be explicitly destroyed when the user leaves the canvas.
 *
 * Subsystems are initialized lazily in {@link init} rather than in the constructor,
 * because persistence and user preferences require async loading. The Tauri file-system
 * APIs are dynamically imported so the app degrades gracefully to localStorage when
 * running in a browser without the Tauri shell.
 *
 * @example
 * ```ts
 * const app = new CanvasApp();
 * await app.init("drawing-123", {
 *   onGoHome: () => viewManager.showHome(),
 *   onRenameDrawing: (id, name) => drawingManager.renameDrawing(id, name),
 * });
 *
 * // Later, to join a collaboration session:
 * app.connectToRoom("ws://localhost:8080", "room-abc", "My Room");
 *
 * // When the user leaves the canvas:
 * await app.destroy();
 * ```
 */
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
  private magnifyCapture!: MagnifyCapture;
  private undoManager!: UndoManager;
  private toolbar!: Toolbar;
  private connectionPanel!: ConnectionPanel;
  private remoteCursors!: RemoteCursors;
  private settingsPanel!: SettingsPanel;
  private turtlePanel!: TurtlePanel;
  private turtleButton!: HTMLButtonElement;
  private turtleRuntime!: LuaRuntime;
  private turtleState!: TurtleState;
  private turtleDrawing!: TurtleDrawing;
  private turtleExecutor!: TurtleExecutor;
  private turtleIndicator!: TurtleIndicator;
  private turtlePlacing = false;
  private turtleOriginPlaced = false;
  private cursorManager!: CursorManager;
  private fpsCounter!: FpsCounter;
  private actionRegistry!: ActionRegistry;
  private cheatSheet!: CheatSheet;
  private autoSave!: { start(): void; stop(): void; saveNow(): Promise<void> | void };
  private canvas!: HTMLCanvasElement;
  private resizeObserver!: ResizeObserver;
  private animFrameId = 0;
  private keydownHandler!: (e: KeyboardEvent) => void;
  private pointermoveHandler!: (e: PointerEvent) => void;
  private beforeUnloadHandler!: () => void;
  private bookmarkPanel!: BookmarkPanel;
  private bookmarkButton!: HTMLButtonElement;
  private settingsButton!: HTMLButtonElement;
  private userColorIndicator!: HTMLDivElement;
  private connectionStateUnsubscribe: (() => void) | null = null;
  private gridStyle: GridStyle = "dots";
  private userPreferences: UserPreferences | null = null;
  private initialized = false;
  private callbacks: CanvasAppCallbacks = {};

  /**
   * Initializes all subsystems and starts the render loop.
   *
   * This must be called exactly once after construction. It loads the persisted
   * document (or creates a new one), sets up the WebGL renderer, camera, input
   * handlers, toolbar, collaboration manager, and begins the animation frame loop.
   *
   * @param drawingId - Unique identifier for the drawing to open or create.
   * @param callbacks - Optional lifecycle callbacks for navigation and rename events.
   * @throws {Error} If the canvas element (`#drawfinity-canvas`) is not found in the DOM.
   */
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
      // Reuse the DrawingManager from main.ts if provided, otherwise create a new one
      const drawingManager = (this.callbacks?.drawingManager as InstanceType<typeof DrawingManager>) ?? new DrawingManager();
      let loadedState = await loadDocumentById(drawingId, drawingManager);
      // Check localStorage for emergency backup from beforeunload
      // (async Tauri saves may not have completed before last page unload)
      if (!loadedState) {
        const backup = localStorage.getItem(`drawfinity:doc:${drawingId}`);
        if (backup) {
          try {
            const bytes = base64ToUint8(backup);
            loadedState = new Y.Doc();
            Y.applyUpdate(loadedState, bytes);
            console.log("CanvasApp: recovered drawing state from localStorage backup");
          } catch {
            loadedState = null;
          }
        }
      }
      this.doc = new DrawfinityDoc(loadedState ?? undefined);
      console.log(`CanvasApp: Tauri persistence loaded (${this.doc.getStrokes().length} strokes)`);
      const savePath = await getDefaultFilePath();
      this.autoSave = new AutoSave(this.doc.getDoc(), savePath, 2000, drawingId, drawingManager);
      this.autoSave.start();
    } catch (err) {
      // Browser fallback: use IndexedDB (via browserStorage) or localStorage
      const { createBrowserStorage } = await import("../persistence/BrowserStorage");
      type BrowserStorageType = Awaited<ReturnType<typeof createBrowserStorage>>;
      const storage = (this.callbacks?.browserStorage as BrowserStorageType) ?? await createBrowserStorage();
      console.log(`CanvasApp: Tauri unavailable, using ${storage.storageLabel} fallback`);

      const savedState = await storage.loadDocState(drawingId);
      if (savedState) {
        console.log(`CanvasApp: loading from ${storage.storageLabel} (${savedState.length} bytes)`);
        try {
          const loadedDoc = new Y.Doc();
          Y.applyUpdate(loadedDoc, savedState);
          this.doc = new DrawfinityDoc(loadedDoc);
          console.log(`CanvasApp: restored ${this.doc.getStrokes().length} strokes`);
        } catch (loadErr) {
          console.error("CanvasApp: failed to restore state, starting fresh", loadErr);
          this.doc = new DrawfinityDoc();
        }
      } else {
        console.log(`CanvasApp: no saved state for drawing "${drawingId}"`);
        this.doc = new DrawfinityDoc();
      }

      // Debounced auto-save to IndexedDB/localStorage
      const doc = this.doc;
      let saveTimer: ReturnType<typeof setTimeout> | null = null;
      const saveToBrowser = async () => {
        try {
          const state = Y.encodeStateAsUpdate(doc.getDoc());
          await storage.saveDocState(drawingId, state);
          console.log(`CanvasApp: saved to ${storage.storageLabel} (${state.length} bytes)`);
        } catch (saveErr) {
          console.error("CanvasApp: failed to save to browser storage", saveErr);
        }
      };
      const debouncedSave = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveToBrowser, 2000);
      };
      doc.getDoc().on("update", debouncedSave);

      this.autoSave = {
        start() {},
        stop() { if (saveTimer) clearTimeout(saveTimer); },
        async saveNow() {
          if (saveTimer) clearTimeout(saveTimer);
          await saveToBrowser();
        },
      };
    }

    // Apply initial background color from document
    this.renderer.setBackgroundColor(this.doc.getBackgroundColor());

    // React to background color changes (from local or remote edits)
    this.doc.onMetaChanged(() => {
      const bgColor = this.doc.getBackgroundColor();
      this.renderer.setBackgroundColor(bgColor);
      if (this.toolbar) {
        this.toolbar.setBackgroundColorUI(bgColor);
      }
    });

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

    let userProfile = await loadProfileAsync();
    let userPreferences = await loadPreferencesAsync();
    this.userPreferences = userPreferences;

    this.syncManager.setUser(userProfile);

    if (userPreferences.defaultBrush >= 0 && userPreferences.defaultBrush < BRUSH_PRESETS.length) {
      this.toolManager.setBrush(BRUSH_PRESETS[userPreferences.defaultBrush]);
    }
    this.toolManager.setColor(userPreferences.defaultColor);
    this.gridStyle = userPreferences.gridStyle ?? "dots";
    this.renderer.setGridStyle(this.gridStyle);

    this.strokeCapture = new StrokeCapture(this.camera, this.cameraController, this.doc, canvas);
    this.strokeCapture.setBrushConfig(this.toolManager.getBrush());
    this.shapeCapture = new ShapeCapture(this.camera, this.cameraController, this.doc, canvas);
    this.shapeCapture.setEnabled(false);
    this.magnifyCapture = new MagnifyCapture(this.camera, this.cameraAnimator, this.cameraController, canvas);
    this.magnifyCapture.setEnabled(false);
    this.magnifyCapture.onCursorChange = (mode) => this.cursorManager.setMagnifyMode(mode);
    this.undoManager = new UndoManager(this.doc.getStrokesArray());
    this.strokeCapture.setUndoManager(this.undoManager);

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
        // Deactivate pan/magnify mode if switching from those tools
        const currentTool = this.toolManager.getTool();
        if (currentTool === "pan") {
          this.cameraController.panToolActive = false;
        }
        if (currentTool === "magnify") {
          this.magnifyCapture.setEnabled(false);
        }
        this.toolManager.setTool("brush");
        this.toolManager.setBrush(brush);
        this.shapeCapture.setEnabled(false);
        this.magnifyCapture.setEnabled(false);
        this.strokeCapture.setEnabled(true);
        this.strokeCapture.setTool("brush");
        this.strokeCapture.setBrushConfig(this.toolManager.getBrush());
        this.toolbar.setToolUI("brush");
        this.toolbar.setBrushSize(this.toolManager.getBrush().baseWidth);
        this.cursorManager.setTool("brush");
        this.cursorManager.setBrushWidth(this.toolManager.getBrush().baseWidth);
      },
      onColorChange: (color) => {
        this.toolManager.setColor(color);
        this.strokeCapture.setColor(color);
        this.shapeCapture.setConfig({ strokeColor: color });
      },
      onToolChange: (tool: ToolType) => {
        this.switchTool(tool);
      },
      onUndo: () => this.doUndo(),
      onRedo: () => this.doRedo(),
      onBrushSizeChange: (size) => {
        const brush = this.toolManager.getBrush();
        brush.baseWidth = size;
        this.strokeCapture.setBrushConfig(brush);
        this.shapeCapture.setConfig({ strokeWidth: brush.baseWidth });
        this.cursorManager.setBrushWidth(brush.baseWidth);
      },
      onOpacityChange: (opacity) => {
        this.toolManager.setOpacity(opacity);
        this.applyOpacityToBrush();
        this.shapeCapture.setConfig({ opacity });
      },
      onGridStyleChange: (style) => {
        this.gridStyle = style;
        this.renderer.setGridStyle(style);
        this.persistGridStyle(style);
      },
      onHome: () => this.callbacks.onGoHome?.(),
      onRenameDrawing: (name) => {
        this.callbacks.onRenameDrawing?.(this.drawingId, name);
      },
      onExport: (options: ExportDialogResult) => this.handleExport(options),
      onCheatSheet: () => this.cheatSheet.toggle(),
      onZoomIn: () => {
        const [vw, vh] = this.camera.getViewportSize();
        this.cameraAnimator.animateZoomTo(this.camera.zoom * 1.5, vw / 2, vh / 2);
      },
      onZoomOut: () => {
        const [vw, vh] = this.camera.getViewportSize();
        this.cameraAnimator.animateZoomTo(this.camera.zoom / 1.5, vw / 2, vh / 2);
      },
      onZoomReset: () => this.cameraAnimator.animateZoomCentered(1),
      onFitAll: () => this.fitAllContent(),
      onBackgroundColorChange: (color) => {
        this.doc.setBackgroundColor(color);
      },
      onShapeConfigChange: (config) => {
        this.toolManager.setShapeConfig(config);
        if (isShapeTool(this.toolManager.getTool())) {
          this.shapeCapture.setConfig({
            shapeType: this.toolManager.getTool() as "rectangle" | "ellipse" | "polygon" | "star",
            strokeColor: this.toolManager.getColor(),
            strokeWidth: this.toolManager.getBrush().baseWidth,
            fillColor: this.toolManager.getShapeConfig().fillColor,
            opacity: this.toolManager.getOpacity(),
            sides: this.toolManager.getShapeConfig().sides,
            starInnerRadius: this.toolManager.getShapeConfig().starInnerRadius,
          });
        }
      },
    });

    this.toolbar.setShapeConfig(this.toolManager.getShapeConfig());
    this.toolbar.setGridStyle(this.gridStyle);

    if (userPreferences.defaultBrush >= 0 && userPreferences.defaultBrush < BRUSH_PRESETS.length) {
      this.toolbar.selectBrush(userPreferences.defaultBrush);
    }
    this.toolbar.setColorUI(userPreferences.defaultColor);
    this.toolbar.setBackgroundColorUI(this.doc.getBackgroundColor());

    // Connection panel
    this.connectionPanel = new ConnectionPanel(this.syncManager, {
      onLeaveSession: () => this.callbacks.onGoHome?.(),
    });

    // Remote cursors overlay
    this.remoteCursors = new RemoteCursors(document.body, this.camera);
    this.remoteCursors.attach(this.syncManager);

    // Settings panel
    this.settingsPanel = new SettingsPanel(userProfile, userPreferences, {
      onSave: (profile, preferences) => {
        userProfile = profile;
        userPreferences = preferences;
        this.userPreferences = preferences;
        this.syncManager.setUser(profile);
        if (preferences.defaultBrush >= 0 && preferences.defaultBrush < BRUSH_PRESETS.length) {
          this.toolManager.setBrush(BRUSH_PRESETS[preferences.defaultBrush]);
          this.strokeCapture.setBrushConfig(this.toolManager.getBrush());
          this.toolbar.selectBrush(preferences.defaultBrush);
          this.cursorManager.setBrushWidth(this.toolManager.getBrush().baseWidth);
        }
        this.toolManager.setColor(preferences.defaultColor);
        this.strokeCapture.setColor(preferences.defaultColor);
        this.shapeCapture.setConfig({ strokeColor: preferences.defaultColor });
        this.toolbar.setColorUI(preferences.defaultColor);
        this.renderer.setGridStyle(preferences.gridStyle ?? "dots");
        this.gridStyle = preferences.gridStyle ?? "dots";
        this.toolbar.setGridStyle(this.gridStyle);
        this.updateUserColorIndicator(userProfile);
      },
    });

    // Bookmark panel
    this.bookmarkPanel = new BookmarkPanel(this.doc, this.camera, {
      onNavigate: (bm) => {
        this.cameraAnimator.animateTo(bm.x, bm.y, bm.zoom);
      },
      getUserId: () => userProfile.id ?? "local",
      getUserName: () => userProfile.name,
      resolveUserName: (userId) => {
        const remoteUsers = this.syncManager.getRemoteUsers();
        const found = remoteUsers.find((u) => u.id === userId);
        return found?.name;
      },
      isCollaborating: () => this.syncManager.getConnectionState() === "connected",
    });

    // Refresh bookmark panel when remote users change (to update creator names)
    this.syncManager.onRemoteUsersChange(() => {
      if (this.bookmarkPanel.isVisible()) {
        this.bookmarkPanel.refreshList();
      }
    });

    // Action registry + cheat sheet
    this.actionRegistry = new ActionRegistry();
    this.registerActions();
    this.cheatSheet = new CheatSheet(this.actionRegistry);

    // Bookmark toggle button (in navigation group)
    this.bookmarkButton = document.createElement("button");
    this.bookmarkButton.className = "toolbar-btn bookmark-btn";
    this.bookmarkButton.title = "Bookmarks (Ctrl+B)";
    this.bookmarkButton.innerHTML = ICONS.bookmark;
    this.bookmarkButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.bookmarkPanel.toggle();
    });
    const navGroup = this.toolbar.getGroup("navigation");
    if (navGroup) {
      navGroup.appendChild(this.bookmarkButton);
    }

    // Turtle graphics pipeline
    this.turtleRuntime = new LuaRuntime();
    this.turtleState = new TurtleState();
    this.turtleDrawing = new TurtleDrawing(this.doc);
    this.turtleIndicator = new TurtleIndicator(canvas.parentElement!, this.camera, this.turtleState);
    this.turtleExecutor = new TurtleExecutor(this.turtleRuntime, this.turtleState, this.turtleDrawing, {
      onPrint: (msg) => this.turtlePanel.appendConsole(msg, "output"),
      onStart: () => {
        this.turtlePanel.setRunning(true);
        this.turtleButton.classList.add("turtle-executing");
        this.turtleIndicator.show();
      },
      onStep: () => {
        this.turtleIndicator.update();
      },
      onComplete: (result) => {
        this.turtlePanel.setRunning(false);
        this.turtleButton.classList.remove("turtle-executing");
        this.turtleIndicator.hide();
        if (!result.success && result.error) {
          this.turtlePanel.appendConsole(`Error: ${result.error}`, "error");
        } else {
          this.turtlePanel.appendConsole("Done.", "info");
        }
      },
    });
    this.turtleRuntime.init();

    this.turtlePanel = new TurtlePanel(drawingId, {
      onRun: (script) => {
        this.turtlePanel.clearConsole();
        // Only set origin to camera center if not explicitly placed
        if (!this.turtleOriginPlaced) {
          this.turtleState.setOrigin(this.camera.x, this.camera.y);
        }
        this.turtleExecutor.run(script);
      },
      onStop: () => {
        this.turtleExecutor.stop();
      },
      onSpeedChange: (speed) => {
        this.turtleState.speed = speed;
      },
      onPlaceRequest: () => {
        this.turtlePlacing = !this.turtlePlacing;
        this.turtlePanel.setPlacing(this.turtlePlacing);
        if (this.turtlePlacing) {
          this.turtlePanel.hide();
          canvas.style.cursor = "crosshair";
          const clickHandler = (e: PointerEvent) => {
            if (!this.turtlePlacing) return;
            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const [vw, vh] = this.camera.getViewportSize();
            const worldX = (screenX - vw / 2) / this.camera.zoom + this.camera.x;
            const worldY = (screenY - vh / 2) / this.camera.zoom + this.camera.y;
            this.turtleState.setOrigin(worldX, worldY);
            this.turtleState.x = worldX;
            this.turtleState.y = worldY;
            this.turtleOriginPlaced = true;
            this.turtlePlacing = false;
            this.turtlePanel.setPlacing(false);
            canvas.style.cursor = "";
            this.cursorManager.updateCursor();
            // Flash the indicator briefly at the placed position
            this.turtleIndicator.show();
            setTimeout(() => {
              if (!this.turtleExecutor.isRunning()) {
                this.turtleIndicator.hide();
              }
            }, 1500);
            this.turtlePanel.show();
            this.turtlePanel.appendConsole(`Origin set to (${Math.round(worldX)}, ${Math.round(worldY)})`, "info");
            canvas.removeEventListener("pointerdown", clickHandler);
          };
          canvas.addEventListener("pointerdown", clickHandler);
        }
      },
    });

    // Turtle toolbar button
    this.turtleButton = document.createElement("button");
    this.turtleButton.className = "toolbar-btn turtle-btn";
    this.turtleButton.title = "Turtle graphics (Ctrl+`)";
    this.turtleButton.innerHTML = ICONS.turtle;
    this.turtleButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.turtlePanel.toggle();
    });
    const panelsGroup = this.toolbar.getGroup("panels");
    if (panelsGroup) {
      panelsGroup.appendChild(this.turtleButton);
    }

    // Settings gear button
    this.settingsButton = document.createElement("button");
    this.settingsButton.className = "toolbar-btn settings-btn";
    this.settingsButton.title = "Settings (Ctrl+,)";
    this.settingsButton.innerHTML = ICONS.settings;
    this.settingsButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.settingsPanel.toggle();
    });
    if (panelsGroup) {
      panelsGroup.appendChild(this.settingsButton);
    }

    // User color indicator
    this.userColorIndicator = document.createElement("div");
    this.userColorIndicator.className = "user-color-indicator";
    this.userColorIndicator.style.display = "none";
    this.userColorIndicator.style.backgroundColor = userProfile.color;
    this.userColorIndicator.title = userProfile.name;
    if (panelsGroup) {
      panelsGroup.appendChild(this.userColorIndicator);
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
      // Synchronously save Yjs state to localStorage as emergency backup.
      // The async autoSave.saveNow() may not complete before the page unloads
      // (especially in Tauri mode where saves go through async IPC).
      try {
        const state = Y.encodeStateAsUpdate(this.doc.getDoc());
        const b64 = uint8ToBase64(state);
        localStorage.setItem(`drawfinity:doc:${this.drawingId}`, b64);
        console.log(`CanvasApp: beforeunload saved ${state.length} bytes to localStorage`);
      } catch (e) {
        console.error("CanvasApp: beforeunload save failed", e);
      }
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
      this.renderer.drawGrid(cameraMatrix, viewportBounds, this.camera.zoom);

      const allStrokes = this.doc.getStrokes();
      const currentZoom = this.camera.zoom;
      const vertexCache = this.renderer.vertexCache;
      const shapeVertexCache = this.renderer.shapeVertexCache;

      // Render all items interleaved by document order (timestamp).
      // Batch consecutive same-type items to minimize draw mode switches.
      const visibleItems = this.spatialIndex.queryAll(viewportBounds);
      let visibleStrokeCount = 0;

      let pendingStrips: Float32Array[] = [];
      let pendingShapeFills: Float32Array[] = [];
      let pendingShapeOutlines: Float32Array[] = [];
      let lastKind: "stroke" | "shape" | null = null;

      const flushBatch = (): void => {
        if (pendingShapeFills.length > 0) this.renderer.drawShapeFillBatch(pendingShapeFills);
        if (pendingShapeOutlines.length > 0) this.renderer.drawShapeOutlineBatch(pendingShapeOutlines);
        if (pendingStrips.length > 0) this.renderer.drawStrokeBatch(pendingStrips);
        pendingStrips = [];
        pendingShapeFills = [];
        pendingShapeOutlines = [];
      };

      for (const ci of visibleItems) {
        if (ci.kind !== lastKind && lastKind !== null) {
          flushBatch();
        }
        lastKind = ci.kind;

        if (ci.kind === "stroke") {
          visibleStrokeCount++;
          const stroke = ci.item;
          const rgba = hexToRgba(stroke.color);
          rgba[3] = stroke.opacity ?? 1.0;
          const lodPoints = getStrokeLOD(stroke.id, stroke.points, currentZoom);
          const data = vertexCache.get(stroke.id, lodPoints, rgba, stroke.width, currentZoom);
          if (data) pendingStrips.push(data);
        } else {
          const shape = ci.item;
          const vd = shapeVertexCache.get(shape);
          if (vd.fill) pendingShapeFills.push(vd.fill);
          if (vd.outline) pendingShapeOutlines.push(vd.outline);
        }
      }
      flushBatch();

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

      this.fpsCounter.update(now, allStrokes.length, visibleStrokeCount);
      this.animFrameId = requestAnimationFrame(frame);
    };
    this.animFrameId = requestAnimationFrame(frame);

    this.initialized = true;
    console.log("CanvasApp: initialized for drawing", drawingId);
  }

  /**
   * Tears down all subsystems and releases resources.
   *
   * Stops the render loop, flushes pending auto-save data to disk, disconnects
   * from any active collaboration session, removes all DOM event listeners, and
   * destroys UI components and the WebGL context. Safe to call if {@link init}
   * was never called (no-op in that case).
   */
  async destroy(): Promise<void> {
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

    // Stop auto-save and flush final state to disk
    this.autoSave.stop();
    await this.autoSave.saveNow();

    // Disconnect collaboration
    this.remoteCursors.detach();
    this.syncManager.disconnect();
    this.syncManager.destroy();

    // Clean up UI components
    this.toolbar.destroy();
    this.connectionPanel.destroy();
    this.settingsPanel.destroy();
    this.bookmarkPanel.destroy();
    this.turtlePanel.destroy();
    this.turtleIndicator.destroy();
    this.turtleRuntime.close();
    this.cheatSheet.destroy();
    this.fpsCounter.destroy();
    this.bookmarkButton.remove();
    this.settingsButton.remove();
    this.turtleButton.remove();
    this.userColorIndicator.remove();

    if (this.connectionStateUnsubscribe) {
      this.connectionStateUnsubscribe();
      this.connectionStateUnsubscribe = null;
    }

    // Clean up input
    this.strokeCapture.destroy();
    this.shapeCapture.destroy();
    this.magnifyCapture.destroy();
    this.cameraController.destroy();

    // Clean up resize observer
    this.resizeObserver.disconnect();

    // Clean up renderer (WebGL context)
    this.renderer.destroy();

    this.initialized = false;
    console.log("CanvasApp: destroyed");
  }

  /** Returns the unique identifier of the currently open drawing. */
  getCurrentDrawingId(): string {
    return this.drawingId;
  }

  /** Returns the Yjs-backed CRDT document that holds all strokes, shapes, and metadata. */
  getDoc(): DrawfinityDoc {
    return this.doc;
  }

  /**
   * Updates the drawing name displayed in the toolbar title area.
   *
   * @param name - The new display name for the drawing.
   */
  setDrawingName(name: string): void {
    this.toolbar.setDrawingName(name);
  }

  /**
   * Joins a collaboration room and begins syncing document state with remote peers.
   *
   * @param serverUrl - WebSocket server URL (e.g. `"ws://localhost:8080"`).
   * @param roomId - Unique room identifier used as the sync channel.
   * @param roomName - Optional human-readable room name shown in the connection panel.
   */
  connectToRoom(serverUrl: string, roomId: string, roomName?: string): void {
    this.connectionPanel.setRoomInfo(roomId, roomName);
    this.syncManager.connect(serverUrl, roomId);
  }

  private switchTool(tool: ToolType): void {
    // Deactivate pan tool if switching away from it
    if (this.toolManager.getTool() === "pan" && tool !== "pan") {
      this.cameraController.panToolActive = false;
    }

    this.toolManager.setTool(tool);

    if (tool === "magnify") {
      this.strokeCapture.setEnabled(false);
      this.shapeCapture.setEnabled(false);
      this.magnifyCapture.setEnabled(true);
      this.cameraController.panToolActive = false;
      this.toolbar.setToolUI(tool);
      this.cursorManager.setTool("magnify");
    } else if (tool === "pan") {
      this.strokeCapture.setEnabled(false);
      this.shapeCapture.setEnabled(false);
      this.magnifyCapture.setEnabled(false);
      this.cameraController.panToolActive = true;
      this.toolbar.setToolUI(tool);
      this.cursorManager.setTool("pan");
    } else if (isShapeTool(tool)) {
      this.strokeCapture.setTool("brush");
      this.strokeCapture.setEnabled(false);
      this.shapeCapture.setEnabled(true);
      this.magnifyCapture.setEnabled(false);
      this.shapeCapture.setConfig({
        shapeType: tool,
        strokeColor: this.toolManager.getColor(),
        strokeWidth: this.toolManager.getBrush().baseWidth,
        fillColor: this.toolManager.getShapeConfig().fillColor,
        opacity: this.toolManager.getOpacity(),
        sides: this.toolManager.getShapeConfig().sides,
        starInnerRadius: this.toolManager.getShapeConfig().starInnerRadius,
      });
      this.toolbar.setToolUI(tool);
      this.cursorManager.setTool("brush");
    } else {
      this.shapeCapture.setEnabled(false);
      this.magnifyCapture.setEnabled(false);
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

  /** Apply the current opacity multiplier to the active brush's opacityCurve and update StrokeCapture. */
  private applyOpacityToBrush(): void {
    const brush = this.toolManager.getBrush();
    const userOpacity = this.toolManager.getOpacity();
    const presetIndex = this.toolbar.getActiveBrushIndex();
    const originalCurve = BRUSH_PRESETS[presetIndex].opacityCurve;
    brush.opacityCurve = (p: number) => originalCurve(p) * userOpacity;
    this.strokeCapture.setBrushConfig(brush);
  }

  private toggleGrid(): void {
    if (this.gridStyle === "none") {
      this.gridStyle = this.toolbar.getLastNonNoneGridStyle();
    } else {
      this.gridStyle = "none";
    }
    this.renderer.setGridStyle(this.gridStyle);
    this.toolbar.setGridStyle(this.gridStyle);
    this.persistGridStyle(this.gridStyle);
  }

  private persistGridStyle(style: GridStyle): void {
    if (this.userPreferences) {
      this.userPreferences.gridStyle = style;
      savePreferences(this.userPreferences);
    }
  }

  private fitAllContent(): void {
    const strokes = this.doc.getStrokes();
    const shapes = this.doc.getShapes ? this.doc.getShapes() : [];
    if (strokes.length === 0 && shapes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of strokes) {
      for (const pt of stroke.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }
    }
    for (const shape of shapes) {
      if (shape.x < minX) minX = shape.x;
      if (shape.y < minY) minY = shape.y;
      if (shape.x + shape.width > maxX) maxX = shape.x + shape.width;
      if (shape.y + shape.height > maxY) maxY = shape.y + shape.height;
    }

    if (minX === Infinity) return;
    this.cameraAnimator.animateToFit(minX, minY, maxX, maxY);
  }

  private handleExport(options: ExportDialogResult): void {
    const strokes = this.doc.getStrokes();
    const shapes = this.doc.getShapes ? this.doc.getShapes() : [];

    const canvas = renderExport(strokes, shapes, {
      scope: options.scope,
      scale: options.scale,
      includeBackground: options.includeBackground,
      viewportBounds: this.camera.getViewportBounds(),
      viewportMatrix: this.camera.getTransformMatrix(),
      viewportSize: this.camera.getViewportSize(),
    });

    if (!canvas) {
      console.warn("Export: nothing to export");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadCanvas(canvas, `drawfinity-${timestamp}.png`);
  }

  private updateUserColorIndicator(profile: { color: string; name: string }): void {
    this.userColorIndicator.style.backgroundColor = profile.color;
    this.userColorIndicator.title = profile.name;
  }

  private registerActions(): void {
    const r = this.actionRegistry;

    // Tools
    r.register({ id: "tool-brush", label: "Brush", shortcut: "B", category: "Tools", execute: () => this.switchTool("brush") });
    r.register({ id: "tool-eraser", label: "Eraser", shortcut: "E", category: "Tools", execute: () => this.switchTool("eraser") });
    r.register({ id: "tool-rectangle", label: "Rectangle", shortcut: "R", category: "Tools", execute: () => this.switchTool("rectangle") });
    r.register({ id: "tool-ellipse", label: "Ellipse", shortcut: "O", category: "Tools", execute: () => this.switchTool("ellipse") });
    r.register({ id: "tool-polygon", label: "Polygon", shortcut: "P", category: "Tools", execute: () => this.switchTool("polygon") });
    r.register({ id: "tool-star", label: "Star", shortcut: "S", category: "Tools", execute: () => this.switchTool("star") });
    r.register({ id: "tool-pan", label: "Pan/Zoom", shortcut: "G", category: "Tools", execute: () => {
      if (this.toolManager.getTool() === "pan") {
        this.switchTool(this.toolbar.getPreviousTool());
      } else {
        this.switchTool("pan");
      }
    }});
    r.register({ id: "tool-magnify", label: "Magnify", shortcut: "Z", category: "Tools", execute: () => this.switchTool("magnify") });

    // Drawing
    r.register({ id: "brush-preset-1", label: "Pen preset", shortcut: "1", category: "Drawing", execute: () => this.switchBrush(0) });
    r.register({ id: "brush-preset-2", label: "Pencil preset", shortcut: "2", category: "Drawing", execute: () => this.switchBrush(1) });
    r.register({ id: "brush-preset-3", label: "Marker preset", shortcut: "3", category: "Drawing", execute: () => this.switchBrush(2) });
    r.register({ id: "brush-preset-4", label: "Highlighter preset", shortcut: "4", category: "Drawing", execute: () => this.switchBrush(3) });
    r.register({ id: "brush-size-down", label: "Decrease brush size", shortcut: "[", category: "Drawing", execute: () => {
      const brush = this.toolManager.getBrush();
      brush.baseWidth = Math.max(0.5, brush.baseWidth - 1);
      this.strokeCapture.setBrushConfig(brush);
      this.shapeCapture.setConfig({ strokeWidth: brush.baseWidth });
      this.cursorManager.setBrushWidth(brush.baseWidth);
      this.toolbar.setBrushSize(brush.baseWidth);
    }});
    r.register({ id: "brush-size-up", label: "Increase brush size", shortcut: "]", category: "Drawing", execute: () => {
      const brush = this.toolManager.getBrush();
      brush.baseWidth = Math.min(64, brush.baseWidth + 1);
      this.strokeCapture.setBrushConfig(brush);
      this.shapeCapture.setConfig({ strokeWidth: brush.baseWidth });
      this.cursorManager.setBrushWidth(brush.baseWidth);
      this.toolbar.setBrushSize(brush.baseWidth);
    }});
    r.register({ id: "undo", label: "Undo", shortcut: "Ctrl+Z", category: "Drawing", execute: () => this.doUndo() });
    r.register({ id: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z", category: "Drawing", execute: () => this.doRedo() });

    // Navigation
    r.register({ id: "zoom-in", label: "Zoom in", shortcut: "Ctrl+=", category: "Navigation", execute: () => {
      const [vw, vh] = this.camera.getViewportSize();
      this.cameraAnimator.animateZoomTo(this.camera.zoom * 1.5, vw / 2, vh / 2);
    }});
    r.register({ id: "zoom-out", label: "Zoom out", shortcut: "Ctrl+\u2212", category: "Navigation", execute: () => {
      const [vw, vh] = this.camera.getViewportSize();
      this.cameraAnimator.animateZoomTo(this.camera.zoom / 1.5, vw / 2, vh / 2);
    }});
    r.register({ id: "zoom-reset", label: "Reset zoom", shortcut: "Ctrl+0", category: "Navigation", execute: () => this.cameraAnimator.animateZoomCentered(1) });
    r.register({ id: "fit-all", label: "Fit all content", shortcut: "", category: "Navigation", execute: () => this.fitAllContent() });
    r.register({ id: "go-home", label: "Go home", shortcut: "Escape", category: "Navigation", execute: () => this.callbacks.onGoHome?.() });

    // Panels
    r.register({ id: "toggle-bookmarks", label: "Bookmarks panel", shortcut: "Ctrl+B", category: "Panels", execute: () => this.bookmarkPanel.toggle() });
    r.register({ id: "quick-add-bookmark", label: "Add bookmark", shortcut: "Ctrl+D", category: "Panels", execute: () => this.bookmarkPanel.addBookmark() });
    r.register({ id: "toggle-connection", label: "Connection panel", shortcut: "Ctrl+K", category: "Panels", execute: () => this.connectionPanel.toggle() });
    r.register({ id: "toggle-settings", label: "Settings", shortcut: "Ctrl+,", category: "Panels", execute: () => this.settingsPanel.toggle() });
    r.register({ id: "toggle-turtle", label: "Turtle graphics", shortcut: "Ctrl+`", category: "Panels", execute: () => this.turtlePanel.toggle() });
    r.register({ id: "toggle-cheatsheet", label: "Keyboard shortcuts", shortcut: "Ctrl+?", category: "Panels", execute: () => this.cheatSheet.toggle() });
    r.register({ id: "toggle-grid", label: "Toggle grid", shortcut: "Ctrl+'", category: "Navigation", execute: () => this.toggleGrid() });
    r.register({ id: "toggle-fps", label: "FPS counter", shortcut: "F3", category: "Panels", execute: () => this.fpsCounter.toggle() });

    // Export
    r.register({ id: "export", label: "Export PNG", shortcut: "Ctrl+Shift+E", category: "Drawing", execute: () => {
      this.handleExport({ scope: "fitAll", scale: 1, includeBackground: true });
    }});
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

    if (mod && (e.key === "b" || e.key === "B") && !e.shiftKey) {
      e.preventDefault();
      this.bookmarkPanel.toggle();
      return;
    }

    if (mod && (e.key === "d" || e.key === "D") && !e.shiftKey) {
      e.preventDefault();
      this.bookmarkPanel.addBookmark();
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

    if (mod && e.key === "`") {
      e.preventDefault();
      this.turtlePanel.toggle();
      return;
    }

    if (mod && e.key === "'") {
      e.preventDefault();
      this.toggleGrid();
      return;
    }

    if (mod && (e.key === "?" || (e.key === "/" && e.shiftKey))) {
      e.preventDefault();
      this.cheatSheet.toggle();
      return;
    }

    if (mod && e.shiftKey && (e.key === "e" || e.key === "E")) {
      e.preventDefault();
      this.handleExport({ scope: "fitAll", scale: 1, includeBackground: true });
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
    } else if (e.key === "g" || e.key === "G") {
      if (this.toolManager.getTool() === "pan") {
        this.switchTool(this.toolbar.getPreviousTool());
      } else {
        this.switchTool("pan");
      }
    } else if (e.key === "z" || e.key === "Z") {
      this.switchTool("magnify");
    }

    if (e.key >= "1" && e.key <= "4") {
      this.switchBrush(parseInt(e.key) - 1);
    }

    if (e.key === "[") {
      const brush = this.toolManager.getBrush();
      brush.baseWidth = Math.max(0.5, brush.baseWidth - 1);
      this.strokeCapture.setBrushConfig(brush);
      this.shapeCapture.setConfig({ strokeWidth: brush.baseWidth });
      this.cursorManager.setBrushWidth(brush.baseWidth);
      this.toolbar.setBrushSize(brush.baseWidth);
    } else if (e.key === "]") {
      const brush = this.toolManager.getBrush();
      brush.baseWidth = Math.min(64, brush.baseWidth + 1);
      this.strokeCapture.setBrushConfig(brush);
      this.shapeCapture.setConfig({ strokeWidth: brush.baseWidth });
      this.cursorManager.setBrushWidth(brush.baseWidth);
      this.toolbar.setBrushSize(brush.baseWidth);
    }
  }
}
