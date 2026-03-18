import { Camera } from "./Camera";

/**
 * Drives smooth animated zoom transitions and momentum-based pan inertia.
 * Uses log-space interpolation for zoom (multiplicative) and linear
 * interpolation for position, producing the fluid feel of endless-paper
 * infinite canvas applications.
 *
 * Integrate by calling tick() once per frame from the render loop.
 */
export class CameraAnimator {
  private camera: Camera;

  // Animated transition target (null = no active animation)
  private target: { x: number; y: number; zoom: number } | null = null;

  // Momentum pan state (world-space velocity per frame)
  private momentumVx = 0;
  private momentumVy = 0;

  // Tuning constants
  private readonly lerpSpeed = 0.14;
  private readonly friction = 0.92;
  private readonly snapZoomThreshold = 0.001;
  private readonly snapPosThreshold = 0.01;
  private readonly minMomentum = 0.05;

  constructor(camera: Camera) {
    this.camera = camera;
  }

  /** Stop all running animations (call when user begins direct manipulation). */
  interrupt(): void {
    this.target = null;
    this.momentumVx = 0;
    this.momentumVy = 0;
  }

  /** Stop only momentum (call when starting a new pan gesture). */
  interruptMomentum(): void {
    this.momentumVx = 0;
    this.momentumVy = 0;
  }

  /** Kick off momentum with the given world-space velocity. */
  setMomentum(vx: number, vy: number): void {
    this.momentumVx = vx;
    this.momentumVy = vy;
  }

  /**
   * Animate zoom to a target level, keeping a world point anchored
   * at the given screen position (e.g., the cursor or viewport center).
   */
  animateZoomTo(
    targetZoom: number,
    anchorScreenX: number,
    anchorScreenY: number,
  ): void {
    const clamped = Math.min(
      Camera.MAX_ZOOM,
      Math.max(Camera.MIN_ZOOM, targetZoom),
    );
    const anchor = this.camera.screenToWorld(anchorScreenX, anchorScreenY);
    const [viewW, viewH] = this.camera.getViewportSize();

    // Compute the camera position that keeps `anchor` at the same screen pixel
    // at the new zoom level:
    //   anchor.x = (anchorScreenX - viewW/2) / clamped + targetX
    //   targetX  = anchor.x - (anchorScreenX - viewW/2) / clamped
    const targetX = anchor.x - (anchorScreenX - viewW / 2) / clamped;
    const targetY = anchor.y - (anchorScreenY - viewH / 2) / clamped;

    this.target = { x: targetX, y: targetY, zoom: clamped };
  }

  /** Animate to a specific zoom level centered on the current viewport. */
  animateZoomCentered(targetZoom: number): void {
    const clamped = Math.min(
      Camera.MAX_ZOOM,
      Math.max(Camera.MIN_ZOOM, targetZoom),
    );
    this.target = { x: this.camera.x, y: this.camera.y, zoom: clamped };
  }

  /**
   * Animate to fit a world-space bounding box within the viewport,
   * with optional pixel padding around the edges.
   */
  animateToFit(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    padding = 40,
  ): void {
    const [viewW, viewH] = this.camera.getViewportSize();
    const boundsW = maxX - minX;
    const boundsH = maxY - minY;
    if (boundsW <= 0 || boundsH <= 0) return;

    const zoomX = (viewW - padding * 2) / boundsW;
    const zoomY = (viewH - padding * 2) / boundsH;
    const targetZoom = Math.min(
      Camera.MAX_ZOOM,
      Math.max(Camera.MIN_ZOOM, Math.min(zoomX, zoomY)),
    );

    this.target = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      zoom: targetZoom,
    };
  }

  /** True when any animation or momentum is still active. */
  get isAnimating(): boolean {
    return (
      this.target !== null ||
      Math.abs(this.momentumVx) > this.minMomentum ||
      Math.abs(this.momentumVy) > this.minMomentum
    );
  }

  /**
   * Advance all animations by one frame. Returns true if the camera
   * was moved (the caller should re-render).
   */
  tick(): boolean {
    let moved = false;

    // --- Momentum pan ---
    if (
      Math.abs(this.momentumVx) > this.minMomentum ||
      Math.abs(this.momentumVy) > this.minMomentum
    ) {
      this.camera.x += this.momentumVx;
      this.camera.y += this.momentumVy;
      this.momentumVx *= this.friction;
      this.momentumVy *= this.friction;
      moved = true;
    } else {
      this.momentumVx = 0;
      this.momentumVy = 0;
    }

    // --- Animated zoom + position transition ---
    if (this.target) {
      const t = this.target;

      // Interpolate zoom in log-space (multiplicative / exponential easing)
      const logCurrent = Math.log(this.camera.zoom);
      const logTarget = Math.log(t.zoom);
      const logDiff = logTarget - logCurrent;

      // Interpolate position linearly
      const dx = t.x - this.camera.x;
      const dy = t.y - this.camera.y;

      const zoomDone = Math.abs(logDiff) < this.snapZoomThreshold;
      const posDone =
        Math.abs(dx) < this.snapPosThreshold &&
        Math.abs(dy) < this.snapPosThreshold;

      if (zoomDone && posDone) {
        // Snap to final values
        this.camera.zoom = t.zoom;
        this.camera.x = t.x;
        this.camera.y = t.y;
        this.target = null;
      } else {
        this.camera.zoom = Math.exp(logCurrent + logDiff * this.lerpSpeed);
        this.camera.x += dx * this.lerpSpeed;
        this.camera.y += dy * this.lerpSpeed;
      }
      moved = true;
    }

    return moved;
  }
}
