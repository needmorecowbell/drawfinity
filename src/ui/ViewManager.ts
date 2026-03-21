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

export interface ViewManagerDeps {
  listDrawings: () => Promise<DrawingMetadata[]>;
  createDrawing: (name: string) => Promise<DrawingMetadata>;
  deleteDrawing: (id: string) => Promise<void>;
  renameDrawing: (id: string, name: string) => Promise<void>;
  duplicateDrawing: (id: string, newName: string) => Promise<DrawingMetadata>;
  getSaveDirectory: () => Promise<string>;
  onChangeSaveDirectory?: () => Promise<string | null>;
  getDrawingName?: (id: string) => Promise<string>;
}

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
      });

      // Connect to the room
      this.canvasApp.connectToRoom(serverUrl, roomId, roomName);
      this.canvasApp.setDrawingName(roomName || roomId);

      this.currentView = "canvas";
    } finally {
      this.transitioning = false;
    }
  }

  getCurrentView(): ViewName {
    return this.currentView;
  }

  getCanvasApp(): CanvasApp | null {
    return this.canvasApp;
  }

  getHomeScreen(): HomeScreen {
    return this.homeScreen;
  }

  async destroy(): Promise<void> {
    if (this.canvasApp) {
      await this.canvasApp.destroy();
      this.canvasApp = null;
    }
    this.homeScreen.destroy();
  }
}
