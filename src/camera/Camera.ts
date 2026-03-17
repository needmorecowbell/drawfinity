/**
 * Stores camera position and zoom, provides coordinate transforms
 * between world space and screen (NDC) space.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  private canvasWidth = 1;
  private canvasHeight = 1;

  static readonly MIN_ZOOM = 0.01;
  static readonly MAX_ZOOM = 100;

  setViewportSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Returns a mat3 (column-major Float32Array) that maps world coordinates
   * to NDC (clip space -1..1).
   *
   * Transform: scale by zoom, translate by -camera position,
   * then map pixel coords to NDC.
   */
  getTransformMatrix(): Float32Array {
    const sx = (2 * this.zoom) / this.canvasWidth;
    const sy = (-2 * this.zoom) / this.canvasHeight; // flip Y for screen coords
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
    const worldX = (screenX - this.canvasWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.canvasHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
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
