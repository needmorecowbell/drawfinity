import * as Y from "yjs";
import { Shape, ShapeType } from "../model/Shape";

/**
 * Converts between plain Shape objects and Yjs Y.Map representations.
 */
export function shapeToYMap(shape: Shape): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>();
  yMap.set("type", "shape");
  yMap.set("id", shape.id);
  yMap.set("shapeType", shape.type);
  yMap.set("x", shape.x);
  yMap.set("y", shape.y);
  yMap.set("width", shape.width);
  yMap.set("height", shape.height);
  yMap.set("rotation", shape.rotation);
  yMap.set("strokeColor", shape.strokeColor);
  yMap.set("strokeWidth", shape.strokeWidth);
  yMap.set("fillColor", shape.fillColor);
  yMap.set("opacity", shape.opacity);
  yMap.set("timestamp", shape.timestamp);

  if (shape.sides !== undefined) {
    yMap.set("sides", shape.sides);
  }
  if (shape.starInnerRadius !== undefined) {
    yMap.set("starInnerRadius", shape.starInnerRadius);
  }

  return yMap;
}

export function yMapToShape(yMap: Y.Map<unknown>): Shape {
  const shape: Shape = {
    id: yMap.get("id") as string,
    type: yMap.get("shapeType") as ShapeType,
    x: yMap.get("x") as number,
    y: yMap.get("y") as number,
    width: yMap.get("width") as number,
    height: yMap.get("height") as number,
    rotation: yMap.get("rotation") as number,
    strokeColor: yMap.get("strokeColor") as string,
    strokeWidth: yMap.get("strokeWidth") as number,
    fillColor: (yMap.get("fillColor") as string | null) ?? null,
    opacity: (yMap.get("opacity") as number) ?? 1.0,
    timestamp: yMap.get("timestamp") as number,
  };

  const sides = yMap.get("sides") as number | undefined;
  if (sides !== undefined) {
    shape.sides = sides;
  }

  const starInnerRadius = yMap.get("starInnerRadius") as number | undefined;
  if (starInnerRadius !== undefined) {
    shape.starInnerRadius = starInnerRadius;
  }

  return shape;
}
