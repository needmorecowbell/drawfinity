import * as Y from "yjs";
import { CameraBookmark } from "../model/Bookmark";

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
