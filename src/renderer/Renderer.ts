import { WebGLContext } from "./WebGLContext";
import { StrokeRenderer, StrokePoint } from "./StrokeRenderer";
import { DotGridRenderer, autoContrastDotColor } from "./DotGridRenderer";
import { LineGridRenderer } from "./LineGridRenderer";
import { StrokeVertexCache } from "./StrokeVertexCache";
import { ShapeVertexCache } from "./ShapeVertexCache";
import type { GridStyle } from "../user/UserPreferences";

/**
 * Top-level renderer that owns the WebGL context, shaders, and stroke/shape renderers.
 * Provides clear(), drawStroke(), and drawShapes() as the public API.
 */
export class Renderer {
  private context: WebGLContext;
  private strokeRenderer: StrokeRenderer;
  private dotGridRenderer: DotGridRenderer;
  private lineGridRenderer: LineGridRenderer;
  private gridStyle: GridStyle = "dots";
  readonly vertexCache: StrokeVertexCache;
  readonly shapeVertexCache: ShapeVertexCache;

  constructor(canvas: HTMLCanvasElement) {
    this.context = new WebGLContext(canvas);
    this.strokeRenderer = new StrokeRenderer(this.context.gl);
    this.dotGridRenderer = new DotGridRenderer(this.context.gl);
    this.lineGridRenderer = new LineGridRenderer(this.context.gl);
    this.vertexCache = new StrokeVertexCache();
    this.shapeVertexCache = new ShapeVertexCache();
  }

  get gl(): WebGL2RenderingContext {
    return this.context.gl;
  }

  get canvas(): HTMLCanvasElement {
    return this.context.canvas;
  }

  /**
   * Sets the canvas background color and automatically adjusts grid overlay colors
   * for contrast against the new background.
   *
   * @param hex - CSS hex color string (e.g. `"#ffffff"`, `"#1a1a2e"`)
   */
  setBackgroundColor(hex: string): void {
    this.context.setClearColor(hex);
    this.dotGridRenderer.setDotColor(autoContrastDotColor(hex));
    this.lineGridRenderer.setAutoContrastColor(hex);
  }

  /**
   * Sets the grid rendering style used when drawing the canvas background grid.
   *
   * The selected style takes effect on the next call to {@link drawGrid}. The grid
   * style is typically loaded from {@link UserPreferences.gridStyle} and can be
   * changed at runtime via the settings panel.
   *
   * @param style - The grid style to use: `"dots"` for a dot grid, `"lines"` for
   *   a line grid, or `"none"` to hide the grid entirely.
   *
   * @see {@link GridStyle}
   */
  setGridStyle(style: GridStyle): void {
    this.gridStyle = style;
  }

  /**
   * Clears the entire rendering canvas, removing all drawn content.
   *
   * Resizes the viewport to match the current canvas dimensions before clearing,
   * ensuring the clear operation covers the full display area. Call this at the
   * start of each render frame before redrawing strokes and grid overlays.
   */
  clear(): void {
    this.context.resize(); // Ensure viewport is current
    this.context.clear();
  }

  /**
   * Sets the camera transformation matrix used for rendering strokes.
   *
   * Uploads a 3x3 homogeneous transformation matrix to the stroke shader,
   * controlling how stroke geometry is projected onto the viewport. This must
   * be called whenever the camera moves, zooms, or rotates, and before any
   * stroke draw calls in the current frame.
   *
   * @param matrix - A 3x3 transformation matrix stored as a 9-element
   *   {@link Float32Array} in column-major order, mapping world coordinates
   *   to clip space.
   */
  setCameraMatrix(matrix: Float32Array): void {
    this.strokeRenderer.setCameraMatrix(matrix);
  }

  drawGrid(
    cameraMatrix: Float32Array,
    viewportBounds: { minX: number; minY: number; maxX: number; maxY: number },
    zoom: number,
  ): void {
    if (this.gridStyle === "dots") {
      this.dotGridRenderer.draw(cameraMatrix, viewportBounds, zoom);
    } else if (this.gridStyle === "lines") {
      this.lineGridRenderer.draw(cameraMatrix, viewportBounds, zoom);
    }
    // "none" — skip drawing
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
    this.lineGridRenderer.destroy();
    this.context.destroy();
  }
}
