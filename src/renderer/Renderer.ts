import { WebGLContext } from "./WebGLContext";
import { StrokeRenderer, StrokePoint } from "./StrokeRenderer";
import { DotGridRenderer } from "./DotGridRenderer";

/**
 * Top-level renderer that owns the WebGL context, shaders, and stroke renderer.
 * Provides clear() and drawStroke() as the public API.
 */
export class Renderer {
  private context: WebGLContext;
  private strokeRenderer: StrokeRenderer;
  private dotGridRenderer: DotGridRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.context = new WebGLContext(canvas);
    this.strokeRenderer = new StrokeRenderer(this.context.gl);
    this.dotGridRenderer = new DotGridRenderer(this.context.gl);
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

  destroy(): void {
    this.strokeRenderer.destroy();
    this.dotGridRenderer.destroy();
    this.context.destroy();
  }
}
