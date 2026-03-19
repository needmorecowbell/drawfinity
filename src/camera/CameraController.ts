import { Camera } from "./Camera";
import { CameraAnimator } from "./CameraAnimator";

/**
 * Listens for pointer/wheel/keyboard events on the canvas and drives
 * pan and zoom on the Camera.
 *
 * Pinch-to-zoom uses the PointerEvent API exclusively (no TouchEvent).
 * Trackpad pinch gestures are detected via ctrlKey on wheel events and
 * produce continuous zoom. Mouse wheel delivers discrete zoom steps.
 * Pan momentum is tracked during drag and handed off to CameraAnimator
 * on release for inertial scrolling.
 */
export class CameraController {
  private camera: Camera;
  private canvas: HTMLCanvasElement;
  private animator: CameraAnimator;

  // Pan state
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private panVelocityX = 0;
  private panVelocityY = 0;

  // Space-to-pan mode
  private spaceHeld = false;

  // Pan tool mode (activated via toolbar button)
  private _panToolActive = false;

  // Pointer-based pinch state (replaces TouchEvent API)
  private pointerCache = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private pinchLastCenter = { x: 0, y: 0 };
  private isPinching = false;

  private readonly ZOOM_STEP = 1.1;
  private readonly VELOCITY_SMOOTH = 0.4;

  // Bound handlers for cleanup
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor(camera: Camera, canvas: HTMLCanvasElement, animator: CameraAnimator) {
    this.camera = camera;
    this.canvas = canvas;
    this.animator = animator;

    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);
    this.onWheel = this.handleWheel.bind(this);
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
  }

  /** True when the controller is actively panning or space is held (input gating). */
  get panning(): boolean {
    return this.isPanning || this.spaceHeld || this.isPinching || this._panToolActive;
  }

  /** Enable/disable pan tool mode (left-click pans, cursor shows grab). */
  set panToolActive(active: boolean) {
    this._panToolActive = active;
    if (active) {
      this.canvas.style.cursor = "grab";
    } else {
      this.canvas.style.cursor = "";
    }
    if (this.onPanStateChange) this.onPanStateChange(active);
  }

  get panToolActive(): boolean {
    return this._panToolActive;
  }

  // ── Pointer events ─────────────────────────────────────────────

  private handlePointerDown(e: PointerEvent): void {
    this.pointerCache.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two pointers → start pinch
    if (this.pointerCache.size === 2) {
      this.startPinch();
      e.preventDefault();
      return;
    }

    // Middle mouse, Ctrl+left, Space+left, or pan tool+left → start pan
    const shouldPan =
      e.button === 1 ||
      (e.button === 0 && e.ctrlKey) ||
      (e.button === 0 && this.spaceHeld) ||
      (e.button === 0 && this._panToolActive);

    if (shouldPan) {
      this.isPanning = true;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      this.panVelocityX = 0;
      this.panVelocityY = 0;
      this.animator.interruptMomentum();
      this.canvas.setPointerCapture(e.pointerId);
      if (this._panToolActive) this.canvas.style.cursor = "grabbing";
      e.preventDefault();
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.pointerCache.has(e.pointerId)) {
      this.pointerCache.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-pointer pinch
    if (this.isPinching && this.pointerCache.size >= 2) {
      this.updatePinch();
      return;
    }

    if (!this.isPanning) return;

    const dx = e.clientX - this.lastPanX;
    const dy = e.clientY - this.lastPanY;
    this.lastPanX = e.clientX;
    this.lastPanY = e.clientY;

    // Move camera opposite to drag
    const worldDx = -dx / this.camera.zoom;
    const worldDy = -dy / this.camera.zoom;
    this.camera.x += worldDx;
    this.camera.y += worldDy;

    // Exponential moving average of velocity for momentum
    const s = this.VELOCITY_SMOOTH;
    this.panVelocityX = this.panVelocityX * s + worldDx * (1 - s);
    this.panVelocityY = this.panVelocityY * s + worldDy * (1 - s);
  }

  private handlePointerUp(e: PointerEvent): void {
    this.pointerCache.delete(e.pointerId);

    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.releasePointerCapture(e.pointerId);
      if (this._panToolActive) this.canvas.style.cursor = "grab";

      // Hand off velocity to animator for momentum
      if (
        Math.abs(this.panVelocityX) > 0.1 ||
        Math.abs(this.panVelocityY) > 0.1
      ) {
        this.animator.setMomentum(this.panVelocityX, this.panVelocityY);
      }
    }

    if (this.pointerCache.size < 2) {
      this.isPinching = false;
      this.pinchStartDist = 0;
    }
  }

  // ── Wheel / trackpad ──────────────────────────────────────────

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    if (e.ctrlKey) {
      // Trackpad pinch gesture (or Ctrl+scroll) → continuous zoom.
      // Browsers send ctrlKey=true + small deltaY for pinch gestures.
      const zoomDelta = -e.deltaY * 0.01;
      const factor = Math.exp(zoomDelta);
      this.camera.zoomAt(e.clientX, e.clientY, factor);
    } else {
      // Mouse wheel → smooth animated zoom steps
      const factor = e.deltaY < 0 ? this.ZOOM_STEP : 1 / this.ZOOM_STEP;
      this.animator.animateZoomTo(
        this.camera.zoom * factor,
        e.clientX,
        e.clientY,
      );
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    // Space for pan mode
    if (e.code === "Space" && !e.repeat) {
      this.spaceHeld = true;
      this.canvas.style.cursor = "grab";
      if (this.onPanStateChange) this.onPanStateChange(true);
      e.preventDefault();
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    const [viewW, viewH] = this.camera.getViewportSize();

    if (e.key === "=" || e.key === "+") {
      // Ctrl+= → animated zoom in
      e.preventDefault();
      this.animator.animateZoomTo(
        this.camera.zoom * 1.5,
        viewW / 2,
        viewH / 2,
      );
    } else if (e.key === "-") {
      // Ctrl+- → animated zoom out
      e.preventDefault();
      this.animator.animateZoomTo(
        this.camera.zoom / 1.5,
        viewW / 2,
        viewH / 2,
      );
    } else if (e.key === "0") {
      // Ctrl+0 → animated reset to 100%
      e.preventDefault();
      this.animator.animateZoomCentered(1);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code === "Space") {
      this.spaceHeld = false;
      this.canvas.style.cursor = "";
      if (this.onPanStateChange) this.onPanStateChange(false);
    }
  }

  /** Optional callback invoked when pan mode state changes. */
  onPanStateChange: ((panning: boolean) => void) | null = null;

  // ── Multi-pointer pinch helpers ───────────────────────────────

  private startPinch(): void {
    const [p1, p2] = this.getPinchPointers();
    this.pinchStartDist = this.pointerDist(p1, p2);
    this.pinchStartZoom = this.camera.zoom;
    this.pinchLastCenter = this.pointerCenter(p1, p2);
    this.isPinching = true;
  }

  private updatePinch(): void {
    const [p1, p2] = this.getPinchPointers();
    const dist = this.pointerDist(p1, p2);
    const center = this.pointerCenter(p1, p2);

    if (this.pinchStartDist > 0) {
      // Zoom
      const scale = dist / this.pinchStartDist;
      const targetZoom = this.pinchStartZoom * scale;
      const factor = targetZoom / this.camera.zoom;
      this.camera.zoomAt(center.x, center.y, factor);

      // Simultaneous pan from center movement
      const dx = center.x - this.pinchLastCenter.x;
      const dy = center.y - this.pinchLastCenter.y;
      this.camera.x -= dx / this.camera.zoom;
      this.camera.y -= dy / this.camera.zoom;
    }

    this.pinchLastCenter = center;
  }

  private getPinchPointers(): [
    { x: number; y: number },
    { x: number; y: number },
  ] {
    const entries = Array.from(this.pointerCache.values());
    return [entries[0], entries[1]];
  }

  private pointerDist(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private pointerCenter(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): { x: number; y: number } {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  }
}
