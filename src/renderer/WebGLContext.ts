/**
 * Initializes and manages a WebGL2 rendering context.
 */
export class WebGLContext {
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
      throw new Error("WebGL2 is not supported in this browser");
    }
    this.gl = gl;

    // Default off-white clear color: #FAFAF8
    this.setClearColor("#FAFAF8");

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  /**
   * Synchronizes the canvas drawing buffer size with its CSS layout size,
   * accounting for the device pixel ratio for crisp rendering on high-DPI displays.
   *
   * Updates the WebGL viewport to match the new buffer dimensions. Only performs
   * the resize when the computed dimensions differ from the current buffer size,
   * avoiding unnecessary GPU state changes.
   *
   * Called automatically via a {@link ResizeObserver} when the canvas element
   * changes size, and once during construction for initial setup.
   */
  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const drawWidth = Math.floor(width * dpr);
    const drawHeight = Math.floor(height * dpr);

    if (this.canvas.width !== drawWidth || this.canvas.height !== drawHeight) {
      this.canvas.width = drawWidth;
      this.canvas.height = drawHeight;
      this.gl.viewport(0, 0, drawWidth, drawHeight);
    }
  }

  setClearColor(hex: string): void {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;
    this.gl.clearColor(r, g, b, 1.0);
  }

  clear(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  destroy(): void {
    this.resizeObserver.disconnect();
  }
}
