import { describe, it, expect } from "vitest";
import { ToolManager } from "../ToolManager";
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

  it("getActiveConfig returns full state", () => {
    const tm = new ToolManager();
    tm.setTool("eraser");
    tm.setBrush(HIGHLIGHTER);
    tm.setColor("#0000FF");

    const config = tm.getActiveConfig();
    expect(config.tool).toBe("eraser");
    expect(config.brush.name).toBe("Highlighter");
    expect(config.color).toBe("#0000FF");
  });

  it("does not mutate the original preset", () => {
    const tm = new ToolManager();
    tm.setBrush(PEN);
    tm.setColor("#FF0000");
    // The original PEN preset should be unmodified
    expect(PEN.color).toBe("#000000");
  });
});
