import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { bookmarkToYMap, yMapToBookmark } from "../BookmarkAdapter";
import { CameraBookmark } from "../../model/Bookmark";

const sampleBookmark: CameraBookmark = {
  id: "bookmark-1",
  label: "Top Left Corner",
  x: -500,
  y: 300,
  zoom: 2.5,
  createdBy: "user-abc",
  createdAt: 1710000000000,
};

function addToDoc(bookmark: CameraBookmark): Y.Map<unknown> {
  const doc = new Y.Doc();
  doc.transact(() => {
    const arr = doc.getArray<Y.Map<unknown>>("test");
    arr.push([bookmarkToYMap(bookmark)]);
  });
  return doc.getArray<Y.Map<unknown>>("test").get(0);
}

describe("BookmarkAdapter", () => {
  describe("bookmarkToYMap", () => {
    it("converts a bookmark to a Y.Map with all fields", () => {
      const yMap = addToDoc(sampleBookmark);
      expect(yMap.get("id")).toBe("bookmark-1");
      expect(yMap.get("label")).toBe("Top Left Corner");
      expect(yMap.get("x")).toBe(-500);
      expect(yMap.get("y")).toBe(300);
      expect(yMap.get("zoom")).toBe(2.5);
      expect(yMap.get("createdBy")).toBe("user-abc");
      expect(yMap.get("createdAt")).toBe(1710000000000);
    });
  });

  describe("yMapToBookmark", () => {
    it("round-trips a bookmark through Y.Map", () => {
      const yMap = addToDoc(sampleBookmark);
      const result = yMapToBookmark(yMap);
      expect(result).toEqual(sampleBookmark);
    });

    it("round-trips a bookmark with createdByName", () => {
      const bmWithName: CameraBookmark = { ...sampleBookmark, createdByName: "Alice" };
      const yMap = addToDoc(bmWithName);
      const result = yMapToBookmark(yMap);
      expect(result.createdByName).toBe("Alice");
      expect(result).toEqual(bmWithName);
    });

    it("omits createdByName when not provided", () => {
      const yMap = addToDoc(sampleBookmark);
      expect(yMap.get("createdByName")).toBeUndefined();
      const result = yMapToBookmark(yMap);
      expect(result.createdByName).toBeUndefined();
    });
  });
});
