import {
  MAX_IMAGE_SOURCE_BYTES,
  generateImageId,
  getImageSourceSizeBytes,
  isImageSourceWithinLimit,
  loadHtmlImage,
  type CanvasImage,
} from "../model";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImagePlacementOptions {
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  centerX: number;
  centerY: number;
}

const RESIZE_HEADROOM = 0.92;
const MAX_RESIZE_ATTEMPTS = 12;

export function isSupportedImageFile(file: File): boolean {
  return /^image\/(png|jpe?g|webp)$/i.test(file.type);
}

/**
 * Extracts the first supported image from a paste/drop `DataTransfer`.
 *
 * Reads `.files` first (populated by Chromium and most browsers), then falls
 * back to `.items` via `getAsFile()`. The Tauri WebKitGTK WebView frequently
 * delivers a *pasted* image only through `items` (a `DataTransferItem` of kind
 * "file"), leaving `.files` empty — so reading both is what makes clipboard
 * paste actually insert an image in the desktop shell, not just the browser.
 */
export function extractImageFileFromDataTransfer(
  data: Pick<DataTransfer, "files" | "items"> | null | undefined,
): File | null {
  if (!data) return null;

  const fromFiles = Array.from(data.files ?? []).find(isSupportedImageFile);
  if (fromFiles) return fromFiles;

  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file" && /^image\//i.test(item.type)) {
      const file = item.getAsFile();
      if (file && isSupportedImageFile(file)) return file;
    }
  }
  return null;
}

/**
 * True if a `DataTransfer` appears to carry image content, even if no usable
 * file could be extracted. Used to decide whether a failed paste should surface
 * a notification (image present but unreadable) versus stay silent (plain text).
 */
export function dataTransferHasImageContent(
  data: Pick<DataTransfer, "items"> | null | undefined,
): boolean {
  if (!data) return false;
  return Array.from(data.items ?? []).some((item) => /^image\//i.test(item.type));
}

/** Formats a byte count as megabytes with one decimal, for user-facing messages. */
function formatBytesAsMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * Pre-flight check on a raw file's size against the inline storage limit.
 *
 * This compares the on-disk byte size (not the base64-inflated data URI) so an
 * oversized file can be rejected before it is ever read or resized.
 */
export function isFileSizeWithinLimit(
  file: File,
  limitBytes = MAX_IMAGE_SOURCE_BYTES,
): boolean {
  return file.size <= limitBytes;
}

export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Image file could not be read as a data URI"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Image file could not be read"));
    reader.readAsDataURL(file);
  });
}

export async function loadImageDimensions(src: string): Promise<ImageDimensions> {
  const image = await loadHtmlImage(src);
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

export function calculatePlacedImageSize(
  dimensions: ImageDimensions,
  options: Pick<ImagePlacementOptions, "viewportWidth" | "zoom">,
): ImageDimensions {
  const aspect = dimensions.height > 0 ? dimensions.width / dimensions.height : 1;
  const width = (options.viewportWidth * 0.5) / options.zoom;
  return {
    width,
    height: width / aspect,
  };
}

export async function resizeDataUriToLimit(
  src: string,
  mimeType: string,
  limitBytes = MAX_IMAGE_SOURCE_BYTES,
): Promise<{ src: string; dimensions: ImageDimensions }> {
  let currentSrc = src;
  let dimensions = await loadImageDimensions(currentSrc);

  if (getImageSourceSizeBytes(currentSrc) <= limitBytes) {
    return { src: currentSrc, dimensions };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image exceeds the inline storage limit and could not be resized");
  }

  for (let attempt = 0; attempt < MAX_RESIZE_ATTEMPTS; attempt++) {
    const currentBytes = getImageSourceSizeBytes(currentSrc);
    const scale = Math.sqrt((limitBytes * RESIZE_HEADROOM) / currentBytes);
    const nextWidth = Math.max(1, Math.floor(dimensions.width * scale));
    const nextHeight = Math.max(1, Math.floor(dimensions.height * scale));

    canvas.width = nextWidth;
    canvas.height = nextHeight;
    context.clearRect(0, 0, nextWidth, nextHeight);

    const image = await loadHtmlImage(currentSrc);
    context.drawImage(image, 0, 0, nextWidth, nextHeight);
    currentSrc = canvas.toDataURL(normalizeOutputMimeType(mimeType), 0.88);
    dimensions = { width: nextWidth, height: nextHeight };

    if (getImageSourceSizeBytes(currentSrc) <= limitBytes) {
      return { src: currentSrc, dimensions };
    }
  }

  throw new Error("Image exceeds the inline storage limit after resizing");
}

export async function createCanvasImageFromFile(
  file: File,
  placement: ImagePlacementOptions,
): Promise<CanvasImage> {
  if (!isSupportedImageFile(file)) {
    throw new Error("Only PNG, JPG, and WebP images can be inserted");
  }

  if (!isFileSizeWithinLimit(file)) {
    throw new Error(
      `Image is too large (${formatBytesAsMb(file.size)} MB). ` +
        `Maximum size is ${formatBytesAsMb(MAX_IMAGE_SOURCE_BYTES)} MB.`,
    );
  }

  const dataUri = await readFileAsDataUri(file);
  const prepared = isImageSourceWithinLimit(dataUri)
    ? { src: dataUri, dimensions: await loadImageDimensions(dataUri) }
    : await resizeDataUriToLimit(dataUri, file.type);
  const size = calculatePlacedImageSize(prepared.dimensions, placement);

  return {
    id: generateImageId(),
    src: prepared.src,
    x: placement.centerX,
    y: placement.centerY,
    width: size.width,
    height: size.height,
    rotation: 0,
    opacity: 1,
    timestamp: Date.now(),
  };
}

function normalizeOutputMimeType(mimeType: string): string {
  if (/^image\/(png|jpe?g|webp)$/i.test(mimeType)) {
    return mimeType.toLowerCase() === "image/jpg" ? "image/jpeg" : mimeType;
  }
  return "image/png";
}
