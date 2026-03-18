/**
 * Simple FPS counter overlay toggled with F3.
 * Shows rolling average FPS and frame time.
 */
export class FpsCounter {
  private container: HTMLDivElement;
  private visible = false;
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private readonly maxSamples = 60;

  constructor() {
    this.container = document.createElement("div");
    this.container.style.cssText = `
      position: fixed;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #0f0;
      font-family: monospace;
      font-size: 13px;
      padding: 4px 8px;
      border-radius: 4px;
      z-index: 9999;
      pointer-events: none;
      display: none;
      line-height: 1.4;
    `;
    document.body.appendChild(this.container);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? "block" : "none";
    if (this.visible) {
      this.frameTimes = [];
      this.lastFrameTime = 0;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Call once per frame with the current timestamp (from requestAnimationFrame). */
  update(now: number, strokeCount: number, visibleCount: number): void {
    if (!this.visible) return;

    if (this.lastFrameTime > 0) {
      const dt = now - this.lastFrameTime;
      this.frameTimes.push(dt);
      if (this.frameTimes.length > this.maxSamples) {
        this.frameTimes.shift();
      }
    }
    this.lastFrameTime = now;

    if (this.frameTimes.length < 2) return;

    const avgDt = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1000 / avgDt;
    const frameMs = avgDt;

    this.container.textContent =
      `FPS: ${fps.toFixed(0)} (${frameMs.toFixed(1)}ms)\n` +
      `Strokes: ${visibleCount}/${strokeCount}`;
  }

  destroy(): void {
    this.container.remove();
  }
}
