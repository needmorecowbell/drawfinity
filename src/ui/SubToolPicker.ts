/** Sub-tool option definition for the hold-to-select picker. */
export interface SubToolOption {
  id: string;
  label: string;
  title: string;
}

/** Configuration for creating a SubToolPicker. */
export interface SubToolPickerConfig {
  /** The sub-tool options to display in the popover. */
  options: SubToolOption[];
  /** Called when a sub-tool is selected (quick click or popover pick). */
  onSelect: (id: string) => void;
  /** Hold duration in ms before showing the popover. Default: 300. */
  holdDelay?: number;
}

const DEFAULT_HOLD_DELAY = 300;

/**
 * Hold-to-select sub-tool picker following GIMP's pattern.
 *
 * Quick click (< holdDelay ms) selects the last-used sub-tool.
 * Long press (>= holdDelay ms) shows a popover with all sub-tool options.
 * The attached button's text/title update to reflect the last-used sub-tool.
 */
export class SubToolPicker {
  private options: SubToolOption[];
  private onSelect: (id: string) => void;
  private holdDelay: number;
  private lastUsedId: string;

  private button: HTMLButtonElement | null = null;
  private popover: HTMLDivElement | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private isHolding = false;
  private popoverVisible = false;

  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnDismiss: (e: PointerEvent) => void;

  constructor(config: SubToolPickerConfig) {
    this.options = config.options;
    this.onSelect = config.onSelect;
    this.holdDelay = config.holdDelay ?? DEFAULT_HOLD_DELAY;
    this.lastUsedId = this.options[0]?.id ?? "";

    this.boundOnPointerDown = this.handlePointerDown.bind(this);
    this.boundOnPointerUp = this.handlePointerUp.bind(this);
    this.boundOnDismiss = this.handleDismiss.bind(this);
  }

  /** Attach hold-to-select behavior to a button element. */
  attach(button: HTMLButtonElement): void {
    this.button = button;
    this.updateButtonAppearance();
    button.addEventListener("pointerdown", this.boundOnPointerDown);
    button.addEventListener("pointerup", this.boundOnPointerUp);
  }

  /** Detach from the currently attached button and clean up. */
  detach(): void {
    if (this.button) {
      this.button.removeEventListener("pointerdown", this.boundOnPointerDown);
      this.button.removeEventListener("pointerup", this.boundOnPointerUp);
      this.button = null;
    }
    this.hidePopover();
    this.clearHoldTimer();
  }

  /** Get the currently last-used sub-tool ID. */
  getLastUsedId(): string {
    return this.lastUsedId;
  }

  /** Programmatically set the last-used sub-tool and update the button. */
  setLastUsedId(id: string): void {
    const option = this.options.find(o => o.id === id);
    if (option) {
      this.lastUsedId = id;
      this.updateButtonAppearance();
    }
  }

  /** Whether the popover is currently visible. */
  isOpen(): boolean {
    return this.popoverVisible;
  }

  private handlePointerDown(e: PointerEvent): void {
    e.stopPropagation();
    this.isHolding = true;
    this.clearHoldTimer();

    this.holdTimer = setTimeout(() => {
      if (this.isHolding) {
        this.showPopover();
      }
    }, this.holdDelay);
  }

  private handlePointerUp(e: PointerEvent): void {
    e.stopPropagation();
    if (!this.isHolding) return;
    this.isHolding = false;

    if (this.popoverVisible) {
      // Popover is already shown (hold completed) — let the popover handle selection
      return;
    }

    // Quick click: select last-used sub-tool
    this.clearHoldTimer();
    this.selectSubTool(this.lastUsedId);
  }

  private handleDismiss(e: PointerEvent): void {
    if (this.popover && !this.popover.contains(e.target as Node) &&
        this.button && !this.button.contains(e.target as Node)) {
      this.hidePopover();
    }
  }

  private showPopover(): void {
    if (!this.button || this.popoverVisible) return;
    this.popoverVisible = true;

    this.popover = document.createElement("div");
    this.popover.className = "subtool-popover";

    for (const option of this.options) {
      const item = document.createElement("button");
      item.className = "subtool-option";
      if (option.id === this.lastUsedId) {
        item.classList.add("active");
      }
      item.innerHTML = option.label;
      item.title = option.title;
      item.dataset.id = option.id;
      item.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        this.selectSubTool(option.id);
        this.hidePopover();
      });
      this.popover.appendChild(item);
    }

    // Position below the button
    const rect = this.button.getBoundingClientRect();
    this.popover.style.position = "fixed";
    this.popover.style.left = `${rect.left}px`;
    this.popover.style.top = `${rect.bottom + 4}px`;

    document.body.appendChild(this.popover);

    // Dismiss on click outside (on next frame to avoid immediate dismissal)
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
    this.isHolding = false;
    document.removeEventListener("pointerdown", this.boundOnDismiss);
  }

  private selectSubTool(id: string): void {
    this.lastUsedId = id;
    this.updateButtonAppearance();
    this.onSelect(id);
  }

  private updateButtonAppearance(): void {
    if (!this.button) return;
    const option = this.options.find(o => o.id === this.lastUsedId);
    if (option) {
      this.button.innerHTML = option.label;
      this.button.title = option.title;
    }
  }

  private clearHoldTimer(): void {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  destroy(): void {
    this.detach();
  }
}
