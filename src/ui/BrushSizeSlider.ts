/** Configuration for creating a BrushSizeSlider. */
export interface BrushSizeSliderConfig {
  /** Called when the brush size changes. */
  onChange: (size: number) => void;
  /** Minimum brush size. Default: 0.5 */
  min?: number;
  /** Maximum brush size. Default: 64 */
  max?: number;
  /** Initial brush size. Default: 2 */
  initialSize?: number;
}

const DEFAULT_MIN = 0.5;
const DEFAULT_MAX = 64;
const DEFAULT_SIZE = 2;
const PRESET_SIZES = [1, 2, 4, 8, 16, 32];

/**
 * Brush size button with a click-to-open slider popover.
 *
 * Shows the current size as text on the button. The popover contains
 * a horizontal slider, numeric input, and preset size buttons.
 * All interactions are Wacom-friendly (pointer events, large targets).
 */
export class BrushSizeSlider {
  private min: number;
  private max: number;
  private currentSize: number;
  private onChange: (size: number) => void;

  private button: HTMLButtonElement | null = null;
  private popover: HTMLDivElement | null = null;
  private slider: HTMLInputElement | null = null;
  private numericInput: HTMLInputElement | null = null;
  private popoverVisible = false;

  private boundOnDismiss: (e: PointerEvent) => void;

  constructor(config: BrushSizeSliderConfig) {
    this.onChange = config.onChange;
    this.min = config.min ?? DEFAULT_MIN;
    this.max = config.max ?? DEFAULT_MAX;
    this.currentSize = config.initialSize ?? DEFAULT_SIZE;

    this.boundOnDismiss = this.handleDismiss.bind(this);
  }

  /** Attach the slider behavior to a button element. */
  attach(button: HTMLButtonElement): void {
    this.button = button;
    this.updateButtonText();
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

  /** Get the current brush size. */
  getSize(): number {
    return this.currentSize;
  }

  /** Programmatically set the size and update button text. */
  setSize(size: number): void {
    this.currentSize = this.clamp(size);
    this.updateButtonText();
    if (this.slider) {
      this.slider.value = String(this.currentSize);
    }
    if (this.numericInput) {
      this.numericInput.value = this.formatSize(this.currentSize);
    }
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
    this.popover.className = "brush-size-popover";

    // Slider row
    const sliderRow = document.createElement("div");
    sliderRow.className = "brush-size-slider-row";

    this.slider = document.createElement("input");
    this.slider.type = "range";
    this.slider.className = "brush-size-slider";
    this.slider.min = String(this.min);
    this.slider.max = String(this.max);
    this.slider.step = "0.5";
    this.slider.value = String(this.currentSize);
    this.slider.addEventListener("input", this.handleSliderInput);
    // Prevent toolbar from stealing events during drag
    this.slider.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    sliderRow.appendChild(this.slider);

    this.numericInput = document.createElement("input");
    this.numericInput.type = "number";
    this.numericInput.className = "brush-size-numeric";
    this.numericInput.min = String(this.min);
    this.numericInput.max = String(this.max);
    this.numericInput.step = "0.5";
    this.numericInput.value = this.formatSize(this.currentSize);
    this.numericInput.addEventListener("input", this.handleNumericInput);
    this.numericInput.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (ev.key === "Enter") {
        this.numericInput?.blur();
      }
    });
    this.numericInput.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    sliderRow.appendChild(this.numericInput);

    this.popover.appendChild(sliderRow);

    // Preset sizes row
    const presetsRow = document.createElement("div");
    presetsRow.className = "brush-size-presets";
    for (const size of PRESET_SIZES) {
      const btn = document.createElement("button");
      btn.className = "brush-size-preset";
      if (size === this.currentSize) {
        btn.classList.add("active");
      }
      btn.textContent = String(size);
      btn.title = `${size}px`;
      btn.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        this.applySize(size);
      });
      presetsRow.appendChild(btn);
    }
    this.popover.appendChild(presetsRow);

    // Position below the button
    const rect = this.button.getBoundingClientRect();
    this.popover.style.position = "fixed";
    this.popover.style.left = `${rect.left}px`;
    this.popover.style.top = `${rect.bottom + 4}px`;

    document.body.appendChild(this.popover);

    // Dismiss on click outside (next frame to avoid immediate dismissal)
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
    this.slider = null;
    this.numericInput = null;
    this.popoverVisible = false;
    document.removeEventListener("pointerdown", this.boundOnDismiss);
  }

  private handleSliderInput = (): void => {
    if (!this.slider) return;
    const value = parseFloat(this.slider.value);
    this.applySize(value);
  };

  private handleNumericInput = (): void => {
    if (!this.numericInput) return;
    const value = parseFloat(this.numericInput.value);
    if (!isNaN(value)) {
      this.applySize(value);
    }
  };

  private handleDismiss(e: PointerEvent): void {
    if (this.popover && !this.popover.contains(e.target as Node) &&
        this.button && !this.button.contains(e.target as Node)) {
      this.hidePopover();
    }
  }

  private applySize(size: number): void {
    this.currentSize = this.clamp(size);
    this.updateButtonText();
    if (this.slider) {
      this.slider.value = String(this.currentSize);
    }
    if (this.numericInput) {
      this.numericInput.value = this.formatSize(this.currentSize);
    }
    // Update preset active states
    if (this.popover) {
      const presets = this.popover.querySelectorAll(".brush-size-preset");
      presets.forEach((btn) => {
        const el = btn as HTMLButtonElement;
        el.classList.toggle("active", parseFloat(el.textContent || "0") === this.currentSize);
      });
    }
    this.onChange(this.currentSize);
  }

  private updateButtonText(): void {
    if (!this.button) return;
    this.button.textContent = this.formatSize(this.currentSize);
    this.button.title = `Brush size: ${this.formatSize(this.currentSize)}px ([/])`;
  }

  private formatSize(size: number): string {
    return size % 1 === 0 ? String(size) : size.toFixed(1);
  }

  private clamp(value: number): number {
    return Math.max(this.min, Math.min(this.max, value));
  }

  destroy(): void {
    this.detach();
  }
}
