import { WebGLContext } from "./WebGLContext";
import { StrokeRenderer, StrokePoint } from "./StrokeRenderer";
import { DotGridRenderer } from "./DotGridRenderer";
import { StrokeVertexCache } from "./StrokeVertexCache";
import { ShapeVertexCache } from "./ShapeVertexCache";

/**
 * Top-level renderer that owns the WebGL context, shaders, and stroke/shape renderers.
 * Provides clear(), drawStroke(), and drawShapes() as the public API.
 */
export class Renderer {
  private context: WebGLContext;
  private strokeRenderer: StrokeRenderer;
  private dotGridRenderer: DotGridRenderer;
  readonly vertexCache: StrokeVertexCache;
  readonly shapeVertexCache: ShapeVertexCache;

  constructor(canvas: HTMLCanvasElement) {
    this.context = new WebGLContext(canvas);
    this.strokeRenderer = new StrokeRenderer(this.context.gl);
    this.dotGridRenderer = new DotGridRenderer(this.context.gl);
    this.vertexCache = new StrokeVertexCache();
    this.shapeVertexCache = new ShapeVertexCache();
  }

  get gl(): WebGL2RenderingContext {
    return this.context.gl;
  }

  get canvas(): HTMLCanvasElement {
    return this.context.canvas;
  }

  clear(): void {
    this.context.resize(); // Ensure viewport is current
    this.context.clear();
  }

  setCameraMatrix(matrix: Float32Array): void {
    this.strokeRenderer.setCameraMatrix(matrix);
  }

  drawDotGrid(
    cameraMatrix: Float32Array,
    viewportBounds: { minX: number; minY: number; maxX: number; maxY: number },
    zoom: number,
  ): void {
    this.dotGridRenderer.draw(cameraMatrix, viewportBounds, zoom);
  }

  drawStroke(
    points: readonly StrokePoint[],
    color: [number, number, number, number],
    width: number,
  ): void {
    this.strokeRenderer.drawStroke(points, color, width);
  }

  /**
   * Draw multiple strokes in a single batched draw call.
   * Pass pre-generated vertex data arrays (from StrokeVertexCache).
   */
  drawStrokeBatch(strips: Float32Array[]): void {
    this.strokeRenderer.drawStrokeBatch(strips);
  }

  /**
   * Draw shape fills as GL_TRIANGLES in a single batched draw call.
   */
  drawShapeFillBatch(triangleArrays: Float32Array[]): void {
    this.strokeRenderer.drawTriangleBatch(triangleArrays);
  }

  /**
   * Draw shape outlines as GL_TRIANGLE_STRIP in a single batched draw call.
   * Reuses the stroke batch renderer since the vertex format is identical.
   */
  drawShapeOutlineBatch(strips: Float32Array[]): void {
    this.strokeRenderer.drawStrokeBatch(strips);
  }

  destroy(): void {
    this.strokeRenderer.destroy();
    this.dotGridRenderer.destroy();
    this.context.destroy();
  }
}
