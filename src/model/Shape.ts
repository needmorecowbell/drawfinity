export type ShapeType = "rectangle" | "ellipse" | "polygon" | "star";

export interface Shape {
  id: string;
  type: ShapeType;
  /** Center X in world coordinates */
  x: number;
  /** Center Y in world coordinates */
  y: number;
  width: number;
  height: number;
  /** Rotation in radians */
  rotation: number;
  strokeColor: string;
  strokeWidth: number;
  /** Fill color, or null for no fill */
  fillColor: string | null;
  opacity: number;
  /** Number of sides for polygon/star shapes */
  sides?: number;
  /** Inner radius ratio (0–1) for star shapes */
  starInnerRadius?: number;
  timestamp: number;
}

export type CanvasItemKind = "stroke" | "shape";

export type CanvasItem =
  | { kind: "stroke"; item: import("./Stroke").Stroke }
  | { kind: "shape"; item: Shape };

let shapeIdCounter = 0;

export function generateShapeId(): string {
  return `shape-${Date.now()}-${shapeIdCounter++}`;
}
