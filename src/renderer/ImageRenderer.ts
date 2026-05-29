import type { CanvasImage } from "../model/Image";
import {
  IMAGE_FRAGMENT_SHADER,
  IMAGE_VERTEX_SHADER,
  ShaderProgram,
} from "./ShaderProgram";

interface TextureEntry {
  src: string;
  texture: WebGLTexture | null;
  promise: Promise<WebGLTexture> | null;
  error: Error | null;
}

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
  private textures = new Map<string, TextureEntry>();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
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
    await this.ensureTexture(image);
  }

  /**
   * Draws an image if its texture is ready.
   *
   * Returns `false` while the texture is still loading or if upload failed.
   */
  drawImage(image: CanvasImage): boolean {
    const entry = this.textures.get(image.id);
    if (!entry || entry.src !== image.src) {
      void this.ensureTexture(image);
      return false;
    }
    if (!entry.texture) return false;

    const gl = this.gl;
    const vertices = generateImageQuadVertices(image);

    this.shader.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
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
    const entry = this.textures.get(imageId);
    if (entry?.texture) {
      this.gl.deleteTexture(entry.texture);
    }
    this.textures.delete(imageId);
  }

  /**
   * Drops all cached textures so they can be re-uploaded after context restore.
   */
  clearTextures(): void {
    for (const entry of this.textures.values()) {
      if (entry.texture) this.gl.deleteTexture(entry.texture);
    }
    this.textures.clear();
  }

  destroy(): void {
    this.clearTextures();
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteVertexArray(this.vao);
    this.shader.destroy();
  }

  private async ensureTexture(image: CanvasImage): Promise<WebGLTexture> {
    const existing = this.textures.get(image.id);
    if (existing?.src === image.src) {
      if (existing.texture) return existing.texture;
      if (existing.promise) return existing.promise;
      if (existing.error) throw existing.error;
    } else if (existing?.texture) {
      this.gl.deleteTexture(existing.texture);
    }

    const entry: TextureEntry = {
      src: image.src,
      texture: null,
      promise: null,
      error: null,
    };
    this.textures.set(image.id, entry);

    entry.promise = this.loadHtmlImage(image.src)
      .then((element) => this.uploadTexture(element))
      .then((texture) => {
        entry.texture = texture;
        entry.promise = null;
        return texture;
      })
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        entry.error = err;
        entry.promise = null;
        throw err;
      });

    return entry.promise;
  }

  private loadHtmlImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = async (): Promise<void> => {
        try {
          if (typeof element.decode === "function") {
            await element.decode();
          }
          resolve(element);
        } catch (error) {
          reject(error);
        }
      };
      element.onerror = (): void => reject(new Error("Failed to decode image source"));
      element.src = src;
      if (element.complete && element.naturalWidth > 0) {
        element.onload?.(new Event("load"));
      }
    });
  }

  private uploadTexture(element: HTMLImageElement): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create image texture");

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      element,
    );
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
  }
}
