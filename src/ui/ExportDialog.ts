import type { ExportScope } from "./ExportRenderer";

/** Configuration for creating an ExportDialog. */
export interface ExportDialogConfig {
  /** Called when the user confirms the export. */
  onExport: (options: ExportDialogResult) => void;
}

/** Export format: raster PNG or vector SVG. */
export type ExportFormat = "png" | "svg";

/** Result from the export dialog. */
export interface ExportDialogResult {
  scope: ExportScope;
  scale: number;
  includeBackground: boolean;
  format: ExportFormat;
}

const SCALE_OPTIONS: { label: string; value: number }[] = [
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
  { label: "4x", value: 4 },
];

/**
 * Export dialog that appears as a popover below the export button.
 *
 * Provides options for:
 * - Scope: "Current viewport" or "Fit all content"
 * - Resolution: 1x, 2x, 4x
 * - Background: include or transparent
 */
export class ExportDialog {
  private onExport: (options: ExportDialogResult) => void;

  private button: HTMLButtonElement | null = null;
  private popover: HTMLDivElement | null = null;
  private popoverVisible = false;

  private format: ExportFormat = "png";
  private scope: ExportScope = "fitAll";
  private scale = 1;
  private includeBackground = true;

  private boundOnDismiss: (e: PointerEvent) => void;

  constructor(config: ExportDialogConfig) {
    this.onExport = config.onExport;
    this.boundOnDismiss = this.handleDismiss.bind(this);
  }

  /** Attach the dialog behavior to a button element. */
  attach(button: HTMLButtonElement): void {
    this.button = button;
    button.addEventListener("pointerdown", this.handleButtonClick);
  }

  /** Detach from the currently attached button and clean up. */
  detach(): void {
    if (this.button) {
      this.button.removeEventListener("pointerdown", this.handleButtonClick);
      this.button = null;
    }
    this.hidePopover();
  }

  /** Whether the popover is currently visible. */
  isOpen(): boolean {
    return this.popoverVisible;
  }

  private handleButtonClick = (e: PointerEvent): void => {
    e.stopPropagation();
    if (this.popoverVisible) {
      this.hidePopover();
    } else {
      this.showPopover();
    }
  };

  private showPopover(): void {
    if (!this.button || this.popoverVisible) return;
    this.popoverVisible = true;

    this.popover = document.createElement("div");
    this.popover.className = "export-popover";

    // Format selector (PNG / SVG)
    const formatRow = this.createRow("Format");
    const formatGroup = document.createElement("div");
    formatGroup.className = "export-option-group";

    const formatPng = this.createOptionButton("PNG", this.format === "png");
    const formatSvg = this.createOptionButton("SVG", this.format === "svg");

    // We need forward references to the resolution row and export button
    let resRow: HTMLDivElement;
    let exportBtn: HTMLButtonElement;

    const updateFormatUI = () => {
      this.updateFormatButtons(formatGroup);
      if (resRow) resRow.style.display = this.format === "svg" ? "none" : "";
      if (exportBtn) exportBtn.textContent = `Export ${this.format.toUpperCase()}`;
    };

    formatPng.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      this.format = "png";
      updateFormatUI();
    });
    formatGroup.appendChild(formatPng);

    formatSvg.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      this.format = "svg";
      updateFormatUI();
    });
    formatGroup.appendChild(formatSvg);
    formatRow.appendChild(formatGroup);
    this.popover.appendChild(formatRow);

    // Scope selector
    const scopeRow = this.createRow("Scope");
    const scopeGroup = document.createElement("div");
    scopeGroup.className = "export-option-group";

    const scopeViewport = this.createOptionButton("Current viewport", this.scope === "viewport");
    scopeViewport.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      this.scope = "viewport";
      this.updateScopeButtons(scopeGroup);
    });
    scopeGroup.appendChild(scopeViewport);

    const scopeFitAll = this.createOptionButton("Fit all content", this.scope === "fitAll");
    scopeFitAll.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      this.scope = "fitAll";
      this.updateScopeButtons(scopeGroup);
    });
    scopeGroup.appendChild(scopeFitAll);
    scopeRow.appendChild(scopeGroup);
    this.popover.appendChild(scopeRow);

    // Resolution selector
    resRow = this.createRow("Resolution");
    if (this.format === "svg") resRow.style.display = "none";
    const resGroup = document.createElement("div");
    resGroup.className = "export-option-group";

    for (const opt of SCALE_OPTIONS) {
      const btn = this.createOptionButton(opt.label, this.scale === opt.value);
      btn.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        this.scale = opt.value;
        this.updateScaleButtons(resGroup);
      });
      resGroup.appendChild(btn);
    }
    resRow.appendChild(resGroup);
    this.popover.appendChild(resRow);

    // Background toggle
    const bgRow = this.createRow("Background");
    const bgGroup = document.createElement("div");
    bgGroup.className = "export-option-group";

    const bgYes = this.createOptionButton("Include", this.includeBackground);
    bgYes.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      this.includeBackground = true;
      this.updateBgButtons(bgGroup);
    });
    bgGroup.appendChild(bgYes);

    const bgNo = this.createOptionButton("Transparent", !this.includeBackground);
    bgNo.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      this.includeBackground = false;
      this.updateBgButtons(bgGroup);
    });
    bgGroup.appendChild(bgNo);
    bgRow.appendChild(bgGroup);
    this.popover.appendChild(bgRow);

    // Export button
    exportBtn = document.createElement("button");
    exportBtn.className = "export-confirm-btn";
    exportBtn.textContent = `Export ${this.format.toUpperCase()}`;
    exportBtn.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      this.onExport({
        format: this.format,
        scope: this.scope,
        scale: this.scale,
        includeBackground: this.includeBackground,
      });
      this.hidePopover();
    });
    this.popover.appendChild(exportBtn);

    // Position below the button
    const rect = this.button.getBoundingClientRect();
    this.popover.style.position = "fixed";
    this.popover.style.left = `${rect.left}px`;
    this.popover.style.top = `${rect.bottom + 4}px`;

    document.body.appendChild(this.popover);

    requestAnimationFrame(() => {
      document.addEventListener("pointerdown", this.boundOnDismiss);
    });
  }

  /** Hide the popover if visible. */
  hidePopover(): void {
    if (this.popover) {
      this.popover.remove();
      this.popover = null;
    }
    this.popoverVisible = false;
    document.removeEventListener("pointerdown", this.boundOnDismiss);
  }

  private handleDismiss(e: PointerEvent): void {
    if (this.popover && !this.popover.contains(e.target as Node) &&
        this.button && !this.button.contains(e.target as Node)) {
      this.hidePopover();
    }
  }

  private createRow(label: string): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "export-row";
    const lbl = document.createElement("span");
    lbl.className = "export-label";
    lbl.textContent = label;
    row.appendChild(lbl);
    return row;
  }

  private createOptionButton(text: string, active: boolean): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "export-option";
    if (active) btn.classList.add("active");
    btn.textContent = text;
    return btn;
  }

  private updateFormatButtons(group: HTMLElement): void {
    const buttons = group.querySelectorAll(".export-option");
    buttons[0]?.classList.toggle("active", this.format === "png");
    buttons[1]?.classList.toggle("active", this.format === "svg");
  }

  private updateScopeButtons(group: HTMLElement): void {
    const buttons = group.querySelectorAll(".export-option");
    buttons[0]?.classList.toggle("active", this.scope === "viewport");
    buttons[1]?.classList.toggle("active", this.scope === "fitAll");
  }

  private updateScaleButtons(group: HTMLElement): void {
    const buttons = group.querySelectorAll(".export-option");
    buttons.forEach((btn, i) => {
      btn.classList.toggle("active", SCALE_OPTIONS[i].value === this.scale);
    });
  }

  private updateBgButtons(group: HTMLElement): void {
    const buttons = group.querySelectorAll(".export-option");
    buttons[0]?.classList.toggle("active", this.includeBackground);
    buttons[1]?.classList.toggle("active", !this.includeBackground);
  }

  destroy(): void {
    this.detach();
  }
}
