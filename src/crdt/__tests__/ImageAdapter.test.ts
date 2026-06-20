import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { MAX_IMAGE_SOURCE_BYTES, type CanvasImage } from "../../model/Image";
import { imageToYMap, yMapToImage } from "../ImageAdapter";

function makeImage(src = "data:image/png;base64,aW1hZ2U="): CanvasImage {
  return {
    id: "image-1",
    src,
    x: 100,
    y: 200,
    width: 320,
    height: 180,
    rotation: Math.PI / 8,
    opacity: 0.75,
    timestamp: 1234,
  };
}

function addToDoc(image: CanvasImage): Y.Map<unknown> {
  const doc = new Y.Doc();
  doc.transact(() => {
    const arr = doc.getArray<Y.Map<unknown>>("test");
    arr.push([imageToYMap(image)]);
  });
  return doc.getArray<Y.Map<unknown>>("test").get(0);
}

describe("ImageAdapter", () => {
  describe("imageToYMap", () => {
    it("converts an image to a Y.Map with all fields", () => {
      const image = makeImage();
      const yMap = addToDoc(image);

      expect(yMap.get("type")).toBe("image");
      expect(yMap.get("id")).toBe("image-1");
      expect(yMap.get("src")).toBe("data:image/png;base64,aW1hZ2U=");
      expect(yMap.get("x")).toBe(100);
      expect(yMap.get("y")).toBe(200);
      expect(yMap.get("width")).toBe(320);
      expect(yMap.get("height")).toBe(180);
      expect(yMap.get("rotation")).toBe(Math.PI / 8);
      expect(yMap.get("opacity")).toBe(0.75);
      expect(yMap.get("timestamp")).toBe(1234);
    });

    it("rejects oversized image sources", () => {
      const oversizedSrc = "x".repeat(MAX_IMAGE_SOURCE_BYTES + 1);

      expect(() => imageToYMap(makeImage(oversizedSrc))).toThrow(/exceeding/);
    });
  });

  describe("yMapToImage", () => {
    it("round-trips an image through Y.Map", () => {
      const image = makeImage();
      const yMap = addToDoc(image);
      const result = yMapToImage(yMap);

      expect(result).toEqual(image);
    });

    it("defaults missing opacity to fully opaque", () => {
      const yMap = addToDoc(makeImage());
      yMap.delete("opacity");

      expect(yMapToImage(yMap).opacity).toBe(1.0);
    });
  });
});
