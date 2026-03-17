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

    // Off-white clear color: #FAFAF8
    this.gl.clearColor(250 / 255, 250 / 255, 248 / 255, 1.0);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

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

  clear(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  destroy(): void {
    this.resizeObserver.disconnect();
  }
}
