import {
  ShaderProgram,
  STROKE_VERTEX_SHADER,
  STROKE_FRAGMENT_SHADER,
} from "./ShaderProgram";
import { generateTriangleStrip } from "./StrokeMesh";

export interface StrokePoint {
  x: number;
  y: number;
}

/**
 * Renders polyline strokes as GL_TRIANGLE_STRIP with vertex colors.
 * Uses triangle strip geometry instead of deprecated gl.lineWidth().
 */
export class StrokeRenderer {
  private gl: WebGL2RenderingContext;
  private shader: ShaderProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private aPositionLoc: number;
  private aColorLoc: number;
  private uCameraLoc: WebGLUniformLocation | null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.shader = new ShaderProgram(
      gl,
      STROKE_VERTEX_SHADER,
      STROKE_FRAGMENT_SHADER,
    );

    this.aPositionLoc = this.shader.getAttribLocation("a_position");
    this.aColorLoc = this.shader.getAttribLocation("a_color");
    this.uCameraLoc = this.shader.getUniformLocation("u_camera");

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create VAO");
    this.vao = vao;

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error("Failed to create VBO");
    this.vbo = vbo;

    // Set up vertex attribute layout: vec2 position + vec4 color = 6 floats per vertex
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    const stride = 6 * 4; // 6 floats * 4 bytes
    gl.enableVertexAttribArray(this.aPositionLoc);
    gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.aColorLoc);
    gl.vertexAttribPointer(
      this.aColorLoc,
      4,
      gl.FLOAT,
      false,
      stride,
      2 * 4,
    );

    gl.bindVertexArray(null);

    // Enable alpha blending for smooth anti-aliased edges
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  setCameraMatrix(matrix: Float32Array): void {
    this.shader.use();
    if (this.uCameraLoc) {
      this.gl.uniformMatrix3fv(this.uCameraLoc, false, matrix);
    }
  }

  drawStroke(
    points: readonly StrokePoint[],
    color: [number, number, number, number],
    width: number,
  ): void {
    if (points.length < 2) return;

    const gl = this.gl;

    // Generate triangle strip geometry from the polyline
    const data = generateTriangleStrip(points, width, color);
    if (!data) return;

    const vertexCount = data.length / 6;

    this.shader.use();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);

    gl.bindVertexArray(null);
  }

  destroy(): void {
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteVertexArray(this.vao);
    this.shader.destroy();
  }
}
