import type { DrawfinityDoc } from "../crdt/DrawfinityDoc";
import { generateTriangleStrip } from "../renderer/StrokeMesh";
import { generateShapeVertices } from "../renderer/ShapeMesh";
import type { Stroke } from "../model/Stroke";
import type { Shape } from "../model/Shape";

const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 150;
const PADDING_RATIO = 0.1;
const GENERATION_INTERVAL_MS = 30_000;

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b, 1.0];
}

interface BoundsResult {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeContentBounds(
  strokes: Stroke[],
  shapes: Shape[],
): BoundsResult | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasContent = false;

  for (const stroke of strokes) {
    for (const pt of stroke.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
      hasContent = true;
    }
  }

  for (const shape of shapes) {
    const hw = shape.width / 2 + shape.strokeWidth / 2;
    const hh = shape.height / 2 + shape.strokeWidth / 2;
    const sx = shape.x - hw;
    const sy = shape.y - hh;
    const ex = shape.x + hw;
    const ey = shape.y + hh;
    if (sx < minX) minX = sx;
    if (sy < minY) minY = sy;
    if (ex > maxX) maxX = ex;
    if (ey > maxY) maxY = ey;
    hasContent = true;
  }

  if (!hasContent) return null;
  return { minX, minY, maxX, maxY };
}

function computeFitTransform(
  bounds: BoundsResult,
  viewW: number,
  viewH: number,
): Float32Array {
  const contentW = bounds.maxX - bounds.minX;
  const contentH = bounds.maxY - bounds.minY;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const padW = contentW > 0 ? contentW * PADDING_RATIO : 10;
  const padH = contentH > 0 ? contentH * PADDING_RATIO : 10;
  const totalW = contentW + padW * 2;
  const totalH = contentH + padH * 2;

  const scaleX = viewW / totalW;
  const scaleY = viewH / totalH;
  const zoom = Math.min(scaleX, scaleY);

  const sx = (2 * zoom) / viewW;
  const sy = (-2 * zoom) / viewH;
  const tx = -centerX * sx;
  const ty = -centerY * sy;

  // Column-major mat3
  return new Float32Array([sx, 0, 0, 0, sy, 0, tx, ty, 1]);
}

export class ThumbnailGenerator {
  private lastGenerationTime = 0;
  private activitySinceLastGeneration = false;

  markActivity(): void {
    this.activitySinceLastGeneration = true;
  }

  shouldGenerate(): boolean {
    if (!this.activitySinceLastGeneration) return false;
    const now = Date.now();
    return now - this.lastGenerationTime >= GENERATION_INTERVAL_MS;
  }

  forceGenerate(): boolean {
    return this.activitySinceLastGeneration;
  }

  generate(doc: DrawfinityDoc): string | null {
    const strokes = doc.getStrokes();
    const shapes = doc.getShapes ? doc.getShapes() : [];

    const bounds = computeContentBounds(strokes, shapes);
    if (!bounds) return null;

    const offscreen = document.createElement("canvas");
    offscreen.width = THUMBNAIL_WIDTH;
    offscreen.height = THUMBNAIL_HEIGHT;

    const gl = offscreen.getContext("webgl2", {
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return null;

    try {
      return this.renderThumbnail(gl, offscreen, strokes, shapes, bounds);
    } finally {
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    }
  }

  private renderThumbnail(
    gl: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
    strokes: Stroke[],
    shapes: Shape[],
    bounds: BoundsResult,
  ): string {
    gl.viewport(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    gl.clearColor(250 / 255, 250 / 255, 248 / 255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const cameraMatrix = computeFitTransform(
      bounds,
      THUMBNAIL_WIDTH,
      THUMBNAIL_HEIGHT,
    );

    // Compile minimal shader program
    const program = this.createShaderProgram(gl);
    if (!program) return canvas.toDataURL("image/png");

    gl.useProgram(program);
    const uCamera = gl.getUniformLocation(program, "u_camera");
    gl.uniformMatrix3fv(uCamera, false, cameraMatrix);

    const aPosition = gl.getAttribLocation(program, "a_position");
    const aColor = gl.getAttribLocation(program, "a_color");

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const stride = 6 * 4; // 6 floats * 4 bytes
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, stride, 2 * 4);

    // Render shape fills (GL_TRIANGLES)
    const shapeFills: Float32Array[] = [];
    const shapeOutlines: Float32Array[] = [];
    for (const shape of shapes) {
      const vd = generateShapeVertices(shape);
      if (vd.fill) shapeFills.push(vd.fill);
      if (vd.outline) shapeOutlines.push(vd.outline);
    }

    if (shapeFills.length > 0) {
      const batch = concatArrays(shapeFills);
      gl.bufferData(gl.ARRAY_BUFFER, batch, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, batch.length / 6);
    }

    // Render shape outlines (TRIANGLE_STRIP with degenerates)
    if (shapeOutlines.length > 0) {
      const batch = concatStrips(shapeOutlines);
      gl.bufferData(gl.ARRAY_BUFFER, batch, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, batch.length / 6);
    }

    // Render strokes (TRIANGLE_STRIP with degenerates)
    const strokeStrips: Float32Array[] = [];
    for (const stroke of strokes) {
      const rgba = hexToRgba(stroke.color);
      rgba[3] = stroke.opacity ?? 1.0;
      const strip = generateTriangleStrip(stroke.points, stroke.width, rgba);
      if (strip) strokeStrips.push(strip);
    }

    if (strokeStrips.length > 0) {
      const batch = concatStrips(strokeStrips);
      gl.bufferData(gl.ARRAY_BUFFER, batch, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, batch.length / 6);
    }

    // Cleanup GPU resources
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);

    this.lastGenerationTime = Date.now();
    this.activitySinceLastGeneration = false;

    return canvas.toDataURL("image/png");
  }

  private createShaderProgram(
    gl: WebGL2RenderingContext,
  ): WebGLProgram | null {
    const vsSource = `#version 300 es
      uniform mat3 u_camera;
      in vec2 a_position;
      in vec4 a_color;
      out vec4 v_color;
      void main() {
        vec3 pos = u_camera * vec3(a_position, 1.0);
        gl_Position = vec4(pos.xy, 0.0, 1.0);
        v_color = a_color;
      }
    `;
    const fsSource = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 fragColor;
      void main() {
        fragColor = v_color;
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }
}

/** Concatenate multiple Float32Arrays without degenerate triangles (for GL_TRIANGLES). */
function concatArrays(arrays: Float32Array[]): Float32Array {
  let totalLen = 0;
  for (const arr of arrays) totalLen += arr.length;
  const result = new Float32Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/** Concatenate triangle strips with degenerate triangles between them. */
function concatStrips(strips: Float32Array[]): Float32Array {
  if (strips.length === 0) return new Float32Array(0);
  if (strips.length === 1) return strips[0];

  // Calculate total size: strips + 12 floats per junction (2 degenerate vertices)
  let totalLen = 0;
  for (const s of strips) totalLen += s.length;
  totalLen += (strips.length - 1) * 12; // 2 vertices * 6 floats between each pair

  const result = new Float32Array(totalLen);
  let offset = 0;

  for (let i = 0; i < strips.length; i++) {
    const strip = strips[i];
    if (i > 0 && strip.length >= 6) {
      // Duplicate last vertex of previous strip
      result.set(result.subarray(offset - 6, offset), offset);
      offset += 6;
      // Duplicate first vertex of current strip
      result.set(strip.subarray(0, 6), offset);
      offset += 6;
    }
    result.set(strip, offset);
    offset += strip.length;
  }

  return result.subarray(0, offset);
}

export { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, GENERATION_INTERVAL_MS };
