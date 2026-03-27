import type { Camera } from "../camera/Camera";

/** Internal state for a single turtle indicator element. */
interface IndicatorEntry {
  container: HTMLElement;
  visible: boolean;
  isMain: boolean;
}

/** SVG size for main turtle indicator. */
const MAIN_SIZE = 24;
/** SVG size for spawned turtle indicators. */
const SPAWNED_SIZE = 18;

/**
 * Renders triangle indicators for multiple turtles at their current positions.
 * Maintains a Map of per-turtle SVG elements, each positioned and colored
 * independently. The main turtle keeps the standard size; spawned turtles
 * are slightly smaller.
 *
 * Global show/hide controls overall visibility. Per-turtle show/hide
 * controls individual indicator visibility (for hide()/show() commands).
 */
export class TurtleIndicator {
  private root: HTMLElement;
  private camera: Camera;
  private indicators = new Map<string, IndicatorEntry>();
  private globalVisible = false;

  constructor(root: HTMLElement, camera: Camera) {
    this.root = root;
    this.camera = camera;
  }

  /**
   * Add a turtle indicator. If the turtle already exists, this is a no-op.
   * @param id      Turtle identifier (e.g. "main", "child1")
   * @param isMain  Whether this is the main turtle (uses larger indicator)
   */
  addTurtle(id: string, isMain = false): void {
    if (this.indicators.has(id)) return;

    const size = isMain ? MAIN_SIZE : SPAWNED_SIZE;
    const container = document.createElement("div");
    container.className = "turtle-indicator";
    container.setAttribute("data-turtle-id", id);
    container.style.display = this.globalVisible ? "" : "none";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.overflow = "visible";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 2L4 22L12 17L20 22Z");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);
    container.appendChild(svg);
    this.root.appendChild(container);

    this.indicators.set(id, { container, visible: true, isMain });
  }

  /** Remove a turtle indicator from the DOM. */
  removeTurtle(id: string): void {
    const entry = this.indicators.get(id);
    if (!entry) return;
    entry.container.remove();
    this.indicators.delete(id);
  }

  /** Check whether a turtle indicator exists. */
  hasTurtle(id: string): boolean {
    return this.indicators.has(id);
  }

  /**
   * Update a turtle indicator's position, heading, and color.
   * Coordinates are in world space — camera transform is applied internally.
   */
  updateTurtle(
    id: string,
    worldX: number,
    worldY: number,
    heading: number,
    color?: string,
  ): void {
    const entry = this.indicators.get(id);
    if (!entry) return;
    if (!this.globalVisible || !entry.visible) return;

    const [vw, vh] = this.camera.getViewportSize();
    const screenX = (worldX - this.camera.x) * this.camera.zoom + vw / 2;
    const screenY = (worldY - this.camera.y) * this.camera.zoom + vh / 2;

    const halfSize = (entry.isMain ? MAIN_SIZE : SPAWNED_SIZE) / 2;

    if (color !== undefined) {
      entry.container.style.color = color;
    }
    entry.container.style.transform =
      `translate(${screenX - halfSize}px, ${screenY - halfSize}px) rotate(${heading}deg)`;
  }

  /** Show a specific turtle's indicator (per-turtle visibility). */
  showTurtle(id: string): void {
    const entry = this.indicators.get(id);
    if (!entry) return;
    entry.visible = true;
    if (this.globalVisible) {
      entry.container.style.display = "";
    }
  }

  /** Hide a specific turtle's indicator (per-turtle visibility). */
  hideTurtle(id: string): void {
    const entry = this.indicators.get(id);
    if (!entry) return;
    entry.visible = false;
    entry.container.style.display = "none";
  }

  /** Whether a specific turtle's indicator is visible (per-turtle). */
  isTurtleVisible(id: string): boolean {
    return this.indicators.get(id)?.visible ?? false;
  }

  /** Show all turtle indicators (global visibility). */
  show(): void {
    this.globalVisible = true;
    for (const [, entry] of this.indicators) {
      if (entry.visible) {
        entry.container.style.display = "";
      }
    }
  }

  /** Hide all turtle indicators (global visibility). */
  hide(): void {
    this.globalVisible = false;
    for (const [, entry] of this.indicators) {
      entry.container.style.display = "none";
    }
  }

  /** Whether indicators are globally visible. */
  isVisible(): boolean {
    return this.globalVisible;
  }

  /** Remove all turtle indicators. */
  clear(): void {
    for (const [, entry] of this.indicators) {
      entry.container.remove();
    }
    this.indicators.clear();
  }

  /** Number of tracked turtles. */
  count(): number {
    return this.indicators.size;
  }

  /** Return all currently tracked turtle IDs. */
  getTrackedIds(): IterableIterator<string> {
    return this.indicators.keys();
  }

  /** Remove all indicators and detach from the DOM. */
  destroy(): void {
    this.hide();
    this.clear();
  }
}
