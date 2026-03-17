import { Stroke, DocumentModel } from "./Stroke";

export class DrawDocument implements DocumentModel {
  private strokes: Stroke[] = [];

  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
  }

  getStrokes(): Stroke[] {
    return this.strokes;
  }

  clear(): void {
    this.strokes = [];
  }
}
