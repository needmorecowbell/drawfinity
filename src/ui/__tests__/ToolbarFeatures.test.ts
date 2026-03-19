// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Toolbar, ToolbarCallbacks } from "../Toolbar";
import { Tooltip } from "../Tooltip";

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
    onBackgroundColorChange: vi.fn(),
    onGridStyleChange: vi.fn(),
    onHome: vi.fn(),
    onRenameDrawing: vi.fn(),
  };
}

describe("Toolbar feature integration tests", () => {
  let toolbar: Toolbar;
  let callbacks: ToolbarCallbacks;

  beforeEach(() => {
    Tooltip.resetInstance();
    callbacks = makeCallbacks();
    toolbar = new Toolbar(callbacks);
  });

  afterEach(() => {
    toolbar.destroy();
    Tooltip.resetInstance();
  });

  // === Tool switching from pan mode ===
  describe("tool switching from pan mode", () => {
    it("can switch from pan to eraser via toolbar button", () => {
      // Switch to pan
      const panBtn = document.querySelector(".pan-btn") as HTMLButtonElement;
      panBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(callbacks.onToolChange).toHaveBeenCalledWith("pan");

      // Switch to eraser
      const eraserBtn = document.querySelector(".eraser-btn") as HTMLButtonElement;
      eraserBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(callbacks.onToolChange).toHaveBeenCalledWith("eraser");
      expect(eraserBtn.classList.contains("active")).toBe(true);
      expect(panBtn.classList.contains("active")).toBe(false);
    });

    it("can switch from pan to brush via SubToolPicker quick click", () => {
      // Switch to pan
      const panBtn = document.querySelector(".pan-btn") as HTMLButtonElement;
      panBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Quick click brush button (pointerdown + pointerup)
      const brushBtn = document.querySelector(".brush-btn") as HTMLButtonElement;
      brushBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      brushBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(callbacks.onBrushSelect).toHaveBeenCalled();
      expect(brushBtn.classList.contains("active")).toBe(true);
      expect(panBtn.classList.contains("active")).toBe(false);
    });

    it("can switch from pan to shape via SubToolPicker quick click", () => {
      // Switch to pan
      const panBtn = document.querySelector(".pan-btn") as HTMLButtonElement;
      panBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Quick click shape button
      const shapeBtn = document.querySelector(".shape-btn") as HTMLButtonElement;
      shapeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      shapeBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(callbacks.onToolChange).toHaveBeenCalledWith("rectangle");
      expect(shapeBtn.classList.contains("active")).toBe(true);
      expect(panBtn.classList.contains("active")).toBe(false);
    });

    it("pan button toggles back to previous tool", () => {
      // First select eraser
      const eraserBtn = document.querySelector(".eraser-btn") as HTMLButtonElement;
      eraserBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Switch to pan
      const panBtn = document.querySelector(".pan-btn") as HTMLButtonElement;
      panBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(panBtn.classList.contains("active")).toBe(true);

      // Click pan again — should return to eraser
      panBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(callbacks.onToolChange).toHaveBeenCalledWith("eraser");
      expect(panBtn.classList.contains("active")).toBe(false);
      expect(eraserBtn.classList.contains("active")).toBe(true);
    });
  });

  // === Background color ===
  describe("background color", () => {
    it("renders background color button in properties group", () => {
      const bgBtn = document.querySelector(".bg-color-btn");
      expect(bgBtn).not.toBeNull();
    });

    it("clicking bg color button opens dropdown", () => {
      const bgBtn = document.querySelector(".bg-color-btn") as HTMLButtonElement;
      bgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const dropdown = document.querySelector(".bg-color-dropdown") as HTMLElement;
      expect(dropdown).not.toBeNull();
      expect(dropdown.style.display).not.toBe("none");
    });

    it("clicking bg color button again closes dropdown", () => {
      const bgBtn = document.querySelector(".bg-color-btn") as HTMLButtonElement;
      bgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      bgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const dropdown = document.querySelector(".bg-color-dropdown") as HTMLElement;
      expect(dropdown.style.display).toBe("none");
    });

    it("clicking a bg swatch fires onBackgroundColorChange", () => {
      // Open dropdown
      const bgBtn = document.querySelector(".bg-color-btn") as HTMLButtonElement;
      bgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Click the first swatch
      const swatches = document.querySelectorAll(".bg-color-swatch");
      expect(swatches.length).toBeGreaterThan(0);
      (swatches[0] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );

      expect(callbacks.onBackgroundColorChange).toHaveBeenCalled();
    });

    it("clicking bg swatch closes the dropdown", () => {
      const bgBtn = document.querySelector(".bg-color-btn") as HTMLButtonElement;
      bgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const swatches = document.querySelectorAll(".bg-color-swatch");
      (swatches[0] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );

      const dropdown = document.querySelector(".bg-color-dropdown") as HTMLElement;
      expect(dropdown.style.display).toBe("none");
    });

    it("setBackgroundColorUI updates button color without firing callback", () => {
      toolbar.setBackgroundColorUI("#FF0000");
      const bgBtn = document.querySelector(".bg-color-btn") as HTMLButtonElement;
      expect(bgBtn.style.backgroundColor).toBe("rgb(255, 0, 0)");
      expect(callbacks.onBackgroundColorChange).not.toHaveBeenCalled();
    });

    it("click outside dropdown dismisses it", async () => {
      const bgBtn = document.querySelector(".bg-color-btn") as HTMLButtonElement;
      bgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const dropdown = document.querySelector(".bg-color-dropdown") as HTMLElement;
      expect(dropdown.style.display).not.toBe("none");

      // Wait for requestAnimationFrame to register the dismiss handler
      await new Promise(resolve => setTimeout(resolve, 50));

      // Click outside
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(dropdown.style.display).toBe("none");
    });
  });

  // === Grid style (SubToolPicker) ===
  describe("grid style", () => {
    it("grid button starts active (dots style)", () => {
      const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;
      expect(gridBtn.classList.contains("active")).toBe(true);
      expect(toolbar.getGridStyle()).toBe("dots");
    });

    it("quick-clicking grid button toggles to none and back", () => {
      const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;

      // Quick click (pointerdown + pointerup) → should go to "none"
      gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      gridBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      expect(toolbar.getGridStyle()).toBe("none");
      expect(gridBtn.classList.contains("active")).toBe(false);
      expect(callbacks.onGridStyleChange).toHaveBeenCalledWith("none");

      // Quick click again → should go back to "dots"
      gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      gridBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      expect(toolbar.getGridStyle()).toBe("dots");
      expect(gridBtn.classList.contains("active")).toBe(true);
      expect(callbacks.onGridStyleChange).toHaveBeenCalledWith("dots");
    });

    it("setGridStyle('lines') shows active and toggles correctly via quick click", () => {
      toolbar.setGridStyle("lines");
      const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;
      expect(gridBtn.classList.contains("active")).toBe(true);
      expect(toolbar.getGridStyle()).toBe("lines");

      // Toggle off
      gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      gridBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      expect(toolbar.getGridStyle()).toBe("none");

      // Toggle back on — should restore "lines" not "dots"
      gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      gridBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      expect(toolbar.getGridStyle()).toBe("lines");
    });

    it("setGridStyle('none') shows inactive button", () => {
      toolbar.setGridStyle("none");
      const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;
      expect(gridBtn.classList.contains("active")).toBe(false);
    });

    it("hold grid button shows popover with dots, lines, none options", () => {
      vi.useFakeTimers();
      const gridBtn = document.querySelector(".grid-btn") as HTMLButtonElement;

      gridBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      vi.advanceTimersByTime(300);

      const options = document.querySelectorAll(".subtool-option");
      expect(options.length).toBe(3);
      expect(options[0].getAttribute("title")).toBe("Dot grid");
      expect(options[1].getAttribute("title")).toBe("Line grid");
      expect(options[2].getAttribute("title")).toBe("No grid");

      toolbar.getGridPicker().hidePopover();
      vi.useRealTimers();
    });

    it("getLastNonNoneGridStyle returns last active grid style", () => {
      expect(toolbar.getLastNonNoneGridStyle()).toBe("dots");
      toolbar.setGridStyle("lines");
      expect(toolbar.getLastNonNoneGridStyle()).toBe("lines");
      toolbar.setGridStyle("none");
      expect(toolbar.getLastNonNoneGridStyle()).toBe("lines");
    });
  });

  // === Brush size display ===
  describe("brush size display", () => {
    it("setBrushSize updates button text", () => {
      toolbar.setBrushSize(8);
      const sizeBtn = document.querySelector(".brush-size-btn") as HTMLButtonElement;
      expect(sizeBtn.textContent).toBe("8");
    });

    it("setBrushSize with fractional value shows decimal", () => {
      toolbar.setBrushSize(3.5);
      const sizeBtn = document.querySelector(".brush-size-btn") as HTMLButtonElement;
      expect(sizeBtn.textContent).toBe("3.5");
    });
  });

  // === Color selection ===
  describe("color selection", () => {
    it("clicking a color swatch fires onColorChange", () => {
      const swatches = document.querySelectorAll(".toolbar-swatch");
      expect(swatches.length).toBeGreaterThan(0);

      // Click the third swatch (red)
      (swatches[2] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(callbacks.onColorChange).toHaveBeenCalled();
    });

    it("setColorUI updates swatches without firing callback", () => {
      toolbar.setColorUI("#FF0000");
      expect(callbacks.onColorChange).not.toHaveBeenCalled();
    });
  });

  // === Eraser toggle ===
  describe("eraser toggle", () => {
    it("clicking eraser when active returns to brush", () => {
      const eraserBtn = document.querySelector(".eraser-btn") as HTMLButtonElement;

      // First click — activate eraser
      eraserBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(callbacks.onToolChange).toHaveBeenCalledWith("eraser");
      expect(eraserBtn.classList.contains("active")).toBe(true);

      // Second click — back to brush
      eraserBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(callbacks.onToolChange).toHaveBeenCalledWith("brush");
      expect(eraserBtn.classList.contains("active")).toBe(false);
    });
  });

  // === Undo/Redo ===
  describe("undo/redo", () => {
    it("undo button starts disabled", () => {
      const actionsGroup = document.querySelector('[data-group="actions"]');
      const buttons = actionsGroup!.querySelectorAll(".toolbar-btn") as NodeListOf<HTMLButtonElement>;
      const undoBtn = buttons[0];
      expect(undoBtn).not.toBeNull();
      expect(undoBtn.innerHTML).toContain("<svg");
      expect(undoBtn.disabled).toBe(true);
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
  });

  // === Zoom display ===
  describe("zoom display", () => {
    it("updateZoom updates the zoom display text", () => {
      toolbar.updateZoom(150);
      const zoomDisplay = document.querySelector(".toolbar-zoom") as HTMLSpanElement;
      expect(zoomDisplay.textContent).toBe("150%");
    });

    it("updateZoom rounds to nearest integer", () => {
      toolbar.updateZoom(99.7);
      const zoomDisplay = document.querySelector(".toolbar-zoom") as HTMLSpanElement;
      expect(zoomDisplay.textContent).toBe("100%");
    });
  });

  // === Shape options ===
  describe("shape options", () => {
    it("shape options panel is hidden when no shape tool is active", () => {
      const panel = document.querySelector(".shape-options") as HTMLElement;
      expect(panel.style.display).toBe("none");
    });

    it("shape options panel shows when shape tool is selected", () => {
      toolbar.setToolUI("rectangle");
      const panel = document.querySelector(".shape-options") as HTMLElement;
      expect(panel.style.display).not.toBe("none");
    });

    it("sides container shows for polygon and star tools", () => {
      toolbar.setToolUI("polygon");
      const sides = document.querySelector(".sides-container") as HTMLElement;
      expect(sides.style.display).not.toBe("none");

      toolbar.setToolUI("rectangle");
      expect(sides.style.display).toBe("none");

      toolbar.setToolUI("star");
      expect(sides.style.display).not.toBe("none");
    });

    it("switching back to brush hides shape options", () => {
      toolbar.setToolUI("rectangle");
      const panel = document.querySelector(".shape-options") as HTMLElement;
      expect(panel.style.display).not.toBe("none");

      toolbar.setToolUI("brush");
      expect(panel.style.display).toBe("none");
    });
  });
});
