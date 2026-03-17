import { WebGLContext } from "./WebGLContext";
import { StrokeRenderer, StrokePoint } from "./StrokeRenderer";

/**
 * Top-level renderer that owns the WebGL context, shaders, and stroke renderer.
 * Provides clear() and drawStroke() as the public API.
 */
export class Renderer {
  private context: WebGLContext;
  private strokeRenderer: StrokeRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.context = new WebGLContext(canvas);
    this.strokeRenderer = new StrokeRenderer(this.context.gl);
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

  drawStroke(
    points: readonly StrokePoint[],
    color: [number, number, number, number],
    width: number,
  ): void {
    this.strokeRenderer.drawStroke(points, color, width);
  }

  destroy(): void {
    this.strokeRenderer.destroy();
    this.context.destroy();
  }
}
