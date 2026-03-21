import { CanvasApp } from "../canvas";
import { HomeScreen, HomeScreenCallbacks } from "./HomeScreen";
import type { DrawingMetadata } from "../persistence/DrawingManifest";

/**
 * Union type representing the two top-level application view states.
 *
 * - `"home"` — The drawing list / home screen where users browse, create, and manage drawings.
 * - `"canvas"` — The infinite canvas drawing view where a single drawing is open for editing.
 *
 * Used by {@link ViewManager} to track and transition between views.
 */
export type ViewName = "home" | "canvas";

/**
 * Dependency injection interface for {@link ViewManager}.
 *
 * Provides the persistence and drawing management callbacks that ViewManager
 * needs to orchestrate transitions between the home screen and canvas views.
 * All drawing CRUD operations are supplied externally, allowing ViewManager
 * to remain decoupled from the persistence layer.
 *
 * @property listDrawings - Fetches all available drawings for the home screen listing.
 * @property createDrawing - Creates a new drawing with the given name and returns its metadata.
 * @property deleteDrawing - Permanently deletes a drawing by its unique ID.
 * @property renameDrawing - Renames an existing drawing identified by ID.
 * @property duplicateDrawing - Creates a copy of a drawing with a new name.
 * @property getSaveDirectory - Returns the current directory path where drawings are stored.
 * @property onChangeSaveDirectory - Optional callback to prompt the user to select a new save directory.
 *   Returns the new path if changed, or `null` if the user cancelled.
 * @property getDrawingName - Optional callback to resolve a drawing's display name from its ID.
 */
export interface ViewManagerDeps {
  listDrawings: () => Promise<DrawingMetadata[]>;
  createDrawing: (name: string) => Promise<DrawingMetadata>;
  deleteDrawing: (id: string) => Promise<void>;
  renameDrawing: (id: string, name: string) => Promise<void>;
  duplicateDrawing: (id: string, newName: string) => Promise<DrawingMetadata>;
  getSaveDirectory: () => Promise<string>;
  onChangeSaveDirectory?: () => Promise<string | null>;
  getDrawingName?: (id: string) => Promise<string>;
  /** When provided, the shared DrawingManager is passed to CanvasApp to avoid stale manifest caches. */
  drawingManager?: unknown;
}

/**
 * Manages transitions between the home screen and canvas drawing views.
 *
 * ViewManager orchestrates the application's two top-level view states: the home
 * screen (where users browse and manage drawings) and the canvas (where a single
 * drawing is open for editing). It handles the lifecycle of {@link CanvasApp} instances,
 * ensuring proper cleanup when switching views, and guards against concurrent
 * transitions with an internal lock.
 *
 * @param canvasContainer - The DOM element that hosts the canvas drawing view.
 * @param deps - Persistence and drawing management callbacks injected via {@link ViewManagerDeps}.
 *
 * @example
 * ```ts
 * const viewManager = new ViewManager(document.getElementById("canvas")!, {
 *   listDrawings: () => manifest.list(),
 *   createDrawing: (name) => manifest.create(name),
 *   deleteDrawing: (id) => manifest.delete(id),
 *   renameDrawing: (id, name) => manifest.rename(id, name),
 *   duplicateDrawing: (id, name) => manifest.duplicate(id, name),
 *   getSaveDirectory: () => manifest.getDirectory(),
 * });
 *
 * // Open a drawing on the canvas
 * await viewManager.showCanvas("drawing-123");
 *
 * // Return to the home screen
 * await viewManager.showHome();
 * ```
 */
export class ViewManager {
  private currentView: ViewName = "home";
  private canvasApp: CanvasApp | null = null;
  private homeScreen: HomeScreen;
  private deps: ViewManagerDeps;
  private canvasContainer: HTMLElement;
  private transitioning = false;

  constructor(canvasContainer: HTMLElement, deps: ViewManagerDeps) {
    this.deps = deps;
    this.canvasContainer = canvasContainer;

    const callbacks: HomeScreenCallbacks = {
      onOpenDrawing: (id: string) => this.showCanvas(id),
      onCreateDrawing: async () => {
        const drawing = await deps.createDrawing("Untitled");
        this.showCanvas(drawing.id);
        return drawing;
      },
      onDeleteDrawing: (id: string) => deps.deleteDrawing(id),
      onRenameDrawing: (id: string, name: string) =>
        deps.renameDrawing(id, name),
      onDuplicateDrawing: (id: string, newName: string) =>
        deps.duplicateDrawing(id, newName),
      onChangeSaveDirectory: deps.onChangeSaveDirectory,
      onJoinRoom: (roomId: string, serverUrl: string, roomName?: string) =>
        this.showCanvasWithRoom(roomId, serverUrl, roomName),
    };

    this.homeScreen = new HomeScreen(callbacks);
    this.canvasContainer.style.display = "none";
  }

  /**
   * Transitions the application to the home screen view.
   *
   * Destroys the active {@link CanvasApp} instance (if any), hides the canvas
   * container, refreshes the drawing list from persistence, and displays the
   * home screen. If a transition is already in progress, the call is silently
   * ignored to prevent concurrent view changes.
   *
   * @returns A promise that resolves once the home screen is fully displayed.
   */
  async showHome(): Promise<void> {
    if (this.transitioning) return;
    this.transitioning = true;

    try {
      // Destroy current canvas app if active
      if (this.canvasApp) {
        await this.canvasApp.destroy();
        this.canvasApp = null;
      }

      // Hide canvas container
      this.canvasContainer.style.display = "none";

      // Refresh drawing list and show home screen
      const drawings = await this.deps.listDrawings();
      this.homeScreen.setDrawings(drawings);

      const saveDir = await this.deps.getSaveDirectory();
      this.homeScreen.setSaveDirectory(saveDir);

      this.homeScreen.show();
      this.currentView = "home";
    } finally {
      this.transitioning = false;
    }
  }

  /**
   * Transitions the application to the canvas view for a specific drawing.
   *
   * Hides the home screen, destroys any previously active {@link CanvasApp}
   * instance, and initializes a new one for the given drawing. The canvas
   * container is made visible and the drawing name is resolved and displayed
   * in the toolbar (if a {@link ViewManagerDeps.getDrawingName} callback is
   * provided). If a transition is already in progress, the call is silently
   * ignored to prevent concurrent view changes.
   *
   * @param drawingId - The unique identifier of the drawing to open.
   * @returns A promise that resolves once the canvas is fully initialized
   *   and the drawing is ready for editing.
   */
  async showCanvas(drawingId: string): Promise<void> {
    if (this.transitioning) return;
    this.transitioning = true;

    try {
      // Hide home screen
      this.homeScreen.hide();

      // Destroy previous canvas app if any
      if (this.canvasApp) {
        await this.canvasApp.destroy();
        this.canvasApp = null;
      }

      // Show canvas container and init app
      this.canvasContainer.style.display = "block";
      this.canvasApp = new CanvasApp();
      await this.canvasApp.init(drawingId, {
        onGoHome: () => this.showHome(),
        onRenameDrawing: (id, name) => this.deps.renameDrawing(id, name),
        drawingManager: this.deps.drawingManager,
      });

      // Set drawing name in toolbar
      if (this.deps.getDrawingName) {
        const name = await this.deps.getDrawingName(drawingId);
        this.canvasApp.setDrawingName(name);
      }

      this.currentView = "canvas";
    } finally {
      this.transitioning = false;
    }
  }

  private async showCanvasWithRoom(
    roomId: string,
    serverUrl: string,
    roomName?: string,
  ): Promise<void> {
    if (this.transitioning) return;
    this.transitioning = true;

    try {
      // Hide home screen
      this.homeScreen.hide();

      // Destroy previous canvas app if any
      if (this.canvasApp) {
        await this.canvasApp.destroy();
        this.canvasApp = null;
      }

      // Show canvas container and init app with room ID as drawing ID
      this.canvasContainer.style.display = "block";
      this.canvasApp = new CanvasApp();
      await this.canvasApp.init(roomId, {
        onGoHome: () => this.showHome(),
        onRenameDrawing: (id, name) => this.deps.renameDrawing(id, name),
        drawingManager: this.deps.drawingManager,
      });

      // Connect to the room
      this.canvasApp.connectToRoom(serverUrl, roomId, roomName);
      this.canvasApp.setDrawingName(roomName || roomId);

      this.currentView = "canvas";
    } finally {
      this.transitioning = false;
    }
  }

  /**
   * Returns the name of the currently active view.
   *
   * @returns The current view state — `"home"` when the drawing list is displayed,
   *   or `"canvas"` when a drawing is open for editing.
   */
  getCurrentView(): ViewName {
    return this.currentView;
  }

  getCanvasApp(): CanvasApp | null {
    return this.canvasApp;
  }

  getHomeScreen(): HomeScreen {
    return this.homeScreen;
  }

  /**
   * Tears down the ViewManager by destroying the active {@link CanvasApp}
   * (if any) and the {@link HomeScreen}, releasing all associated resources
   * such as WebGL contexts, event listeners, and DOM elements.
   *
   * After this method resolves the ViewManager instance should not be reused.
   *
   * @returns A promise that resolves once all cleanup is complete.
   */
  async destroy(): Promise<void> {
    if (this.canvasApp) {
      await this.canvasApp.destroy();
      this.canvasApp = null;
    }
    this.homeScreen.destroy();
  }
}
