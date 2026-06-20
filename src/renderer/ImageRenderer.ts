import type { CanvasImage } from "../model/Image";
import {
  IMAGE_FRAGMENT_SHADER,
  IMAGE_VERTEX_SHADER,
  ShaderProgram,
} from "./ShaderProgram";
import { TextureCache } from "./TextureCache";

/**
 * Generates two textured triangles for a canvas image.
 *
 * Vertex format is `[x, y, u, v]`.
 */
export function generateImageQuadVertices(image: CanvasImage): Float32Array {
  const halfWidth = image.width / 2;
  const halfHeight = image.height / 2;
  const cos = Math.cos(image.rotation);
  const sin = Math.sin(image.rotation);

  const transform = (localX: number, localY: number): [number, number] => [
    image.x + localX * cos - localY * sin,
    image.y + localX * sin + localY * cos,
  ];

  const topLeft = transform(-halfWidth, -halfHeight);
  const topRight = transform(halfWidth, -halfHeight);
  const bottomLeft = transform(-halfWidth, halfHeight);
  const bottomRight = transform(halfWidth, halfHeight);

  return new Float32Array([
    topLeft[0], topLeft[1], 0, 0,
    topRight[0], topRight[1], 1, 0,
    bottomLeft[0], bottomLeft[1], 0, 1,
    bottomLeft[0], bottomLeft[1], 0, 1,
    topRight[0], topRight[1], 1, 0,
    bottomRight[0], bottomRight[1], 1, 1,
  ]);
}

/**
 * Renders raster canvas images as textured WebGL quads.
 */
export class ImageRenderer {
  private gl: WebGL2RenderingContext;
  private shader: ShaderProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private aPositionLoc: number;
  private aUvLoc: number;
  private uCameraLoc: WebGLUniformLocation | null;
  private uSamplerLoc: WebGLUniformLocation | null;
  private uOpacityLoc: WebGLUniformLocation | null;
  private textureCache: TextureCache;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.textureCache = new TextureCache(gl);
    this.shader = new ShaderProgram(gl, IMAGE_VERTEX_SHADER, IMAGE_FRAGMENT_SHADER);

    this.aPositionLoc = this.shader.getAttribLocation("a_position");
    this.aUvLoc = this.shader.getAttribLocation("a_uv");
    this.uCameraLoc = this.shader.getUniformLocation("u_camera");
    this.uSamplerLoc = this.shader.getUniformLocation("u_sampler");
    this.uOpacityLoc = this.shader.getUniformLocation("u_opacity");

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create image VAO");
    this.vao = vao;

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error("Failed to create image VBO");
    this.vbo = vbo;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    const stride = 4 * 4;
    gl.enableVertexAttribArray(this.aPositionLoc);
    gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.aUvLoc);
    gl.vertexAttribPointer(this.aUvLoc, 2, gl.FLOAT, false, stride, 2 * 4);

    gl.bindVertexArray(null);
  }

  setCameraMatrix(matrix: Float32Array): void {
    this.shader.use();
    if (this.uCameraLoc) {
      this.gl.uniformMatrix3fv(this.uCameraLoc, false, matrix);
    }
  }

  /**
   * Starts texture upload for an image and resolves when it is ready to draw.
   */
  async preloadImage(image: CanvasImage): Promise<void> {
    await this.textureCache.preload(image);
  }

  /**
   * Draws an image if its texture is ready.
   *
   * Returns `false` while the texture is still loading or if upload failed.
   */
  drawImage(image: CanvasImage): boolean {
    const texture = this.textureCache.getTexture(image);
    if (!texture) return false;

    const gl = this.gl;
    const vertices = generateImageQuadVertices(image);

    this.shader.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (this.uSamplerLoc) gl.uniform1i(this.uSamplerLoc, 0);
    if (this.uOpacityLoc) gl.uniform1f(this.uOpacityLoc, image.opacity);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    return true;
  }

  /**
   * Removes one image texture from GPU memory.
   */
  deleteTexture(imageId: string): void {
    this.textureCache.delete(imageId);
  }

  /**
   * Releases textures for images that are no longer present in the document.
   */
  retainTextures(imageIds: Iterable<string>): void {
    this.textureCache.retain(imageIds);
  }

  /**
   * Drops all cached textures so they can be re-uploaded after context restore.
   */
  clearTextures(): void {
    this.textureCache.clear();
  }

  handleContextLost(): void {
    this.textureCache.handleContextLost();
  }

  handleContextRestored(): void {
    this.textureCache.handleContextRestored();
  }

  destroy(): void {
    this.clearTextures();
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteVertexArray(this.vao);
    this.shader.destroy();
  }
}
