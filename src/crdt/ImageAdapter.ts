import * as Y from "yjs";
import { CanvasImage, createCanvasImage } from "../model/Image";

/**
 * Converts between plain CanvasImage objects and Yjs Y.Map representations.
 */
export function imageToYMap(image: CanvasImage): Y.Map<unknown> {
  createCanvasImage(image);

  const yMap = new Y.Map<unknown>();
  yMap.set("type", "image");
  yMap.set("id", image.id);
  yMap.set("src", image.src);
  yMap.set("x", image.x);
  yMap.set("y", image.y);
  yMap.set("width", image.width);
  yMap.set("height", image.height);
  yMap.set("rotation", image.rotation);
  yMap.set("opacity", image.opacity);
  yMap.set("timestamp", image.timestamp);

  return yMap;
}

/**
 * Deserializes a Yjs Map back into a plain {@link CanvasImage} object.
 */
export function yMapToImage(yMap: Y.Map<unknown>): CanvasImage {
  return createCanvasImage({
    id: yMap.get("id") as string,
    src: yMap.get("src") as string,
    x: yMap.get("x") as number,
    y: yMap.get("y") as number,
    width: yMap.get("width") as number,
    height: yMap.get("height") as number,
    rotation: yMap.get("rotation") as number,
    opacity: (yMap.get("opacity") as number) ?? 1.0,
    timestamp: yMap.get("timestamp") as number,
  });
}
