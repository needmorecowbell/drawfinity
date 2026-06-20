import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGl = {
  createProgram: vi.fn().mockReturnValue({}),
  createShader: vi.fn().mockReturnValue({}),
  createVertexArray: vi.fn().mockReturnValue({}),
  createBuffer: vi.fn().mockReturnValue({}),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn().mockReturnValue(true),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn().mockReturnValue(true),
  deleteShader: vi.fn(),
  useProgram: vi.fn(),
  getUniformLocation: vi.fn().mockReturnValue({}),
  getAttribLocation: vi.fn().mockReturnValue(0),
  bindVertexArray: vi.fn(),
  bindBuffer: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  bufferData: vi.fn(),
  drawArrays: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  viewport: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteVertexArray: vi.fn(),
  deleteProgram: vi.fn(),
  createTexture: vi.fn().mockReturnValue({}),
  uniform1i: vi.fn(),
  uniform1f: vi.fn(),
  activeTexture: vi.fn(),
  bindTexture: vi.fn(),
  pixelStorei: vi.fn(),
  texParameteri: vi.fn(),
  texImage2D: vi.fn(),
  deleteTexture: vi.fn(),
  enable: vi.fn(),
  blendFunc: vi.fn(),
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  LINK_STATUS: 0x8b82,
  COMPILE_STATUS: 0x8b81,
  COLOR_BUFFER_BIT: 0x00004000,
  ARRAY_BUFFER: 0x8892,
  DYNAMIC_DRAW: 0x88e8,
  FLOAT: 0x1406,
  LINE_STRIP: 0x0003,
  TRIANGLE_STRIP: 0x0005,
  TEXTURE0: 0x84c0,
  TEXTURE_2D: 0x0de1,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  CLAMP_TO_EDGE: 0x812f,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  LINEAR: 0x2601,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
  BLEND: 0x0be2,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
};

const mockContextInstance = {
  gl: mockGl,
  canvas: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLCanvasElement,
  resize: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
};

vi.mock("../WebGLContext", () => ({
  WebGLContext: vi.fn().mockImplementation(function () {
    return mockContextInstance;
  }),
}));

import { Renderer } from "../Renderer";

describe("Renderer", () => {
  const mockOverlayContext = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 1,
    lineJoin: "miter",
    lineCap: "butt",
    strokeStyle: "",
    fillStyle: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContextInstance.canvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;
  });

  it("creates without error", () => {
    const renderer = new Renderer(mockContextInstance.canvas);
    expect(renderer).toBeDefined();
  });

  it("exposes gl and canvas properties", () => {
    const renderer = new Renderer(mockContextInstance.canvas);
    expect(renderer.gl).toBe(mockGl);
    expect(renderer.canvas).toBeDefined();
  });

  it("clear() delegates to context", () => {
    const renderer = new Renderer(mockContextInstance.canvas);
    renderer.clear();
    expect(mockContextInstance.resize).toHaveBeenCalled();
    expect(mockContextInstance.clear).toHaveBeenCalled();
  });

  it("drawStroke() calls gl.drawArrays with TRIANGLE_STRIP for valid input", () => {
    const renderer = new Renderer(mockContextInstance.canvas);
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    renderer.drawStroke(points, [0, 0, 0, 1], 2);
    // 2 points → 4 vertices in triangle strip (2 per polyline point)
    expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.TRIANGLE_STRIP, 0, 4);
  });

  it("drawStroke() skips draw for fewer than 2 points", () => {
    const renderer = new Renderer(mockContextInstance.canvas);
    mockGl.drawArrays.mockClear();
    renderer.drawStroke([{ x: 0, y: 0 }], [0, 0, 0, 1], 2);
    renderer.drawStroke([], [0, 0, 0, 1], 2);
    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it("destroy() cleans up resources", () => {
    const renderer = new Renderer(mockContextInstance.canvas);
    expect(() => renderer.destroy()).not.toThrow();
    expect(mockContextInstance.destroy).toHaveBeenCalled();
  });

  it("drawSelectionOverlay() renders a fixed-screen dashed region on an overlay canvas", () => {
    let removed = false;
    const createdOverlay: {
      className: string;
      style: Record<string, string>;
      width: number;
      height: number;
      setAttribute: ReturnType<typeof vi.fn>;
      getContext: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    } = {
      className: "",
      style: {},
      width: 0,
      height: 0,
      setAttribute: vi.fn(),
      getContext: vi.fn((contextId: string) =>
        contextId === "2d" ? mockOverlayContext : null,
      ),
      remove: vi.fn(() => {
        removed = true;
      }),
    };
    const host = {
      appendChild: vi.fn(),
    };
    const ownerDocument = {
      createElement: vi.fn(() => createdOverlay),
    };
    const canvas = {
      ownerDocument,
      parentElement: host,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;
    mockContextInstance.canvas = canvas;

    const renderer = new Renderer(canvas);
    renderer.drawSelectionOverlay(
      {
        x: 0,
        y: 0,
        zoom: 2,
        getViewportSize: () => [200, 100],
      },
      [{ type: "rect", bounds: { x: -10, y: -5, width: 20, height: 10 } }],
    );

    expect(host.appendChild).toHaveBeenCalledWith(createdOverlay);
    expect(createdOverlay.className).toBe("selection-overlay-canvas");
    expect(createdOverlay.style.pointerEvents).toBe("none");
    expect(mockOverlayContext.setLineDash).toHaveBeenCalledWith([6, 4]);
    expect(mockOverlayContext.rect).toHaveBeenCalledWith(80, 40, 40, 20);
    expect(mockOverlayContext.stroke).toHaveBeenCalled();

    renderer.destroy();
    expect(removed).toBe(true);
  });
});
