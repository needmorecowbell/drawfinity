import { BrushConfig } from "../tools/Brush";
import { BRUSH_PRESETS } from "../tools/BrushPresets";
import { ToolType, isShapeTool, ShapeToolConfig } from "../tools/ToolManager";
import type { GridStyle } from "../user/UserPreferences";
import { BrushSizeSlider } from "./BrushSizeSlider";
import { OpacitySlider } from "./OpacitySlider";
import { ExportDialog } from "./ExportDialog";
import type { ExportDialogResult } from "./ExportDialog";
import { SubToolPicker, SubToolOption } from "./SubToolPicker";
import { ICONS } from "./ToolbarIcons";
import { Tooltip } from "./Tooltip";
import { ToolbarOverflow } from "./ToolbarOverflow";

/**
 * Callback interface for handling toolbar user interactions.
 *
 * Consumers provide implementations for these callbacks when constructing a {@link Toolbar}
 * to respond to tool selection, color changes, undo/redo actions, and other toolbar events.
 * Required callbacks must always be provided; optional callbacks (marked with `?`) are
 * invoked only when the corresponding toolbar feature is used.
 *
 * @property onBrushSelect - Called when the user selects a brush preset from the brush picker.
 * @property onColorChange - Called when the user picks a stroke color from the palette or custom input.
 * @property onToolChange - Called when the active drawing tool changes (brush, eraser, shape, pan, magnify).
 * @property onUndo - Called when the user clicks the undo button.
 * @property onRedo - Called when the user clicks the redo button.
 * @property onBrushSizeChange - Called when the user adjusts the brush size slider.
 * @property onOpacityChange - Called when the user adjusts the opacity slider.
 * @property onGridStyleChange - Called when the user changes the grid style (dots, lines, or none).
 * @property onShapeConfigChange - Called when shape tool options change (fill color, side count).
 * @property onBackgroundColorChange - Called when the user picks a new canvas background color.
 * @property onHome - Called when the user clicks the home button to return to the home screen.
 * @property onRenameDrawing - Called when the user renames the current drawing via the toolbar.
 * @property onCheatSheet - Called when the user clicks the help/keyboard shortcuts button.
 * @property onExport - Called when the user confirms an export from the export dialog.
 * @property onZoomIn - Called when the user clicks the zoom in button.
 * @property onZoomOut - Called when the user clicks the zoom out button.
 * @property onZoomReset - Called when the user clicks the zoom display to reset to 100%.
 * @property onFitAll - Called when the user clicks the fit-all button to frame all content.
 */
export interface ToolbarCallbacks {
  onBrushSelect: (brush: BrushConfig) => void;
  onColorChange: (color: string) => void;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onBrushSizeChange: (size: number) => void;
  onOpacityChange: (opacity: number) => void;
  onGridStyleChange?: (style: GridStyle) => void;
  onShapeConfigChange?: (config: Partial<ShapeToolConfig>) => void;
  onBackgroundColorChange?: (color: string) => void;
  onHome?: () => void;
  onRenameDrawing?: (name: string) => void;
  onCheatSheet?: () => void;
  onExport?: (options: ExportDialogResult) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onFitAll?: () => void;
}

const BACKGROUND_PRESET_COLORS = [
  "#FFFFFF", "#FAFAF8", "#D9D9D9", "#666666",
  "#000000", "#FFF8E7", "#E3F2FD", "#E8F5E9",
  "#FCE4EC", "#FFFDE7", "#1A237E", "#1B5E20",
  "#B71C1C", "#4A148C", "#455A64", "#795548",
];

const PRESET_COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#FF6600",
  "#FFCC00", "#33CC33", "#0066FF", "#9933FF",
  "#FF69B4", "#8B4513", "#808080", "#00CED1",
];

/** Shape tool definitions for the toolbar. */
const SHAPE_TOOLS: { type: ToolType; label: string; title: string; shortcut: string }[] = [
  { type: "rectangle", label: ICONS.rectangle, title: "Rectangle", shortcut: "R" },
  { type: "ellipse", label: ICONS.ellipse, title: "Ellipse", shortcut: "O" },
  { type: "polygon", label: ICONS.polygon, title: "Polygon", shortcut: "P" },
  { type: "star", label: ICONS.star, title: "Star", shortcut: "S" },
];

/** Toolbar group identifiers for logical organization. */
export type ToolbarGroup = "tools" | "properties" | "actions" | "navigation" | "panels";

/**
 * Main toolbar UI component that provides drawing tool selection, color picking,
 * brush settings, zoom controls, and other canvas actions.
 *
 * The toolbar renders as a fixed panel in the DOM and delegates all user interactions
 * to the provided {@link ToolbarCallbacks}. It manages sub-tool pickers (brush presets,
 * shape tools, grid styles), sliders for brush size and opacity, color swatches,
 * background color selection, shape options, zoom controls, and overflow handling
 * for narrow viewports.
 *
 * @param callbacks - Callback handlers for all toolbar interactions. See {@link ToolbarCallbacks}.
 *
 * @example
 * ```ts
 * const toolbar = new Toolbar({
 *   onBrushSelect: (brush) => toolManager.setBrush(brush),
 *   onColorChange: (color) => toolManager.setColor(color),
 *   onToolChange: (tool) => toolManager.setActiveTool(tool),
 *   onUndo: () => undoManager.undo(),
 *   onRedo: () => undoManager.redo(),
 *   onBrushSizeChange: (size) => toolManager.setBrushSize(size),
 *   onOpacityChange: (opacity) => toolManager.setOpacity(opacity),
 * });
 *
 * // Update toolbar state to reflect external changes
 * toolbar.setActiveTool("eraser");
 * toolbar.setZoomLevel(1.5);
 *
 * // Clean up when done
 * toolbar.destroy();
 * ```
 */
export class Toolbar {
  private container: HTMLElement;
  private callbacks: ToolbarCallbacks;
  private brushButton!: HTMLButtonElement;
  private shapeButton!: HTMLButtonElement;
  private panButton!: HTMLButtonElement;
  private magnifyButton!: HTMLButtonElement;
  private brushPicker!: SubToolPicker;
  private shapePicker!: SubToolPicker;
  private gridPicker!: SubToolPicker;
  private brushSizeSlider!: BrushSizeSlider;
  private brushSizeButton!: HTMLButtonElement;
  private opacitySlider!: OpacitySlider;
  private opacityButton!: HTMLButtonElement;
  private colorSwatches: HTMLButtonElement[] = [];
  private eraserButton!: HTMLButtonElement;
  private undoButton!: HTMLButtonElement;
  private redoButton!: HTMLButtonElement;
  private gridButton!: HTMLButtonElement;
  private zoomInButton!: HTMLButtonElement;
  private zoomOutButton!: HTMLButtonElement;
  private fitAllButton!: HTMLButtonElement;
  private zoomDisplay!: HTMLSpanElement;
  private customColorInput!: HTMLInputElement;
  private shapeOptionsPanel!: HTMLDivElement;
  private fillColorInput!: HTMLInputElement;
  private fillToggle!: HTMLButtonElement;
  private sidesInput!: HTMLInputElement;
  private sidesContainer!: HTMLDivElement;

  private bgSwatchButton!: HTMLButtonElement;
  private bgDropdown!: HTMLDivElement;
  private bgColorSwatches: HTMLButtonElement[] = [];
  private bgColorInput!: HTMLInputElement;

  private homeButton!: HTMLButtonElement;
  private helpButton!: HTMLButtonElement;
  private exportButton!: HTMLButtonElement;
  private exportDialog!: ExportDialog;
  private drawingNameEl!: HTMLSpanElement;
  private drawingNameInput!: HTMLInputElement;
  private drawingNameContainer!: HTMLDivElement;

  private groups: Map<ToolbarGroup, HTMLDivElement> = new Map();
  private tooltip: Tooltip;
  private overflow!: ToolbarOverflow;

  private activeBrushIndex = 0;
  private activeTool: ToolType = "brush";
  private previousTool: ToolType = "brush";
  private activeColor = "#000000";
  private gridStyle: GridStyle = "dots";
  private lastNonNoneGridStyle: GridStyle = "dots";
  private fillEnabled = false;
  private fillColor = "#0066FF";
  private activeBackgroundColor = "#FAFAF8";
  private boundBgDismiss: (e: PointerEvent) => void;

  constructor(callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks;
    this.tooltip = Tooltip.getInstance();
    this.boundBgDismiss = this.handleBgDismiss.bind(this);
    this.container = document.createElement("div");
    this.container.id = "toolbar";
    this.build();
    document.body.appendChild(this.container);
  }

  private build(): void {
    // === TOOLS GROUP: Brush (hold→presets), Eraser, Shapes (hold→types) ===
    const toolsGroup = this.createGroup("tools");

    // Brush button with hold-to-select presets
    const BRUSH_ICONS: Record<string, string> = {
      "Pen": ICONS.pen,
      "Pencil": ICONS.pencil,
      "Marker": ICONS.marker,
      "Highlighter": ICONS.highlighter,
    };
    const brushOptions: SubToolOption[] = BRUSH_PRESETS.map((preset, i) => ({
      id: String(i),
      label: BRUSH_ICONS[preset.name] ?? ICONS.brush,
      title: `${preset.name} (${i + 1})`,
    }));
    this.brushButton = document.createElement("button");
    this.brushButton.className = "toolbar-btn brush-btn active";
    this.brushPicker = new SubToolPicker({
      options: brushOptions,
      onSelect: (id) => this.selectBrush(parseInt(id, 10)),
    });
    this.brushPicker.attach(this.brushButton);
    this.tooltip.attach(this.brushButton, "Brush (B)");
    toolsGroup.appendChild(this.brushButton);

    // Eraser
    this.eraserButton = document.createElement("button");
    this.eraserButton.className = "toolbar-btn eraser-btn";
    this.tooltip.attach(this.eraserButton, "Eraser (E)");
    this.eraserButton.innerHTML = ICONS.eraser;
    this.eraserButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.setTool(this.activeTool === "eraser" ? "brush" : "eraser");
    });
    toolsGroup.appendChild(this.eraserButton);

    // Shape button with hold-to-select shape types
    const shapeOptions: SubToolOption[] = SHAPE_TOOLS.map(st => ({
      id: st.type,
      label: st.label,
      title: `${st.title} (${st.shortcut})`,
    }));
    this.shapeButton = document.createElement("button");
    this.shapeButton.className = "toolbar-btn shape-btn";
    this.shapePicker = new SubToolPicker({
      options: shapeOptions,
      onSelect: (id) => this.setTool(id as ToolType),
    });
    this.shapePicker.attach(this.shapeButton);
    this.tooltip.attach(this.shapeButton, "Shapes (hold to select)");
    toolsGroup.appendChild(this.shapeButton);

    // Pan/Zoom tool
    this.panButton = document.createElement("button");
    this.panButton.className = "toolbar-btn pan-btn";
    this.tooltip.attach(this.panButton, "Pan/Zoom (G)");
    this.panButton.innerHTML = ICONS.pan;
    this.panButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (this.activeTool === "pan") {
        this.setTool(this.previousTool);
      } else {
        this.setTool("pan");
      }
    });
    toolsGroup.appendChild(this.panButton);

    // Magnify tool
    this.magnifyButton = document.createElement("button");
    this.magnifyButton.className = "toolbar-btn magnify-btn";
    this.tooltip.attach(this.magnifyButton, "Magnify (Z)");
    this.magnifyButton.innerHTML = ICONS.magnify;
    this.magnifyButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (this.activeTool === "magnify") {
        this.setTool(this.previousTool);
      } else {
        this.setTool("magnify");
      }
    });
    toolsGroup.appendChild(this.magnifyButton);

    this.container.appendChild(toolsGroup);

    this.container.appendChild(this.createDivider());

    // === PROPERTIES GROUP: Brush size, Shape options, Color palette ===
    const propertiesGroup = this.createGroup("properties");

    // Brush size slider
    this.brushSizeButton = document.createElement("button");
    this.brushSizeButton.className = "toolbar-btn brush-size-btn";
    this.brushSizeSlider = new BrushSizeSlider({
      onChange: (size) => this.callbacks.onBrushSizeChange(size),
    });
    this.brushSizeSlider.attach(this.brushSizeButton);
    this.tooltip.attach(this.brushSizeButton, "Brush size ([ / ])");
    propertiesGroup.appendChild(this.brushSizeButton);

    // Opacity slider
    this.opacityButton = document.createElement("button");
    this.opacityButton.className = "toolbar-btn opacity-btn";
    this.opacitySlider = new OpacitySlider({
      onChange: (opacity) => this.callbacks.onOpacityChange(opacity),
    });
    this.opacitySlider.attach(this.opacityButton);
    this.tooltip.attach(this.opacityButton, "Opacity");
    propertiesGroup.appendChild(this.opacityButton);

    // Shape options panel (shown only when a shape tool is active)
    this.shapeOptionsPanel = document.createElement("div");
    this.shapeOptionsPanel.className = "toolbar-section shape-options";
    this.shapeOptionsPanel.style.display = "none";

    this.fillToggle = document.createElement("button");
    this.fillToggle.className = "toolbar-btn fill-toggle";
    this.tooltip.attach(this.fillToggle, "Toggle fill");
    this.fillToggle.innerHTML = ICONS.fillToggle;
    this.fillToggle.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.fillEnabled = !this.fillEnabled;
      this.fillToggle.classList.toggle("active", this.fillEnabled);
      this.fillColorInput.style.display = this.fillEnabled ? "" : "none";
      this.emitShapeConfig();
    });
    this.shapeOptionsPanel.appendChild(this.fillToggle);

    this.fillColorInput = document.createElement("input");
    this.fillColorInput.type = "color";
    this.fillColorInput.className = "toolbar-color-input fill-color-input";
    this.fillColorInput.value = this.fillColor;
    this.tooltip.attach(this.fillColorInput, "Fill color");
    this.fillColorInput.style.display = "none";
    this.fillColorInput.addEventListener("input", (e) => {
      this.fillColor = (e.target as HTMLInputElement).value;
      this.emitShapeConfig();
    });
    this.shapeOptionsPanel.appendChild(this.fillColorInput);

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
    this.tooltip.attach(this.sidesInput, "Number of sides");
    this.sidesInput.addEventListener("input", () => {
      const val = parseInt(this.sidesInput.value, 10);
      if (val >= 3 && val <= 32) {
        this.emitShapeConfig();
      }
    });
    this.sidesInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });
    this.sidesContainer.appendChild(this.sidesInput);
    this.shapeOptionsPanel.appendChild(this.sidesContainer);
    propertiesGroup.appendChild(this.shapeOptionsPanel);

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
      this.tooltip.attach(swatch, color);
      swatch.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.setColor(color);
      });
      colorSection.appendChild(swatch);
      this.colorSwatches.push(swatch);
    }

    this.customColorInput = document.createElement("input");
    this.customColorInput.type = "color";
    this.customColorInput.className = "toolbar-color-input";
    this.customColorInput.value = this.activeColor;
    this.tooltip.attach(this.customColorInput, "Custom color");
    this.customColorInput.addEventListener("input", (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.setColor(value);
    });
    colorSection.appendChild(this.customColorInput);
    propertiesGroup.appendChild(colorSection);

    // Background color button
    this.bgSwatchButton = document.createElement("button");
    this.bgSwatchButton.className = "toolbar-btn bg-color-btn";
    this.bgSwatchButton.style.backgroundColor = this.activeBackgroundColor;
    this.tooltip.attach(this.bgSwatchButton, "Background color");
    this.bgSwatchButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.toggleBgDropdown();
    });
    propertiesGroup.appendChild(this.bgSwatchButton);

    // Background color dropdown (hidden by default)
    this.bgDropdown = document.createElement("div");
    this.bgDropdown.className = "bg-color-dropdown";
    this.bgDropdown.style.display = "none";

    const bgPalette = document.createElement("div");
    bgPalette.className = "bg-color-palette";
    for (const color of BACKGROUND_PRESET_COLORS) {
      const swatch = document.createElement("button");
      swatch.className = "bg-color-swatch";
      swatch.style.backgroundColor = color;
      if (color === "#FFFFFF") {
        swatch.style.border = "1px solid #ccc";
      }
      if (color === this.activeBackgroundColor) swatch.classList.add("active");
      this.tooltip.attach(swatch, color);
      swatch.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.setBackgroundColor(color);
      });
      bgPalette.appendChild(swatch);
      this.bgColorSwatches.push(swatch);
    }
    this.bgDropdown.appendChild(bgPalette);

    this.bgColorInput = document.createElement("input");
    this.bgColorInput.type = "color";
    this.bgColorInput.className = "toolbar-color-input bg-custom-color-input";
    this.bgColorInput.value = this.activeBackgroundColor;
    this.tooltip.attach(this.bgColorInput, "Custom background color");
    this.bgColorInput.addEventListener("input", (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.setBackgroundColor(value);
    });
    this.bgDropdown.appendChild(this.bgColorInput);

    document.body.appendChild(this.bgDropdown);

    this.container.appendChild(propertiesGroup);

    this.container.appendChild(this.createDivider());

    // === ACTIONS GROUP: Undo, Redo ===
    const actionsGroup = this.createGroup("actions");

    this.undoButton = document.createElement("button");
    this.undoButton.className = "toolbar-btn";
    this.tooltip.attach(this.undoButton, "Undo (Ctrl+Z)");
    this.undoButton.innerHTML = ICONS.undo;
    this.undoButton.disabled = true;
    this.undoButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onUndo();
    });
    actionsGroup.appendChild(this.undoButton);

    this.redoButton = document.createElement("button");
    this.redoButton.className = "toolbar-btn";
    this.tooltip.attach(this.redoButton, "Redo (Ctrl+Shift+Z)");
    this.redoButton.innerHTML = ICONS.redo;
    this.redoButton.disabled = true;
    this.redoButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onRedo();
    });
    actionsGroup.appendChild(this.redoButton);

    // Export button
    this.exportButton = document.createElement("button");
    this.exportButton.className = "toolbar-btn export-btn";
    this.tooltip.attach(this.exportButton, "Export (Ctrl+Shift+E)");
    this.exportButton.innerHTML = ICONS.export;
    this.exportDialog = new ExportDialog({
      onExport: (options) => this.callbacks.onExport?.(options),
    });
    this.exportDialog.attach(this.exportButton);
    actionsGroup.appendChild(this.exportButton);

    this.container.appendChild(actionsGroup);

    this.container.appendChild(this.createDivider());

    // === NAVIGATION GROUP: Grid toggle, Zoom controls ===
    const navigationGroup = this.createGroup("navigation");

    this.gridButton = document.createElement("button");
    this.gridButton.className = "toolbar-btn grid-btn active";
    const gridOptions: SubToolOption[] = [
      { id: "dots", label: ICONS.gridDots, title: "Dot grid" },
      { id: "lines", label: ICONS.gridLines, title: "Line grid" },
      { id: "none", label: ICONS.gridNone, title: "No grid" },
    ];
    this.gridPicker = new SubToolPicker({
      options: gridOptions,
      onSelect: (id) => this.selectGridStyle(id as GridStyle),
    });
    this.gridPicker.attach(this.gridButton);
    this.tooltip.attach(this.gridButton, "Grid (hold to select, Ctrl+')");
    navigationGroup.appendChild(this.gridButton);

    // Zoom out
    this.zoomOutButton = document.createElement("button");
    this.zoomOutButton.className = "toolbar-btn zoom-out-btn";
    this.tooltip.attach(this.zoomOutButton, "Zoom out (Ctrl+\u2212)");
    this.zoomOutButton.innerHTML = ICONS.zoomOut;
    this.zoomOutButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onZoomOut?.();
    });
    navigationGroup.appendChild(this.zoomOutButton);

    // Zoom display (clickable → reset to 100%)
    this.zoomDisplay = document.createElement("span");
    this.zoomDisplay.className = "toolbar-zoom";
    this.zoomDisplay.textContent = "100%";
    this.tooltip.attach(this.zoomDisplay, "Reset zoom (Ctrl+0)");
    this.zoomDisplay.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onZoomReset?.();
    });
    navigationGroup.appendChild(this.zoomDisplay);

    // Zoom in
    this.zoomInButton = document.createElement("button");
    this.zoomInButton.className = "toolbar-btn zoom-in-btn";
    this.tooltip.attach(this.zoomInButton, "Zoom in (Ctrl+=)");
    this.zoomInButton.innerHTML = ICONS.zoomIn;
    this.zoomInButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onZoomIn?.();
    });
    navigationGroup.appendChild(this.zoomInButton);

    // Fit all content
    this.fitAllButton = document.createElement("button");
    this.fitAllButton.className = "toolbar-btn fit-all-btn";
    this.tooltip.attach(this.fitAllButton, "Fit all content");
    this.fitAllButton.innerHTML = ICONS.fitAll;
    this.fitAllButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onFitAll?.();
    });
    navigationGroup.appendChild(this.fitAllButton);

    this.container.appendChild(navigationGroup);

    this.container.appendChild(this.createDivider());

    // === PANELS GROUP: Home, Drawing name, Help ===
    const panelsGroup = this.createGroup("panels");

    this.homeButton = document.createElement("button");
    this.homeButton.className = "toolbar-btn home-btn";
    this.tooltip.attach(this.homeButton, "Home (Ctrl+W)");
    this.homeButton.innerHTML = ICONS.home;
    this.homeButton.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onHome?.();
    });
    panelsGroup.appendChild(this.homeButton);

    // Drawing name (editable)
    this.drawingNameContainer = document.createElement("div");
    this.drawingNameContainer.className = "toolbar-drawing-name";

    this.drawingNameEl = document.createElement("span");
    this.drawingNameEl.className = "drawing-name-display";
    this.drawingNameEl.textContent = "";
    this.tooltip.attach(this.drawingNameEl, "Click to rename");
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
    panelsGroup.appendChild(this.drawingNameContainer);

    // Help button (cheat sheet)
    this.helpButton = document.createElement("button");
    this.helpButton.className = "toolbar-btn help-btn";
    this.tooltip.attach(this.helpButton, "Keyboard shortcuts (Ctrl+?)");
    this.helpButton.innerHTML = ICONS.help;
    this.helpButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.callbacks.onCheatSheet?.();
    });
    panelsGroup.appendChild(this.helpButton);

    this.container.appendChild(panelsGroup);

    // === OVERFLOW: responsive collapse of less-used groups ===
    this.overflow = new ToolbarOverflow({
      container: this.container,
      groups: this.groups,
    });
  }

  private createGroup(name: ToolbarGroup): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "toolbar-group";
    group.dataset.group = name;
    this.groups.set(name, group);
    return group;
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

  /** Get a toolbar group element for external components to append to. */
  getGroup(name: ToolbarGroup): HTMLDivElement | undefined {
    return this.groups.get(name);
  }

  selectBrush(index: number): void {
    if (index < 0 || index >= BRUSH_PRESETS.length) return;
    this.activeBrushIndex = index;
    this.brushPicker.setLastUsedId(String(index));
    this.setToolUI("brush");
    this.callbacks.onBrushSelect(BRUSH_PRESETS[index]);
  }

  setTool(tool: ToolType): void {
    this.setToolUI(tool);
    this.callbacks.onToolChange(tool);
  }

  /** Update UI only (called from external keyboard shortcuts). */
  setToolUI(tool: ToolType): void {
    if (this.activeTool !== "pan" && this.activeTool !== "magnify" && tool !== this.activeTool) {
      this.previousTool = this.activeTool;
    }
    this.activeTool = tool;
    this.eraserButton.classList.toggle("active", tool === "eraser");
    this.brushButton.classList.toggle("active", tool === "brush");
    this.panButton.classList.toggle("active", tool === "pan");
    this.magnifyButton.classList.toggle("active", tool === "magnify");
    const shapeActive = isShapeTool(tool);
    this.shapeButton.classList.toggle("active", shapeActive);
    if (shapeActive) {
      this.shapePicker.setLastUsedId(tool);
    }
    this.shapeOptionsPanel.style.display = shapeActive ? "" : "none";
    if (shapeActive) {
      this.sidesContainer.style.display =
        (tool === "polygon" || tool === "star") ? "" : "none";
    }
  }

  /** Get the tool that was active before pan mode. */
  getPreviousTool(): ToolType {
    return this.previousTool;
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

  private setBackgroundColor(color: string): void {
    this.activeBackgroundColor = color;
    this.bgSwatchButton.style.backgroundColor = color;
    this.bgColorInput.value = color;
    for (const swatch of this.bgColorSwatches) {
      swatch.classList.toggle("active",
        swatch.style.backgroundColor === this.colorToRgb(color));
    }
    this.callbacks.onBackgroundColorChange?.(color);
    this.closeBgDropdown();
  }

  /** Update background color UI only (called from external changes). */
  setBackgroundColorUI(color: string): void {
    this.activeBackgroundColor = color;
    this.bgSwatchButton.style.backgroundColor = color;
    this.bgColorInput.value = color;
    for (const swatch of this.bgColorSwatches) {
      swatch.classList.toggle("active",
        swatch.style.backgroundColor === this.colorToRgb(color));
    }
  }

  private toggleBgDropdown(): void {
    if (this.bgDropdown.style.display === "none") {
      const rect = this.bgSwatchButton.getBoundingClientRect();
      this.bgDropdown.style.top = `${rect.bottom + 4}px`;
      this.bgDropdown.style.left = `${rect.left}px`;
      this.bgDropdown.style.display = "";
      requestAnimationFrame(() => {
        document.addEventListener("pointerdown", this.boundBgDismiss);
      });
    } else {
      this.closeBgDropdown();
    }
  }

  private closeBgDropdown(): void {
    this.bgDropdown.style.display = "none";
    document.removeEventListener("pointerdown", this.boundBgDismiss);
  }

  private handleBgDismiss(e: PointerEvent): void {
    if (!this.bgDropdown.contains(e.target as Node) &&
        !this.bgSwatchButton.contains(e.target as Node)) {
      this.closeBgDropdown();
    }
  }

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
    this.tooltip.attach(this.drawingNameEl, `${name} — click to rename`);
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
      this.tooltip.attach(this.drawingNameEl, `${newName} — click to rename`);
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

  /** Handle grid style selection from SubToolPicker (quick-click or popover). */
  private selectGridStyle(style: GridStyle): void {
    if (style === this.gridStyle) {
      // Quick-click on active style → toggle to "none"
      this.gridStyle = "none";
      this.gridPicker.setLastUsedId(this.lastNonNoneGridStyle);
    } else if (style === "none") {
      // Explicit "none" pick from popover
      this.gridStyle = "none";
      this.gridPicker.setLastUsedId(this.lastNonNoneGridStyle);
    } else {
      // Activate a grid style
      this.gridStyle = style;
      this.lastNonNoneGridStyle = style;
    }
    this.gridButton.classList.toggle("active", this.gridStyle !== "none");
    this.callbacks.onGridStyleChange?.(this.gridStyle);
  }

  /** Update grid style UI state (called from external changes). */
  setGridStyle(style: GridStyle): void {
    this.gridStyle = style;
    if (style !== "none") this.lastNonNoneGridStyle = style;
    this.gridButton.classList.toggle("active", style !== "none");
    this.gridPicker.setLastUsedId(style === "none" ? this.lastNonNoneGridStyle : style);
  }

  /** Get the current grid style. */
  getGridStyle(): GridStyle {
    return this.gridStyle;
  }

  /** Update the brush size display (called from external changes like keyboard shortcuts). */
  setBrushSize(size: number): void {
    this.brushSizeSlider.setSize(size);
  }

  /** Update the opacity display (called from external changes). */
  setOpacity(opacity: number): void {
    this.opacitySlider.setOpacity(opacity);
  }

  /** Get the BrushSizeSlider (for testing or external use). */
  getBrushSizeSlider(): BrushSizeSlider {
    return this.brushSizeSlider;
  }

  /** Get the OpacitySlider (for testing or external use). */
  getOpacitySlider(): OpacitySlider {
    return this.opacitySlider;
  }

  /** Get the brush SubToolPicker (for testing or external use). */
  getBrushPicker(): SubToolPicker {
    return this.brushPicker;
  }

  /** Get the shape SubToolPicker (for testing or external use). */
  getShapePicker(): SubToolPicker {
    return this.shapePicker;
  }

  /** Get the grid SubToolPicker (for testing or external use). */
  getGridPicker(): SubToolPicker {
    return this.gridPicker;
  }

  /** Get the last non-none grid style (for toggle restoration). */
  getLastNonNoneGridStyle(): GridStyle {
    return this.lastNonNoneGridStyle;
  }

  /** Get the ExportDialog (for testing or external use). */
  getExportDialog(): ExportDialog {
    return this.exportDialog;
  }

  /** Get the Tooltip instance (for testing). */
  getTooltip(): Tooltip {
    return this.tooltip;
  }

  /** Get the ToolbarOverflow instance (for testing). */
  getOverflow(): ToolbarOverflow {
    return this.overflow;
  }

  destroy(): void {
    this.overflow.destroy();
    this.brushPicker.destroy();
    this.shapePicker.destroy();
    this.gridPicker.destroy();
    this.brushSizeSlider.destroy();
    this.opacitySlider.destroy();
    this.exportDialog.destroy();
    this.tooltip.destroy();
    this.closeBgDropdown();
    this.bgDropdown.remove();
    this.container.remove();
  }
}
