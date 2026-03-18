// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ThumbnailGenerator,
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  GENERATION_INTERVAL_MS,
} from "../ThumbnailGenerator";
import type { DrawfinityDoc } from "../../crdt/DrawfinityDoc";
import type { Stroke } from "../../model/Stroke";
import type { Shape } from "../../model/Shape";

function createMockGl() {
  return {
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn().mockReturnValue({}),
    uniformMatrix3fv: vi.fn(),
    getAttribLocation: vi.fn().mockReturnValue(0),
    createVertexArray: vi.fn().mockReturnValue({}),
    bindVertexArray: vi.fn(),
    createBuffer: vi.fn().mockReturnValue({}),
    bindBuffer: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    bufferData: vi.fn(),
    drawArrays: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteVertexArray: vi.fn(),
    deleteProgram: vi.fn(),
    createShader: vi.fn().mockReturnValue({}),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn().mockReturnValue(true),
    createProgram: vi.fn().mockReturnValue({}),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn().mockReturnValue(true),
    deleteShader: vi.fn(),
    getExtension: vi.fn().mockReturnValue({ loseContext: vi.fn() }),
    COLOR_BUFFER_BIT: 0x00004000,
    BLEND: 0x0be2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    ARRAY_BUFFER: 0x8892,
    FLOAT: 0x1406,
    DYNAMIC_DRAW: 0x88e8,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLES: 0x0004,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
  } as unknown as WebGL2RenderingContext;
}

function makeStroke(overrides: Partial<Stroke> = {}): Stroke {
  return {
    id: "stroke-1",
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 100, y: 100, pressure: 0.5 },
    ],
    color: "#ff0000",
    width: 5,
    opacity: 1.0,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeShape(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "shape-1",
    type: "rectangle",
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    rotation: 0,
    strokeColor: "#0000ff",
    strokeWidth: 2,
    fillColor: "#00ff00",
    opacity: 1.0,
    timestamp: Date.now(),
    ...overrides,
  };
}

function createMockDoc(
  strokes: Stroke[] = [],
  shapes: Shape[] = [],
): DrawfinityDoc {
  return {
    getStrokes: vi.fn().mockReturnValue(strokes),
    getShapes: vi.fn().mockReturnValue(shapes),
  } as unknown as DrawfinityDoc;
}

describe("ThumbnailGenerator", () => {
  let generator: ThumbnailGenerator;
  let mockGl: WebGL2RenderingContext;

  beforeEach(() => {
    generator = new ThumbnailGenerator();
    mockGl = createMockGl();

    // Mock document.createElement to return a canvas with our mock GL
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const canvas = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(mockGl),
          toDataURL: vi.fn().mockReturnValue("data:image/png;base64,MOCK"),
        };
        return canvas as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("shouldGenerate", () => {
    it("returns false when no activity has occurred", () => {
      expect(generator.shouldGenerate()).toBe(false);
    });

    it("returns true after activity and interval has passed", () => {
      generator.markActivity();
      // Override lastGenerationTime to simulate time passage
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + GENERATION_INTERVAL_MS + 1,
      );
      expect(generator.shouldGenerate()).toBe(true);
    });

    it("returns false if activity occurred but interval has not passed", () => {
      generator.markActivity();
      // No time has passed, so it's within the interval from the initial 0
      // But lastGenerationTime starts at 0, so Date.now() > 0 + 30000 in most cases
      // Let's be explicit:
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);
      // Generate once to set lastGenerationTime
      const doc = createMockDoc([makeStroke()]);
      generator.generate(doc);
      // Now mark activity again
      generator.markActivity();
      // Check within interval
      vi.spyOn(Date, "now").mockReturnValue(now + 1000);
      expect(generator.shouldGenerate()).toBe(false);
    });
  });

  describe("forceGenerate", () => {
    it("returns false when no activity", () => {
      expect(generator.forceGenerate()).toBe(false);
    });

    it("returns true after activity regardless of time", () => {
      generator.markActivity();
      expect(generator.forceGenerate()).toBe(true);
    });
  });

  describe("generate", () => {
    it("returns null for empty document", () => {
      const doc = createMockDoc();
      const result = generator.generate(doc);
      expect(result).toBeNull();
    });

    it("generates thumbnail for document with strokes", () => {
      const doc = createMockDoc([makeStroke()]);
      const result = generator.generate(doc);
      expect(result).toBe("data:image/png;base64,MOCK");
    });

    it("generates thumbnail for document with shapes only", () => {
      const doc = createMockDoc([], [makeShape()]);
      const result = generator.generate(doc);
      expect(result).toBe("data:image/png;base64,MOCK");
    });

    it("generates thumbnail for document with both strokes and shapes", () => {
      const doc = createMockDoc([makeStroke()], [makeShape()]);
      const result = generator.generate(doc);
      expect(result).toBe("data:image/png;base64,MOCK");
    });

    it("sets up WebGL context correctly", () => {
      const doc = createMockDoc([makeStroke()]);
      generator.generate(doc);

      const gl = mockGl;
      expect(gl.viewport).toHaveBeenCalledWith(
        0,
        0,
        THUMBNAIL_WIDTH,
        THUMBNAIL_HEIGHT,
      );
      expect(gl.clearColor).toHaveBeenCalledWith(
        250 / 255,
        250 / 255,
        248 / 255,
        1.0,
      );
      expect(gl.clear).toHaveBeenCalled();
      expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
      expect(gl.blendFunc).toHaveBeenCalledWith(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
      );
    });

    it("compiles shaders and creates program", () => {
      const doc = createMockDoc([makeStroke()]);
      generator.generate(doc);

      const gl = mockGl;
      expect(gl.createShader).toHaveBeenCalledTimes(2);
      expect(gl.shaderSource).toHaveBeenCalledTimes(2);
      expect(gl.compileShader).toHaveBeenCalledTimes(2);
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.linkProgram).toHaveBeenCalled();
    });

    it("cleans up GPU resources after rendering", () => {
      const doc = createMockDoc([makeStroke()]);
      generator.generate(doc);

      const gl = mockGl;
      expect(gl.deleteBuffer).toHaveBeenCalled();
      expect(gl.deleteVertexArray).toHaveBeenCalled();
      expect(gl.deleteProgram).toHaveBeenCalled();
      expect(gl.getExtension).toHaveBeenCalledWith("WEBGL_lose_context");
    });

    it("draws stroke batches as TRIANGLE_STRIP", () => {
      const doc = createMockDoc([makeStroke()]);
      generator.generate(doc);

      const drawCalls = vi.mocked(mockGl.drawArrays).mock.calls;
      const hasTriangleStrip = drawCalls.some(
        (call) => call[0] === mockGl.TRIANGLE_STRIP,
      );
      expect(hasTriangleStrip).toBe(true);
    });

    it("draws shape fills as TRIANGLES", () => {
      const doc = createMockDoc([], [makeShape()]);
      generator.generate(doc);

      const drawCalls = vi.mocked(mockGl.drawArrays).mock.calls;
      const hasTriangles = drawCalls.some(
        (call) => call[0] === mockGl.TRIANGLES,
      );
      expect(hasTriangles).toBe(true);
    });

    it("resets activity flag after generation", () => {
      generator.markActivity();
      expect(generator.forceGenerate()).toBe(true);

      const doc = createMockDoc([makeStroke()]);
      generator.generate(doc);

      expect(generator.forceGenerate()).toBe(false);
    });

    it("returns null when WebGL2 is not available", () => {
      vi.spyOn(document, "createElement").mockImplementation(
        (tag: string) => {
          if (tag === "canvas") {
            return {
              width: 0,
              height: 0,
              getContext: vi.fn().mockReturnValue(null),
              toDataURL: vi.fn(),
            } as unknown as HTMLCanvasElement;
          }
          return document.createElement(tag);
        },
      );

      const doc = createMockDoc([makeStroke()]);
      const result = generator.generate(doc);
      expect(result).toBeNull();
    });

    it("handles strokes with opacity", () => {
      const stroke = makeStroke({ opacity: 0.5 });
      const doc = createMockDoc([stroke]);
      const result = generator.generate(doc);
      expect(result).toBe("data:image/png;base64,MOCK");
    });

    it("handles multiple strokes", () => {
      const strokes = [
        makeStroke({ id: "s1" }),
        makeStroke({
          id: "s2",
          points: [
            { x: 200, y: 200, pressure: 0.8 },
            { x: 300, y: 300, pressure: 0.8 },
          ],
        }),
      ];
      const doc = createMockDoc(strokes);
      const result = generator.generate(doc);
      expect(result).toBe("data:image/png;base64,MOCK");
    });

    it("handles document without getShapes method", () => {
      const doc = {
        getStrokes: vi.fn().mockReturnValue([makeStroke()]),
        getShapes: undefined,
      } as unknown as DrawfinityDoc;
      const result = generator.generate(doc);
      expect(result).toBe("data:image/png;base64,MOCK");
    });
  });

  describe("thumbnail dimensions", () => {
    it("exports correct dimensions", () => {
      expect(THUMBNAIL_WIDTH).toBe(200);
      expect(THUMBNAIL_HEIGHT).toBe(150);
    });

    it("exports correct generation interval", () => {
      expect(GENERATION_INTERVAL_MS).toBe(30_000);
    });
  });
});
