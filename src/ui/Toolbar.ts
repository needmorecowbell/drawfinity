import { BrushConfig } from "../tools/Brush";
import { BRUSH_PRESETS } from "../tools/BrushPresets";
import { ToolType, isShapeTool, ShapeToolConfig } from "../tools/ToolManager";

export interface ToolbarCallbacks {
  onBrushSelect: (brush: BrushConfig) => void;
  onColorChange: (color: string) => void;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onBrushSizeChange: (delta: number) => void;
  onShapeConfigChange?: (config: Partial<ShapeToolConfig>) => void;
  onHome?: () => void;
  onRenameDrawing?: (name: string) => void;
  onCheatSheet?: () => void;
}

const PRESET_COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#FF6600",
  "#FFCC00", "#33CC33", "#0066FF", "#9933FF",
  "#FF69B4", "#8B4513", "#808080", "#00CED1",
];

/** Shape tool definitions for the toolbar. */
const SHAPE_TOOLS: { type: ToolType; label: string; title: string; shortcut: string }[] = [
  { type: "rectangle", label: "\u25AD", title: "Rectangle", shortcut: "R" },
  { type: "ellipse", label: "\u25CB", title: "Ellipse", shortcut: "O" },
  { type: "polygon", label: "\u2B53", title: "Polygon", shortcut: "P" },
  { type: "star", label: "\u2606", title: "Star", shortcut: "S" },
];

export class Toolbar {
  private container: HTMLElement;
  private callbacks: ToolbarCallbacks;
  private brushButtons: HTMLButtonElement[] = [];
  private shapeButtons: HTMLButtonElement[] = [];
  private colorSwatches: HTMLButtonElement[] = [];
  private eraserButton!: HTMLButtonElement;
  private undoButton!: HTMLButtonElement;
  private redoButton!: HTMLButtonElement;
  private zoomDisplay!: HTMLSpanElement;
  private customColorInput!: HTMLInputElement;
  private shapeOptionsPanel!: HTMLDivElement;
  private fillColorInput!: HTMLInputElement;
  private fillToggle!: HTMLButtonElement;
  private sidesInput!: HTMLInputElement;
  private sidesContainer!: HTMLDivElement;

  private homeButton!: HTMLButtonElement;
  private helpButton!: HTMLButtonElement;
  private drawingNameEl!: HTMLSpanElement;
  private drawingNameInput!: HTMLInputElement;
  private drawingNameContainer!: HTMLDivElement;

  private activeBrushIndex = 0;
  private activeTool: ToolType = "brush";
  private activeColor = "#000000";
  private fillEnabled = false;
  private fillColor = "#0066FF";

  constructor(callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement("div");
    this.container.id = "toolbar";
    this.build();
    document.body.appendChild(this.container);
  }

  private build(): void {
    // Home button
    this.homeButton = document.createElement("button");
    this.homeButton.className = "toolbar-btn home-btn";
    this.homeButton.title = "Home (Ctrl+W)";
    this.homeButton.textContent = "\u2302"; // ⌂
    this.homeButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onHome?.();
    });
    this.container.appendChild(this.homeButton);

    // Drawing name (editable)
    this.drawingNameContainer = document.createElement("div");
    this.drawingNameContainer.className = "toolbar-drawing-name";

    this.drawingNameEl = document.createElement("span");
    this.drawingNameEl.className = "drawing-name-display";
    this.drawingNameEl.textContent = "";
    this.drawingNameEl.title = "Click to rename";
    this.drawingNameEl.addEventListener("click", () => this.startRename());

    this.drawingNameInput = document.createElement("input");
    this.drawingNameInput.type = "text";
    this.drawingNameInput.className = "drawing-name-input";
    this.drawingNameInput.style.display = "none";
    this.drawingNameInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        this.commitRename();
      } else if (e.key === "Escape") {
        this.cancelRename();
      }
    });
    this.drawingNameInput.addEventListener("blur", () => this.commitRename());

    this.drawingNameContainer.appendChild(this.drawingNameEl);
    this.drawingNameContainer.appendChild(this.drawingNameInput);
    this.container.appendChild(this.drawingNameContainer);

    // Divider after nav section
    this.container.appendChild(this.createDivider());

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

    // Shape tool buttons
    const shapeSection = this.createSection("toolbar-section");
    for (const shapeTool of SHAPE_TOOLS) {
      const btn = document.createElement("button");
      btn.className = "toolbar-btn shape-btn";
      btn.title = `${shapeTool.title} (${shapeTool.shortcut})`;
      btn.textContent = shapeTool.label;
      btn.dataset.shape = shapeTool.type;
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.setTool(shapeTool.type);
      });
      shapeSection.appendChild(btn);
      this.shapeButtons.push(btn);
    }
    this.container.appendChild(shapeSection);

    // Shape options panel (shown only when a shape tool is active)
    this.shapeOptionsPanel = document.createElement("div");
    this.shapeOptionsPanel.className = "toolbar-section shape-options";
    this.shapeOptionsPanel.style.display = "none";

    // Fill toggle button
    this.fillToggle = document.createElement("button");
    this.fillToggle.className = "toolbar-btn fill-toggle";
    this.fillToggle.title = "Toggle fill";
    this.fillToggle.textContent = "\u25A7"; // ▧ (partial fill icon)
    this.fillToggle.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.fillEnabled = !this.fillEnabled;
      this.fillToggle.classList.toggle("active", this.fillEnabled);
      this.fillColorInput.style.display = this.fillEnabled ? "" : "none";
      this.emitShapeConfig();
    });
    this.shapeOptionsPanel.appendChild(this.fillToggle);

    // Fill color input
    this.fillColorInput = document.createElement("input");
    this.fillColorInput.type = "color";
    this.fillColorInput.className = "toolbar-color-input fill-color-input";
    this.fillColorInput.value = this.fillColor;
    this.fillColorInput.title = "Fill color";
    this.fillColorInput.style.display = "none";
    this.fillColorInput.addEventListener("input", (e) => {
      this.fillColor = (e.target as HTMLInputElement).value;
      this.emitShapeConfig();
    });
    this.shapeOptionsPanel.appendChild(this.fillColorInput);

    // Sides spinner (for polygon/star)
    this.sidesContainer = document.createElement("div");
    this.sidesContainer.className = "sides-container";
    this.sidesContainer.style.display = "none";
    const sidesLabel = document.createElement("span");
    sidesLabel.className = "sides-label";
    sidesLabel.textContent = "Sides";
    this.sidesContainer.appendChild(sidesLabel);
    this.sidesInput = document.createElement("input");
    this.sidesInput.type = "number";
    this.sidesInput.className = "sides-input";
    this.sidesInput.min = "3";
    this.sidesInput.max = "32";
    this.sidesInput.value = "5";
    this.sidesInput.title = "Number of sides";
    this.sidesInput.addEventListener("input", () => {
      const val = parseInt(this.sidesInput.value, 10);
      if (val >= 3 && val <= 32) {
        this.emitShapeConfig();
      }
    });
    // Prevent keyboard shortcuts from firing while typing in the input
    this.sidesInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });
    this.sidesContainer.appendChild(this.sidesInput);
    this.shapeOptionsPanel.appendChild(this.sidesContainer);

    this.container.appendChild(this.shapeOptionsPanel);

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

    // Divider
    this.container.appendChild(this.createDivider());

    // Help button (cheat sheet)
    this.helpButton = document.createElement("button");
    this.helpButton.className = "toolbar-btn help-btn";
    this.helpButton.title = "Keyboard shortcuts (Ctrl+?)";
    this.helpButton.textContent = "?";
    this.helpButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onCheatSheet?.();
    });
    this.container.appendChild(this.helpButton);
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
    for (const btn of this.shapeButtons) {
      btn.classList.toggle("active", btn.dataset.shape === tool);
    }
    // Show/hide shape options panel
    const shapeActive = isShapeTool(tool);
    this.shapeOptionsPanel.style.display = shapeActive ? "" : "none";
    if (shapeActive) {
      // Show sides spinner only for polygon and star
      this.sidesContainer.style.display =
        (tool === "polygon" || tool === "star") ? "" : "none";
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

  /** Notify the host about shape config changes. */
  private emitShapeConfig(): void {
    const sides = parseInt(this.sidesInput.value, 10);
    this.callbacks.onShapeConfigChange?.({
      fillColor: this.fillEnabled ? this.fillColor : null,
      sides: isNaN(sides) ? 5 : Math.max(3, Math.min(32, sides)),
    });
  }

  /** Update shape options UI from external state. */
  setShapeConfig(config: ShapeToolConfig): void {
    this.fillEnabled = config.fillColor !== null;
    this.fillToggle.classList.toggle("active", this.fillEnabled);
    if (config.fillColor !== null) {
      this.fillColor = config.fillColor;
      this.fillColorInput.value = config.fillColor;
    }
    this.fillColorInput.style.display = this.fillEnabled ? "" : "none";
    this.sidesInput.value = String(config.sides);
  }

  setDrawingName(name: string): void {
    this.drawingNameEl.textContent = name;
    this.drawingNameEl.title = `${name} — click to rename`;
  }

  private startRename(): void {
    this.drawingNameInput.value = this.drawingNameEl.textContent || "";
    this.drawingNameEl.style.display = "none";
    this.drawingNameInput.style.display = "";
    this.drawingNameInput.focus();
    this.drawingNameInput.select();
  }

  private commitRename(): void {
    if (this.drawingNameInput.style.display === "none") return;
    const newName = this.drawingNameInput.value.trim();
    this.drawingNameInput.style.display = "none";
    this.drawingNameEl.style.display = "";
    if (newName && newName !== this.drawingNameEl.textContent) {
      this.drawingNameEl.textContent = newName;
      this.drawingNameEl.title = `${newName} — click to rename`;
      this.callbacks.onRenameDrawing?.(newName);
    }
  }

  private cancelRename(): void {
    this.drawingNameInput.style.display = "none";
    this.drawingNameEl.style.display = "";
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
