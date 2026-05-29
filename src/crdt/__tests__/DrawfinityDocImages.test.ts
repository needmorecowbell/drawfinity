import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Y from "yjs";
import { DrawfinityDoc } from "../DrawfinityDoc";
import { MAX_IMAGE_SOURCE_BYTES, type CanvasImage } from "../../model/Image";
import type { Shape } from "../../model/Shape";
import type { Stroke } from "../../model/Stroke";

function makeImage(overrides: Partial<CanvasImage> = {}): CanvasImage {
  return {
    id: "img1",
    src: "data:image/png;base64,aW1hZ2U=",
    x: 100,
    y: 200,
    width: 320,
    height: 180,
    rotation: 0,
    opacity: 1,
    timestamp: 2000,
    ...overrides,
  };
}

function makeStroke(id: string, timestamp: number): Stroke {
  return {
    id,
    color: "#ff0000",
    width: 3,
    timestamp,
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 5, y: 5, pressure: 0.7 },
    ],
  };
}

function makeShape(id: string, timestamp: number): Shape {
  return {
    id,
    type: "rectangle",
    x: 100,
    y: 200,
    width: 50,
    height: 30,
    rotation: 0,
    strokeColor: "#0000ff",
    strokeWidth: 2,
    fillColor: "#00ff00",
    opacity: 0.9,
    timestamp,
  };
}

describe("DrawfinityDoc — image support", () => {
  let doc: DrawfinityDoc;

  beforeEach(() => {
    doc = new DrawfinityDoc();
  });

  it("starts with no images", () => {
    expect(doc.getImages()).toEqual([]);
  });

  it("adds and retrieves an image", () => {
    doc.addImage(makeImage());

    const images = doc.getImages();
    expect(images).toHaveLength(1);
    expect(images[0]).toEqual(makeImage());
  });

  it("removes an image by ID", () => {
    doc.addImage(makeImage({ id: "img1" }));
    doc.addImage(makeImage({ id: "img2" }));

    expect(doc.removeImage("img1")).toBe(true);
    expect(doc.getImages().map((image) => image.id)).toEqual(["img2"]);
  });

  it("returns false when removing a non-existent image", () => {
    expect(doc.removeImage("missing")).toBe(false);
  });

  it("updates image transform and opacity fields", () => {
    doc.addImage(makeImage());

    doc.updateImage("img1", {
      x: 25,
      y: 50,
      width: 640,
      height: 360,
      rotation: Math.PI / 4,
      opacity: 0.5,
    });

    expect(doc.getImages()[0]).toEqual(
      expect.objectContaining({
        id: "img1",
        x: 25,
        y: 50,
        width: 640,
        height: 360,
        rotation: Math.PI / 4,
        opacity: 0.5,
      }),
    );
  });

  it("keeps image ID stable during updates", () => {
    doc.addImage(makeImage());

    doc.updateImage("img1", { id: "changed-id", x: 25 });

    expect(doc.getImages()).toHaveLength(1);
    expect(doc.getImages()[0]).toEqual(expect.objectContaining({ id: "img1", x: 25 }));
  });

  it("rejects oversized image sources on add", () => {
    const oversizedSrc = `data:image/png;base64,${"a".repeat(MAX_IMAGE_SOURCE_BYTES)}`;

    expect(() => doc.addImage(makeImage({ src: oversizedSrc }))).toThrow(/exceeding/);
  });

  it("rejects oversized image sources on update", () => {
    const oversizedSrc = `data:image/png;base64,${"a".repeat(MAX_IMAGE_SOURCE_BYTES)}`;
    doc.addImage(makeImage());

    expect(() => doc.updateImage("img1", { src: oversizedSrc })).toThrow(/exceeding/);
    expect(doc.getImages()[0].src).toBe("data:image/png;base64,aW1hZ2U=");
  });

  it("filters images out of getStrokes() and getShapes()", () => {
    doc.addStroke(makeStroke("s1", 1000));
    doc.addShape(makeShape("sh1", 2000));
    doc.addImage(makeImage({ id: "img1", timestamp: 3000 }));

    expect(doc.getStrokes().map((stroke) => stroke.id)).toEqual(["s1"]);
    expect(doc.getShapes().map((shape) => shape.id)).toEqual(["sh1"]);
    expect(doc.getImages().map((image) => image.id)).toEqual(["img1"]);
  });

  it("includes images in getAllItems() sorted by timestamp", () => {
    doc.addImage(makeImage({ id: "img-late", timestamp: 3000 }));
    doc.addStroke(makeStroke("s1", 1000));
    doc.addShape(makeShape("sh1", 2000));
    doc.addImage(makeImage({ id: "img-early", timestamp: 500 }));

    const items = doc.getAllItems();
    expect(items.map((item) => `${item.kind}:${item.item.id}`)).toEqual([
      "image:img-early",
      "stroke:s1",
      "shape:sh1",
      "image:img-late",
    ]);
  });

  it("fires onStrokesChanged when an image is added, updated, or removed", () => {
    const callback = vi.fn();
    doc.onStrokesChanged(callback);

    doc.addImage(makeImage());
    doc.updateImage("img1", { x: 25 });
    doc.removeImage("img1");

    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("undoes and redoes image addition", () => {
    const undoManager = new Y.UndoManager(doc.getStrokesArray());

    doc.addImage(makeImage());
    expect(doc.getImages()).toHaveLength(1);

    undoManager.undo();
    expect(doc.getImages()).toHaveLength(0);

    undoManager.redo();
    expect(doc.getImages()).toHaveLength(1);
  });

  it("syncs images between two docs", () => {
    const doc1 = new DrawfinityDoc();
    const doc2 = new DrawfinityDoc();

    doc1.addImage(makeImage({ id: "from-doc1" }));

    const update = Y.encodeStateAsUpdate(doc1.getDoc());
    Y.applyUpdate(doc2.getDoc(), update);

    expect(doc2.getImages()).toHaveLength(1);
    expect(doc2.getImages()[0].id).toBe("from-doc1");
  });
});
