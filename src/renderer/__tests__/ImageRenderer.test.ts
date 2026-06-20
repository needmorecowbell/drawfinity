import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageRenderer, generateImageQuadVertices } from "../ImageRenderer";
import type { CanvasImage } from "../../model/Image";

const mockGl = {
  createProgram: vi.fn().mockReturnValue({}),
  createShader: vi.fn().mockReturnValue({}),
  createVertexArray: vi.fn().mockReturnValue({}),
  createBuffer: vi.fn().mockReturnValue({}),
  createTexture: vi.fn().mockReturnValue({}),
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
  uniform1i: vi.fn(),
  uniform1f: vi.fn(),
  activeTexture: vi.fn(),
  bindTexture: vi.fn(),
  pixelStorei: vi.fn(),
  texParameteri: vi.fn(),
  texImage2D: vi.fn(),
  deleteTexture: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteVertexArray: vi.fn(),
  deleteProgram: vi.fn(),
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  LINK_STATUS: 0x8b82,
  COMPILE_STATUS: 0x8b81,
  ARRAY_BUFFER: 0x8892,
  DYNAMIC_DRAW: 0x88e8,
  FLOAT: 0x1406,
  TRIANGLES: 0x0004,
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
};

function makeImage(overrides: Partial<CanvasImage> = {}): CanvasImage {
  return {
    id: "image-1",
    src: "data:image/png;base64,aW1hZ2U=",
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 0.75,
    timestamp: 1,
    ...overrides,
  };
}

class MockImage {
  onload: ((event: Event) => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  naturalWidth = 1;
  decoding = "auto";

  set src(_value: string) {
    this.complete = true;
    queueMicrotask(() => this.onload?.(new Event("load")));
  }

  decode(): Promise<void> {
    return Promise.resolve();
  }
}

describe("ImageRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let textureId = 0;
    mockGl.createTexture.mockImplementation(() => ({ textureId: textureId++ }));
    vi.stubGlobal("Image", MockImage);
  });

  it("generates a two-triangle image quad with position and UV attributes", () => {
    const vertices = generateImageQuadVertices(makeImage());

    expect(vertices).toHaveLength(24);
    expect(Array.from(vertices.slice(0, 4))).toEqual([-40, -5, 0, 0]);
    expect(Array.from(vertices.slice(20, 24))).toEqual([60, 45, 1, 1]);
  });

  it("uploads a texture and draws the image quad", async () => {
    const renderer = new ImageRenderer(mockGl as unknown as WebGL2RenderingContext);
    const image = makeImage();

    await renderer.preloadImage(image);
    const didDraw = renderer.drawImage(image);

    expect(didDraw).toBe(true);
    expect(mockGl.texImage2D).toHaveBeenCalled();
    expect(mockGl.uniform1f).toHaveBeenCalledWith({}, 0.75);
    expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.TRIANGLES, 0, 6);
  });

  it("reuses a cached texture across draws", async () => {
    const renderer = new ImageRenderer(mockGl as unknown as WebGL2RenderingContext);
    const image = makeImage();

    await renderer.preloadImage(image);
    renderer.drawImage(image);
    renderer.drawImage(image);

    expect(mockGl.texImage2D).toHaveBeenCalledTimes(1);
    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it("deletes the previous texture when an image source changes", async () => {
    const renderer = new ImageRenderer(mockGl as unknown as WebGL2RenderingContext);
    const image = makeImage();
    const updated = makeImage({ src: "data:image/png;base64,bmV3" });

    await renderer.preloadImage(image);
    await renderer.preloadImage(updated);

    expect(mockGl.deleteTexture).toHaveBeenCalledWith({ textureId: 0 });
    expect(mockGl.texImage2D).toHaveBeenCalledTimes(2);
  });

  it("retains only textures for active image IDs", async () => {
    const renderer = new ImageRenderer(mockGl as unknown as WebGL2RenderingContext);

    await renderer.preloadImage(makeImage({ id: "image-1" }));
    await renderer.preloadImage(makeImage({ id: "image-2" }));
    renderer.retainTextures(["image-2"]);

    expect(mockGl.deleteTexture).toHaveBeenCalledWith({ textureId: 0 });
  });

  it("invalidates texture handles on context loss and re-uploads after restore", async () => {
    const renderer = new ImageRenderer(mockGl as unknown as WebGL2RenderingContext);
    const image = makeImage();

    await renderer.preloadImage(image);
    renderer.handleContextLost();
    renderer.handleContextRestored();
    expect(renderer.drawImage(image)).toBe(false);
    await renderer.preloadImage(image);
    expect(renderer.drawImage(image)).toBe(true);

    expect(mockGl.texImage2D).toHaveBeenCalledTimes(2);
  });

  it("starts loading and skips drawing when texture is not ready", () => {
    const renderer = new ImageRenderer(mockGl as unknown as WebGL2RenderingContext);
    const didDraw = renderer.drawImage(makeImage());

    expect(didDraw).toBe(false);
    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });
});
