import { ExchangeClient, ExchangeCache } from "../turtle";
import type {
  ExchangeScriptEntry,
  UpdateCheckResult,
  ExchangeSnapshot,
} from "../turtle";
import snapshotData from "../turtle/exchange/exchange-snapshot.json";
import type { DrawfinityDoc } from "../crdt";
import { TurtleEditor } from "./turtle-editor";

export interface TurtlePanelCallbacks {
  /** Called when the user clicks Run. Receives the script text. */
  onRun?: (script: string) => void;
  /** Called when the user clicks Stop. */
  onStop?: () => void;
  /** Called when the speed slider changes. */
  onSpeedChange?: (speed: number) => void;
  /** Called when the user wants to place the turtle on the canvas. */
  onPlaceRequest?: () => void;
  /** Called when the user clicks Share. Receives the script text. */
  onShare?: (script: string) => void;
  /** Called when a REPL command is entered. Returns output/error for display. */
  onReplCommand?: (line: string) => Promise<{ output: string | null; error: string | null }>;
  /** Called when the REPL is reset. */
  onReplReset?: () => Promise<void>;
  /** Called when the REPL drawing is cleared. */
  onReplClear?: () => void;
}

export type TurtleTabName = "script" | "repl";

const STORAGE_KEY_PREFIX = "drawfinity:turtle-script:";
const TAB_STORAGE_KEY = "drawfinity:turtle-tab";

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
  private editor!: TurtleEditor;
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
  private exchangeCache = new ExchangeCache(snapshotData as ExchangeSnapshot);
  private exchangeClient = new ExchangeClient(undefined, this.exchangeCache);
  private exchangeOverlay: HTMLElement | null = null;
  private updateResult: UpdateCheckResult | null = null;
  private scriptsBtnBadge: HTMLElement | null = null;
  private drawfinityDoc: DrawfinityDoc | null = null;
  private shareBtn!: HTMLButtonElement;
  private userDisplayName: string = "Me";
  private docChangeCallback: (() => void) | null = null;
  private exchangeSharedCallback: (() => void) | null = null;

  // Tab state
  private activeTab: TurtleTabName = "script";
  private scriptTabBtn!: HTMLButtonElement;
  private replTabBtn!: HTMLButtonElement;
  private scriptContent!: HTMLElement;
  private replContent!: HTMLElement;
  private scriptBottomBar!: HTMLElement;
  private replBottomBar!: HTMLElement;

  // REPL state
  private replHistory!: HTMLElement;
  private replInput!: HTMLInputElement;
  private replCommandHistory: string[] = [];
  private replHistoryIndex = -1;
  private replExecuting = false;

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

    // Restore active tab preference
    const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
    if (savedTab === "repl" || savedTab === "script") {
      this.switchTab(savedTab);
    }

    // Background update check — fire-and-forget
    this.checkForUpdatesInBackground();
  }

  /**
   * Fire-and-forget background update check.
   * Silently catches errors (e.g., offline) — the user will still see
   * cached/snapshot scripts when they open the browser.
   */
  private checkForUpdatesInBackground(): void {
    this.exchangeClient
      .checkForUpdates()
      .then((result) => {
        this.setUpdateResult(result);
      })
      .catch(() => {
        // Offline or network error — silently ignore.
        // Cached data and snapshot fallback are still available.
      });
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
        this.editor.requestMeasure();
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

    // Title bar with tabs
    const titleBar = document.createElement("div");
    titleBar.className = "turtle-title-bar";

    const title = document.createElement("span");
    title.className = "turtle-title";
    title.textContent = "Turtle Graphics";
    titleBar.appendChild(title);

    // Tab bar
    const tabBar = document.createElement("div");
    tabBar.className = "turtle-tabs";

    this.scriptTabBtn = document.createElement("button");
    this.scriptTabBtn.className = "turtle-tab active";
    this.scriptTabBtn.textContent = "Script";
    this.scriptTabBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.switchTab("script");
    });
    tabBar.appendChild(this.scriptTabBtn);

    this.replTabBtn = document.createElement("button");
    this.replTabBtn.className = "turtle-tab";
    this.replTabBtn.textContent = "REPL";
    this.replTabBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.switchTab("repl");
    });
    tabBar.appendChild(this.replTabBtn);

    titleBar.appendChild(tabBar);

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

    // === Script tab content ===
    this.scriptContent = document.createElement("div");
    this.scriptContent.className = "turtle-content";

    // Left: Code editor
    const editorWrap = document.createElement("div");
    editorWrap.className = "turtle-editor-wrap";

    const editorLabel = document.createElement("div");
    editorLabel.className = "turtle-section-label";
    editorLabel.textContent = "Script";
    editorWrap.appendChild(editorLabel);

    const editorContainer = document.createElement("div");
    editorContainer.className = "turtle-editor";
    this.editor = new TurtleEditor({
      parent: editorContainer,
      onChange: () => this.saveScript(),
      onRun: () => this.handleRun(),
    });
    editorWrap.appendChild(editorContainer);
    this.scriptContent.appendChild(editorWrap);

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
    this.scriptContent.appendChild(consoleWrap);

    this.panel.appendChild(this.scriptContent);

    // === REPL tab content ===
    this.replContent = document.createElement("div");
    this.replContent.className = "turtle-content repl-content";
    this.replContent.style.display = "none";

    this.replHistory = document.createElement("div");
    this.replHistory.className = "repl-history";
    this.replContent.appendChild(this.replHistory);

    const replInputWrap = document.createElement("div");
    replInputWrap.className = "repl-input-wrap";

    const replPromptLabel = document.createElement("span");
    replPromptLabel.className = "repl-prompt";
    replPromptLabel.textContent = ">>>";
    replInputWrap.appendChild(replPromptLabel);

    this.replInput = document.createElement("input");
    this.replInput.className = "repl-input";
    this.replInput.type = "text";
    this.replInput.placeholder = "Enter Lua command...";
    this.replInput.spellcheck = false;
    this.replInput.addEventListener("keydown", (e) => this.handleReplKeydown(e));
    replInputWrap.appendChild(this.replInput);
    this.replContent.appendChild(replInputWrap);

    this.panel.appendChild(this.replContent);

    // === Script bottom bar ===
    this.scriptBottomBar = document.createElement("div");
    this.scriptBottomBar.className = "turtle-bottom-bar";

    // Run button
    this.runBtn = document.createElement("button");
    this.runBtn.className = "turtle-btn turtle-btn-run";
    this.runBtn.textContent = "\u25b6 Run";
    this.runBtn.title = "Run script (Ctrl+Enter)";
    this.runBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleRun();
    });
    this.scriptBottomBar.appendChild(this.runBtn);

    // Stop button
    this.stopBtn = document.createElement("button");
    this.stopBtn.className = "turtle-btn turtle-btn-stop";
    this.stopBtn.textContent = "\u25a0 Stop";
    this.stopBtn.disabled = true;
    this.stopBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onStop?.();
    });
    this.scriptBottomBar.appendChild(this.stopBtn);

    // Place button — click to place turtle origin on canvas
    this.placeBtn = document.createElement("button");
    this.placeBtn.className = "turtle-btn turtle-btn-secondary";
    this.placeBtn.textContent = "\u{1F4CD} Place";
    this.placeBtn.title = "Click on canvas to set turtle starting position";
    this.placeBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onPlaceRequest?.();
    });
    this.scriptBottomBar.appendChild(this.placeBtn);

    // Share button
    this.shareBtn = document.createElement("button");
    this.shareBtn.className = "turtle-btn turtle-btn-secondary turtle-btn-share";
    this.shareBtn.textContent = "Share";
    this.shareBtn.title = "Share script with collaborators";
    this.shareBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleShare();
    });
    this.scriptBottomBar.appendChild(this.shareBtn);

    // Unified script browser button
    const scriptsBtnWrap = document.createElement("div");
    scriptsBtnWrap.className = "turtle-scripts-btn-wrap";

    const scriptsBtn = document.createElement("button");
    scriptsBtn.className = "turtle-btn turtle-btn-secondary";
    scriptsBtn.textContent = "Scripts";
    scriptsBtn.title = "Browse turtle scripts";
    scriptsBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.openExchangeBrowser();
    });

    const badge = document.createElement("span");
    badge.className = "turtle-scripts-badge";
    badge.style.display = "none";
    this.scriptsBtnBadge = badge;
    scriptsBtn.appendChild(badge);

    scriptsBtnWrap.appendChild(scriptsBtn);
    this.scriptBottomBar.appendChild(scriptsBtnWrap);

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

    this.scriptBottomBar.appendChild(speedWrap);

    // Spacer
    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    this.scriptBottomBar.appendChild(spacer);

    // Clear Console button
    this.clearConsoleBtn = document.createElement("button");
    this.clearConsoleBtn.className = "turtle-btn turtle-btn-secondary";
    this.clearConsoleBtn.textContent = "Clear Console";
    this.clearConsoleBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.clearConsole();
    });
    this.scriptBottomBar.appendChild(this.clearConsoleBtn);

    this.panel.appendChild(this.scriptBottomBar);

    // === REPL bottom bar ===
    this.replBottomBar = document.createElement("div");
    this.replBottomBar.className = "turtle-bottom-bar";
    this.replBottomBar.style.display = "none";

    const replResetBtn = document.createElement("button");
    replResetBtn.className = "turtle-btn turtle-btn-secondary repl-reset-btn";
    replResetBtn.textContent = "Reset";
    replResetBtn.title = "Reset REPL state and turtle position";
    replResetBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleReplReset();
    });
    this.replBottomBar.appendChild(replResetBtn);

    const replClearBtn = document.createElement("button");
    replClearBtn.className = "turtle-btn turtle-btn-secondary repl-clear-btn";
    replClearBtn.textContent = "Clear Drawing";
    replClearBtn.title = "Clear strokes drawn by REPL";
    replClearBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onReplClear?.();
      this.appendReplEntry(null, "Drawing cleared.", null);
    });
    this.replBottomBar.appendChild(replClearBtn);

    const replSpacer = document.createElement("div");
    replSpacer.style.flex = "1";
    this.replBottomBar.appendChild(replSpacer);

    const replClearHistoryBtn = document.createElement("button");
    replClearHistoryBtn.className = "turtle-btn turtle-btn-secondary";
    replClearHistoryBtn.textContent = "Clear History";
    replClearHistoryBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.replHistory.innerHTML = "";
    });
    this.replBottomBar.appendChild(replClearHistoryBtn);

    this.panel.appendChild(this.replBottomBar);
  }

  /** Switch between Script and REPL tabs. */
  switchTab(tab: TurtleTabName): void {
    this.activeTab = tab;
    localStorage.setItem(TAB_STORAGE_KEY, tab);

    if (tab === "script") {
      this.scriptTabBtn.classList.add("active");
      this.replTabBtn.classList.remove("active");
      this.scriptContent.style.display = "";
      this.replContent.style.display = "none";
      this.scriptBottomBar.style.display = "";
      this.replBottomBar.style.display = "none";
    } else {
      this.scriptTabBtn.classList.remove("active");
      this.replTabBtn.classList.add("active");
      this.scriptContent.style.display = "none";
      this.replContent.style.display = "";
      this.scriptBottomBar.style.display = "none";
      this.replBottomBar.style.display = "";
      this.replInput.focus();
    }
  }

  /** Get the active tab name. */
  getActiveTab(): TurtleTabName {
    return this.activeTab;
  }

  private handleReplKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      const line = this.replInput.value.trim();
      if (!line || this.replExecuting) return;
      this.replCommandHistory.push(line);
      this.replHistoryIndex = -1;
      this.replInput.value = "";
      this.executeReplCommand(line);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.replCommandHistory.length === 0) return;
      if (this.replHistoryIndex === -1) {
        this.replHistoryIndex = this.replCommandHistory.length - 1;
      } else if (this.replHistoryIndex > 0) {
        this.replHistoryIndex--;
      }
      this.replInput.value = this.replCommandHistory[this.replHistoryIndex];
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.replHistoryIndex === -1) return;
      if (this.replHistoryIndex < this.replCommandHistory.length - 1) {
        this.replHistoryIndex++;
        this.replInput.value = this.replCommandHistory[this.replHistoryIndex];
      } else {
        this.replHistoryIndex = -1;
        this.replInput.value = "";
      }
    }
  }

  private async executeReplCommand(line: string): Promise<void> {
    if (!this.callbacks.onReplCommand) {
      this.appendReplEntry(line, null, "REPL not connected");
      return;
    }

    this.replExecuting = true;
    this.replInput.disabled = true;

    try {
      const result = await this.callbacks.onReplCommand(line);
      this.appendReplEntry(line, result.output, result.error);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.appendReplEntry(line, null, msg);
    } finally {
      this.replExecuting = false;
      this.replInput.disabled = false;
      this.replInput.focus();
    }
  }

  private appendReplEntry(
    command: string | null,
    output: string | null,
    error: string | null,
  ): void {
    const entry = document.createElement("div");
    entry.className = "repl-entry";

    if (command !== null) {
      const cmdLine = document.createElement("div");
      cmdLine.className = "repl-command";
      const prompt = document.createElement("span");
      prompt.className = "repl-prompt";
      prompt.textContent = ">>>";
      cmdLine.appendChild(prompt);
      const cmdText = document.createElement("span");
      cmdText.textContent = " " + command;
      cmdLine.appendChild(cmdText);
      entry.appendChild(cmdLine);
    }

    if (output !== null) {
      const outputLine = document.createElement("div");
      outputLine.className = "repl-output";
      outputLine.textContent = output;
      entry.appendChild(outputLine);
    }

    if (error !== null) {
      const errorLine = document.createElement("div");
      errorLine.className = "repl-error";
      errorLine.textContent = error;
      entry.appendChild(errorLine);
    }

    this.replHistory.appendChild(entry);
    this.replHistory.scrollTop = this.replHistory.scrollHeight;
  }

  private async handleReplReset(): Promise<void> {
    if (this.callbacks.onReplReset) {
      await this.callbacks.onReplReset();
    }
    this.replHistory.innerHTML = "";
    this.replCommandHistory = [];
    this.replHistoryIndex = -1;
    this.appendReplEntry(null, "REPL reset.", null);
  }

  private handleRun(): void {
    const script = this.editor.getValue().trim();
    if (!script) return;
    this.callbacks.onRun?.(script);
  }

  private handleShare(): void {
    const script = this.editor.getValue().trim();
    if (!script) return;
    if (!this.drawfinityDoc) {
      this.appendConsole("Share requires a collaborative session", "error");
      return;
    }
    const id = `shared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const firstLine = script.split("\n")[0].replace(/^--\s*/, "").trim();
    const title = firstLine.length > 0 && firstLine.length <= 60 ? firstLine : "Shared Script";
    this.drawfinityDoc.shareScript({
      id,
      title,
      code: script,
      author: this.userDisplayName,
      sharedAt: Date.now(),
    });
    this.appendConsole("Script shared with collaborators", "info");
    this.callbacks.onShare?.(script);
  }

  /**
   * Connect the panel to a DrawfinityDoc for shared script support.
   * Listens for changes and shows notifications when scripts are shared.
   */
  setDrawfinityDoc(doc: DrawfinityDoc | null): void {
    // Clean up previous listener
    if (this.drawfinityDoc && this.docChangeCallback) {
      this.drawfinityDoc.offSharedScriptsChanged(this.docChangeCallback);
      this.docChangeCallback = null;
    }
    this.drawfinityDoc = doc;
    if (doc) {
      let previousIds = new Set(doc.getSharedScripts().map((s) => s.id));
      this.docChangeCallback = () => {
        const currentScripts = doc.getSharedScripts();
        const currentIds = new Set(currentScripts.map((s) => s.id));
        for (const script of currentScripts) {
          if (!previousIds.has(script.id)) {
            this.appendConsole(
              `${script.author} shared a turtle script: "${script.title}"`,
              "info",
            );
          }
        }
        previousIds = currentIds;
      };
      doc.onSharedScriptsChanged(this.docChangeCallback);
    }
  }

  /**
   * Set the display name used when sharing scripts.
   */
  setUserDisplayName(name: string): void {
    this.userDisplayName = name;
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
    return this.editor.getValue();
  }

  /** Set the editor content. */
  setScript(script: string): void {
    this.editor.setValue(script, true);
    this.saveScript();
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.panel.style.height = `${this.panelHeight}px`;
    document.body.appendChild(this.overlay);
    if (this.activeTab === "repl") {
      this.replInput.focus();
    } else {
      this.editor.focus();
    }
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
    localStorage.setItem(key, this.editor.getValue());
  }

  private loadScript(): void {
    const key = STORAGE_KEY_PREFIX + this.drawingId;
    const saved = localStorage.getItem(key);
    if (saved) {
      this.editor.setValue(saved);
    }
  }

  /** Determine the status of a script relative to the local cache and update results. */
  private getScriptStatus(
    entry: ExchangeScriptEntry,
  ): "installed" | "update-available" | "available" {
    // Check update result first for update-available status
    if (this.updateResult) {
      const isUpdated = this.updateResult.updatedScripts.some(
        (u) => u.entry.id === entry.id,
      );
      if (isUpdated) return "update-available";
    }
    const cached = this.exchangeCache.getCachedScript(entry.id);
    if (cached) return "installed";
    return "available";
  }

  /** Get scripts from cache (which automatically falls back to bundled snapshot). */
  private getScriptsFromCacheOrSnapshot(): ExchangeScriptEntry[] {
    const cachedIndex = this.exchangeCache.getCachedIndex();
    if (cachedIndex && cachedIndex.scripts.length > 0) {
      return cachedIndex.scripts;
    }
    return [];
  }

  /** Notify the panel of update check results and show badge if updates exist. */
  setUpdateResult(result: UpdateCheckResult): void {
    this.updateResult = result;
    if (this.scriptsBtnBadge) {
      const count =
        result.newScripts.length + result.updatedScripts.length;
      if (count > 0) {
        this.scriptsBtnBadge.textContent = String(count);
        this.scriptsBtnBadge.style.display = "";
      } else {
        this.scriptsBtnBadge.style.display = "none";
      }
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
    titleEl.textContent = "Turtle Scripts";
    header.appendChild(titleEl);

    // Update All button (shown only when updates exist)
    const updateAllBtn = document.createElement("button");
    updateAllBtn.className = "turtle-btn turtle-btn-run turtle-exchange-update-all-btn";
    updateAllBtn.textContent = "Update All";
    updateAllBtn.style.display = "none";
    header.appendChild(updateAllBtn);

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

    // Shared Scripts section (from Yjs doc)
    const sharedSection = document.createElement("div");
    sharedSection.className = "turtle-shared-scripts-section";
    container.appendChild(sharedSection);

    const renderSharedScripts = () => {
      sharedSection.innerHTML = "";
      if (!this.drawfinityDoc) return;
      const shared = this.drawfinityDoc.getSharedScripts();
      if (shared.length === 0) return;

      const sharedLabel = document.createElement("div");
      sharedLabel.className = "turtle-exchange-title turtle-shared-scripts-label";
      sharedLabel.textContent = "Shared Scripts";
      sharedSection.appendChild(sharedLabel);

      const sharedList = document.createElement("div");
      sharedList.className = "turtle-exchange-list turtle-shared-scripts-list";

      for (const script of shared) {
        const item = document.createElement("div");
        item.className = "turtle-exchange-item turtle-shared-script-item";

        const info = document.createElement("div");
        info.className = "turtle-exchange-item-info";

        const titleLine = document.createElement("div");
        titleLine.className = "turtle-exchange-item-title";
        const titleText = document.createElement("span");
        titleText.textContent = script.title;
        titleLine.appendChild(titleText);

        const sharedBadge = document.createElement("span");
        sharedBadge.className = "turtle-exchange-status turtle-exchange-status-shared";
        sharedBadge.textContent = "Shared";
        titleLine.appendChild(sharedBadge);

        info.appendChild(titleLine);

        const meta = document.createElement("div");
        meta.className = "turtle-exchange-item-meta";
        const authorSpan = document.createElement("span");
        authorSpan.className = "turtle-exchange-item-author";
        authorSpan.textContent = `by ${script.author}`;
        meta.appendChild(authorSpan);
        const dateSpan = document.createElement("span");
        dateSpan.className = "turtle-exchange-item-date";
        dateSpan.textContent = new Date(script.sharedAt).toLocaleString();
        meta.appendChild(dateSpan);
        info.appendChild(meta);

        item.appendChild(info);

        const runBtn = document.createElement("button");
        runBtn.className = "turtle-btn turtle-btn-run turtle-shared-run-btn";
        runBtn.textContent = "Run Shared";
        runBtn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.setScript(script.code);
          this.closeExchangeBrowser();
          this.callbacks.onRun?.(script.code);
        });
        item.appendChild(runBtn);

        sharedList.appendChild(item);
      }

      sharedSection.appendChild(sharedList);
    };

    renderSharedScripts();
    if (this.drawfinityDoc) {
      // Clean up previous exchange browser listener if any
      if (this.exchangeSharedCallback) {
        this.drawfinityDoc.offSharedScriptsChanged(this.exchangeSharedCallback);
      }
      this.exchangeSharedCallback = () => renderSharedScripts();
      this.drawfinityDoc.onSharedScriptsChanged(this.exchangeSharedCallback);
    }

    // Footer with repo link
    const footer = document.createElement("div");
    footer.className = "turtle-exchange-footer";
    footer.innerHTML =
      'Browse the full collection and contribute scripts at <a href="https://github.com/needmorecowbell/drawfinity_turtle_exchange" target="_blank" rel="noopener noreferrer">needmorecowbell/drawfinity_turtle_exchange</a>';
    container.appendChild(footer);

    overlay.appendChild(container);
    this.panel.appendChild(overlay);

    // State
    let allScripts: ExchangeScriptEntry[] = [];
    const activeTags = new Set<string>();

    const renderScripts = (scripts: ExchangeScriptEntry[]) => {
      scriptList.innerHTML = "";
      if (scripts.length === 0) {
        const empty = document.createElement("div");
        empty.className = "turtle-exchange-empty";
        empty.textContent = "No scripts match your search";
        scriptList.appendChild(empty);
        return;
      }

      let hasUpdates = false;

      for (const entry of scripts) {
        const status = this.getScriptStatus(entry);
        if (status === "update-available") hasUpdates = true;

        const item = document.createElement("div");
        item.className = "turtle-exchange-item";

        const info = document.createElement("div");
        info.className = "turtle-exchange-item-info";

        const titleLine = document.createElement("div");
        titleLine.className = "turtle-exchange-item-title";

        const titleText = document.createElement("span");
        titleText.textContent = entry.title;
        titleLine.appendChild(titleText);

        // Status badge
        const statusBadge = document.createElement("span");
        statusBadge.className = `turtle-exchange-status turtle-exchange-status-${status}`;
        if (status === "installed") {
          statusBadge.textContent = "Installed";
        } else if (status === "update-available") {
          statusBadge.textContent = "Update Available";
        }
        // "available" scripts show no badge — they just show "Import"
        if (status !== "available") {
          titleLine.appendChild(statusBadge);
        }

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
          const tagBadge = document.createElement("span");
          tagBadge.className = "turtle-exchange-tag-badge";
          tagBadge.textContent = tag;
          meta.appendChild(tagBadge);
        }
        info.appendChild(meta);

        item.appendChild(info);

        // Action button depends on status
        const actionBtn = document.createElement("button");
        actionBtn.className = "turtle-btn turtle-exchange-import-btn";
        if (status === "update-available") {
          actionBtn.className += " turtle-btn-update";
          actionBtn.textContent = "Update";
        } else if (status === "installed") {
          actionBtn.className += " turtle-btn-secondary";
          actionBtn.textContent = "Import";
        } else {
          actionBtn.className += " turtle-btn-run";
          actionBtn.textContent = "Import";
        }
        actionBtn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.importExchangeScript(entry, actionBtn, renderAfterFilter);
        });
        item.appendChild(actionBtn);

        scriptList.appendChild(item);
      }

      updateAllBtn.style.display = hasUpdates ? "" : "none";
    };

    const renderAfterFilter = () => filterScripts();

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

    // Update All handler
    updateAllBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.updateAllScripts(renderAfterFilter);
    });

    // Start with cached/snapshot data immediately, then try fetching fresh
    const fallbackScripts = this.getScriptsFromCacheOrSnapshot();

    if (fallbackScripts.length > 0) {
      allScripts = fallbackScripts;
      renderTags(allScripts);
      renderScripts(allScripts);
    } else {
      scriptList.innerHTML =
        '<div class="turtle-exchange-loading">Loading scripts\u2026</div>';
    }

    // Fetch fresh data in background
    this.exchangeClient
      .fetchIndex()
      .then((index) => {
        allScripts = index.scripts;
        renderTags(allScripts);
        filterScripts();
      })
      .catch((err) => {
        // If we already have fallback data, just silently use it
        if (fallbackScripts.length > 0) return;
        scriptList.innerHTML = "";
        const errorDiv = document.createElement("div");
        errorDiv.className = "turtle-exchange-error";

        const msg = document.createElement("div");
        msg.textContent =
          err instanceof Error ? err.message : "Failed to load scripts";
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
    onUpdate?: () => void,
  ): Promise<void> {
    const cached = this.exchangeCache.getCachedScript(entry.id);
    const status = this.getScriptStatus(entry);

    // Fast path: already installed and not outdated — use cache directly
    if (cached && status !== "update-available") {
      this.setScript(cached.code);
      this.closeExchangeBrowser();
      return;
    }

    const origText = btn.textContent;
    btn.textContent = "Loading\u2026";
    btn.disabled = true;

    const slowTimer = setTimeout(() => {
      btn.textContent = "Loading\u2026 (slow)";
    }, 2000);

    try {
      const code = await this.exchangeClient.fetchScript(entry);
      clearTimeout(slowTimer);
      this.setScript(code);

      // If this was an update, remove from update result and re-render
      if (this.updateResult) {
        this.updateResult.updatedScripts = this.updateResult.updatedScripts.filter(
          (u) => u.entry.id !== entry.id,
        );
        this.updateResult.newScripts = this.updateResult.newScripts.filter(
          (s) => s.id !== entry.id,
        );
        this.updateResult.hasUpdates =
          this.updateResult.updatedScripts.length > 0 ||
          this.updateResult.newScripts.length > 0;
        this.setUpdateResult(this.updateResult);
      }
      onUpdate?.();
      this.closeExchangeBrowser();
    } catch {
      clearTimeout(slowTimer);
      // Update failed but we have a cached version — use it
      if (cached) {
        this.setScript(cached.code);
        this.closeExchangeBrowser();
        return;
      }

      btn.textContent = "Offline";
      btn.disabled = false;
      setTimeout(() => {
        btn.textContent = origText;
      }, 2000);
    }
  }

  private async updateAllScripts(onUpdate?: () => void): Promise<void> {
    if (!this.updateResult) return;
    const toUpdate = [
      ...this.updateResult.updatedScripts.map((u) => u.entry),
      ...this.updateResult.newScripts,
    ];
    for (const entry of toUpdate) {
      try {
        await this.exchangeClient.fetchScript(entry);
      } catch {
        // Skip failed scripts silently
      }
    }
    // Clear update state
    this.updateResult = {
      hasUpdates: false,
      newScripts: [],
      updatedScripts: [],
      remoteIndex: this.updateResult.remoteIndex,
    };
    this.setUpdateResult(this.updateResult);
    onUpdate?.();
  }

  private closeExchangeBrowser(): void {
    if (this.exchangeSharedCallback && this.drawfinityDoc) {
      this.drawfinityDoc.offSharedScriptsChanged(this.exchangeSharedCallback);
      this.exchangeSharedCallback = null;
    }
    if (this.exchangeOverlay) {
      this.exchangeOverlay.remove();
      this.exchangeOverlay = null;
    }
  }

  destroy(): void {
    if (this.drawfinityDoc && this.docChangeCallback) {
      this.drawfinityDoc.offSharedScriptsChanged(this.docChangeCallback);
      this.docChangeCallback = null;
    }
    this.closeExchangeBrowser();
    this.hide();
    this.editor.destroy();
  }
}
