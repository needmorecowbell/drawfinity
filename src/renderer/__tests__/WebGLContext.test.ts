import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebGLContext } from "../WebGLContext";

// Stub window for node environment
vi.stubGlobal("window", { devicePixelRatio: 1 });

function createMockCanvas() {
  const mockGl = {
    clearColor: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    COLOR_BUFFER_BIT: 0x00004000,
  };

  const canvas = {
    getContext: vi.fn().mockReturnValue(mockGl),
    clientWidth: 800,
    clientHeight: 600,
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement;

  const mockObserve = vi.fn();
  const mockDisconnect = vi.fn();

  class MockResizeObserver {
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = vi.fn();
    constructor(_cb: ResizeObserverCallback) {}
  }

  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  vi.stubGlobal("devicePixelRatio", 1);

  return { canvas, mockGl, mockObserve, mockDisconnect };
}

describe("WebGLContext", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes WebGL2 context", () => {
    const { canvas, mockGl } = createMockCanvas();
    const ctx = new WebGLContext(canvas);
    expect(canvas.getContext).toHaveBeenCalledWith("webgl2", expect.any(Object));
    expect(ctx.gl).toBe(mockGl);
  });

  it("sets clear color to off-white #FAFAF8", () => {
    const { canvas, mockGl } = createMockCanvas();
    new WebGLContext(canvas);
    expect(mockGl.clearColor).toHaveBeenCalledWith(
      250 / 255,
      250 / 255,
      248 / 255,
      1.0,
    );
  });

  it("throws if WebGL2 is not supported", () => {
    const canvas = {
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement;

    class MockResizeObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      constructor(_cb: ResizeObserverCallback) {}
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    expect(() => new WebGLContext(canvas)).toThrow("WebGL2 is not supported");
  });

  it("resizes canvas to match client dimensions", () => {
    const { canvas, mockGl } = createMockCanvas();
    const ctx = new WebGLContext(canvas);
    ctx.resize();
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it("clears the canvas", () => {
    const { canvas, mockGl } = createMockCanvas();
    const ctx = new WebGLContext(canvas);
    ctx.clear();
    expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
  });

  it("disconnects observer on destroy", () => {
    const { canvas, mockDisconnect } = createMockCanvas();
    const ctx = new WebGLContext(canvas);
    ctx.destroy();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
