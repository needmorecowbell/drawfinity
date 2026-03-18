import { describe, it, expect } from "vitest";
import { ToolManager, isShapeTool, SHAPE_TOOL_TYPES } from "../ToolManager";
import { PEN, PENCIL, MARKER, HIGHLIGHTER } from "../BrushPresets";

describe("ToolManager", () => {
  it("defaults to brush tool with PEN preset", () => {
    const tm = new ToolManager();
    expect(tm.getTool()).toBe("brush");
    expect(tm.getBrush().name).toBe("Pen");
  });

  it("switches tool type", () => {
    const tm = new ToolManager();
    tm.setTool("eraser");
    expect(tm.getTool()).toBe("eraser");
    tm.setTool("brush");
    expect(tm.getTool()).toBe("brush");
  });

  it("switches to shape tool types", () => {
    const tm = new ToolManager();
    tm.setTool("rectangle");
    expect(tm.getTool()).toBe("rectangle");
    tm.setTool("ellipse");
    expect(tm.getTool()).toBe("ellipse");
    tm.setTool("polygon");
    expect(tm.getTool()).toBe("polygon");
    tm.setTool("star");
    expect(tm.getTool()).toBe("star");
  });

  it("switches brush preset", () => {
    const tm = new ToolManager();
    tm.setBrush(PENCIL);
    expect(tm.getBrush().name).toBe("Pencil");
    expect(tm.getBrush().baseWidth).toBe(PENCIL.baseWidth);
  });

  it("preserves user-selected color when switching brushes", () => {
    const tm = new ToolManager();
    tm.setColor("#FF0000");
    tm.setBrush(MARKER); // Marker default color is #000000
    expect(tm.getBrush().color).toBe("#FF0000");
    expect(tm.getColor()).toBe("#FF0000");
  });

  it("setColor updates both brush and stored color", () => {
    const tm = new ToolManager();
    tm.setColor("#00FF00");
    expect(tm.getColor()).toBe("#00FF00");
    expect(tm.getBrush().color).toBe("#00FF00");
  });

  it("getActiveConfig returns full state including shape config", () => {
    const tm = new ToolManager();
    tm.setTool("eraser");
    tm.setBrush(HIGHLIGHTER);
    tm.setColor("#0000FF");

    const config = tm.getActiveConfig();
    expect(config.tool).toBe("eraser");
    expect(config.brush.name).toBe("Highlighter");
    expect(config.color).toBe("#0000FF");
    expect(config.shapeConfig).toBeDefined();
    expect(config.shapeConfig.sides).toBe(5);
    expect(config.shapeConfig.starInnerRadius).toBe(0.4);
    expect(config.shapeConfig.fillColor).toBeNull();
  });

  it("does not mutate the original preset", () => {
    const tm = new ToolManager();
    tm.setBrush(PEN);
    tm.setColor("#FF0000");
    // The original PEN preset should be unmodified
    expect(PEN.color).toBe("#000000");
  });

  it("sets and gets shape config", () => {
    const tm = new ToolManager();
    tm.setShapeConfig({ fillColor: "#FF0000", sides: 6 });
    const config = tm.getShapeConfig();
    expect(config.fillColor).toBe("#FF0000");
    expect(config.sides).toBe(6);
    expect(config.starInnerRadius).toBe(0.4); // unchanged default
  });

  it("getShapeConfig returns a copy", () => {
    const tm = new ToolManager();
    const config = tm.getShapeConfig();
    config.sides = 99;
    expect(tm.getShapeConfig().sides).toBe(5); // unchanged
  });
});

describe("isShapeTool", () => {
  it("returns true for shape tool types", () => {
    expect(isShapeTool("rectangle")).toBe(true);
    expect(isShapeTool("ellipse")).toBe(true);
    expect(isShapeTool("polygon")).toBe(true);
    expect(isShapeTool("star")).toBe(true);
  });

  it("returns false for non-shape tool types", () => {
    expect(isShapeTool("brush")).toBe(false);
    expect(isShapeTool("eraser")).toBe(false);
  });
});

describe("SHAPE_TOOL_TYPES", () => {
  it("contains all four shape types", () => {
    expect(SHAPE_TOOL_TYPES).toContain("rectangle");
    expect(SHAPE_TOOL_TYPES).toContain("ellipse");
    expect(SHAPE_TOOL_TYPES).toContain("polygon");
    expect(SHAPE_TOOL_TYPES).toContain("star");
    expect(SHAPE_TOOL_TYPES).toHaveLength(4);
  });
});
