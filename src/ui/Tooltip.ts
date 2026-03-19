/** Delay in milliseconds before showing the tooltip. */
const SHOW_DELAY = 500;

/** Padding from viewport edges. */
const EDGE_PADDING = 8;

/**
 * Lightweight singleton tooltip that shows on hover for toolbar buttons.
 * Uses a single DOM element repositioned for each target.
 */
export class Tooltip {
  private static instance: Tooltip | null = null;

  private el: HTMLDivElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private currentTarget: HTMLElement | null = null;

  /** Registered targets with their cleanup functions. */
  private targets: Map<HTMLElement, () => void> = new Map();

  private constructor() {
    this.el = document.createElement("div");
    this.el.className = "toolbar-tooltip";
    this.el.setAttribute("role", "tooltip");
    this.el.style.display = "none";
    document.body.appendChild(this.el);
  }

  /** Get or create the singleton instance. */
  static getInstance(): Tooltip {
    if (!Tooltip.instance) {
      Tooltip.instance = new Tooltip();
    }
    return Tooltip.instance;
  }

  /** Reset the singleton (for testing). */
  static resetInstance(): void {
    if (Tooltip.instance) {
      Tooltip.instance.destroy();
      Tooltip.instance = null;
    }
  }

  /**
   * Register a tooltip on an element.
   * @param target The element to attach the tooltip to.
   * @param text The tooltip text (e.g., "Brush (B)").
   */
  attach(target: HTMLElement, text: string): void {
    // Remove any previous registration
    this.detach(target);

    // Remove native title to prevent double tooltips
    target.removeAttribute("title");

    const onPointerEnter = () => this.scheduleShow(target, text);
    const onPointerLeave = () => this.hide();
    const onPointerDown = () => this.hide();

    target.addEventListener("pointerenter", onPointerEnter);
    target.addEventListener("pointerleave", onPointerLeave);
    target.addEventListener("pointerdown", onPointerDown);

    this.targets.set(target, () => {
      target.removeEventListener("pointerenter", onPointerEnter);
      target.removeEventListener("pointerleave", onPointerLeave);
      target.removeEventListener("pointerdown", onPointerDown);
    });
  }

  /** Update the tooltip text for an already-registered target. */
  updateText(target: HTMLElement, text: string): void {
    if (!this.targets.has(target)) return;
    // Re-attach with new text (detach + attach preserves listeners)
    this.attach(target, text);
  }

  /** Remove tooltip from an element. */
  detach(target: HTMLElement): void {
    const cleanup = this.targets.get(target);
    if (cleanup) {
      cleanup();
      this.targets.delete(target);
    }
    if (this.currentTarget === target) {
      this.hide();
    }
  }

  private scheduleShow(target: HTMLElement, text: string): void {
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.show(target, text);
    }, SHOW_DELAY);
  }

  private show(target: HTMLElement, text: string): void {
    this.currentTarget = target;
    this.el.textContent = text;
    this.el.style.display = "";

    // Position below the target, centered horizontally
    const rect = target.getBoundingClientRect();
    const tooltipRect = this.el.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    const top = rect.bottom + 6;

    // Clamp to viewport
    if (left < EDGE_PADDING) left = EDGE_PADDING;
    if (left + tooltipRect.width > window.innerWidth - EDGE_PADDING) {
      left = window.innerWidth - EDGE_PADDING - tooltipRect.width;
    }

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  hide(): void {
    this.cancelTimer();
    this.el.style.display = "none";
    this.currentTarget = null;
  }

  /** Whether the tooltip is currently visible. */
  isVisible(): boolean {
    return this.el.style.display !== "none";
  }

  /** Get the DOM element (for testing). */
  getElement(): HTMLDivElement {
    return this.el;
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Clean up all registrations and remove the DOM element. */
  destroy(): void {
    this.cancelTimer();
    for (const cleanup of this.targets.values()) {
      cleanup();
    }
    this.targets.clear();
    this.el.remove();
  }
}
