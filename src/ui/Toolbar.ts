import { BrushConfig } from "../tools/Brush";
import { BRUSH_PRESETS } from "../tools/BrushPresets";
import { ToolType } from "../tools/ToolManager";

export interface ToolbarCallbacks {
  onBrushSelect: (brush: BrushConfig) => void;
  onColorChange: (color: string) => void;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onBrushSizeChange: (delta: number) => void;
}

const PRESET_COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#FF6600",
  "#FFCC00", "#33CC33", "#0066FF", "#9933FF",
  "#FF69B4", "#8B4513", "#808080", "#00CED1",
];

export class Toolbar {
  private container: HTMLElement;
  private callbacks: ToolbarCallbacks;
  private brushButtons: HTMLButtonElement[] = [];
  private colorSwatches: HTMLButtonElement[] = [];
  private eraserButton!: HTMLButtonElement;
  private undoButton!: HTMLButtonElement;
  private redoButton!: HTMLButtonElement;
  private zoomDisplay!: HTMLSpanElement;
  private customColorInput!: HTMLInputElement;

  private activeBrushIndex = 0;
  private activeTool: ToolType = "brush";
  private activeColor = "#000000";

  constructor(callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement("div");
    this.container.id = "toolbar";
    this.build();
    document.body.appendChild(this.container);
  }

  private build(): void {
    // Brush presets section
    const brushSection = this.createSection("toolbar-section");
    for (let i = 0; i < BRUSH_PRESETS.length; i++) {
      const preset = BRUSH_PRESETS[i];
      const btn = document.createElement("button");
      btn.className = "toolbar-btn brush-btn";
      btn.title = `${preset.name} (${i + 1})`;
      btn.textContent = preset.name[0]; // First letter as icon
      btn.dataset.index = String(i);
      if (i === 0) btn.classList.add("active");
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.selectBrush(i);
      });
      brushSection.appendChild(btn);
      this.brushButtons.push(btn);
    }
    this.container.appendChild(brushSection);

    // Eraser button
    const toolSection = this.createSection("toolbar-section");
    this.eraserButton = document.createElement("button");
    this.eraserButton.className = "toolbar-btn eraser-btn";
    this.eraserButton.title = "Eraser (E)";
    this.eraserButton.textContent = "\u2718"; // ✘
    this.eraserButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.setTool(this.activeTool === "eraser" ? "brush" : "eraser");
    });
    toolSection.appendChild(this.eraserButton);
    this.container.appendChild(toolSection);

    // Divider
    this.container.appendChild(this.createDivider());

    // Color palette
    const colorSection = this.createSection("toolbar-section toolbar-colors");
    for (const color of PRESET_COLORS) {
      const swatch = document.createElement("button");
      swatch.className = "toolbar-swatch";
      swatch.style.backgroundColor = color;
      if (color === "#FFFFFF") {
        swatch.style.border = "1px solid #ccc";
      }
      if (color === this.activeColor) swatch.classList.add("active");
      swatch.title = color;
      swatch.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.setColor(color);
      });
      colorSection.appendChild(swatch);
      this.colorSwatches.push(swatch);
    }

    // Custom color input
    this.customColorInput = document.createElement("input");
    this.customColorInput.type = "color";
    this.customColorInput.className = "toolbar-color-input";
    this.customColorInput.value = this.activeColor;
    this.customColorInput.title = "Custom color";
    this.customColorInput.addEventListener("input", (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.setColor(value);
    });
    colorSection.appendChild(this.customColorInput);
    this.container.appendChild(colorSection);

    // Divider
    this.container.appendChild(this.createDivider());

    // Undo/Redo + Zoom
    const actionSection = this.createSection("toolbar-section");
    this.undoButton = document.createElement("button");
    this.undoButton.className = "toolbar-btn";
    this.undoButton.title = "Undo (Ctrl+Z)";
    this.undoButton.textContent = "\u21B6"; // ↶
    this.undoButton.disabled = true;
    this.undoButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onUndo();
    });
    actionSection.appendChild(this.undoButton);

    this.redoButton = document.createElement("button");
    this.redoButton.className = "toolbar-btn";
    this.redoButton.title = "Redo (Ctrl+Shift+Z)";
    this.redoButton.textContent = "\u21B7"; // ↷
    this.redoButton.disabled = true;
    this.redoButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onRedo();
    });
    actionSection.appendChild(this.redoButton);

    this.zoomDisplay = document.createElement("span");
    this.zoomDisplay.className = "toolbar-zoom";
    this.zoomDisplay.textContent = "100%";
    actionSection.appendChild(this.zoomDisplay);

    this.container.appendChild(actionSection);
  }

  private createSection(className: string): HTMLDivElement {
    const section = document.createElement("div");
    section.className = className;
    return section;
  }

  private createDivider(): HTMLDivElement {
    const div = document.createElement("div");
    div.className = "toolbar-divider";
    return div;
  }

  selectBrush(index: number): void {
    if (index < 0 || index >= BRUSH_PRESETS.length) return;
    this.activeBrushIndex = index;
    for (const btn of this.brushButtons) {
      btn.classList.toggle("active", btn.dataset.index === String(index));
    }
    // Switch to brush tool when selecting a brush
    this.setToolUI("brush");
    this.callbacks.onBrushSelect(BRUSH_PRESETS[index]);
  }

  setTool(tool: ToolType): void {
    this.setToolUI(tool);
    this.callbacks.onToolChange(tool);
  }

  /** Update UI only (called from external keyboard shortcuts). */
  setToolUI(tool: ToolType): void {
    this.activeTool = tool;
    this.eraserButton.classList.toggle("active", tool === "eraser");
    for (const btn of this.brushButtons) {
      btn.classList.toggle("active",
        tool === "brush" && btn.dataset.index === String(this.activeBrushIndex));
    }
  }

  setColor(color: string): void {
    this.activeColor = color;
    this.customColorInput.value = color;
    for (const swatch of this.colorSwatches) {
      swatch.classList.toggle("active",
        swatch.style.backgroundColor === this.colorToRgb(color));
    }
    this.callbacks.onColorChange(color);
  }

  /** Update color UI only (called from external changes). */
  setColorUI(color: string): void {
    this.activeColor = color;
    this.customColorInput.value = color;
    for (const swatch of this.colorSwatches) {
      swatch.classList.toggle("active",
        swatch.style.backgroundColor === this.colorToRgb(color));
    }
  }

  updateUndoRedo(canUndo: boolean, canRedo: boolean): void {
    this.undoButton.disabled = !canUndo;
    this.redoButton.disabled = !canRedo;
  }

  updateZoom(zoomPercent: number): void {
    this.zoomDisplay.textContent = `${Math.round(zoomPercent)}%`;
  }

  getActiveBrushIndex(): number {
    return this.activeBrushIndex;
  }

  private colorToRgb(hex: string): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  destroy(): void {
    this.container.remove();
  }
}
