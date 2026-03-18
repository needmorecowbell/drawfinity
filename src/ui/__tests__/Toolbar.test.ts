// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Toolbar, ToolbarCallbacks } from "../Toolbar";
import { BRUSH_PRESETS } from "../../tools/BrushPresets";

function makeCallbacks(): ToolbarCallbacks {
  return {
    onBrushSelect: vi.fn(),
    onColorChange: vi.fn(),
    onToolChange: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onBrushSizeChange: vi.fn(),
  };
}

describe("Toolbar", () => {
  let toolbar: Toolbar;
  let callbacks: ToolbarCallbacks;

  beforeEach(() => {
    callbacks = makeCallbacks();
    toolbar = new Toolbar(callbacks);
  });

  afterEach(() => {
    toolbar.destroy();
  });

  it("renders toolbar container in the DOM", () => {
    const el = document.getElementById("toolbar");
    expect(el).not.toBeNull();
  });

  it("renders brush preset buttons", () => {
    const buttons = document.querySelectorAll(".brush-btn");
    expect(buttons.length).toBe(BRUSH_PRESETS.length);
  });

  it("renders color swatches", () => {
    const swatches = document.querySelectorAll(".toolbar-swatch");
    expect(swatches.length).toBe(12); // 12 preset colors
  });

  it("renders eraser button", () => {
    const eraser = document.querySelector(".eraser-btn");
    expect(eraser).not.toBeNull();
  });

  it("renders undo and redo buttons", () => {
    const buttons = document.querySelectorAll(".toolbar-btn");
    // 4 brush + 1 eraser + 1 undo + 1 redo = 7
    expect(buttons.length).toBe(7);
  });

  it("renders zoom display", () => {
    const zoom = document.querySelector(".toolbar-zoom");
    expect(zoom).not.toBeNull();
    expect(zoom!.textContent).toBe("100%");
  });

  it("renders custom color input", () => {
    const input = document.querySelector(".toolbar-color-input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.type).toBe("color");
  });

  it("first brush is active by default", () => {
    const buttons = document.querySelectorAll(".brush-btn");
    expect(buttons[0].classList.contains("active")).toBe(true);
    expect(buttons[1].classList.contains("active")).toBe(false);
  });

  it("selectBrush updates active state and fires callback", () => {
    toolbar.selectBrush(2);
    const buttons = document.querySelectorAll(".brush-btn");
    expect(buttons[0].classList.contains("active")).toBe(false);
    expect(buttons[2].classList.contains("active")).toBe(true);
    expect(callbacks.onBrushSelect).toHaveBeenCalledWith(BRUSH_PRESETS[2]);
  });

  it("selectBrush ignores out-of-range index", () => {
    toolbar.selectBrush(99);
    expect(callbacks.onBrushSelect).not.toHaveBeenCalled();
  });

  it("setToolUI toggles eraser active state", () => {
    toolbar.setToolUI("eraser");
    const eraser = document.querySelector(".eraser-btn");
    expect(eraser!.classList.contains("active")).toBe(true);
    // Brush buttons should not be active
    const brushBtns = document.querySelectorAll(".brush-btn");
    for (const btn of brushBtns) {
      expect(btn.classList.contains("active")).toBe(false);
    }
  });

  it("setToolUI to brush re-activates correct brush button", () => {
    toolbar.selectBrush(1);
    toolbar.setToolUI("eraser");
    toolbar.setToolUI("brush");
    const buttons = document.querySelectorAll(".brush-btn");
    expect(buttons[1].classList.contains("active")).toBe(true);
  });

  it("updateUndoRedo enables/disables buttons", () => {
    toolbar.updateUndoRedo(true, false);
    const buttons = document.querySelectorAll(".toolbar-btn:not(.brush-btn):not(.eraser-btn)");
    // Undo should be enabled, redo disabled
    const undoBtn = buttons[0] as HTMLButtonElement;
    const redoBtn = buttons[1] as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(false);
    expect(redoBtn.disabled).toBe(true);

    toolbar.updateUndoRedo(false, true);
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(false);
  });

  it("updateZoom changes display text", () => {
    toolbar.updateZoom(250);
    const zoom = document.querySelector(".toolbar-zoom");
    expect(zoom!.textContent).toBe("250%");
  });

  it("clicking a color swatch fires onColorChange", () => {
    const swatches = document.querySelectorAll(".toolbar-swatch");
    const swatch = swatches[2] as HTMLButtonElement;
    swatch.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onColorChange).toHaveBeenCalled();
  });

  it("clicking undo button fires onUndo", () => {
    toolbar.updateUndoRedo(true, true);
    const buttons = document.querySelectorAll(".toolbar-btn:not(.brush-btn):not(.eraser-btn)");
    const undoBtn = buttons[0] as HTMLButtonElement;
    undoBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onUndo).toHaveBeenCalled();
  });

  it("clicking redo button fires onRedo", () => {
    toolbar.updateUndoRedo(true, true);
    const buttons = document.querySelectorAll(".toolbar-btn:not(.brush-btn):not(.eraser-btn)");
    const redoBtn = buttons[1] as HTMLButtonElement;
    redoBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onRedo).toHaveBeenCalled();
  });

  it("clicking eraser toggles to eraser tool", () => {
    const eraser = document.querySelector(".eraser-btn") as HTMLButtonElement;
    eraser.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("eraser");
  });

  it("getActiveBrushIndex tracks selection", () => {
    expect(toolbar.getActiveBrushIndex()).toBe(0);
    toolbar.selectBrush(3);
    expect(toolbar.getActiveBrushIndex()).toBe(3);
  });

  it("destroy removes toolbar from DOM", () => {
    toolbar.destroy();
    expect(document.getElementById("toolbar")).toBeNull();
    // Prevent double-destroy in afterEach
    callbacks = makeCallbacks();
    toolbar = new Toolbar(callbacks);
  });
});
