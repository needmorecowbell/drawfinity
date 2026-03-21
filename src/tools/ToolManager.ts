import { BrushConfig } from "./Brush";
import { PEN } from "./BrushPresets";
import type { ShapeType } from "../model/Shape";

/**
 * The set of available drawing tools.
 *
 * - `"brush"` — freehand pressure-sensitive drawing
 * - `"eraser"` — removes strokes under the pointer
 * - `"rectangle"`, `"ellipse"`, `"polygon"`, `"star"` — shape tools
 * - `"pan"` — click-drag to pan the canvas
 * - `"magnify"` — click to zoom in/out
 */
export type ToolType = "brush" | "eraser" | "rectangle" | "ellipse" | "polygon" | "star" | "pan" | "magnify";

/** Shape tool types that map to ShapeType. */
export const SHAPE_TOOL_TYPES: readonly ToolType[] = ["rectangle", "ellipse", "polygon", "star"] as const;

/**
 * Configuration for shape drawing tools (rectangle, ellipse, polygon, star).
 *
 * @property fillColor - Fill color as a CSS color string, or `null` for outline-only shapes.
 * @property sides - Number of sides for polygon shapes.
 * @property starInnerRadius - Inner radius ratio (0–1) for star shapes, where smaller values produce sharper points.
 */
export interface ShapeToolConfig {
  fillColor: string | null;
  sides: number;
  starInnerRadius: number;
}

/**
 * Type guard that checks whether a tool type corresponds to a shape tool.
 *
 * @param tool - The tool type to check.
 * @returns `true` if the tool is one of the shape tools (`rectangle`, `ellipse`, `polygon`, `star`).
 */
export function isShapeTool(tool: ToolType): tool is ShapeType {
  return (SHAPE_TOOL_TYPES as readonly string[]).includes(tool);
}

/**
 * Central manager for drawing tool state including the active tool, brush
 * configuration, stroke color, opacity, and shape settings.
 *
 * ToolManager owns the "what am I drawing with?" state. Other subsystems
 * (e.g. {@link StrokeCapture}, {@link ShapeCapture}) read from it when a
 * stroke or shape begins. Changing a value here takes effect on the *next*
 * drawing action — in-progress strokes are not affected.
 *
 * Defaults to the Pen brush preset at full opacity.
 *
 * @example
 * ```ts
 * const tools = new ToolManager();
 * tools.setTool("brush");
 * tools.setColor("#ff0000");
 * tools.setOpacity(0.8);
 * const config = tools.getActiveConfig();
 * ```
 */
export class ToolManager {
  private activeTool: ToolType = "brush";
  private activeBrush: BrushConfig = { ...PEN };
  private currentColor: string = PEN.color;
  private strokeOpacity: number = 1.0;
  private shapeConfig: ShapeToolConfig = {
    fillColor: null,
    sides: 5,
    starInnerRadius: 0.4,
  };

  /**
   * Sets the active drawing tool.
   *
   * @param tool - The tool to activate.
   */
  setTool(tool: ToolType): void {
    this.activeTool = tool;
  }

  /**
   * Returns the currently active tool type.
   *
   * @returns The active {@link ToolType}.
   */
  getTool(): ToolType {
    return this.activeTool;
  }

  /**
   * Sets the active brush preset. The brush is shallow-copied and its color is
   * overridden with the user's currently selected color so that switching
   * presets preserves the chosen color.
   *
   * @param brush - The brush configuration to apply.
   */
  setBrush(brush: BrushConfig): void {
    this.activeBrush = { ...brush };
    // Preserve user-selected color when switching brushes
    this.activeBrush.color = this.currentColor;
  }

  /**
   * Returns the active brush configuration (by reference — mutations will
   * affect subsequent strokes).
   *
   * @returns The current {@link BrushConfig}.
   */
  getBrush(): BrushConfig {
    return this.activeBrush;
  }

  /**
   * Sets the drawing color. Updates both the stored color and the active
   * brush's color so they stay in sync.
   *
   * @param color - A CSS color string (e.g. `"#ff0000"`).
   */
  setColor(color: string): void {
    this.currentColor = color;
    this.activeBrush.color = color;
  }

  /**
   * Returns the user's currently selected drawing color.
   *
   * @returns A CSS color string.
   */
  getColor(): string {
    return this.currentColor;
  }

  /**
   * Sets the stroke opacity, clamped to the 0–1 range.
   *
   * @param opacity - Desired opacity where `0` is fully transparent and `1` is fully opaque.
   */
  setOpacity(opacity: number): void {
    this.strokeOpacity = Math.max(0, Math.min(1, opacity));
  }

  /**
   * Returns the current stroke opacity.
   *
   * @returns A number between `0` (transparent) and `1` (opaque).
   */
  getOpacity(): number {
    return this.strokeOpacity;
  }

  /**
   * Merges partial shape configuration into the current settings.
   * Only the provided properties are updated; others are left unchanged.
   *
   * @param config - A partial {@link ShapeToolConfig} with the properties to update.
   */
  setShapeConfig(config: Partial<ShapeToolConfig>): void {
    Object.assign(this.shapeConfig, config);
  }

  /**
   * Returns a shallow copy of the current shape tool configuration.
   *
   * @returns A copy of the active {@link ShapeToolConfig}.
   */
  getShapeConfig(): ShapeToolConfig {
    return { ...this.shapeConfig };
  }

  /**
   * Returns a snapshot of all active tool state in a single object.
   * The shape config is shallow-copied; other values are primitives or
   * references to the internal brush.
   *
   * @returns An object containing the active tool, brush, color, and shape config.
   */
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
