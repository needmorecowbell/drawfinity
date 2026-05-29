import { WebGLContext } from "./WebGLContext";
import { StrokeRenderer, StrokePoint } from "./StrokeRenderer";
import { DotGridRenderer, autoContrastDotColor } from "./DotGridRenderer";
import { LineGridRenderer } from "./LineGridRenderer";
import { StrokeVertexCache } from "./StrokeVertexCache";
import { ShapeVertexCache } from "./ShapeVertexCache";
import type { GridStyle } from "../user/UserPreferences";
import type { SelectionPoint, SelectionRegion } from "../model";

interface SelectionOverlayCamera {
  x: number;
  y: number;
  zoom: number;
  getViewportSize(): [number, number];
}

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
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayContext: CanvasRenderingContext2D | null = null;
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

  /**
   * Renders the background grid overlay using the currently configured
   * {@link GridStyle}. When the style is `"none"`, this method is a no-op.
   *
   * @param cameraMatrix - A 3x3 transformation matrix stored as a 9-element
   *   {@link Float32Array} in column-major order, used to position grid
   *   geometry in clip space.
   * @param viewportBounds - Axis-aligned bounding rectangle of the visible
   *   area in world coordinates. Only grid elements within these bounds are
   *   drawn.
   * @param viewportBounds.minX - Left edge of the visible area in world space.
   * @param viewportBounds.minY - Top edge of the visible area in world space.
   * @param viewportBounds.maxX - Right edge of the visible area in world space.
   * @param viewportBounds.maxY - Bottom edge of the visible area in world space.
   * @param zoom - Current camera zoom level, used to scale grid spacing so
   *   the grid remains visually consistent across zoom levels.
   *
   * @see {@link setGridStyle} to change which grid renderer is active.
   * @see {@link setBackgroundColor} which auto-adjusts grid colors for contrast.
   */
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

  /**
   * Renders a single stroke to the canvas as triangle strip geometry.
   *
   * Delegates to the internal {@link StrokeRenderer} which converts the stroke
   * points into filled quads offset along segment normals with miter joins.
   * For rendering multiple strokes efficiently, prefer {@link drawStrokeBatch}.
   *
   * @param points - Ordered array of stroke points with position and optional pressure.
   *   Pressure values (0–1) control the rendered width at each point.
   * @param color - RGBA color tuple, each component in the range [0, 1].
   * @param width - Base stroke width in world-space units, scaled by each point's pressure.
   */
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

  /**
   * Draws finalized and in-progress selection regions into a pointer-transparent
   * 2D overlay above the WebGL canvas. Geometry is positioned from world space,
   * while stroke width and dash lengths stay fixed in screen-space pixels.
   */
  drawSelectionOverlay(
    camera: SelectionOverlayCamera,
    regions: readonly (SelectionRegion | null | undefined)[],
  ): void {
    const ctx = this.ensureSelectionOverlay();
    if (!ctx || !this.overlayCanvas) return;

    const [width, height] = camera.getViewportSize();
    this.resizeSelectionOverlay(width, height);
    ctx.clearRect(0, 0, width, height);

    const visibleRegions = regions.filter((region): region is SelectionRegion => Boolean(region));
    if (visibleRegions.length === 0) return;

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(37, 99, 235, 0.95)";
    ctx.fillStyle = "rgba(37, 99, 235, 0.06)";
    ctx.setLineDash([6, 4]);

    for (const region of visibleRegions) {
      this.traceSelectionPath(ctx, camera, region);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  clearSelectionOverlay(): void {
    if (!this.overlayCanvas || !this.overlayContext) return;
    this.overlayContext.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  /**
   * Releases all WebGL resources held by this renderer, including the stroke renderer,
   * grid renderers, and the underlying WebGL context. Call this when the canvas is being
   * removed from the DOM or the application is shutting down to avoid GPU memory leaks.
   *
   * After calling destroy(), this Renderer instance must not be used again.
   */
  destroy(): void {
    this.overlayCanvas?.remove();
    this.overlayCanvas = null;
    this.overlayContext = null;
    this.strokeRenderer.destroy();
    this.dotGridRenderer.destroy();
    this.lineGridRenderer.destroy();
    this.context.destroy();
  }

  private ensureSelectionOverlay(): CanvasRenderingContext2D | null {
    if (this.overlayContext) return this.overlayContext;

    const sourceCanvas = this.context.canvas;
    const ownerDocument = sourceCanvas.ownerDocument;
    const parent = sourceCanvas.parentElement;
    if (!ownerDocument || !parent) return null;

    const overlay = ownerDocument.createElement("canvas");
    overlay.className = "selection-overlay-canvas";
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "1",
    });

    parent.appendChild(overlay);
    this.overlayCanvas = overlay;
    this.overlayContext = overlay.getContext("2d");
    return this.overlayContext;
  }

  private resizeSelectionOverlay(width: number, height: number): void {
    if (!this.overlayCanvas || !this.overlayContext) return;
    const dpr =
      typeof globalThis.devicePixelRatio === "number" && globalThis.devicePixelRatio > 0
        ? globalThis.devicePixelRatio
        : 1;
    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));

    if (this.overlayCanvas.width !== pixelWidth || this.overlayCanvas.height !== pixelHeight) {
      this.overlayCanvas.width = pixelWidth;
      this.overlayCanvas.height = pixelHeight;
    }

    this.overlayContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private traceSelectionPath(
    ctx: CanvasRenderingContext2D,
    camera: SelectionOverlayCamera,
    region: SelectionRegion,
  ): void {
    ctx.beginPath();

    if (region.type === "rect") {
      const topLeft = worldToScreen(camera, { x: region.bounds.x, y: region.bounds.y });
      ctx.rect(
        topLeft.x,
        topLeft.y,
        region.bounds.width * camera.zoom,
        region.bounds.height * camera.zoom,
      );
      return;
    }

    if (region.type === "ellipse") {
      const center = worldToScreen(camera, {
        x: region.bounds.x + region.bounds.width / 2,
        y: region.bounds.y + region.bounds.height / 2,
      });
      ctx.ellipse(
        center.x,
        center.y,
        Math.abs(region.bounds.width * camera.zoom) / 2,
        Math.abs(region.bounds.height * camera.zoom) / 2,
        0,
        0,
        Math.PI * 2,
      );
      return;
    }

    const [first, ...rest] = region.points;
    if (!first) return;

    const start = worldToScreen(camera, first);
    ctx.moveTo(start.x, start.y);
    for (const point of rest) {
      const screen = worldToScreen(camera, point);
      ctx.lineTo(screen.x, screen.y);
    }
    if (region.points.length >= 3) {
      ctx.closePath();
    }
  }
}

function worldToScreen(camera: SelectionOverlayCamera, point: SelectionPoint): SelectionPoint {
  const [width, height] = camera.getViewportSize();
  return {
    x: (point.x - camera.x) * camera.zoom + width / 2,
    y: (point.y - camera.y) * camera.zoom + height / 2,
  };
}
