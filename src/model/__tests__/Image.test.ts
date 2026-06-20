import { describe, expect, it } from "vitest";
import type { CanvasItem } from "../Shape";
import {
  MAX_IMAGE_SOURCE_BYTES,
  assertImageSourceWithinLimit,
  createCanvasImage,
  generateImageId,
  getImageSourceSizeBytes,
  isImageSourceWithinLimit,
  type CanvasImage,
} from "../Image";

function makeImage(src = "data:image/png;base64,aW1hZ2U="): CanvasImage {
  return {
    id: "image-1",
    src,
    x: 100,
    y: 200,
    width: 320,
    height: 180,
    rotation: 0,
    opacity: 0.75,
    timestamp: 1234,
  };
}

describe("CanvasImage model", () => {
  it("creates an image with valid fields", () => {
    const image = createCanvasImage(makeImage());

    expect(image).toEqual({
      id: "image-1",
      src: "data:image/png;base64,aW1hZ2U=",
      x: 100,
      y: 200,
      width: 320,
      height: 180,
      rotation: 0,
      opacity: 0.75,
      timestamp: 1234,
    });
  });

  it("allows CanvasImage in the CanvasItem union", () => {
    const item: CanvasItem = { kind: "image", item: makeImage() };

    expect(item.kind).toBe("image");
    expect(item.item.id).toBe("image-1");
  });

  it("returns unique image IDs with the image prefix", () => {
    const id1 = generateImageId();
    const id2 = generateImageId();

    expect(id1).toMatch(/^image-/);
    expect(id1).not.toBe(id2);
  });

  it("measures encoded source size", () => {
    expect(getImageSourceSizeBytes("data:image/png;base64,abc")).toBe(25);
  });

  it("rejects oversized image sources", () => {
    const oversizedSrc = "x".repeat(MAX_IMAGE_SOURCE_BYTES + 1);

    expect(isImageSourceWithinLimit(oversizedSrc)).toBe(false);
    expect(() => assertImageSourceWithinLimit(oversizedSrc)).toThrow(/exceeding/);
    expect(() => createCanvasImage(makeImage(oversizedSrc))).toThrow(/exceeding/);
  });
});
