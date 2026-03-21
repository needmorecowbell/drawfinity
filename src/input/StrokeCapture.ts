import { Camera } from "../camera";
import { CameraController } from "../camera";
import { DocumentModel, Stroke, StrokePoint, generateStrokeId } from "../model/Stroke";
import { BrushConfig } from "../tools/Brush";
import { EraserTool } from "../tools/EraserTool";
import { ToolType } from "../tools/ToolManager";
import { smoothStroke } from "./StrokeSmoothing";

/**
 * Captures pointer events on the canvas and converts them into strokes or erasure operations.
 *
 * Listens for `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` events on the
 * provided canvas element. In brush mode, pointer input is accumulated into stroke points
 * (with pressure-curve processing), smoothed, and committed to the document model on pointer
 * release. In eraser mode, strokes and shapes under the pointer are removed or split via
 * {@link EraserTool}.
 *
 * Brush width is converted from screen-space pixels to world-space units at the zoom level
 * when the stroke begins, so strokes maintain consistent visual weight regardless of zoom.
 * Stroke-level opacity is derived from the brush's {@link BrushConfig.opacityCurve} applied
 * to the average pressure across all captured points.
 *
 * Call {@link destroy} to remove all event listeners when the capture instance is no longer needed.
 */
export class StrokeCapture {
  private camera: Camera;
  private cameraController: CameraController;
  private document: DocumentModel;
  private canvas: HTMLCanvasElement;

  private activeStroke: StrokePoint[] | null = null;
  private strokeColor = "#000000";
  private strokeWidth = 2;
  private smoothingWindow = 5;
  private activeBrush: BrushConfig | null = null;
  private activeTool: ToolType = "brush";
  private eraserTool: EraserTool = new EraserTool();
  private isErasing = false;
  private activeStrokeOpacityCurve: ((p: number) => number) | null = null;
  /** World-space width for the active stroke (brushWidth / zoom at stroke start). */
  private activeStrokeWorldWidth = 2;
  private enabled = true;

  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;

  /**
   * Creates a new StrokeCapture and immediately begins listening for pointer events.
   *
   * @param camera - Camera used to convert screen coordinates to world-space positions.
   * @param cameraController - Checked during pointer-down to suppress drawing while panning.
   * @param document - The document model that receives completed strokes and erasure operations.
   * @param canvas - The HTML canvas element to attach pointer event listeners to.
   */
  constructor(
    camera: Camera,
    cameraController: CameraController,
    document: DocumentModel,
    canvas: HTMLCanvasElement,
  ) {
    this.camera = camera;
    this.cameraController = cameraController;
    this.document = document;
    this.canvas = canvas;

    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    // Only start stroke on left button without Ctrl (Ctrl+left is pan)
    if (e.button !== 0 || e.ctrlKey) return;
    // Don't draw while camera is panning
    if (this.cameraController.panning) return;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);

    if (this.activeTool === "eraser") {
      this.isErasing = true;
      this.canvas.setPointerCapture(e.pointerId);
      this.eraseAt(world.x, world.y);
      return;
    }

    const rawPressure = e.pressure > 0 ? e.pressure : 0.5;
    const pressure = this.activeBrush ? this.activeBrush.pressureCurve(rawPressure) : rawPressure;
    this.activeStroke = [{ x: world.x, y: world.y, pressure }];
    this.activeStrokeOpacityCurve = this.activeBrush?.opacityCurve ?? null;
    // Convert screen-space brush width to world-space at current zoom
    this.activeStrokeWorldWidth = this.strokeWidth / this.camera.zoom;
    this.canvas.setPointerCapture(e.pointerId);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.isErasing) {
      const world = this.camera.screenToWorld(e.clientX, e.clientY);
      this.eraseAt(world.x, world.y);
      return;
    }

    if (!this.activeStroke) return;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);
    const rawPressure = e.pressure > 0 ? e.pressure : 0.5;
    const pressure = this.activeBrush ? this.activeBrush.pressureCurve(rawPressure) : rawPressure;

    this.activeStroke.push({ x: world.x, y: world.y, pressure });
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.isErasing) {
      this.isErasing = false;
      this.canvas.releasePointerCapture(e.pointerId);
      return;
    }

    if (!this.activeStroke) return;

    // Only finalize strokes with at least 2 points
    if (this.activeStroke.length >= 2) {
      const smoothed = smoothStroke(this.activeStroke, this.smoothingWindow);
      // Compute stroke-level opacity from the brush's opacityCurve using average pressure
      const avgPressure = this.activeStroke.reduce((s, p) => s + p.pressure, 0) / this.activeStroke.length;
      const opacity = this.activeStrokeOpacityCurve ? this.activeStrokeOpacityCurve(avgPressure) : 1.0;
      const stroke: Stroke = {
        id: generateStrokeId(),
        points: smoothed,
        color: this.strokeColor,
        width: this.activeStrokeWorldWidth,
        opacity,
        timestamp: Date.now(),
      };
      this.document.addStroke(stroke);
    }

    this.activeStroke = null;
    this.canvas.releasePointerCapture(e.pointerId);
  }

  private eraseAt(worldX: number, worldY: number): void {
    // Erase strokes (split or remove)
    if (this.document.replaceStroke || this.document.removeStroke) {
      const strokes = this.document.getStrokes();
      const results = this.eraserTool.computeErasureResults(worldX, worldY, strokes);
      for (const { strokeId, fragments } of results) {
        if (this.document.replaceStroke) {
          this.document.replaceStroke(strokeId, fragments);
        } else if (this.document.removeStroke) {
          this.document.removeStroke(strokeId);
        }
      }
    }

    // Erase shapes (whole-shape removal)
    if (this.document.getShapes && this.document.removeShape) {
      const shapes = this.document.getShapes();
      const hitShapeIds = this.eraserTool.findIntersectingShapes(worldX, worldY, shapes);
      for (const shapeId of hitShapeIds) {
        this.document.removeShape(shapeId);
      }
    }
  }

  /** Returns the in-progress stroke points (smoothed, for live rendering), or null. */
  getActiveStroke(): { points: readonly StrokePoint[]; color: string; width: number; opacity: number } | null {
    if (!this.activeStroke || this.activeStroke.length < 2) return null;
    const smoothed = smoothStroke(this.activeStroke, this.smoothingWindow);
    const avgPressure = this.activeStroke.reduce((s, p) => s + p.pressure, 0) / this.activeStroke.length;
    const opacity = this.activeStrokeOpacityCurve ? this.activeStrokeOpacityCurve(avgPressure) : 1.0;
    return { points: smoothed, color: this.strokeColor, width: this.activeStrokeWorldWidth, opacity };
  }

  /**
   * Enables or disables stroke capture. When disabled, pointer events are ignored and any
   * in-progress stroke or erase operation is cancelled.
   *
   * @param enabled - `true` to accept pointer input, `false` to ignore it.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.activeStroke = null;
      this.isErasing = false;
    }
  }

  /** Returns whether stroke capture is currently enabled. */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Sets the stroke color for subsequent strokes.
   *
   * @param color - CSS color string (e.g. `"#ff0000"`).
   */
  setColor(color: string): void {
    this.strokeColor = color;
  }

  /**
   * Sets the brush width in screen-space pixels. Converted to world-space at stroke start.
   *
   * @param width - Brush diameter in screen pixels.
   */
  setWidth(width: number): void {
    this.strokeWidth = width;
  }

  /**
   * Sets the smoothing window size used to filter stroke points on finalization.
   *
   * @param windowSize - Number of neighboring points to average during smoothing.
   */
  setSmoothing(windowSize: number): void {
    this.smoothingWindow = windowSize;
  }

  /**
   * Switches the active tool, determining whether pointer input draws strokes or erases.
   *
   * @param tool - The tool to activate (e.g. `"brush"`, `"eraser"`).
   */
  setTool(tool: ToolType): void {
    this.activeTool = tool;
  }

  /** Returns the currently active tool type. */
  getTool(): ToolType {
    return this.activeTool;
  }

  /** Returns the underlying {@link EraserTool} instance used for erasure hit-testing. */
  getEraserTool(): EraserTool {
    return this.eraserTool;
  }

  /** Apply a full brush config — sets color, width, and smoothing from the brush. */
  setBrushConfig(brush: BrushConfig): void {
    this.activeBrush = brush;
    this.strokeColor = brush.color;
    this.strokeWidth = brush.baseWidth;
    this.smoothingWindow = brush.smoothing;
  }

  /** Returns the active brush config, or null if none set. */
  getBrushConfig(): BrushConfig | null {
    return this.activeBrush;
  }

  /** Removes all pointer event listeners from the canvas. Call when this instance is no longer needed. */
  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }
}
