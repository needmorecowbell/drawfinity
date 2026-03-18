import { ToolType } from "../tools/ToolManager";

/**
 * Manages the canvas cursor to reflect the active tool and brush size.
 * - Brush: circle outline matching current brush width (scaled by zoom)
 * - Eraser: larger circle outline
 * - Pan mode: grab/grabbing cursor via CSS (handled by CameraController)
 *
 * Uses SVG data URIs for crisp, resolution-independent cursors.
 */
export class CursorManager {
  private canvas: HTMLCanvasElement;
  private currentTool: ToolType = "brush";
  private brushWidth = 2;
  private eraserRadius = 10;
  private zoom = 1;
  private isPanning = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.updateCursor();
  }

  setBrushWidth(width: number): void {
    this.brushWidth = width;
    this.updateCursor();
  }

  setEraserRadius(radius: number): void {
    this.eraserRadius = radius;
    this.updateCursor();
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
    this.updateCursor();
  }

  setPanning(panning: boolean): void {
    this.isPanning = panning;
    this.updateCursor();
  }

  /**
   * Build an SVG circle cursor at the given screen-pixel diameter.
   * Returns a CSS cursor value string.
   */
  private buildCircleCursor(screenDiameter: number): string {
    // Clamp to reasonable range for cursor rendering
    const d = Math.max(4, Math.min(128, Math.round(screenDiameter)));
    const r = d / 2;
    const svgSize = d + 2; // 1px padding for stroke
    const center = svgSize / 2;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">` +
      `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>` +
      `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1" stroke-dasharray="2,2"/>` +
      `</svg>`;

    const encoded = encodeURIComponent(svg);
    const hotspot = Math.round(svgSize / 2);
    return `url("data:image/svg+xml,${encoded}") ${hotspot} ${hotspot}, crosshair`;
  }

  updateCursor(): void {
    if (this.isPanning) {
      // Pan cursor is handled by CameraController; don't override
      return;
    }

    if (this.currentTool === "brush") {
      const screenDiameter = this.brushWidth * this.zoom;
      this.canvas.style.cursor = this.buildCircleCursor(screenDiameter);
    } else if (this.currentTool === "eraser") {
      const screenDiameter = this.eraserRadius * 2 * this.zoom;
      this.canvas.style.cursor = this.buildCircleCursor(screenDiameter);
    }
  }
}
