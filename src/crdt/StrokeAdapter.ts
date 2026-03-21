import * as Y from "yjs";
import { Stroke, StrokePoint } from "../model/Stroke";

/**
 * Converts between plain Stroke objects and Yjs Y.Map representations.
 */
export function strokeToYMap(stroke: Stroke): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>();
  yMap.set("type", "stroke");
  yMap.set("id", stroke.id);
  yMap.set("color", stroke.color);
  yMap.set("width", stroke.width);
  yMap.set("opacity", stroke.opacity);
  yMap.set("timestamp", stroke.timestamp);

  const yPoints = new Y.Array<Y.Map<number>>();
  const pointMaps = stroke.points.map((pt) => {
    const yPt = new Y.Map<number>();
    yPt.set("x", pt.x);
    yPt.set("y", pt.y);
    yPt.set("pressure", pt.pressure);
    return yPt;
  });
  yPoints.push(pointMaps);
  yMap.set("points", yPoints);

  return yMap;
}

/**
 * Deserializes a Yjs Map back into a plain {@link Stroke} object.
 *
 * Reads the keys written by {@link strokeToYMap} (`id`, `color`, `width`,
 * `opacity`, `timestamp`, `points`) and reconstructs the corresponding
 * `Stroke`. If `opacity` is missing from the map it defaults to `1.0`.
 *
 * @param yMap - A `Y.Map` containing the serialized stroke data produced by
 *   {@link strokeToYMap}.
 * @returns The deserialized {@link Stroke} with all points and visual
 *   properties restored.
 */
export function yMapToStroke(yMap: Y.Map<unknown>): Stroke {
  const yPoints = yMap.get("points") as Y.Array<Y.Map<number>>;
  const points: StrokePoint[] = yPoints.toArray().map((yPt) => ({
    x: yPt.get("x") as number,
    y: yPt.get("y") as number,
    pressure: yPt.get("pressure") as number,
  }));

  return {
    id: yMap.get("id") as string,
    color: yMap.get("color") as string,
    width: yMap.get("width") as number,
    opacity: (yMap.get("opacity") as number) ?? 1.0,
    timestamp: yMap.get("timestamp") as number,
    points,
  };
}
