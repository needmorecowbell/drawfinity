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
    onShapeConfigChange: vi.fn(),
    onHome: vi.fn(),
    onRenameDrawing: vi.fn(),
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

  it("renders shape tool buttons", () => {
    const buttons = document.querySelectorAll(".shape-btn");
    expect(buttons.length).toBe(4); // rectangle, ellipse, polygon, star
  });

  it("renders undo and redo buttons", () => {
    const buttons = document.querySelectorAll(".toolbar-btn");
    // 1 home + 4 brush + 1 eraser + 4 shape + 1 fill toggle + 1 undo + 1 redo = 13
    expect(buttons.length).toBe(13);
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
    const buttons = document.querySelectorAll(".toolbar-btn:not(.brush-btn):not(.eraser-btn):not(.shape-btn):not(.fill-toggle):not(.home-btn)");
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
    const buttons = document.querySelectorAll(".toolbar-btn:not(.brush-btn):not(.eraser-btn):not(.shape-btn):not(.fill-toggle):not(.home-btn)");
    const undoBtn = buttons[0] as HTMLButtonElement;
    undoBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onUndo).toHaveBeenCalled();
  });

  it("clicking redo button fires onRedo", () => {
    toolbar.updateUndoRedo(true, true);
    const buttons = document.querySelectorAll(".toolbar-btn:not(.brush-btn):not(.eraser-btn):not(.shape-btn):not(.fill-toggle):not(.home-btn)");
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

  it("clicking a shape button switches to that shape tool", () => {
    const shapeBtn = document.querySelector(".shape-btn[data-shape='rectangle']") as HTMLButtonElement;
    shapeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("rectangle");
  });

  it("setToolUI highlights active shape button", () => {
    toolbar.setToolUI("ellipse");
    const btns = document.querySelectorAll(".shape-btn");
    const ellipseBtn = Array.from(btns).find(b => (b as HTMLElement).dataset.shape === "ellipse");
    expect(ellipseBtn!.classList.contains("active")).toBe(true);

    // Other shape buttons should not be active
    const rectBtn = Array.from(btns).find(b => (b as HTMLElement).dataset.shape === "rectangle");
    expect(rectBtn!.classList.contains("active")).toBe(false);

    // Brush and eraser should not be active
    expect(document.querySelector(".eraser-btn")!.classList.contains("active")).toBe(false);
    for (const btn of document.querySelectorAll(".brush-btn")) {
      expect(btn.classList.contains("active")).toBe(false);
    }
  });

  it("setToolUI shows shape options panel for shape tools", () => {
    const panel = document.querySelector(".shape-options") as HTMLElement;
    expect(panel.style.display).toBe("none");

    toolbar.setToolUI("rectangle");
    expect(panel.style.display).toBe("");

    toolbar.setToolUI("brush");
    expect(panel.style.display).toBe("none");
  });

  it("setToolUI shows sides spinner for polygon and star only", () => {
    toolbar.setToolUI("polygon");
    const sidesContainer = document.querySelector(".sides-container") as HTMLElement;
    expect(sidesContainer.style.display).toBe("");

    toolbar.setToolUI("star");
    expect(sidesContainer.style.display).toBe("");

    toolbar.setToolUI("rectangle");
    expect(sidesContainer.style.display).toBe("none");

    toolbar.setToolUI("ellipse");
    expect(sidesContainer.style.display).toBe("none");
  });

  it("fill toggle emits shape config change", () => {
    toolbar.setToolUI("rectangle");
    const fillToggle = document.querySelector(".fill-toggle") as HTMLButtonElement;
    fillToggle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onShapeConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ fillColor: expect.any(String) })
    );
  });

  it("fill toggle off emits null fill color", () => {
    toolbar.setToolUI("rectangle");
    const fillToggle = document.querySelector(".fill-toggle") as HTMLButtonElement;
    // Toggle on
    fillToggle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    // Toggle off
    fillToggle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onShapeConfigChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ fillColor: null })
    );
  });

  it("setShapeConfig updates fill and sides UI state", () => {
    toolbar.setShapeConfig({ fillColor: "#FF0000", sides: 8, starInnerRadius: 0.5 });
    const fillToggle = document.querySelector(".fill-toggle") as HTMLButtonElement;
    expect(fillToggle.classList.contains("active")).toBe(true);
    const sidesInput = document.querySelector(".sides-input") as HTMLInputElement;
    expect(sidesInput.value).toBe("8");
    const fillInput = document.querySelector(".fill-color-input") as HTMLInputElement;
    expect(fillInput.value).toBe("#ff0000");
  });

  it("switching to brush deactivates shape buttons", () => {
    toolbar.setToolUI("star");
    toolbar.setToolUI("brush");
    for (const btn of document.querySelectorAll(".shape-btn")) {
      expect(btn.classList.contains("active")).toBe(false);
    }
  });

  it("renders home button", () => {
    const homeBtn = document.querySelector(".home-btn");
    expect(homeBtn).not.toBeNull();
    expect(homeBtn!.textContent).toBe("\u2302");
  });

  it("clicking home button fires onHome callback", () => {
    const homeBtn = document.querySelector(".home-btn") as HTMLButtonElement;
    homeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onHome).toHaveBeenCalled();
  });

  it("renders drawing name container", () => {
    const container = document.querySelector(".toolbar-drawing-name");
    expect(container).not.toBeNull();
    const display = document.querySelector(".drawing-name-display");
    expect(display).not.toBeNull();
  });

  it("setDrawingName updates display text", () => {
    toolbar.setDrawingName("My Drawing");
    const display = document.querySelector(".drawing-name-display") as HTMLElement;
    expect(display.textContent).toBe("My Drawing");
  });

  it("clicking drawing name enters rename mode", () => {
    toolbar.setDrawingName("Test");
    const display = document.querySelector(".drawing-name-display") as HTMLElement;
    const input = document.querySelector(".drawing-name-input") as HTMLInputElement;

    display.click();
    expect(input.style.display).toBe("");
    expect(display.style.display).toBe("none");
    expect(input.value).toBe("Test");
  });

  it("pressing Enter in rename input commits the new name", () => {
    toolbar.setDrawingName("Old Name");
    const display = document.querySelector(".drawing-name-display") as HTMLElement;
    const input = document.querySelector(".drawing-name-input") as HTMLInputElement;

    display.click();
    input.value = "New Name";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(display.textContent).toBe("New Name");
    expect(input.style.display).toBe("none");
    expect(display.style.display).toBe("");
    expect(callbacks.onRenameDrawing).toHaveBeenCalledWith("New Name");
  });

  it("pressing Escape in rename input cancels without changing name", () => {
    toolbar.setDrawingName("Original");
    const display = document.querySelector(".drawing-name-display") as HTMLElement;
    const input = document.querySelector(".drawing-name-input") as HTMLInputElement;

    display.click();
    input.value = "Changed";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(display.textContent).toBe("Original");
    expect(input.style.display).toBe("none");
    expect(callbacks.onRenameDrawing).not.toHaveBeenCalled();
  });

  it("does not fire rename callback when name is unchanged", () => {
    toolbar.setDrawingName("Same");
    const display = document.querySelector(".drawing-name-display") as HTMLElement;
    const input = document.querySelector(".drawing-name-input") as HTMLInputElement;

    display.click();
    input.value = "Same";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(callbacks.onRenameDrawing).not.toHaveBeenCalled();
  });

  it("does not fire rename callback for empty name", () => {
    toolbar.setDrawingName("Test");
    const display = document.querySelector(".drawing-name-display") as HTMLElement;
    const input = document.querySelector(".drawing-name-input") as HTMLInputElement;

    display.click();
    input.value = "   ";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(callbacks.onRenameDrawing).not.toHaveBeenCalled();
  });

  it("destroy removes toolbar from DOM", () => {
    toolbar.destroy();
    expect(document.getElementById("toolbar")).toBeNull();
    // Prevent double-destroy in afterEach
    callbacks = makeCallbacks();
    toolbar = new Toolbar(callbacks);
  });
});
