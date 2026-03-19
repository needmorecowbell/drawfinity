import { describe, it, expect, vi, beforeEach } from "vitest";
import { LineGridRenderer } from "../LineGridRenderer";

function createMockGL(): WebGL2RenderingContext {
  const gl = {
    createVertexArray: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({})),
    createShader: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    bindBuffer: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    useProgram: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform4fv: vi.fn(),
    bufferData: vi.fn(),
    drawArrays: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteVertexArray: vi.fn(),
    deleteProgram: vi.fn(),
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    ARRAY_BUFFER: 0x8892,
    FLOAT: 0x1406,
    LINES: 0x0001,
    DYNAMIC_DRAW: 0x88E8,
  } as unknown as WebGL2RenderingContext;
  return gl;
}

describe("LineGridRenderer", () => {
  let gl: WebGL2RenderingContext;
  let renderer: LineGridRenderer;

  beforeEach(() => {
    gl = createMockGL();
    renderer = new LineGridRenderer(gl);
  });

  it("constructs without errors", () => {
    expect(renderer).toBeDefined();
  });

  it("computes effective spacing that adapts to zoom level", () => {
    const spacingAt1 = renderer.getEffectiveSpacing(1);
    expect(spacingAt1).toBeGreaterThan(0);

    const spacingAtPointOne = renderer.getEffectiveSpacing(0.1);
    expect(spacingAtPointOne).toBeGreaterThan(spacingAt1);

    const spacingAt10 = renderer.getEffectiveSpacing(10);
    expect(spacingAt10).toBeLessThan(spacingAt1);
  });

  it("draws lines within viewport bounds", () => {
    const cameraMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 };

    renderer.draw(cameraMatrix, bounds, 1);

    expect(gl.drawArrays).toHaveBeenCalled();
    expect(gl.bufferData).toHaveBeenCalled();
  });

  it("draws using GL_LINES mode", () => {
    const cameraMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 };

    renderer.draw(cameraMatrix, bounds, 1);

    // GL_LINES = 0x0001
    expect(gl.drawArrays).toHaveBeenCalledWith(0x0001, 0, expect.any(Number));
  });

  it("setLineColor updates the line color used in draw calls", () => {
    const newColor: [number, number, number, number] = [1.0, 1.0, 1.0, 0.1];
    renderer.setLineColor(newColor);

    const cameraMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    renderer.draw(cameraMatrix, bounds, 1);

    expect(gl.uniform4fv).toHaveBeenCalledWith(expect.anything(), newColor);
  });

  it("setAutoContrastColor adjusts for light backgrounds", () => {
    renderer.setAutoContrastColor("#FFFFFF");
    const cameraMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    renderer.draw(cameraMatrix, bounds, 1);

    // Should use dark lines (r=0, g=0, b=0) with reduced alpha
    const color = (gl.uniform4fv as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(color[0]).toBe(0.0);
    expect(color[1]).toBe(0.0);
    expect(color[2]).toBe(0.0);
    expect(color[3]).toBeLessThan(0.15); // Less than dot alpha
  });

  it("setAutoContrastColor adjusts for dark backgrounds", () => {
    renderer.setAutoContrastColor("#000000");
    const cameraMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    renderer.draw(cameraMatrix, bounds, 1);

    const color = (gl.uniform4fv as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(color[0]).toBe(1.0);
    expect(color[1]).toBe(1.0);
    expect(color[2]).toBe(1.0);
    expect(color[3]).toBeLessThan(0.2); // Less than dot alpha
  });

  it("cleans up GL resources on destroy", () => {
    renderer.destroy();

    expect(gl.deleteBuffer).toHaveBeenCalled();
    expect(gl.deleteVertexArray).toHaveBeenCalled();
    expect(gl.deleteProgram).toHaveBeenCalled();
  });
});
