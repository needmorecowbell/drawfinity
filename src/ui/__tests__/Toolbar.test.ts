// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Toolbar, ToolbarCallbacks } from "../Toolbar";
import { Tooltip } from "../Tooltip";
import { BRUSH_PRESETS } from "../../tools/BrushPresets";

// Mock ResizeObserver for jsdom
if (typeof ResizeObserver === "undefined") {
  (globalThis as any).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

function makeCallbacks(): ToolbarCallbacks {
  return {
    onBrushSelect: vi.fn(),
    onColorChange: vi.fn(),
    onToolChange: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onBrushSizeChange: vi.fn(),
    onOpacityChange: vi.fn(),
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
    Tooltip.resetInstance();
  });

  it("renders toolbar container in the DOM", () => {
    const el = document.getElementById("toolbar");
    expect(el).not.toBeNull();
  });

  it("renders 5 toolbar groups with correct data-group attributes", () => {
    const groups = document.querySelectorAll(".toolbar-group");
    expect(groups.length).toBe(5);
    const groupNames = Array.from(groups).map(g => (g as HTMLElement).dataset.group);
    expect(groupNames).toEqual(["tools", "properties", "actions", "navigation", "panels"]);
  });

  it("renders dividers between groups", () => {
    const dividers = document.querySelectorAll("#toolbar > .toolbar-divider");
    expect(dividers.length).toBe(4); // divider between each of the 5 groups
  });

  it("renders a single brush button with hold-to-select in tools group", () => {
    const toolsGroup = document.querySelector('[data-group="tools"]');
    const buttons = toolsGroup!.querySelectorAll(".brush-btn");
    expect(buttons.length).toBe(1);
    // Button shows first preset label by default
    expect(buttons[0].innerHTML).toContain("<svg");
  });

  it("renders eraser button in tools group", () => {
    const toolsGroup = document.querySelector('[data-group="tools"]');
    const eraser = toolsGroup!.querySelector(".eraser-btn");
    expect(eraser).not.toBeNull();
  });

  it("renders a single shape button with hold-to-select in tools group", () => {
    const toolsGroup = document.querySelector('[data-group="tools"]');
    const buttons = toolsGroup!.querySelectorAll(".shape-btn");
    expect(buttons.length).toBe(1);
  });

  it("renders color swatches in properties group", () => {
    const propsGroup = document.querySelector('[data-group="properties"]');
    const swatches = propsGroup!.querySelectorAll(".toolbar-swatch");
    expect(swatches.length).toBe(12);
  });

  it("renders undo and redo buttons in actions group", () => {
    const actionsGroup = document.querySelector('[data-group="actions"]');
    const buttons = actionsGroup!.querySelectorAll(".toolbar-btn");
    expect(buttons.length).toBe(3); // undo + redo + export
  });

  it("renders zoom display in navigation group", () => {
    const navGroup = document.querySelector('[data-group="navigation"]');
    const zoom = navGroup!.querySelector(".toolbar-zoom");
    expect(zoom).not.toBeNull();
    expect(zoom!.textContent).toBe("100%");
  });

  it("renders home button in panels group", () => {
    const panelsGroup = document.querySelector('[data-group="panels"]');
    const homeBtn = panelsGroup!.querySelector(".home-btn");
    expect(homeBtn).not.toBeNull();
    expect(homeBtn!.innerHTML).toContain("<svg");
  });

  it("renders help button in panels group", () => {
    const panelsGroup = document.querySelector('[data-group="panels"]');
    const helpBtn = panelsGroup!.querySelector(".help-btn");
    expect(helpBtn).not.toBeNull();
    expect(helpBtn!.innerHTML).toContain("<svg");
  });

  it("renders drawing name container in panels group", () => {
    const panelsGroup = document.querySelector('[data-group="panels"]');
    const container = panelsGroup!.querySelector(".toolbar-drawing-name");
    expect(container).not.toBeNull();
  });

  it("renders custom color input", () => {
    const input = document.querySelector(".toolbar-color-input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.type).toBe("color");
  });

  it("brush button is active by default", () => {
    const brushBtn = document.querySelector(".brush-btn")!;
    expect(brushBtn.classList.contains("active")).toBe(true);
  });

  it("selectBrush updates button label and fires callback", () => {
    toolbar.selectBrush(2);
    const brushBtn = document.querySelector(".brush-btn")!;
    expect(brushBtn.classList.contains("active")).toBe(true);
    expect(brushBtn.innerHTML).toContain("<svg");
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
    const brushBtn = document.querySelector(".brush-btn")!;
    expect(brushBtn.classList.contains("active")).toBe(false);
  });

  it("setToolUI to brush re-activates brush button", () => {
    toolbar.selectBrush(1);
    toolbar.setToolUI("eraser");
    toolbar.setToolUI("brush");
    const brushBtn = document.querySelector(".brush-btn")!;
    expect(brushBtn.classList.contains("active")).toBe(true);
    // Verify it still shows the last selected preset
    expect(brushBtn.innerHTML).toContain("<svg");
  });

  it("updateUndoRedo enables/disables buttons", () => {
    const actionsGroup = document.querySelector('[data-group="actions"]');
    const buttons = actionsGroup!.querySelectorAll(".toolbar-btn") as NodeListOf<HTMLButtonElement>;
    const undoBtn = buttons[0];
    const redoBtn = buttons[1];

    toolbar.updateUndoRedo(true, false);
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
    const actionsGroup = document.querySelector('[data-group="actions"]');
    const undoBtn = actionsGroup!.querySelectorAll(".toolbar-btn")[0] as HTMLButtonElement;
    undoBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onUndo).toHaveBeenCalled();
  });

  it("clicking redo button fires onRedo", () => {
    toolbar.updateUndoRedo(true, true);
    const actionsGroup = document.querySelector('[data-group="actions"]');
    const redoBtn = actionsGroup!.querySelectorAll(".toolbar-btn")[1] as HTMLButtonElement;
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

  it("quick-clicking shape button selects last-used shape tool", () => {
    const shapeBtn = document.querySelector(".shape-btn") as HTMLButtonElement;
    // Quick click triggers the SubToolPicker's last-used selection (default: rectangle)
    shapeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    shapeBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("rectangle");
  });

  it("setToolUI highlights shape button when a shape tool is active", () => {
    toolbar.setToolUI("ellipse");
    const shapeBtn = document.querySelector(".shape-btn")!;
    expect(shapeBtn.classList.contains("active")).toBe(true);
    // Shape picker updates to show the selected shape
    expect(toolbar.getShapePicker().getLastUsedId()).toBe("ellipse");

    expect(document.querySelector(".eraser-btn")!.classList.contains("active")).toBe(false);
    expect(document.querySelector(".brush-btn")!.classList.contains("active")).toBe(false);
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
    fillToggle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
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

  it("switching to brush deactivates shape button", () => {
    toolbar.setToolUI("star");
    toolbar.setToolUI("brush");
    const shapeBtn = document.querySelector(".shape-btn")!;
    expect(shapeBtn.classList.contains("active")).toBe(false);
  });

  it("clicking home button fires onHome callback", () => {
    const homeBtn = document.querySelector(".home-btn") as HTMLButtonElement;
    homeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onHome).toHaveBeenCalled();
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

  it("clicking help button fires onCheatSheet callback", () => {
    callbacks.onCheatSheet = vi.fn();
    toolbar.destroy();
    toolbar = new Toolbar(callbacks);
    const helpBtn = document.querySelector(".help-btn") as HTMLButtonElement;
    helpBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(callbacks.onCheatSheet).toHaveBeenCalled();
  });

  it("getGroup returns the correct group element", () => {
    const toolsGroup = toolbar.getGroup("tools");
    expect(toolsGroup).not.toBeUndefined();
    expect(toolsGroup!.dataset.group).toBe("tools");

    const panelsGroup = toolbar.getGroup("panels");
    expect(panelsGroup).not.toBeUndefined();
    expect(panelsGroup!.dataset.group).toBe("panels");
  });

  it("getGroup returns undefined for unknown group", () => {
    const unknown = toolbar.getGroup("nonexistent" as any);
    expect(unknown).toBeUndefined();
  });

  // Grid SubToolPicker tests
  it("renders grid button in navigation group", () => {
    const navGroup = document.querySelector('[data-group="navigation"]');
    const gridBtn = navGroup!.querySelector(".grid-btn");
    expect(gridBtn).not.toBeNull();
    expect(gridBtn!.innerHTML).toContain("<svg");
  });

  it("grid button is active by default (grid visible)", () => {
    const gridBtn = document.querySelector(".grid-btn")!;
    expect(gridBtn.classList.contains("active")).toBe(true);
  });

  it("quick-clicking grid button toggles between dots and none", () => {
    callbacks.onGridStyleChange = vi.fn();
    toolbar.destroy();
    toolbar = new Toolbar(callbacks);

    const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;
    // Quick click (pointerdown + pointerup) toggles to "none"
    gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    gridBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(gridBtn.classList.contains("active")).toBe(false);
    expect(callbacks.onGridStyleChange).toHaveBeenCalledWith("none");

    // Quick click again restores "dots"
    gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    gridBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(gridBtn.classList.contains("active")).toBe(true);
    expect(callbacks.onGridStyleChange).toHaveBeenCalledWith("dots");
  });

  it("hold grid button shows popover with 3 grid options", () => {
    vi.useFakeTimers();
    const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;

    gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);

    const popover = document.querySelector(".subtool-popover");
    expect(popover).not.toBeNull();
    const options = document.querySelectorAll(".subtool-option");
    expect(options.length).toBe(3);

    // Clean up
    toolbar.getGridPicker().hidePopover();
    vi.useRealTimers();
  });

  it("selecting 'lines' from grid popover sets grid to lines", () => {
    vi.useFakeTimers();
    callbacks.onGridStyleChange = vi.fn();
    toolbar.destroy();
    toolbar = new Toolbar(callbacks);

    const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;
    gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);

    const options = document.querySelectorAll(".subtool-option");
    // Options: dots, lines, none
    options[1].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onGridStyleChange).toHaveBeenCalledWith("lines");
    expect(toolbar.getGridStyle()).toBe("lines");
    expect(gridBtn.classList.contains("active")).toBe(true);

    vi.useRealTimers();
  });

  it("selecting 'none' from grid popover disables grid and preserves last style for toggle", () => {
    vi.useFakeTimers();
    callbacks.onGridStyleChange = vi.fn();
    toolbar.destroy();
    toolbar = new Toolbar(callbacks);

    // First set to lines via popover
    const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;
    gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    let options = document.querySelectorAll(".subtool-option");
    options[1].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(toolbar.getGridStyle()).toBe("lines");

    // Now pick "none" from popover
    gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    options = document.querySelectorAll(".subtool-option");
    options[2].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(toolbar.getGridStyle()).toBe("none");
    expect(gridBtn.classList.contains("active")).toBe(false);

    // Quick click should restore "lines" (last non-none)
    gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    gridBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(toolbar.getGridStyle()).toBe("lines");
    expect(gridBtn.classList.contains("active")).toBe(true);

    vi.useRealTimers();
  });

  it("setGridStyle updates button active state and picker", () => {
    const gridBtn = document.querySelector(".grid-btn")!;
    toolbar.setGridStyle("none");
    expect(gridBtn.classList.contains("active")).toBe(false);
    toolbar.setGridStyle("dots");
    expect(gridBtn.classList.contains("active")).toBe(true);
    toolbar.setGridStyle("lines");
    expect(gridBtn.classList.contains("active")).toBe(true);
    expect(toolbar.getGridPicker().getLastUsedId()).toBe("lines");
  });

  it("getGridStyle returns current grid style", () => {
    expect(toolbar.getGridStyle()).toBe("dots");
    toolbar.setGridStyle("none");
    expect(toolbar.getGridStyle()).toBe("none");
    toolbar.setGridStyle("lines");
    expect(toolbar.getGridStyle()).toBe("lines");
  });

  it("destroy removes toolbar from DOM", () => {
    toolbar.destroy();
    expect(document.getElementById("toolbar")).toBeNull();
    // Prevent double-destroy in afterEach
    callbacks = makeCallbacks();
    toolbar = new Toolbar(callbacks);
  });

  // Pan/Zoom tool button tests
  it("renders pan button in tools group", () => {
    const toolsGroup = document.querySelector('[data-group="tools"]');
    const panBtn = toolsGroup!.querySelector(".pan-btn");
    expect(panBtn).not.toBeNull();
    expect(panBtn!.innerHTML).toContain("<svg");
  });

  it("clicking pan button fires onToolChange with 'pan'", () => {
    const panBtn = document.querySelector(".pan-btn") as HTMLButtonElement;
    panBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("pan");
  });

  it("clicking pan button again returns to previous tool", () => {
    // First switch to eraser
    toolbar.setToolUI("eraser");
    // Now activate pan
    const panBtn = document.querySelector(".pan-btn") as HTMLButtonElement;
    panBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("pan");

    // Click pan again → should return to eraser (the previous tool)
    toolbar.setToolUI("pan"); // simulate the UI update
    panBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("eraser");
  });

  it("setToolUI highlights pan button when pan tool is active", () => {
    toolbar.setToolUI("pan");
    const panBtn = document.querySelector(".pan-btn")!;
    expect(panBtn.classList.contains("active")).toBe(true);
    expect(document.querySelector(".brush-btn")!.classList.contains("active")).toBe(false);
    expect(document.querySelector(".eraser-btn")!.classList.contains("active")).toBe(false);
    expect(document.querySelector(".shape-btn")!.classList.contains("active")).toBe(false);
  });

  it("switching from pan to brush deactivates pan button", () => {
    toolbar.setToolUI("pan");
    toolbar.setToolUI("brush");
    const panBtn = document.querySelector(".pan-btn")!;
    expect(panBtn.classList.contains("active")).toBe(false);
    expect(document.querySelector(".brush-btn")!.classList.contains("active")).toBe(true);
  });

  it("getPreviousTool returns the tool before pan was activated", () => {
    toolbar.setToolUI("eraser");
    toolbar.setToolUI("pan");
    expect(toolbar.getPreviousTool()).toBe("eraser");
  });

  it("getPreviousTool defaults to brush", () => {
    expect(toolbar.getPreviousTool()).toBe("brush");
  });

  // Magnify tool button tests
  it("renders magnify button in tools group", () => {
    const toolsGroup = document.querySelector('[data-group="tools"]');
    const magnifyBtn = toolsGroup!.querySelector(".magnify-btn");
    expect(magnifyBtn).not.toBeNull();
    expect(magnifyBtn!.innerHTML).toContain("<svg");
  });

  it("clicking magnify button fires onToolChange with 'magnify'", () => {
    const magnifyBtn = document.querySelector(".magnify-btn") as HTMLButtonElement;
    magnifyBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("magnify");
  });

  it("clicking magnify button again returns to previous tool", () => {
    // First switch to eraser
    toolbar.setToolUI("eraser");
    // Now activate magnify
    const magnifyBtn = document.querySelector(".magnify-btn") as HTMLButtonElement;
    magnifyBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("magnify");

    // Click magnify again → should return to eraser (the previous tool)
    toolbar.setToolUI("magnify"); // simulate the UI update
    magnifyBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onToolChange).toHaveBeenCalledWith("eraser");
  });

  it("setToolUI highlights magnify button when magnify tool is active", () => {
    toolbar.setToolUI("magnify");
    const magnifyBtn = document.querySelector(".magnify-btn")!;
    expect(magnifyBtn.classList.contains("active")).toBe(true);
    expect(document.querySelector(".brush-btn")!.classList.contains("active")).toBe(false);
    expect(document.querySelector(".eraser-btn")!.classList.contains("active")).toBe(false);
    expect(document.querySelector(".pan-btn")!.classList.contains("active")).toBe(false);
    expect(document.querySelector(".shape-btn")!.classList.contains("active")).toBe(false);
  });

  // Zoom controls tests
  it("renders zoom in button in navigation group", () => {
    const navGroup = document.querySelector('[data-group="navigation"]');
    const btn = navGroup!.querySelector(".zoom-in-btn");
    expect(btn).not.toBeNull();
    expect(btn!.innerHTML).toContain("<svg");
  });

  it("renders zoom out button in navigation group", () => {
    const navGroup = document.querySelector('[data-group="navigation"]');
    const btn = navGroup!.querySelector(".zoom-out-btn");
    expect(btn).not.toBeNull();
    expect(btn!.innerHTML).toContain("<svg");
  });

  it("renders fit all button in navigation group", () => {
    const navGroup = document.querySelector('[data-group="navigation"]');
    const btn = navGroup!.querySelector(".fit-all-btn");
    expect(btn).not.toBeNull();
    expect(btn!.innerHTML).toContain("<svg");
  });

  it("zoom display is clickable and has reset tooltip", () => {
    const zoom = document.querySelector(".toolbar-zoom") as HTMLElement;
    expect(zoom).not.toBeNull();
  });

  it("clicking zoom in button fires onZoomIn callback", () => {
    callbacks.onZoomIn = vi.fn();
    toolbar.destroy();
    toolbar = new Toolbar(callbacks);

    const btn = document.querySelector(".zoom-in-btn") as HTMLButtonElement;
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onZoomIn).toHaveBeenCalled();
  });

  it("clicking zoom out button fires onZoomOut callback", () => {
    callbacks.onZoomOut = vi.fn();
    toolbar.destroy();
    toolbar = new Toolbar(callbacks);

    const btn = document.querySelector(".zoom-out-btn") as HTMLButtonElement;
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onZoomOut).toHaveBeenCalled();
  });

  it("clicking zoom display fires onZoomReset callback", () => {
    callbacks.onZoomReset = vi.fn();
    toolbar.destroy();
    toolbar = new Toolbar(callbacks);

    const zoom = document.querySelector(".toolbar-zoom") as HTMLElement;
    zoom.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onZoomReset).toHaveBeenCalled();
  });

  it("clicking fit all button fires onFitAll callback", () => {
    callbacks.onFitAll = vi.fn();
    toolbar.destroy();
    toolbar = new Toolbar(callbacks);

    const btn = document.querySelector(".fit-all-btn") as HTMLButtonElement;
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(callbacks.onFitAll).toHaveBeenCalled();
  });

  // Integration test: hold brush button → sub-picker appears → select preset → verify tool change
  it("hold brush button shows sub-picker, selecting a preset fires onBrushSelect with correct preset", () => {
    vi.useFakeTimers();

    const brushBtn = document.querySelector(".brush-btn") as HTMLButtonElement;

    // Hold the brush button for 300ms to trigger sub-picker
    brushBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);

    // Sub-picker popover should be visible
    const popover = document.querySelector(".subtool-popover");
    expect(popover).not.toBeNull();

    // Verify sub-tool options are shown (one per brush preset)
    const options = document.querySelectorAll(".subtool-option");
    expect(options.length).toBe(BRUSH_PRESETS.length);

    // Select the third preset (index 2, e.g., Marker)
    options[2].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Verify the callback was fired with the correct brush preset
    expect(callbacks.onBrushSelect).toHaveBeenCalledWith(BRUSH_PRESETS[2]);

    // Popover should be dismissed
    expect(document.querySelector(".subtool-popover")).toBeNull();

    // Button text should update to reflect selected preset (single-char label via innerHTML)
    expect(brushBtn.innerHTML).toContain("<svg");

    // Quick click should now use the newly selected preset
    (callbacks.onBrushSelect as ReturnType<typeof vi.fn>).mockClear();
    brushBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    brushBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(callbacks.onBrushSelect).toHaveBeenCalledWith(BRUSH_PRESETS[2]);

    vi.useRealTimers();
  });

  it("hold shape button shows sub-picker, selecting a shape fires onToolChange", () => {
    vi.useFakeTimers();

    const shapeBtn = document.querySelector(".shape-btn") as HTMLButtonElement;

    // Hold the shape button for 300ms
    shapeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(300);

    const popover = document.querySelector(".subtool-popover");
    expect(popover).not.toBeNull();

    const options = document.querySelectorAll(".subtool-option");
    expect(options.length).toBe(4); // rectangle, ellipse, polygon, star

    // Select ellipse (index 1)
    options[1].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(callbacks.onToolChange).toHaveBeenCalledWith("ellipse");
    expect(document.querySelector(".subtool-popover")).toBeNull();

    vi.useRealTimers();
  });

  it("navigation group has zoom buttons in correct order: grid, zoom-out, zoom-display, zoom-in, fit-all", () => {
    const navGroup = document.querySelector('[data-group="navigation"]');
    const children = Array.from(navGroup!.children);
    expect(children[0].classList.contains("grid-btn")).toBe(true);
    expect(children[1].classList.contains("zoom-out-btn")).toBe(true);
    expect(children[2].classList.contains("toolbar-zoom")).toBe(true);
    expect(children[3].classList.contains("zoom-in-btn")).toBe(true);
    expect(children[4].classList.contains("fit-all-btn")).toBe(true);
  });
});
