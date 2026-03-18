import { BrushConfig } from "./Brush";
import { PEN } from "./BrushPresets";

export type ToolType = "brush" | "eraser";

export class ToolManager {
  private activeTool: ToolType = "brush";
  private activeBrush: BrushConfig = { ...PEN };
  private currentColor: string = PEN.color;

  setTool(tool: ToolType): void {
    this.activeTool = tool;
  }

  getTool(): ToolType {
    return this.activeTool;
  }

  setBrush(brush: BrushConfig): void {
    this.activeBrush = { ...brush };
    // Preserve user-selected color when switching brushes
    this.activeBrush.color = this.currentColor;
  }

  getBrush(): BrushConfig {
    return this.activeBrush;
  }

  setColor(color: string): void {
    this.currentColor = color;
    this.activeBrush.color = color;
  }

  getColor(): string {
    return this.currentColor;
  }

  getActiveConfig(): {
    tool: ToolType;
    brush: BrushConfig;
    color: string;
  } {
    return {
      tool: this.activeTool,
      brush: this.activeBrush,
      color: this.currentColor,
    };
  }
}
