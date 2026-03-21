import { TURTLE_EXAMPLES, ExchangeClient } from "../turtle";
import type { ExchangeScriptEntry } from "../turtle";

export interface TurtlePanelCallbacks {
  /** Called when the user clicks Run. Receives the script text. */
  onRun?: (script: string) => void;
  /** Called when the user clicks Stop. */
  onStop?: () => void;
  /** Called when the speed slider changes. */
  onSpeedChange?: (speed: number) => void;
  /** Called when the user wants to place the turtle on the canvas. */
  onPlaceRequest?: () => void;
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
  private placeBtn!: HTMLButtonElement;
  private clearConsoleBtn!: HTMLButtonElement;
  private callbacks: TurtlePanelCallbacks;
  private drawingId: string;
  private visible = false;
  private resizing = false;
  private panelHeight = 300;
  private startY = 0;
  private startHeight = 0;
  private exchangeClient = new ExchangeClient();
  private exchangeOverlay: HTMLElement | null = null;

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

    // Place button — click to place turtle origin on canvas
    this.placeBtn = document.createElement("button");
    this.placeBtn.className = "turtle-btn turtle-btn-secondary";
    this.placeBtn.textContent = "\u{1F4CD} Place";
    this.placeBtn.title = "Click on canvas to set turtle starting position";
    this.placeBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onPlaceRequest?.();
    });
    bottomBar.appendChild(this.placeBtn);

    // Examples dropdown
    const examplesWrap = document.createElement("div");
    examplesWrap.className = "turtle-examples-wrap";

    const examplesBtn = document.createElement("button");
    examplesBtn.className = "turtle-btn turtle-btn-secondary";
    examplesBtn.textContent = "Examples ▾";
    examplesBtn.title = "Load an example script";

    const examplesMenu = document.createElement("div");
    examplesMenu.className = "turtle-examples-menu";
    examplesMenu.style.display = "none";

    for (const example of TURTLE_EXAMPLES) {
      const item = document.createElement("button");
      item.className = "turtle-examples-item";
      item.innerHTML = `<span class="turtle-examples-item-name">${example.name}</span><span class="turtle-examples-item-desc">${example.description}</span>`;
      item.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.setScript(example.script);
        examplesMenu.style.display = "none";
      });
      examplesMenu.appendChild(item);
    }

    examplesBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const isOpen = examplesMenu.style.display !== "none";
      examplesMenu.style.display = isOpen ? "none" : "flex";
    });

    // Close menu when clicking outside
    document.addEventListener("pointerdown", () => {
      examplesMenu.style.display = "none";
    });

    examplesWrap.appendChild(examplesBtn);
    examplesWrap.appendChild(examplesMenu);
    bottomBar.appendChild(examplesWrap);

    // Community scripts button
    const communityBtn = document.createElement("button");
    communityBtn.className = "turtle-btn turtle-btn-secondary";
    communityBtn.textContent = "Community";
    communityBtn.title = "Browse community turtle scripts";
    communityBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.openExchangeBrowser();
    });
    bottomBar.appendChild(communityBtn);

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

  /** Update UI to reflect placement mode state. */
  setPlacing(placing: boolean): void {
    this.placeBtn.classList.toggle("active", placing);
    this.placeBtn.textContent = placing ? "\u{1F4CD} Click canvas..." : "\u{1F4CD} Place";
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

  private openExchangeBrowser(): void {
    if (this.exchangeOverlay) return;

    const overlay = document.createElement("div");
    overlay.className = "turtle-exchange-overlay";
    this.exchangeOverlay = overlay;

    const container = document.createElement("div");
    container.className = "turtle-exchange-container";

    // Header
    const header = document.createElement("div");
    header.className = "turtle-exchange-header";

    const titleEl = document.createElement("span");
    titleEl.className = "turtle-exchange-title";
    titleEl.textContent = "Community Scripts";
    header.appendChild(titleEl);

    const closeBtn = document.createElement("button");
    closeBtn.className = "turtle-close-btn";
    closeBtn.textContent = "\u00d7";
    closeBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.closeExchangeBrowser();
    });
    header.appendChild(closeBtn);
    container.appendChild(header);

    // Search bar
    const searchBar = document.createElement("div");
    searchBar.className = "turtle-exchange-search-bar";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "turtle-exchange-search-input";
    searchInput.placeholder = "Search scripts...";
    searchBar.appendChild(searchInput);
    container.appendChild(searchBar);

    // Tag filters
    const tagBar = document.createElement("div");
    tagBar.className = "turtle-exchange-tag-bar";
    container.appendChild(tagBar);

    // Script list
    const scriptList = document.createElement("div");
    scriptList.className = "turtle-exchange-list";
    container.appendChild(scriptList);

    overlay.appendChild(container);
    this.panel.appendChild(overlay);

    // State
    let allScripts: ExchangeScriptEntry[] = [];
    let activeTags = new Set<string>();

    const renderScripts = (scripts: ExchangeScriptEntry[]) => {
      scriptList.innerHTML = "";
      if (scripts.length === 0) {
        const empty = document.createElement("div");
        empty.className = "turtle-exchange-empty";
        empty.textContent = "No scripts match your search";
        scriptList.appendChild(empty);
        return;
      }
      for (const entry of scripts) {
        const item = document.createElement("div");
        item.className = "turtle-exchange-item";

        const info = document.createElement("div");
        info.className = "turtle-exchange-item-info";

        const titleLine = document.createElement("div");
        titleLine.className = "turtle-exchange-item-title";
        titleLine.textContent = entry.title;
        info.appendChild(titleLine);

        const desc = document.createElement("div");
        desc.className = "turtle-exchange-item-desc";
        desc.textContent = entry.description;
        info.appendChild(desc);

        const meta = document.createElement("div");
        meta.className = "turtle-exchange-item-meta";
        const authorSpan = document.createElement("span");
        authorSpan.className = "turtle-exchange-item-author";
        authorSpan.textContent = `by ${entry.author}`;
        meta.appendChild(authorSpan);
        for (const tag of entry.tags) {
          const badge = document.createElement("span");
          badge.className = "turtle-exchange-tag-badge";
          badge.textContent = tag;
          meta.appendChild(badge);
        }
        info.appendChild(meta);

        item.appendChild(info);

        const importBtn = document.createElement("button");
        importBtn.className = "turtle-btn turtle-btn-run turtle-exchange-import-btn";
        importBtn.textContent = "Import";
        importBtn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.importExchangeScript(entry, importBtn);
        });
        item.appendChild(importBtn);

        scriptList.appendChild(item);
      }
    };

    const filterScripts = () => {
      const q = searchInput.value.toLowerCase();
      let filtered = allScripts;
      if (q) {
        filtered = filtered.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q),
        );
      }
      if (activeTags.size > 0) {
        filtered = filtered.filter((s) =>
          s.tags.some((t) => activeTags.has(t)),
        );
      }
      renderScripts(filtered);
    };

    const renderTags = (scripts: ExchangeScriptEntry[]) => {
      tagBar.innerHTML = "";
      const tagSet = new Set<string>();
      for (const s of scripts) {
        for (const t of s.tags) tagSet.add(t);
      }
      for (const tag of [...tagSet].sort()) {
        const btn = document.createElement("button");
        btn.className = "turtle-exchange-tag-filter";
        btn.textContent = tag;
        btn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          if (activeTags.has(tag)) {
            activeTags.delete(tag);
            btn.classList.remove("active");
          } else {
            activeTags.add(tag);
            btn.classList.add("active");
          }
          filterScripts();
        });
        tagBar.appendChild(btn);
      }
    };

    searchInput.addEventListener("input", () => filterScripts());

    // Loading state
    scriptList.innerHTML =
      '<div class="turtle-exchange-loading">Loading community scripts\u2026</div>';

    // Fetch
    this.exchangeClient
      .fetchIndex()
      .then((index) => {
        allScripts = index.scripts;
        renderTags(allScripts);
        renderScripts(allScripts);
      })
      .catch((err) => {
        scriptList.innerHTML = "";
        const errorDiv = document.createElement("div");
        errorDiv.className = "turtle-exchange-error";

        const msg = document.createElement("div");
        msg.textContent =
          err instanceof Error ? err.message : "Failed to load community scripts";
        errorDiv.appendChild(msg);

        const retryBtn = document.createElement("button");
        retryBtn.className = "turtle-btn turtle-btn-secondary";
        retryBtn.textContent = "Retry";
        retryBtn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.closeExchangeBrowser();
          this.openExchangeBrowser();
        });
        errorDiv.appendChild(retryBtn);
        scriptList.appendChild(errorDiv);
      });
  }

  private async importExchangeScript(
    entry: ExchangeScriptEntry,
    btn: HTMLButtonElement,
  ): Promise<void> {
    const origText = btn.textContent;
    btn.textContent = "Loading\u2026";
    btn.disabled = true;

    try {
      const code = await this.exchangeClient.fetchScript(entry);
      this.setScript(code);
      this.closeExchangeBrowser();
    } catch (err) {
      btn.textContent = "Error";
      btn.disabled = false;
      setTimeout(() => {
        btn.textContent = origText;
      }, 2000);
    }
  }

  private closeExchangeBrowser(): void {
    if (this.exchangeOverlay) {
      this.exchangeOverlay.remove();
      this.exchangeOverlay = null;
    }
  }

  destroy(): void {
    this.closeExchangeBrowser();
    this.hide();
  }
}
