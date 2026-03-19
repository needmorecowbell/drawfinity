import { Camera } from "../camera/Camera";
import { CameraAnimator } from "../camera/CameraAnimator";
import { CameraController } from "../camera/CameraController";

/**
 * Handles magnify tool interaction on the canvas.
 * Click zooms in 2x toward the clicked point.
 * Drag up zooms in continuously, drag down zooms out continuously,
 * anchored at the initial pointer position.
 */
export class MagnifyCapture {
  private camera: Camera;
  private cameraAnimator: CameraAnimator;
  private cameraController: CameraController;
  private canvas: HTMLCanvasElement;

  private enabled = false;
  private isActive = false;
  private startX = 0;
  private startY = 0;
  private lastY = 0;
  private isDragging = false;
  private pointerId = -1;

  private static readonly DRAG_THRESHOLD = 5;
  private static readonly DRAG_ZOOM_SENSITIVITY = 0.005;

  onCursorChange?: (mode: "default" | "in" | "out") => void;

  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;

  constructor(
    camera: Camera,
    cameraAnimator: CameraAnimator,
    cameraController: CameraController,
    canvas: HTMLCanvasElement,
  ) {
    this.camera = camera;
    this.cameraAnimator = cameraAnimator;
    this.cameraController = cameraController;
    this.canvas = canvas;

    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.resetState();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private resetState(): void {
    if (this.isActive && this.pointerId >= 0) {
      try {
        this.canvas.releasePointerCapture(this.pointerId);
      } catch {
        // Pointer may already be released
      }
    }
    this.isActive = false;
    this.isDragging = false;
    this.pointerId = -1;
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    if (e.button !== 0 || e.ctrlKey) return;
    if (this.cameraController.panning) return;

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastY = e.clientY;
    this.isActive = true;
    this.isDragging = false;
    this.pointerId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isActive) return;

    const totalDeltaY = e.clientY - this.startY;

    if (!this.isDragging && Math.abs(totalDeltaY) > MagnifyCapture.DRAG_THRESHOLD) {
      this.isDragging = true;
    }

    if (this.isDragging) {
      const frameDeltaY = e.clientY - this.lastY;
      const factor = 1 - frameDeltaY * MagnifyCapture.DRAG_ZOOM_SENSITIVITY;
      this.camera.zoomAt(this.startX, this.startY, factor);
      this.lastY = e.clientY;

      const mode = totalDeltaY < 0 ? "in" : "out";
      this.onCursorChange?.(mode);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isActive) return;
    if (e.pointerId !== this.pointerId) return;

    if (!this.isDragging) {
      // Click — animated 2x zoom toward click point
      this.cameraAnimator.animateZoomTo(
        this.camera.zoom * 2,
        this.startX,
        this.startY,
      );
    }

    this.isActive = false;
    this.isDragging = false;
    this.canvas.releasePointerCapture(e.pointerId);
    this.pointerId = -1;
    this.onCursorChange?.("default");
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }
}
