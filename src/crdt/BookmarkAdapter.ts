import * as Y from "yjs";
import { CameraBookmark } from "../model/Bookmark";

/**
 * Serializes a {@link CameraBookmark} into a Yjs Map for CRDT storage and
 * collaborative synchronization.
 *
 * Each bookmark property is stored as a separate key in the `Y.Map` so that
 * concurrent edits to different fields merge without conflict. The optional
 * `createdByName` field is only written when present.
 *
 * @param bookmark - The camera bookmark to serialize.
 * @returns A new `Y.Map` containing all bookmark properties, ready to be
 *   inserted into a Yjs shared array.
 */
export function bookmarkToYMap(bookmark: CameraBookmark): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>();
  yMap.set("id", bookmark.id);
  yMap.set("label", bookmark.label);
  yMap.set("x", bookmark.x);
  yMap.set("y", bookmark.y);
  yMap.set("zoom", bookmark.zoom);
  yMap.set("createdBy", bookmark.createdBy);
  if (bookmark.createdByName) {
    yMap.set("createdByName", bookmark.createdByName);
  }
  yMap.set("createdAt", bookmark.createdAt);
  return yMap;
}

/**
 * Deserializes a Yjs Map back into a {@link CameraBookmark} object.
 *
 * Reads each expected key from the `Y.Map` and reconstructs the typed
 * bookmark. The optional `createdByName` field is only included when the
 * map contains a truthy value for that key.
 *
 * @param yMap - A Yjs Map previously created by {@link bookmarkToYMap}.
 * @returns The reconstructed camera bookmark.
 */
export function yMapToBookmark(yMap: Y.Map<unknown>): CameraBookmark {
  const bookmark: CameraBookmark = {
    id: yMap.get("id") as string,
    label: yMap.get("label") as string,
    x: yMap.get("x") as number,
    y: yMap.get("y") as number,
    zoom: yMap.get("zoom") as number,
    createdBy: yMap.get("createdBy") as string,
    createdAt: yMap.get("createdAt") as number,
  };
  const createdByName = yMap.get("createdByName") as string | undefined;
  if (createdByName) {
    bookmark.createdByName = createdByName;
  }
  return bookmark;
}
