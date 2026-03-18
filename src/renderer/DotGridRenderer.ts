import { ShaderProgram } from "./ShaderProgram";

const DOT_VERTEX_SHADER = `#version 300 es
  precision highp float;

  in vec2 a_position;

  uniform mat3 u_camera;
  uniform float u_pointSize;

  void main() {
    vec3 transformed = u_camera * vec3(a_position, 1.0);
    gl_Position = vec4(transformed.xy, 0.0, 1.0);
    gl_PointSize = u_pointSize;
  }
`;

const DOT_FRAGMENT_SHADER = `#version 300 es
  precision highp float;

  uniform vec4 u_color;
  out vec4 fragColor;

  void main() {
    // Circle shape: discard pixels outside radius
    vec2 center = gl_PointCoord - vec2(0.5);
    if (dot(center, center) > 0.25) discard;
    fragColor = u_color;
  }
`;

/**
 * Renders a dot grid background that scales with camera zoom,
 * providing spatial reference without being distracting.
 * Uses GL_POINTS with a circle fragment shader.
 */
export class DotGridRenderer {
  private gl: WebGL2RenderingContext;
  private shader: ShaderProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private aPositionLoc: number;
  private uCameraLoc: WebGLUniformLocation | null;
  private uPointSizeLoc: WebGLUniformLocation | null;
  private uColorLoc: WebGLUniformLocation | null;

  /** World-space distance between dots at base zoom. */
  private readonly baseSpacing = 50;
  /** Dot color (light gray, subtle). */
  private readonly dotColor: [number, number, number, number] = [0.0, 0.0, 0.0, 0.10];
  /** Dot radius in screen pixels. */
  private readonly dotSize = 2.0;
  /** Max dots per axis to avoid excessive geometry. */
  private readonly maxDotsPerAxis = 200;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.shader = new ShaderProgram(gl, DOT_VERTEX_SHADER, DOT_FRAGMENT_SHADER);

    this.aPositionLoc = this.shader.getAttribLocation("a_position");
    this.uCameraLoc = this.shader.getUniformLocation("u_camera");
    this.uPointSizeLoc = this.shader.getUniformLocation("u_pointSize");
    this.uColorLoc = this.shader.getUniformLocation("u_color");

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create dot grid VAO");
    this.vao = vao;

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error("Failed to create dot grid VBO");
    this.vbo = vbo;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(this.aPositionLoc);
    gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /**
   * Compute the grid spacing that looks good at the current zoom level.
   * As the user zooms out, the spacing increases (fewer dots visible);
   * as they zoom in, the spacing decreases to maintain density.
   */
  getEffectiveSpacing(zoom: number): number {
    // Use power-of-2 scaling so the grid snaps cleanly between levels
    const logSpacing = Math.log2(this.baseSpacing / zoom);
    const level = Math.round(logSpacing);
    return Math.pow(2, level);
  }

  /**
   * Draw the dot grid for the given viewport bounds and camera matrix.
   */
  draw(
    cameraMatrix: Float32Array,
    viewportBounds: { minX: number; minY: number; maxX: number; maxY: number },
    zoom: number,
  ): void {
    const gl = this.gl;
    const spacing = this.getEffectiveSpacing(zoom);

    // Compute grid-aligned start/end in world space
    const startX = Math.floor(viewportBounds.minX / spacing) * spacing;
    const startY = Math.floor(viewportBounds.minY / spacing) * spacing;
    const endX = Math.ceil(viewportBounds.maxX / spacing) * spacing;
    const endY = Math.ceil(viewportBounds.maxY / spacing) * spacing;

    const countX = Math.min(this.maxDotsPerAxis, Math.round((endX - startX) / spacing) + 1);
    const countY = Math.min(this.maxDotsPerAxis, Math.round((endY - startY) / spacing) + 1);
    const totalDots = countX * countY;

    if (totalDots <= 0) return;

    // Generate dot positions
    const positions = new Float32Array(totalDots * 2);
    let idx = 0;
    for (let iy = 0; iy < countY; iy++) {
      const wy = startY + iy * spacing;
      for (let ix = 0; ix < countX; ix++) {
        positions[idx++] = startX + ix * spacing;
        positions[idx++] = wy;
      }
    }

    // Upload and draw
    this.shader.use();

    if (this.uCameraLoc) {
      gl.uniformMatrix3fv(this.uCameraLoc, false, cameraMatrix);
    }
    if (this.uPointSizeLoc) {
      const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
      gl.uniform1f(this.uPointSizeLoc, this.dotSize * dpr);
    }
    if (this.uColorLoc) {
      gl.uniform4fv(this.uColorLoc, this.dotColor);
    }

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, totalDots);
    gl.bindVertexArray(null);
  }

  destroy(): void {
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteVertexArray(this.vao);
    this.shader.destroy();
  }
}
