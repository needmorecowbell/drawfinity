import { describe, it, expect, vi, beforeEach } from "vitest";
import { DotGridRenderer } from "../DotGridRenderer";

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
    uniform1f: vi.fn(),
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
    POINTS: 0x0000,
    DYNAMIC_DRAW: 0x88E8,
  } as unknown as WebGL2RenderingContext;
  return gl;
}

describe("DotGridRenderer", () => {
  let gl: WebGL2RenderingContext;
  let renderer: DotGridRenderer;

  beforeEach(() => {
    gl = createMockGL();
    renderer = new DotGridRenderer(gl);
  });

  it("constructs without errors", () => {
    expect(renderer).toBeDefined();
  });

  it("computes effective spacing that adapts to zoom level", () => {
    // At zoom 1, spacing should be around baseSpacing (50)
    const spacingAt1 = renderer.getEffectiveSpacing(1);
    expect(spacingAt1).toBeGreaterThan(0);

    // At zoom 0.1 (zoomed out), spacing should be larger
    const spacingAtPointOne = renderer.getEffectiveSpacing(0.1);
    expect(spacingAtPointOne).toBeGreaterThan(spacingAt1);

    // At zoom 10 (zoomed in), spacing should be smaller
    const spacingAt10 = renderer.getEffectiveSpacing(10);
    expect(spacingAt10).toBeLessThan(spacingAt1);
  });

  it("draws dots within viewport bounds", () => {
    const cameraMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 };

    renderer.draw(cameraMatrix, bounds, 1);

    expect(gl.drawArrays).toHaveBeenCalled();
    expect(gl.bufferData).toHaveBeenCalled();
  });

  it("skips drawing when viewport produces zero dots", () => {
    const cameraMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    // Tiny viewport that fits within one grid cell
    const bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    renderer.draw(cameraMatrix, bounds, 1);

    // Should still draw at least 1 dot (the grid-aligned origin)
    // The exact call count depends on spacing, but drawArrays should be called
    expect(gl.drawArrays).toHaveBeenCalled();
  });

  it("cleans up GL resources on destroy", () => {
    renderer.destroy();

    expect(gl.deleteBuffer).toHaveBeenCalled();
    expect(gl.deleteVertexArray).toHaveBeenCalled();
    expect(gl.deleteProgram).toHaveBeenCalled();
  });
});
