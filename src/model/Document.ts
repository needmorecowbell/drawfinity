import { Stroke } from "./Stroke";

export class DrawDocument {
  private strokes: Stroke[] = [];

  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
  }

  getStrokes(): readonly Stroke[] {
    return this.strokes;
  }

  clear(): void {
    this.strokes = [];
  }
}
