import type { CanvasImage } from "../model/Image";

interface TextureEntry {
  src: string;
  texture: WebGLTexture | null;
  promise: Promise<WebGLTexture> | null;
  error: Error | null;
}

/**
 * Owns WebGL textures for canvas images and lazily uploads data URI sources.
 */
export class TextureCache {
  private gl: WebGL2RenderingContext;
  private textures = new Map<string, TextureEntry>();
  private contextGeneration = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Starts texture upload for an image and resolves when it is ready.
   */
  async preload(image: CanvasImage): Promise<void> {
    await this.ensureTexture(image);
  }

  /**
   * Returns a ready texture, starting an async upload when needed.
   */
  getTexture(image: CanvasImage): WebGLTexture | null {
    const entry = this.textures.get(image.id);
    if (!entry || entry.src !== image.src) {
      void this.ensureTexture(image);
      return null;
    }
    if (!entry.texture && !entry.promise && !entry.error) {
      void this.ensureTexture(image);
      return null;
    }
    return entry.texture;
  }

  /**
   * Releases one cached texture from GPU memory.
   */
  delete(imageId: string): void {
    const entry = this.textures.get(imageId);
    if (entry?.texture) {
      this.gl.deleteTexture(entry.texture);
    }
    this.textures.delete(imageId);
  }

  /**
   * Keeps only textures whose image IDs are still present in the document.
   */
  retain(imageIds: Iterable<string>): void {
    const activeIds = new Set(imageIds);
    for (const imageId of Array.from(this.textures.keys())) {
      if (!activeIds.has(imageId)) {
        this.delete(imageId);
      }
    }
  }

  /**
   * Deletes all cached textures and forgets pending entries.
   */
  clear(): void {
    for (const entry of this.textures.values()) {
      if (entry.texture) this.gl.deleteTexture(entry.texture);
    }
    this.textures.clear();
  }

  /**
   * Invalidates GPU handles after WebGL context loss while retaining source keys.
   */
  handleContextLost(): void {
    this.contextGeneration++;
    for (const entry of this.textures.values()) {
      entry.texture = null;
      entry.promise = null;
      entry.error = null;
    }
  }

  /**
   * Marks cached entries for lazy re-upload on the next render/preload call.
   */
  handleContextRestored(): void {
    this.handleContextLost();
  }

  has(imageId: string): boolean {
    return this.textures.has(imageId);
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

    const uploadGeneration = this.contextGeneration;
    let uploadPromise: Promise<WebGLTexture>;
    uploadPromise = this.loadHtmlImage(image.src)
      .then((element) => this.uploadTexture(element))
      .then((texture) => {
        if (entry.promise !== uploadPromise || uploadGeneration !== this.contextGeneration) {
          this.gl.deleteTexture(texture);
          throw new Error("Image texture upload was superseded");
        }
        entry.texture = texture;
        entry.promise = null;
        return texture;
      })
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        if (entry.promise !== uploadPromise || uploadGeneration !== this.contextGeneration) {
          throw err;
        }
        entry.error = err;
        entry.promise = null;
        throw err;
      });
    entry.promise = uploadPromise;

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
