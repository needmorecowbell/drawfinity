export interface RecordBrokenEvent {
  key: string;
  newValue: number;
  oldValue: number;
}

const AUTO_DISMISS_MS = 3000;
const FADE_OUT_MS = 300;

/** Human-readable labels for record keys. */
const RECORD_LABELS: Record<string, string> = {
  longestSingleStroke: "Longest Stroke",
  widestBrushUsed: "Widest Brush",
  mostTurtlesInOneRun: "Most Turtles",
  longestTurtleDistance: "Turtle Distance",
  mostTurtleTurns: "Turtle Turns",
  fastestTurtleCompletion: "Fastest Turtle",
  longestTurtleRuntime: "Longest Turtle Run",
  deepestZoom: "Deepest Zoom",
  widestZoom: "Widest Zoom",
  longestPanInOneSession: "Pan Distance",
  mostConcurrentCollaborators: "Most Collaborators",
  longestSession: "Longest Session",
  mostStrokesInOneSession: "Most Strokes (Session)",
};

function formatRecordValue(key: string, value: number): string {
  if (key === "deepestZoom" || key === "widestZoom") {
    return value.toExponential(1) + "x";
  }
  if (key === "longestSession" || key === "longestTurtleRuntime" || key === "fastestTurtleCompletion") {
    const secs = Math.floor(value / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs}s`;
  }
  if (key === "longestTurtleDistance" || key === "longestPanInOneSession" || key === "longestSingleStroke") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
  }
  return String(Math.round(value));
}

/**
 * Subtle toast notification for broken personal records.
 *
 * Listens to `drawfinity:record-broken` custom events on `window`.
 * Smaller and less prominent than badge toasts. Latest record
 * replaces any currently visible record toast (no stacking).
 */
export class RecordToast {
  private container: HTMLElement;
  private handler: (e: Event) => void;
  private currentToast: HTMLElement | null = null;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "record-toast-container";
    document.body.appendChild(this.container);

    this.handler = (e: Event) => {
      const detail = (e as CustomEvent<RecordBrokenEvent>).detail;
      this.showRecord(detail);
    };
    window.addEventListener("drawfinity:record-broken", this.handler);
  }

  private showRecord(event: RecordBrokenEvent): void {
    // Remove any existing record toast (no stacking)
    this.clearCurrent();

    const toast = document.createElement("div");
    toast.className = "record-toast";

    const header = document.createElement("div");
    header.className = "record-toast-header";
    header.textContent = "New Record!";

    const name = document.createElement("div");
    name.className = "record-toast-name";
    name.textContent = RECORD_LABELS[event.key] ?? event.key;

    const value = document.createElement("div");
    value.className = "record-toast-value";
    value.textContent = formatRecordValue(event.key, event.newValue);

    toast.appendChild(header);
    toast.appendChild(name);
    toast.appendChild(value);

    this.container.appendChild(toast);
    this.currentToast = toast;

    // Force reflow so the slide-in animation triggers
    toast.offsetHeight;
    toast.classList.add("record-toast-visible");

    this.dismissTimer = setTimeout(() => {
      this.dismissToast(toast);
    }, AUTO_DISMISS_MS);
  }

  private clearCurrent(): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (this.currentToast) {
      this.currentToast.remove();
      this.currentToast = null;
    }
  }

  private dismissToast(toast: HTMLElement): void {
    if (!toast.parentNode) return;
    toast.classList.add("record-toast-exit");
    setTimeout(() => {
      toast.remove();
      if (this.currentToast === toast) {
        this.currentToast = null;
      }
    }, FADE_OUT_MS);
  }

  destroy(): void {
    window.removeEventListener("drawfinity:record-broken", this.handler);
    this.clearCurrent();
    this.container.remove();
  }
}
