import {
  ShaderProgram,
  STROKE_VERTEX_SHADER,
  STROKE_FRAGMENT_SHADER,
} from "./ShaderProgram";
import { generateTriangleStrip } from "./StrokeMesh";

/**
 * A point within a stroke used for rendering, containing position and optional pressure.
 *
 * This is the renderer-local interface for stroke points consumed by
 * {@link StrokeRenderer} and {@link generateTriangleStrip}. Unlike the model-layer
 * `StrokePoint` (in `model/Stroke.ts`), pressure is optional here — when omitted,
 * the renderer treats it as a uniform-width stroke.
 *
 * @property x - Horizontal position in world-space coordinates.
 * @property y - Vertical position in world-space coordinates.
 * @property pressure - Normalized pressure value (0–1). Optional; when absent,
 *   the stroke is rendered at uniform width.
 */
export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

/**
 * Renders polyline strokes as GL_TRIANGLE_STRIP with vertex colors.
 * Uses triangle strip geometry instead of deprecated gl.lineWidth().
 * Supports both single-stroke and batched multi-stroke rendering.
 */
export class StrokeRenderer {
  private gl: WebGL2RenderingContext;
  private shader: ShaderProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private aPositionLoc: number;
  private aColorLoc: number;
  private uCameraLoc: WebGLUniformLocation | null;

  /** Reusable batch buffer — grows as needed to avoid repeated allocation. */
  private batchBuffer: Float32Array | null = null;
  private batchBufferCapacity = 0;

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

  /**
   * Draw multiple strokes in a single draw call by concatenating their
   * pre-generated vertex data with degenerate triangles between strips.
   * This dramatically reduces GPU state changes and draw call overhead.
   */
  drawStrokeBatch(strips: Float32Array[]): void {
    if (strips.length === 0) return;

    const gl = this.gl;

    // Calculate total floats needed (including degenerate connectors)
    // Between each pair of strips, we add 2 degenerate vertices (12 floats)
    let totalFloats = 0;
    for (let i = 0; i < strips.length; i++) {
      totalFloats += strips[i].length;
      if (i > 0) totalFloats += 12; // 2 degenerate vertices × 6 floats
    }

    if (totalFloats === 0) return;

    // Grow the reusable batch buffer if needed
    if (totalFloats > this.batchBufferCapacity) {
      // Over-allocate by 50% to reduce future reallocation
      this.batchBufferCapacity = Math.ceil(totalFloats * 1.5);
      this.batchBuffer = new Float32Array(this.batchBufferCapacity);
    }

    const buffer = this.batchBuffer!;
    let offset = 0;

    for (let i = 0; i < strips.length; i++) {
      const strip = strips[i];
      if (strip.length === 0) continue;

      if (i > 0 && offset > 0) {
        // Insert degenerate triangles to connect strips:
        // Repeat last vertex of previous strip
        buffer[offset] = buffer[offset - 6];
        buffer[offset + 1] = buffer[offset - 5];
        buffer[offset + 2] = buffer[offset - 4];
        buffer[offset + 3] = buffer[offset - 3];
        buffer[offset + 4] = buffer[offset - 2];
        buffer[offset + 5] = buffer[offset - 1];
        offset += 6;

        // Repeat first vertex of next strip
        buffer[offset] = strip[0];
        buffer[offset + 1] = strip[1];
        buffer[offset + 2] = strip[2];
        buffer[offset + 3] = strip[3];
        buffer[offset + 4] = strip[4];
        buffer[offset + 5] = strip[5];
        offset += 6;
      }

      buffer.set(strip, offset);
      offset += strip.length;
    }

    const vertexCount = offset / 6;
    if (vertexCount === 0) return;

    this.shader.use();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    // Upload only the used portion of the buffer
    gl.bufferData(gl.ARRAY_BUFFER, buffer.subarray(0, offset), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
    gl.bindVertexArray(null);
  }

  /**
   * Draw multiple triangle-list arrays in a single draw call (GL_TRIANGLES).
   * Used for shape fills which use triangle fan geometry rather than strips.
   */
  drawTriangleBatch(triangleArrays: Float32Array[]): void {
    if (triangleArrays.length === 0) return;

    const gl = this.gl;

    let totalFloats = 0;
    for (const arr of triangleArrays) {
      totalFloats += arr.length;
    }
    if (totalFloats === 0) return;

    // Grow the reusable batch buffer if needed
    if (totalFloats > this.batchBufferCapacity) {
      this.batchBufferCapacity = Math.ceil(totalFloats * 1.5);
      this.batchBuffer = new Float32Array(this.batchBufferCapacity);
    }

    const buffer = this.batchBuffer!;
    let offset = 0;

    for (const arr of triangleArrays) {
      if (arr.length === 0) continue;
      buffer.set(arr, offset);
      offset += arr.length;
    }

    const vertexCount = offset / 6;
    if (vertexCount === 0) return;

    this.shader.use();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, buffer.subarray(0, offset), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    gl.bindVertexArray(null);
  }

  destroy(): void {
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteVertexArray(this.vao);
    this.shader.destroy();
    this.batchBuffer = null;
  }
}
