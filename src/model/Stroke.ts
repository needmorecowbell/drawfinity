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
  timestamp: number;
}

let idCounter = 0;

export function generateStrokeId(): string {
  return `stroke-${Date.now()}-${idCounter++}`;
}
