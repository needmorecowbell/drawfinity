export interface TurtlePanelCallbacks {
  /** Called when the user clicks Run. Receives the script text. */
  onRun?: (script: string) => void;
  /** Called when the user clicks Stop. */
  onStop?: () => void;
  /** Called when the speed slider changes. */
  onSpeedChange?: (speed: number) => void;
}

const STORAGE_KEY_PREFIX = "drawfinity:turtle-script:";

/**
 * Slide-up panel for turtle graphics scripting.
 *
 * Layout:
 * - Left: monospace code editor (textarea)
 * - Right: console output log (print() output and errors)
 * - Bottom bar: Run, Stop, Speed slider, Clear Console
 */
export class TurtlePanel {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private editor!: HTMLTextAreaElement;
  private consoleLog!: HTMLElement;
  private runBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private speedSlider!: HTMLInputElement;
  private speedLabel!: HTMLSpanElement;
  private clearConsoleBtn!: HTMLButtonElement;
  private callbacks: TurtlePanelCallbacks;
  private drawingId: string;
  private visible = false;
  private resizing = false;
  private panelHeight = 300;
  private startY = 0;
  private startHeight = 0;

  constructor(drawingId: string, callbacks?: TurtlePanelCallbacks) {
    this.callbacks = callbacks ?? {};
    this.drawingId = drawingId;

    this.overlay = document.createElement("div");
    this.overlay.id = "turtle-overlay";
    this.overlay.addEventListener("pointerdown", (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.panel = document.createElement("div");
    this.panel.id = "turtle-panel";
    this.build();
    this.overlay.appendChild(this.panel);

    // Load saved script from localStorage
    this.loadScript();
  }

  private build(): void {
    // Resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "turtle-resize-handle";
    resizeHandle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.resizing = true;
      this.startY = e.clientY;
      this.startHeight = this.panelHeight;

      const onMove = (ev: PointerEvent) => {
        if (!this.resizing) return;
        const delta = this.startY - ev.clientY;
        this.panelHeight = Math.max(150, Math.min(window.innerHeight - 60, this.startHeight + delta));
        this.panel.style.height = `${this.panelHeight}px`;
      };
      const onUp = () => {
        this.resizing = false;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });
    this.panel.appendChild(resizeHandle);

    // Title bar
    const titleBar = document.createElement("div");
    titleBar.className = "turtle-title-bar";

    const title = document.createElement("span");
    title.className = "turtle-title";
    title.textContent = "Turtle Graphics";
    titleBar.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.className = "turtle-close-btn";
    closeBtn.textContent = "\u00d7";
    closeBtn.title = "Close (Ctrl+`)";
    closeBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.hide();
    });
    titleBar.appendChild(closeBtn);

    this.panel.appendChild(titleBar);

    // Main content area: editor + console
    const content = document.createElement("div");
    content.className = "turtle-content";

    // Left: Code editor
    const editorWrap = document.createElement("div");
    editorWrap.className = "turtle-editor-wrap";

    const editorLabel = document.createElement("div");
    editorLabel.className = "turtle-section-label";
    editorLabel.textContent = "Script";
    editorWrap.appendChild(editorLabel);

    this.editor = document.createElement("textarea");
    this.editor.className = "turtle-editor";
    this.editor.spellcheck = false;
    this.editor.placeholder = "-- Write Lua code here\nforward(100)\nright(90)\nforward(100)";
    // Save script on input
    this.editor.addEventListener("input", () => this.saveScript());
    // Ctrl+Enter to run
    this.editor.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        this.handleRun();
      }
      // Tab inserts spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        this.editor.value = this.editor.value.substring(0, start) + "  " + this.editor.value.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 2;
        this.saveScript();
      }
    });
    editorWrap.appendChild(this.editor);
    content.appendChild(editorWrap);

    // Right: Console output
    const consoleWrap = document.createElement("div");
    consoleWrap.className = "turtle-console-wrap";

    const consoleLabel = document.createElement("div");
    consoleLabel.className = "turtle-section-label";
    consoleLabel.textContent = "Console";
    consoleWrap.appendChild(consoleLabel);

    this.consoleLog = document.createElement("div");
    this.consoleLog.className = "turtle-console";
    consoleWrap.appendChild(this.consoleLog);
    content.appendChild(consoleWrap);

    this.panel.appendChild(content);

    // Bottom bar: controls
    const bottomBar = document.createElement("div");
    bottomBar.className = "turtle-bottom-bar";

    // Run button
    this.runBtn = document.createElement("button");
    this.runBtn.className = "turtle-btn turtle-btn-run";
    this.runBtn.textContent = "\u25b6 Run";
    this.runBtn.title = "Run script (Ctrl+Enter)";
    this.runBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleRun();
    });
    bottomBar.appendChild(this.runBtn);

    // Stop button
    this.stopBtn = document.createElement("button");
    this.stopBtn.className = "turtle-btn turtle-btn-stop";
    this.stopBtn.textContent = "\u25a0 Stop";
    this.stopBtn.disabled = true;
    this.stopBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onStop?.();
    });
    bottomBar.appendChild(this.stopBtn);

    // Speed control
    const speedWrap = document.createElement("div");
    speedWrap.className = "turtle-speed-wrap";

    const speedLabelEl = document.createElement("span");
    speedLabelEl.className = "turtle-speed-label-text";
    speedLabelEl.textContent = "Speed:";
    speedWrap.appendChild(speedLabelEl);

    this.speedSlider = document.createElement("input");
    this.speedSlider.type = "range";
    this.speedSlider.className = "turtle-speed-slider";
    this.speedSlider.min = "0";
    this.speedSlider.max = "10";
    this.speedSlider.value = "5";
    this.speedSlider.addEventListener("input", () => {
      const val = parseInt(this.speedSlider.value, 10);
      this.speedLabel.textContent = val === 0 ? "Instant" : `${val}`;
      this.callbacks.onSpeedChange?.(val);
    });
    speedWrap.appendChild(this.speedSlider);

    this.speedLabel = document.createElement("span");
    this.speedLabel.className = "turtle-speed-value";
    this.speedLabel.textContent = "5";
    speedWrap.appendChild(this.speedLabel);

    bottomBar.appendChild(speedWrap);

    // Spacer
    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    bottomBar.appendChild(spacer);

    // Clear Console button
    this.clearConsoleBtn = document.createElement("button");
    this.clearConsoleBtn.className = "turtle-btn turtle-btn-secondary";
    this.clearConsoleBtn.textContent = "Clear Console";
    this.clearConsoleBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.clearConsole();
    });
    bottomBar.appendChild(this.clearConsoleBtn);

    this.panel.appendChild(bottomBar);
  }

  private handleRun(): void {
    const script = this.editor.value.trim();
    if (!script) return;
    this.callbacks.onRun?.(script);
  }

  /** Append a message to the console log. */
  appendConsole(message: string, type: "output" | "error" | "info" = "output"): void {
    const line = document.createElement("div");
    line.className = `turtle-console-line turtle-console-${type}`;
    line.textContent = message;
    this.consoleLog.appendChild(line);
    this.consoleLog.scrollTop = this.consoleLog.scrollHeight;
  }

  /** Clear the console log. */
  clearConsole(): void {
    this.consoleLog.innerHTML = "";
  }

  /** Update button states when execution starts. */
  setRunning(running: boolean): void {
    this.runBtn.disabled = running;
    this.stopBtn.disabled = !running;
    if (running) {
      this.runBtn.textContent = "\u23f3 Running...";
    } else {
      this.runBtn.textContent = "\u25b6 Run";
    }
  }

  /** Get current speed slider value. */
  getSpeed(): number {
    return parseInt(this.speedSlider.value, 10);
  }

  /** Set speed slider value programmatically. */
  setSpeed(speed: number): void {
    this.speedSlider.value = String(speed);
    this.speedLabel.textContent = speed === 0 ? "Instant" : `${speed}`;
  }

  /** Get the current editor content. */
  getScript(): string {
    return this.editor.value;
  }

  /** Set the editor content. */
  setScript(script: string): void {
    this.editor.value = script;
    this.saveScript();
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.panel.style.height = `${this.panelHeight}px`;
    document.body.appendChild(this.overlay);
    this.editor.focus();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.overlay.remove();
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  private saveScript(): void {
    const key = STORAGE_KEY_PREFIX + this.drawingId;
    localStorage.setItem(key, this.editor.value);
  }

  private loadScript(): void {
    const key = STORAGE_KEY_PREFIX + this.drawingId;
    const saved = localStorage.getItem(key);
    if (saved) {
      this.editor.value = saved;
    }
  }

  destroy(): void {
    this.hide();
  }
}
