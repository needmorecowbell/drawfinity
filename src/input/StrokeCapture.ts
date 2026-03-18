import { Camera } from "../camera";
import { CameraController } from "../camera";
import { DocumentModel, Stroke, StrokePoint, generateStrokeId } from "../model/Stroke";
import { BrushConfig } from "../tools/Brush";
import { smoothStroke } from "./StrokeSmoothing";

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

  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;

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
    // Only start stroke on left button without Ctrl (Ctrl+left is pan)
    if (e.button !== 0 || e.ctrlKey) return;
    // Don't draw while camera is panning
    if (this.cameraController.panning) return;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    this.activeStroke = [{ x: world.x, y: world.y, pressure }];
    this.canvas.setPointerCapture(e.pointerId);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.activeStroke) return;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    this.activeStroke.push({ x: world.x, y: world.y, pressure });
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.activeStroke) return;

    // Only finalize strokes with at least 2 points
    if (this.activeStroke.length >= 2) {
      const smoothed = smoothStroke(this.activeStroke, this.smoothingWindow);
      const stroke: Stroke = {
        id: generateStrokeId(),
        points: smoothed,
        color: this.strokeColor,
        width: this.strokeWidth,
        timestamp: Date.now(),
      };
      this.document.addStroke(stroke);
    }

    this.activeStroke = null;
    this.canvas.releasePointerCapture(e.pointerId);
  }

  /** Returns the in-progress stroke points (smoothed, for live rendering), or null. */
  getActiveStroke(): { points: readonly StrokePoint[]; color: string; width: number } | null {
    if (!this.activeStroke || this.activeStroke.length < 2) return null;
    const smoothed = smoothStroke(this.activeStroke, this.smoothingWindow);
    return { points: smoothed, color: this.strokeColor, width: this.strokeWidth };
  }

  setColor(color: string): void {
    this.strokeColor = color;
  }

  setWidth(width: number): void {
    this.strokeWidth = width;
  }

  setSmoothing(windowSize: number): void {
    this.smoothingWindow = windowSize;
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

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }
}
