// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CanvasApp } from "../CanvasApp";

// Mock WebGL2 context
function createMockWebGL2Context(): WebGL2RenderingContext {
  return {
    canvas: document.createElement("canvas"),
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ""),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ""),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    getAttribLocation: vi.fn(() => 0),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    drawArrays: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    blendFuncSeparate: vi.fn(),
    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),
    deleteBuffer: vi.fn(),
    getExtension: vi.fn(() => null),
    createVertexArray: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    drawingBufferWidth: 800,
    drawingBufferHeight: 600,
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    DYNAMIC_DRAW: 0x88E8,
    FLOAT: 0x1406,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLES: 0x0004,
    COLOR_BUFFER_BIT: 0x4000,
    BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    ONE: 1,
    POINTS: 0x0000,
  } as unknown as WebGL2RenderingContext;
}

// Stub out the canvas getContext to return our mock
const origGetContext = HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(function (
    this: HTMLCanvasElement,
    contextId: string,
  ) {
    if (contextId === "webgl2") {
      return createMockWebGL2Context();
    }
    return origGetContext.call(this, contextId as "2d");
  }) as typeof origGetContext;
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext;
});

// Mock persistence to avoid Tauri
vi.mock("../../persistence", () => ({
  loadDocumentById: vi.fn().mockResolvedValue(null),
  getDefaultFilePath: vi.fn().mockResolvedValue("/mock/path/drawing.drawfinity"),
  AutoSave: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    saveNow: vi.fn(),
  })),
  DrawingManager: vi.fn().mockImplementation(() => ({
    listDrawings: vi.fn().mockResolvedValue([]),
    createDrawing: vi.fn(),
    openDrawing: vi.fn().mockResolvedValue(new Uint8Array(0)),
    saveDrawing: vi.fn(),
    deleteDrawing: vi.fn(),
    renameDrawing: vi.fn(),
    duplicateDrawing: vi.fn(),
    getSaveDirectory: vi.fn().mockResolvedValue("/mock/path"),
    getDefaultSaveDirectory: vi.fn().mockResolvedValue("/mock/path"),
    setSaveDirectory: vi.fn(),
    migrateFromSingleFile: vi.fn().mockResolvedValue(null),
    updateThumbnail: vi.fn(),
    getDrawingFilePath: vi.fn().mockResolvedValue("/mock/path/test.drawfinity"),
  })),
}));

// Mock y-websocket
vi.mock("y-websocket", () => ({
  WebsocketProvider: vi.fn().mockImplementation(() => ({
    awareness: {
      setLocalStateField: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getStates: vi.fn(() => new Map()),
    },
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    wsconnected: false,
  })),
}));

describe("CanvasApp", () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
        key: vi.fn(() => null),
        length: 0,
      },
      configurable: true,
      writable: true,
    });

    // Set up DOM
    document.body.innerHTML = "";
    canvas = document.createElement("canvas");
    canvas.id = "drawfinity-canvas";
    document.body.appendChild(canvas);

    // Mock getBoundingClientRect
    canvas.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      toJSON: vi.fn(),
    }));

    // Mock clientWidth/clientHeight
    Object.defineProperty(canvas, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(canvas, "clientHeight", { value: 600, configurable: true });

    // Mock ResizeObserver
    global.ResizeObserver = class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      constructor() {}
    } as unknown as typeof ResizeObserver;

    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("init() sets up the app and starts the render loop", async () => {
    const app = new CanvasApp();
    await app.init("test-drawing-id");

    expect(app.getCurrentDrawingId()).toBe("test-drawing-id");
    expect(app.getDoc()).toBeDefined();
    expect(window.requestAnimationFrame).toHaveBeenCalled();

    app.destroy();
  });

  it("destroy() cancels the animation frame and cleans up", async () => {
    const app = new CanvasApp();
    await app.init("test-drawing-id");

    app.destroy();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it("getCurrentDrawingId() returns the drawing ID passed to init()", async () => {
    const app = new CanvasApp();
    await app.init("my-drawing-123");

    expect(app.getCurrentDrawingId()).toBe("my-drawing-123");

    app.destroy();
  });

  it("getDoc() returns a valid DrawfinityDoc", async () => {
    const app = new CanvasApp();
    await app.init("test-doc");

    const doc = app.getDoc();
    expect(doc).toBeDefined();
    expect(typeof doc.getStrokes).toBe("function");
    expect(typeof doc.getShapes).toBe("function");

    app.destroy();
  });

  it("creates toolbar and settings button in DOM", async () => {
    const app = new CanvasApp();
    await app.init("test-ui");

    const toolbar = document.getElementById("toolbar");
    expect(toolbar).not.toBeNull();

    const settingsBtn = document.querySelector(".settings-btn");
    expect(settingsBtn).not.toBeNull();

    app.destroy();
  });

  it("removes settings button and color indicator on destroy", async () => {
    const app = new CanvasApp();
    await app.init("test-cleanup");

    const settingsBtn = document.querySelector(".settings-btn");
    const colorIndicator = document.querySelector(".user-color-indicator");
    expect(settingsBtn).not.toBeNull();
    expect(colorIndicator).not.toBeNull();

    app.destroy();

    expect(document.querySelector(".settings-btn")).toBeNull();
    expect(document.querySelector(".user-color-indicator")).toBeNull();
  });

  it("throws if canvas element is missing", async () => {
    document.body.innerHTML = ""; // Remove canvas

    const app = new CanvasApp();
    await expect(app.init("no-canvas")).rejects.toThrow("Canvas element not found");
  });

  it("destroy() is safe to call multiple times", async () => {
    const app = new CanvasApp();
    await app.init("test-double-destroy");

    app.destroy();
    expect(() => app.destroy()).not.toThrow();
  });

  it("registers beforeunload handler during init", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const app = new CanvasApp();
    await app.init("test-beforeunload");

    const beforeUnloadCalls = addSpy.mock.calls.filter(
      (call) => call[0] === "beforeunload",
    );
    expect(beforeUnloadCalls.length).toBeGreaterThan(0);

    app.destroy();
  });

  it("removes beforeunload handler on destroy", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const app = new CanvasApp();
    await app.init("test-remove-handlers");

    app.destroy();

    const beforeUnloadCalls = removeSpy.mock.calls.filter(
      (call) => call[0] === "beforeunload",
    );
    expect(beforeUnloadCalls.length).toBeGreaterThan(0);
  });
});
