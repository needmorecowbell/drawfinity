export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
  opacity?: number;
  timestamp: number;
}

/** Minimal document interface for stroke storage — implemented by both DrawDocument and DrawfinityDoc. */
export interface DocumentModel {
  addStroke(stroke: Stroke): void;
  getStrokes(): Stroke[];
  removeStroke?(strokeId: string): boolean;
  /** Atomically remove a stroke and insert replacements (for partial erasing). */
  replaceStroke?(strokeId: string, replacements: Stroke[]): boolean;
  /** Returns all shapes in the document (optional — only available when shapes are supported). */
  getShapes?(): import("./Shape").Shape[];
  /** Remove a shape by ID (optional — whole-shape erasure). */
  removeShape?(shapeId: string): boolean;
}

let idCounter = 0;

export function generateStrokeId(): string {
  return `stroke-${Date.now()}-${idCounter++}`;
}
