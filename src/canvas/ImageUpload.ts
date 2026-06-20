import {
  MAX_IMAGE_SOURCE_BYTES,
  generateImageId,
  getImageSourceSizeBytes,
  isImageSourceWithinLimit,
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

export function loadImageDimensions(src: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    });
    image.onerror = () => reject(new Error("Image data could not be decoded"));
    image.src = src;
  });
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

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image data could not be decoded"));
    image.src = src;
  });
}
