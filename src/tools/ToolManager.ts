import { BrushConfig } from "./Brush";
import { PEN } from "./BrushPresets";
import type { ShapeType } from "../model/Shape";

export type ToolType = "brush" | "eraser" | "rectangle" | "ellipse" | "polygon" | "star";

/** Shape tool types that map to ShapeType. */
export const SHAPE_TOOL_TYPES: readonly ToolType[] = ["rectangle", "ellipse", "polygon", "star"] as const;

export interface ShapeToolConfig {
  fillColor: string | null;
  sides: number;
  starInnerRadius: number;
}

export function isShapeTool(tool: ToolType): tool is ShapeType {
  return (SHAPE_TOOL_TYPES as readonly string[]).includes(tool);
}

export class ToolManager {
  private activeTool: ToolType = "brush";
  private activeBrush: BrushConfig = { ...PEN };
  private currentColor: string = PEN.color;
  private shapeConfig: ShapeToolConfig = {
    fillColor: null,
    sides: 5,
    starInnerRadius: 0.4,
  };

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

  setShapeConfig(config: Partial<ShapeToolConfig>): void {
    Object.assign(this.shapeConfig, config);
  }

  getShapeConfig(): ShapeToolConfig {
    return { ...this.shapeConfig };
  }

  getActiveConfig(): {
    tool: ToolType;
    brush: BrushConfig;
    color: string;
    shapeConfig: ShapeToolConfig;
  } {
    return {
      tool: this.activeTool,
      brush: this.activeBrush,
      color: this.currentColor,
      shapeConfig: { ...this.shapeConfig },
    };
  }
}
