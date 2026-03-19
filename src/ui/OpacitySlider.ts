/** Configuration for creating an OpacitySlider. */
export interface OpacitySliderConfig {
  /** Called when the opacity changes (0–1). */
  onChange: (opacity: number) => void;
  /** Initial opacity (0–1). Default: 1 */
  initialOpacity?: number;
}

const PRESET_OPACITIES = [25, 50, 75, 100];

/**
 * Opacity button with a click-to-open slider popover.
 *
 * Shows the current opacity as a percentage on the button. The popover contains
 * a horizontal slider (0–100%) and preset buttons.
 * All interactions are Wacom-friendly (pointer events, large targets).
 */
export class OpacitySlider {
  private currentOpacity: number;
  private onChange: (opacity: number) => void;

  private button: HTMLButtonElement | null = null;
  private popover: HTMLDivElement | null = null;
  private slider: HTMLInputElement | null = null;
  private popoverVisible = false;

  private boundOnDismiss: (e: PointerEvent) => void;

  constructor(config: OpacitySliderConfig) {
    this.onChange = config.onChange;
    this.currentOpacity = config.initialOpacity ?? 1;

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

  /** Get the current opacity (0–1). */
  getOpacity(): number {
    return this.currentOpacity;
  }

  /** Programmatically set the opacity and update button text. */
  setOpacity(opacity: number): void {
    this.currentOpacity = this.clamp(opacity);
    this.updateButtonText();
    if (this.slider) {
      this.slider.value = String(Math.round(this.currentOpacity * 100));
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
    this.popover.className = "opacity-popover";

    // Slider row
    const sliderRow = document.createElement("div");
    sliderRow.className = "opacity-slider-row";

    this.slider = document.createElement("input");
    this.slider.type = "range";
    this.slider.className = "opacity-slider";
    this.slider.min = "0";
    this.slider.max = "100";
    this.slider.step = "1";
    this.slider.value = String(Math.round(this.currentOpacity * 100));
    this.slider.addEventListener("input", this.handleSliderInput);
    this.slider.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    sliderRow.appendChild(this.slider);

    const label = document.createElement("span");
    label.className = "opacity-value-label";
    label.textContent = this.formatPercent(this.currentOpacity);
    sliderRow.appendChild(label);

    this.popover.appendChild(sliderRow);

    // Preset buttons row
    const presetsRow = document.createElement("div");
    presetsRow.className = "opacity-presets";
    for (const pct of PRESET_OPACITIES) {
      const btn = document.createElement("button");
      btn.className = "opacity-preset";
      if (Math.round(this.currentOpacity * 100) === pct) {
        btn.classList.add("active");
      }
      btn.textContent = `${pct}%`;
      btn.title = `${pct}% opacity`;
      btn.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        this.applyOpacity(pct / 100);
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
    this.popoverVisible = false;
    document.removeEventListener("pointerdown", this.boundOnDismiss);
  }

  private handleSliderInput = (): void => {
    if (!this.slider) return;
    const value = parseInt(this.slider.value, 10) / 100;
    this.applyOpacity(value);
  };

  private handleDismiss(e: PointerEvent): void {
    if (this.popover && !this.popover.contains(e.target as Node) &&
        this.button && !this.button.contains(e.target as Node)) {
      this.hidePopover();
    }
  }

  private applyOpacity(opacity: number): void {
    this.currentOpacity = this.clamp(opacity);
    this.updateButtonText();
    if (this.slider) {
      this.slider.value = String(Math.round(this.currentOpacity * 100));
    }
    // Update the value label
    if (this.popover) {
      const label = this.popover.querySelector(".opacity-value-label");
      if (label) {
        label.textContent = this.formatPercent(this.currentOpacity);
      }
      // Update preset active states
      const presets = this.popover.querySelectorAll(".opacity-preset");
      presets.forEach((btn) => {
        const el = btn as HTMLButtonElement;
        const pct = parseInt(el.textContent || "0", 10);
        el.classList.toggle("active", pct === Math.round(this.currentOpacity * 100));
      });
    }
    this.onChange(this.currentOpacity);
  }

  private updateButtonText(): void {
    if (!this.button) return;
    this.button.textContent = this.formatPercent(this.currentOpacity);
    this.button.title = `Opacity: ${this.formatPercent(this.currentOpacity)}`;
  }

  private formatPercent(opacity: number): string {
    return `${Math.round(opacity * 100)}%`;
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  destroy(): void {
    this.detach();
  }
}
