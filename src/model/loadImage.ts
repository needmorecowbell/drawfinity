/**
 * Decode an image from a string source (data URI or URL) into an
 * {@link HTMLImageElement} that is ready to read pixels from or upload to WebGL.
 *
 * Resolves only once the image has fully decoded: when available, the async
 * {@link HTMLImageElement.decode} method is awaited so callers never receive a
 * partially-decoded element. A `complete` fast-path covers sources that resolve
 * synchronously (e.g. cached data URIs) where `onload` may not fire.
 *
 * @param src - Image source string (data URI such as `"data:image/png;base64,..."` or a URL).
 * @returns A promise resolving to the fully-decoded image element.
 * @throws If the source cannot be loaded or decoded.
 */
export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
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
    element.onerror = (): void => reject(new Error("Image data could not be decoded"));
    element.src = src;
    if (element.complete && element.naturalWidth > 0) {
      element.onload?.(new Event("load"));
    }
  });
}
