import { Camera } from "./Camera";

/**
 * Listens for pointer/wheel/touch events on the canvas and drives
 * pan and zoom on the Camera.
 */
export class CameraController {
  private camera: Camera;
  private canvas: HTMLCanvasElement;

  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;

  // Pinch-to-zoom state
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  private readonly ZOOM_FACTOR = 1.1;

  // Bound handlers for cleanup
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onTouchStart: (e: TouchEvent) => void;
  private onTouchMove: (e: TouchEvent) => void;
  private onTouchEnd: (e: TouchEvent) => void;

  constructor(camera: Camera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;

    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);
    this.onWheel = this.handleWheel.bind(this);
    this.onTouchStart = this.handleTouchStart.bind(this);
    this.onTouchMove = this.handleTouchMove.bind(this);
    this.onTouchEnd = this.handleTouchEnd.bind(this);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
    canvas.addEventListener("touchend", this.onTouchEnd);
  }

  /** Returns true if the controller is currently panning (for input gating). */
  get panning(): boolean {
    return this.isPanning;
  }

  private handlePointerDown(e: PointerEvent): void {
    // Middle mouse button or Ctrl+left click starts pan
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      this.isPanning = true;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isPanning) return;

    const dx = e.clientX - this.lastPanX;
    const dy = e.clientY - this.lastPanY;
    this.lastPanX = e.clientX;
    this.lastPanY = e.clientY;

    // Move camera opposite to drag direction (pan the view)
    this.camera.x -= dx / this.camera.zoom;
    this.camera.y -= dy / this.camera.zoom;
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.releasePointerCapture(e.pointerId);
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? this.ZOOM_FACTOR : 1 / this.ZOOM_FACTOR;
    this.camera.zoomAt(e.clientX, e.clientY, factor);
  }

  private getTouchDist(touches: TouchList): number {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchCenter(touches: TouchList): { x: number; y: number } {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      e.preventDefault();
      this.pinchStartDist = this.getTouchDist(e.touches);
      this.pinchStartZoom = this.camera.zoom;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = this.getTouchDist(e.touches);
      const scale = dist / this.pinchStartDist;
      const center = this.getTouchCenter(e.touches);
      const targetZoom = this.pinchStartZoom * scale;
      const factor = targetZoom / this.camera.zoom;
      this.camera.zoomAt(center.x, center.y, factor);
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (e.touches.length < 2) {
      this.pinchStartDist = 0;
    }
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("touchstart", this.onTouchStart);
    this.canvas.removeEventListener("touchmove", this.onTouchMove);
    this.canvas.removeEventListener("touchend", this.onTouchEnd);
  }
}
