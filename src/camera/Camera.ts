/**
 * Stores camera position and zoom, provides coordinate transforms
 * between world space and screen (NDC) space.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  private viewportWidth = 1;
  private viewportHeight = 1;

  static readonly MIN_ZOOM = 1e-10;
  static readonly MAX_ZOOM = 1e10;

  setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /** Returns [width, height] of the current viewport in CSS pixels. */
  getViewportSize(): [number, number] {
    return [this.viewportWidth, this.viewportHeight];
  }

  /**
   * Returns a mat3 (column-major Float32Array) that maps world coordinates
   * to NDC (clip space -1..1).
   *
   * Transform: scale by zoom, translate by -camera position,
   * then map pixel coords to NDC.
   */
  getTransformMatrix(): Float32Array {
    const sx = (2 * this.zoom) / this.viewportWidth;
    const sy = (-2 * this.zoom) / this.viewportHeight; // flip Y for screen coords
    const tx = -this.x * sx;
    const ty = -this.y * sy;

    // Column-major mat3
    return new Float32Array([
      sx, 0, 0,
      0, sy, 0,
      tx, ty, 1,
    ]);
  }

  /**
   * Converts screen pixel coordinates to world coordinates.
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    // Screen center is (canvasWidth/2, canvasHeight/2) which maps to camera position
    const worldX = (screenX - this.viewportWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.viewportHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  /**
   * Returns the world-space axis-aligned bounding box of the current viewport.
   */
  getViewportBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const halfW = this.viewportWidth / (2 * this.zoom);
    const halfH = this.viewportHeight / (2 * this.zoom);
    return {
      minX: this.x - halfW,
      minY: this.y - halfH,
      maxX: this.x + halfW,
      maxY: this.y + halfH,
    };
  }

  /**
   * Zoom toward a screen-space point (e.g., cursor position).
   * Adjusts camera position so the world point under the cursor stays fixed.
   */
  zoomAt(screenX: number, screenY: number, factor: number): void {
    const worldBefore = this.screenToWorld(screenX, screenY);
    this.zoom = Math.min(Camera.MAX_ZOOM, Math.max(Camera.MIN_ZOOM, this.zoom * factor));
    const worldAfter = this.screenToWorld(screenX, screenY);
    this.x += worldBefore.x - worldAfter.x;
    this.y += worldBefore.y - worldAfter.y;
  }
}
