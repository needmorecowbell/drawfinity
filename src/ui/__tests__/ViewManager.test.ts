// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { DrawingMetadata } from "../../persistence/DrawingManifest";
import type { ViewManagerDeps } from "../ViewManager";

// Mock dependencies that HomeScreen imports
vi.mock("../../sync/ServerApi", () => ({
  fetchRooms: vi.fn().mockResolvedValue([]),
  createRoom: vi.fn().mockResolvedValue({ id: "r1", name: "Room", clientCount: 0, createdAt: 0, lastActiveAt: 0 }),
  ServerApiError: class extends Error { constructor(m: string) { super(m); this.name = "ServerApiError"; } },
}));

vi.mock("../../user/UserPreferences", () => ({
  loadPreferences: vi.fn(() => ({ defaultBrush: 0, defaultColor: "#000000" })),
  savePreferences: vi.fn(),
}));

// Mock CanvasApp
const mockInit = vi.fn().mockResolvedValue(undefined);
const mockDestroy = vi.fn();
const mockGetCurrentDrawingId = vi.fn().mockReturnValue("d1");
const mockSetDrawingName = vi.fn();
const mockConnectToRoom = vi.fn();

vi.mock("../../canvas", () => {
  return {
    CanvasApp: class MockCanvasApp {
      init = mockInit;
      destroy = mockDestroy;
      getCurrentDrawingId = mockGetCurrentDrawingId;
      setDrawingName = mockSetDrawingName;
      connectToRoom = mockConnectToRoom;
    },
  };
});

// Import after mocks
import { ViewManager } from "../ViewManager";

function makeDrawing(overrides: Partial<DrawingMetadata> = {}): DrawingMetadata {
  return {
    id: "d1",
    name: "My Drawing",
    createdAt: "2026-03-18T10:00:00.000Z",
    modifiedAt: "2026-03-18T10:00:00.000Z",
    fileName: "d1.drawfinity",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ViewManagerDeps> = {}): ViewManagerDeps {
  return {
    listDrawings: vi.fn().mockResolvedValue([makeDrawing()]),
    createDrawing: vi.fn().mockResolvedValue(makeDrawing({ id: "new", name: "Untitled" })),
    deleteDrawing: vi.fn().mockResolvedValue(undefined),
    renameDrawing: vi.fn().mockResolvedValue(undefined),
    duplicateDrawing: vi.fn().mockResolvedValue(makeDrawing({ id: "dup", name: "Copy" })),
    getSaveDirectory: vi.fn().mockResolvedValue("/home/user/Documents/Drawfinity"),
    ...overrides,
  };
}

describe("ViewManager", () => {
  let canvasContainer: HTMLElement;
  let deps: ViewManagerDeps;
  let vm: ViewManager;

  beforeEach(() => {
    vi.clearAllMocks();

    canvasContainer = document.createElement("div");
    canvasContainer.id = "canvas-view";
    const canvas = document.createElement("canvas");
    canvas.id = "drawfinity-canvas";
    canvasContainer.appendChild(canvas);
    document.body.appendChild(canvasContainer);

    deps = makeDeps();
    vm = new ViewManager(canvasContainer, deps);
  });

  afterEach(() => {
    vm.destroy();
    canvasContainer.remove();
  });

  it("starts in home view with canvas container hidden", () => {
    expect(vm.getCurrentView()).toBe("home");
    expect(canvasContainer.style.display).toBe("none");
  });

  it("getCanvasApp() returns null initially", () => {
    expect(vm.getCanvasApp()).toBeNull();
  });

  it("getHomeScreen() returns the HomeScreen instance", () => {
    expect(vm.getHomeScreen()).toBeDefined();
  });

  describe("showHome()", () => {
    it("refreshes drawing list and shows home screen", async () => {
      await vm.showHome();
      expect(deps.listDrawings).toHaveBeenCalled();
      expect(deps.getSaveDirectory).toHaveBeenCalled();
      expect(vm.getCurrentView()).toBe("home");
      expect(vm.getHomeScreen().isVisible()).toBe(true);
    });

    it("hides canvas container", async () => {
      await vm.showCanvas("d1");
      await vm.showHome();
      expect(canvasContainer.style.display).toBe("none");
    });

    it("destroys active CanvasApp when returning home", async () => {
      await vm.showCanvas("d1");
      mockDestroy.mockClear();
      await vm.showHome();
      expect(mockDestroy).toHaveBeenCalledOnce();
      expect(vm.getCanvasApp()).toBeNull();
    });

    it("sets save directory on home screen", async () => {
      await vm.showHome();
      expect(deps.getSaveDirectory).toHaveBeenCalled();
    });
  });

  describe("showCanvas()", () => {
    it("hides home screen and shows canvas container", async () => {
      await vm.showHome();
      await vm.showCanvas("d1");
      expect(vm.getCurrentView()).toBe("canvas");
      expect(canvasContainer.style.display).toBe("block");
      expect(vm.getHomeScreen().isVisible()).toBe(false);
    });

    it("creates and initializes CanvasApp with drawing ID and callbacks", async () => {
      await vm.showCanvas("d1");
      expect(mockInit).toHaveBeenCalledWith("d1", expect.objectContaining({
        onGoHome: expect.any(Function),
        onRenameDrawing: expect.any(Function),
      }));
      expect(vm.getCanvasApp()).not.toBeNull();
    });

    it("destroys previous CanvasApp when switching drawings", async () => {
      await vm.showCanvas("d1");
      mockDestroy.mockClear();
      await vm.showCanvas("d2");
      expect(mockDestroy).toHaveBeenCalledOnce();
      expect(mockInit).toHaveBeenCalledWith("d2", expect.any(Object));
    });
  });

  describe("view transitions", () => {
    it("can round-trip between home and canvas", async () => {
      await vm.showHome();
      expect(vm.getCurrentView()).toBe("home");

      await vm.showCanvas("d1");
      expect(vm.getCurrentView()).toBe("canvas");

      await vm.showHome();
      expect(vm.getCurrentView()).toBe("home");
    });

    it("prevents concurrent transitions", async () => {
      // Start two transitions simultaneously
      const p1 = vm.showCanvas("d1");
      const p2 = vm.showHome();
      await Promise.all([p1, p2]);

      // Second transition should have been skipped due to transitioning guard
      // The first transition wins, so canvas view should be active
      expect(vm.getCurrentView()).toBe("canvas");
    });
  });

  describe("destroy()", () => {
    it("destroys active CanvasApp", async () => {
      await vm.showCanvas("d1");
      mockDestroy.mockClear();
      vm.destroy();
      expect(mockDestroy).toHaveBeenCalledOnce();
    });

    it("destroys home screen", () => {
      vm.destroy();
      // HomeScreen.destroy() calls hide(), no error should occur
    });

    it("is safe to call multiple times", () => {
      vm.destroy();
      vm.destroy(); // Should not throw
    });
  });
});
