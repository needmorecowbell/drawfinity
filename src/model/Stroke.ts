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
}

let idCounter = 0;

export function generateStrokeId(): string {
  return `stroke-${Date.now()}-${idCounter++}`;
}
