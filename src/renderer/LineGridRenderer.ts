import { ShaderProgram } from "./ShaderProgram";
import { autoContrastDotColor } from "./DotGridRenderer";

const LINE_VERTEX_SHADER = `#version 300 es
  precision highp float;

  in vec2 a_position;

  uniform mat3 u_camera;

  void main() {
    vec3 transformed = u_camera * vec3(a_position, 1.0);
    gl_Position = vec4(transformed.xy, 0.0, 1.0);
  }
`;

const LINE_FRAGMENT_SHADER = `#version 300 es
  precision highp float;

  uniform vec4 u_color;
  out vec4 fragColor;

  void main() {
    fragColor = u_color;
  }
`;

/**
 * Renders a line grid background that scales with camera zoom.
 * Uses GL_LINES for horizontal and vertical grid lines.
 */
export class LineGridRenderer {
  private gl: WebGL2RenderingContext;
  private shader: ShaderProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private aPositionLoc: number;
  private uCameraLoc: WebGLUniformLocation | null;
  private uColorLoc: WebGLUniformLocation | null;

  /** World-space distance between lines at base zoom. */
  private readonly baseSpacing = 50;
  /** Line color — auto-adjusted for background contrast. */
  private lineColor: [number, number, number, number] = [0.0, 0.0, 0.0, 0.08];
  /** Max lines per axis to avoid excessive geometry. */
  private readonly maxLinesPerAxis = 200;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.shader = new ShaderProgram(gl, LINE_VERTEX_SHADER, LINE_FRAGMENT_SHADER);

    this.aPositionLoc = this.shader.getAttribLocation("a_position");
    this.uCameraLoc = this.shader.getUniformLocation("u_camera");
    this.uColorLoc = this.shader.getUniformLocation("u_color");

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create line grid VAO");
    this.vao = vao;

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error("Failed to create line grid VBO");
    this.vbo = vbo;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(this.aPositionLoc);
    gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /**
   * Compute the grid spacing that looks good at the current zoom level.
   * Same power-of-2 snapping as DotGridRenderer.
   */
  getEffectiveSpacing(zoom: number): number {
    const logSpacing = Math.log2(this.baseSpacing / zoom);
    const level = Math.round(logSpacing);
    return Math.pow(2, level);
  }

  /**
   * Draw the line grid for the given viewport bounds and camera matrix.
   */
  draw(
    cameraMatrix: Float32Array,
    viewportBounds: { minX: number; minY: number; maxX: number; maxY: number },
    zoom: number,
  ): void {
    const gl = this.gl;
    const spacing = this.getEffectiveSpacing(zoom);

    const startX = Math.floor(viewportBounds.minX / spacing) * spacing;
    const startY = Math.floor(viewportBounds.minY / spacing) * spacing;
    const endX = Math.ceil(viewportBounds.maxX / spacing) * spacing;
    const endY = Math.ceil(viewportBounds.maxY / spacing) * spacing;

    const countX = Math.min(this.maxLinesPerAxis, Math.round((endX - startX) / spacing) + 1);
    const countY = Math.min(this.maxLinesPerAxis, Math.round((endY - startY) / spacing) + 1);
    const totalLines = countX + countY;

    if (totalLines <= 0) return;

    // Each line = 2 endpoints × 2 floats = 4 floats per line
    const positions = new Float32Array(totalLines * 4);
    let idx = 0;

    // Vertical lines
    for (let ix = 0; ix < countX; ix++) {
      const wx = startX + ix * spacing;
      positions[idx++] = wx;
      positions[idx++] = viewportBounds.minY;
      positions[idx++] = wx;
      positions[idx++] = viewportBounds.maxY;
    }

    // Horizontal lines
    for (let iy = 0; iy < countY; iy++) {
      const wy = startY + iy * spacing;
      positions[idx++] = viewportBounds.minX;
      positions[idx++] = wy;
      positions[idx++] = viewportBounds.maxX;
      positions[idx++] = wy;
    }

    this.shader.use();

    if (this.uCameraLoc) {
      gl.uniformMatrix3fv(this.uCameraLoc, false, cameraMatrix);
    }
    if (this.uColorLoc) {
      gl.uniform4fv(this.uColorLoc, this.lineColor);
    }

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.LINES, 0, totalLines * 2);
    gl.bindVertexArray(null);
  }

  setLineColor(color: [number, number, number, number]): void {
    this.lineColor = color;
  }

  /**
   * Auto-contrast for line grid: slightly more transparent than dots.
   */
  setAutoContrastColor(backgroundHex: string): void {
    const base = autoContrastDotColor(backgroundHex);
    // Lines are more subtle than dots — reduce alpha
    this.lineColor = [base[0], base[1], base[2], base[3] * 0.6];
  }

  destroy(): void {
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteVertexArray(this.vao);
    this.shader.destroy();
  }
}
