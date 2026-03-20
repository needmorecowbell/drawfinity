import type { Camera } from "../camera/Camera";
import type { TurtleState } from "./TurtleState";

/**
 * Renders a triangle indicator at the turtle's current position and heading.
 * Uses a CSS-positioned HTML element (similar to RemoteCursors) that
 * transforms world coordinates to screen space via the Camera.
 *
 * The indicator is visible during script execution and hidden when idle.
 * Its color matches the current pen color.
 */
export class TurtleIndicator {
  private container: HTMLElement;
  private camera: Camera;
  private state: TurtleState;
  private visible = false;

  constructor(root: HTMLElement, camera: Camera, state: TurtleState) {
    this.camera = camera;
    this.state = state;

    this.container = document.createElement("div");
    this.container.className = "turtle-indicator";
    this.container.style.display = "none";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.overflow = "visible";
    // Triangle pointing up: tip at (12,2), base at (4,22) and (20,22)
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 2L4 22L12 17L20 22Z");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);
    this.container.appendChild(svg);
    root.appendChild(this.container);
  }

  /** Show the turtle indicator and update its position/heading/color. */
  show(): void {
    this.visible = true;
    this.container.style.display = "";
    this.update();
  }

  /** Hide the turtle indicator. */
  hide(): void {
    this.visible = false;
    this.container.style.display = "none";
  }

  /** Whether the indicator is currently visible. */
  isVisible(): boolean {
    return this.visible;
  }

  /** Update the indicator's position, rotation, and color from current state. */
  update(): void {
    if (!this.visible) return;

    const [vw, vh] = this.camera.getViewportSize();
    const screenX = (this.state.x - this.camera.x) * this.camera.zoom + vw / 2;
    const screenY = (this.state.y - this.camera.y) * this.camera.zoom + vh / 2;

    this.container.style.color = this.state.pen.color;
    // Translate to screen position, then rotate by heading (offset by -12,-12 to center the SVG)
    this.container.style.transform =
      `translate(${screenX - 12}px, ${screenY - 12}px) rotate(${this.state.angle}deg)`;
  }

  /** Remove the indicator element from the DOM. */
  destroy(): void {
    this.hide();
    this.container.remove();
  }
}
