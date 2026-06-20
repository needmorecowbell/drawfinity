import type { CanvasItem, Shape } from "./Shape";
import type { CanvasImage } from "./Image";
import type { DocumentModel, Stroke } from "./Stroke";

export interface SelectionPoint {
  x: number;
  y: number;
}

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SelectionRegion =
  | { type: "rect"; bounds: SelectionBounds }
  | { type: "ellipse"; bounds: SelectionBounds }
  | { type: "lasso"; bounds: SelectionBounds; points: SelectionPoint[] };

interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SelectionDocumentModel extends DocumentModel {
  getAllItems?(): CanvasItem[];
}

/**
 * Returns true when any sampled stroke point lies inside the selection region.
 */
export function hitTestStroke(stroke: Stroke, region: SelectionRegion): boolean {
  return stroke.points.some((point) => pointInRegion(point, region));
}

/**
 * Returns true when the shape's axis-aligned bounding box intersects the selection region.
 */
export function hitTestShape(shape: Shape, region: SelectionRegion): boolean {
  const bounds = getShapeBounds(shape);

  if (region.type === "rect") {
    return aabbIntersectsAabb(bounds, selectionBoundsToAabb(region.bounds));
  }

  if (region.type === "ellipse") {
    return aabbIntersectsEllipse(bounds, region.bounds);
  }

  return aabbIntersectsPolygon(bounds, region.points);
}

/**
 * Returns true when the image's axis-aligned bounding box intersects the selection region.
 */
export function hitTestImage(image: CanvasImage, region: SelectionRegion): boolean {
  const bounds = getImageBounds(image);

  if (region.type === "rect") {
    return aabbIntersectsAabb(bounds, selectionBoundsToAabb(region.bounds));
  }

  if (region.type === "ellipse") {
    return aabbIntersectsEllipse(bounds, region.bounds);
  }

  return aabbIntersectsPolygon(bounds, region.points);
}

/**
 * Returns all document items that intersect the selection region, preserving document order.
 */
export function getSelectedItems(doc: SelectionDocumentModel, region: SelectionRegion): CanvasItem[] {
  const items = doc.getAllItems
    ? doc.getAllItems()
    : [
        ...doc.getStrokes().map((stroke) => ({ kind: "stroke" as const, item: stroke })),
        ...(doc.getShapes?.() ?? []).map((shape) => ({ kind: "shape" as const, item: shape })),
      ];

  return items.filter((entry) => {
    if (entry.kind === "stroke") return hitTestStroke(entry.item, region);
    if (entry.kind === "image") return hitTestImage(entry.item, region);
    return hitTestShape(entry.item, region);
  });
}

export function pointInRegion(point: SelectionPoint, region: SelectionRegion): boolean {
  if (region.type === "rect") {
    return pointInBounds(point, region.bounds);
  }
  if (region.type === "ellipse") {
    return pointInEllipse(point, region.bounds);
  }
  return pointInPolygon(point, region.points);
}

/**
 * Returns a copy of the selection region translated by the given world-space delta.
 */
export function translateSelectionRegion(region: SelectionRegion, dx: number, dy: number): SelectionRegion {
  const bounds = {
    x: region.bounds.x + dx,
    y: region.bounds.y + dy,
    width: region.bounds.width,
    height: region.bounds.height,
  };

  if (region.type === "lasso") {
    return {
      type: "lasso",
      bounds,
      points: region.points.map((point) => ({ x: point.x + dx, y: point.y + dy })),
    };
  }

  return { ...region, bounds };
}

function pointInBounds(point: SelectionPoint, bounds: SelectionBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function pointInEllipse(point: SelectionPoint, bounds: SelectionBounds): boolean {
  if (bounds.width === 0 || bounds.height === 0) return false;

  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  const cx = bounds.x + rx;
  const cy = bounds.y + ry;
  const nx = (point.x - cx) / rx;
  const ny = (point.y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

function pointInPolygon(point: SelectionPoint, polygon: readonly SelectionPoint[]): boolean {
  if (polygon.length < 3) return false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (pointOnSegment(point, polygon[j], polygon[i])) {
      return true;
    }
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crossesY = a.y > point.y !== b.y > point.y;
    if (!crossesY) continue;

    const xAtY = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (point.x < xAtY) {
      inside = !inside;
    }
  }
  return inside;
}

function getShapeBounds(shape: Shape): AABB {
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const halfStroke = shape.strokeWidth / 2;

  if (shape.rotation === 0) {
    return {
      minX: shape.x - halfWidth - halfStroke,
      minY: shape.y - halfHeight - halfStroke,
      maxX: shape.x + halfWidth + halfStroke,
      maxY: shape.y + halfHeight + halfStroke,
    };
  }

  const cos = Math.abs(Math.cos(shape.rotation));
  const sin = Math.abs(Math.sin(shape.rotation));
  const rotatedHalfWidth = halfWidth * cos + halfHeight * sin;
  const rotatedHalfHeight = halfWidth * sin + halfHeight * cos;

  return {
    minX: shape.x - rotatedHalfWidth - halfStroke,
    minY: shape.y - rotatedHalfHeight - halfStroke,
    maxX: shape.x + rotatedHalfWidth + halfStroke,
    maxY: shape.y + rotatedHalfHeight + halfStroke,
  };
}

function getImageBounds(image: CanvasImage): AABB {
  const halfWidth = image.width / 2;
  const halfHeight = image.height / 2;

  if (image.rotation === 0) {
    return {
      minX: image.x - halfWidth,
      minY: image.y - halfHeight,
      maxX: image.x + halfWidth,
      maxY: image.y + halfHeight,
    };
  }

  const cos = Math.abs(Math.cos(image.rotation));
  const sin = Math.abs(Math.sin(image.rotation));
  const rotatedHalfWidth = halfWidth * cos + halfHeight * sin;
  const rotatedHalfHeight = halfWidth * sin + halfHeight * cos;

  return {
    minX: image.x - rotatedHalfWidth,
    minY: image.y - rotatedHalfHeight,
    maxX: image.x + rotatedHalfWidth,
    maxY: image.y + rotatedHalfHeight,
  };
}

function selectionBoundsToAabb(bounds: SelectionBounds): AABB {
  return {
    minX: bounds.x,
    minY: bounds.y,
    maxX: bounds.x + bounds.width,
    maxY: bounds.y + bounds.height,
  };
}

function aabbIntersectsAabb(a: AABB, b: AABB): boolean {
  return a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;
}

function aabbIntersectsEllipse(aabb: AABB, bounds: SelectionBounds): boolean {
  if (bounds.width === 0 || bounds.height === 0) return false;

  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  const cx = bounds.x + rx;
  const cy = bounds.y + ry;
  const closestX = clamp(cx, aabb.minX, aabb.maxX);
  const closestY = clamp(cy, aabb.minY, aabb.maxY);
  return pointInEllipse({ x: closestX, y: closestY }, bounds);
}

function aabbIntersectsPolygon(aabb: AABB, polygon: readonly SelectionPoint[]): boolean {
  if (polygon.length < 3) return false;

  const corners = [
    { x: aabb.minX, y: aabb.minY },
    { x: aabb.maxX, y: aabb.minY },
    { x: aabb.maxX, y: aabb.maxY },
    { x: aabb.minX, y: aabb.maxY },
  ];

  if (corners.some((corner) => pointInPolygon(corner, polygon))) {
    return true;
  }
  if (polygon.some((point) => pointInAabb(point, aabb))) {
    return true;
  }

  const boxEdges: Array<[SelectionPoint, SelectionPoint]> = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ];

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const polygonEdge: [SelectionPoint, SelectionPoint] = [polygon[j], polygon[i]];
    if (boxEdges.some((boxEdge) => segmentsIntersect(polygonEdge[0], polygonEdge[1], boxEdge[0], boxEdge[1]))) {
      return true;
    }
  }

  return false;
}

function pointInAabb(point: SelectionPoint, aabb: AABB): boolean {
  return point.x >= aabb.minX && point.x <= aabb.maxX && point.y >= aabb.minY && point.y <= aabb.maxY;
}

function pointOnSegment(point: SelectionPoint, a: SelectionPoint, b: SelectionPoint): boolean {
  const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > 1e-9) return false;

  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
  if (dot < 0) return false;

  const lengthSquared = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= lengthSquared;
}

function segmentsIntersect(a: SelectionPoint, b: SelectionPoint, c: SelectionPoint, d: SelectionPoint): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 === 0 && pointOnSegment(c, a, b)) return true;
  if (o2 === 0 && pointOnSegment(d, a, b)) return true;
  if (o3 === 0 && pointOnSegment(a, c, d)) return true;
  if (o4 === 0 && pointOnSegment(b, c, d)) return true;

  return o1 !== o2 && o3 !== o4;
}

function orientation(a: SelectionPoint, b: SelectionPoint, c: SelectionPoint): -1 | 0 | 1 {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) <= 1e-9) return 0;
  return value > 0 ? 1 : -1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
