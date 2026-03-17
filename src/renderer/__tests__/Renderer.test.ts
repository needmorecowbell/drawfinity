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
  lineWidth: vi.fn(),
  drawArrays: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  viewport: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteVertexArray: vi.fn(),
  deleteProgram: vi.fn(),
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  LINK_STATUS: 0x8b82,
  COMPILE_STATUS: 0x8b81,
  COLOR_BUFFER_BIT: 0x00004000,
  ARRAY_BUFFER: 0x8892,
  DYNAMIC_DRAW: 0x88e8,
  FLOAT: 0x1406,
  LINE_STRIP: 0x0003,
};

const mockContextInstance = {
  gl: mockGl,
  canvas: {} as HTMLCanvasElement,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates without error", () => {
    const renderer = new Renderer({} as HTMLCanvasElement);
    expect(renderer).toBeDefined();
  });

  it("exposes gl and canvas properties", () => {
    const renderer = new Renderer({} as HTMLCanvasElement);
    expect(renderer.gl).toBe(mockGl);
    expect(renderer.canvas).toBeDefined();
  });

  it("clear() delegates to context", () => {
    const renderer = new Renderer({} as HTMLCanvasElement);
    renderer.clear();
    expect(mockContextInstance.resize).toHaveBeenCalled();
    expect(mockContextInstance.clear).toHaveBeenCalled();
  });

  it("drawStroke() calls gl.drawArrays for valid input", () => {
    const renderer = new Renderer({} as HTMLCanvasElement);
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    renderer.drawStroke(points, [0, 0, 0, 1], 2);
    expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.LINE_STRIP, 0, 2);
  });

  it("drawStroke() skips draw for fewer than 2 points", () => {
    const renderer = new Renderer({} as HTMLCanvasElement);
    mockGl.drawArrays.mockClear();
    renderer.drawStroke([{ x: 0, y: 0 }], [0, 0, 0, 1], 2);
    renderer.drawStroke([], [0, 0, 0, 1], 2);
    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it("destroy() cleans up resources", () => {
    const renderer = new Renderer({} as HTMLCanvasElement);
    expect(() => renderer.destroy()).not.toThrow();
    expect(mockContextInstance.destroy).toHaveBeenCalled();
  });
});
