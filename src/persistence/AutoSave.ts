import * as Y from "yjs";
import { saveDocument } from "./LocalStorage";
import type { DrawingManager } from "./DrawingManager";

/** Default debounce interval in milliseconds before triggering a save. */
const DEFAULT_DEBOUNCE_MS = 2000;

/**
 * Manages automatic persistence of a Yjs document by listening for CRDT updates
 * and saving after a debounce interval. Supports two persistence modes: direct
 * file-based saving via {@link saveDocument}, or managed saving through a
 * {@link DrawingManager} instance when a drawing ID is provided.
 *
 * Call {@link start} to begin listening for document changes and {@link stop}
 * to tear down the listener and cancel any pending saves. Use {@link saveNow}
 * to flush immediately (e.g., before closing a drawing).
 *
 * @example
 * ```ts
 * // File-based auto-save
 * const autoSave = new AutoSave(doc, "/path/to/file.ydoc");
 * autoSave.start();
 * // ... user edits trigger debounced saves ...
 * await autoSave.saveNow(); // flush before closing
 * autoSave.stop();
 *
 * // DrawingManager-based auto-save
 * const autoSave = new AutoSave(doc, filePath, 2000, drawingId, drawingManager);
 * autoSave.start();
 * ```
 */
export class AutoSave {
  private doc: Y.Doc;
  private filePath: string;
  private drawingId: string | null;
  private drawingManager: DrawingManager | null;
  private debounceMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private updateHandler: ((update: Uint8Array, origin: unknown) => void) | null =
    null;
  private saving = false;
  private savePromise: Promise<void> | null = null;

  /**
   * Creates an AutoSave instance for direct file-based persistence.
   *
   * @param doc - The Yjs document to monitor for changes.
   * @param filePath - Filesystem path where the document state will be saved.
   * @param debounceMs - Milliseconds to wait after the last change before saving (default: 2000).
   */
  constructor(
    doc: Y.Doc,
    filePath: string,
    debounceMs?: number,
  );
  /**
   * Creates an AutoSave instance that persists through a {@link DrawingManager}.
   *
   * @param doc - The Yjs document to monitor for changes.
   * @param filePath - Filesystem path for the drawing file.
   * @param debounceMs - Milliseconds to wait after the last change before saving.
   * @param drawingId - Unique identifier of the drawing within the DrawingManager.
   * @param drawingManager - The DrawingManager instance used to persist state.
   */
  constructor(
    doc: Y.Doc,
    filePath: string,
    debounceMs: number,
    drawingId: string,
    drawingManager: DrawingManager,
  );
  constructor(
    doc: Y.Doc,
    filePath: string,
    debounceMs: number = DEFAULT_DEBOUNCE_MS,
    drawingId?: string,
    drawingManager?: DrawingManager,
  ) {
    this.doc = doc;
    this.filePath = filePath;
    this.debounceMs = debounceMs;
    this.drawingId = drawingId ?? null;
    this.drawingManager = drawingManager ?? null;
  }

  /**
   * Begins listening for Yjs document updates and scheduling debounced saves.
   * Calling `start()` when already started is a no-op.
   */
  start(): void {
    if (this.updateHandler) return; // already started

    this.updateHandler = () => {
      this.scheduleSave();
    };
    this.doc.on("update", this.updateHandler);
  }

  /**
   * Stops listening for document updates and cancels any pending debounced save.
   * Safe to call when already stopped.
   */
  stop(): void {
    if (this.updateHandler) {
      this.doc.off("update", this.updateHandler);
      this.updateHandler = null;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Updates the filesystem path used for saving.
   *
   * @param filePath - New path where the document state will be written.
   */
  setFilePath(filePath: string): void {
    this.filePath = filePath;
  }

  /**
   * Returns the current filesystem path used for saving.
   *
   * @returns The file path for document persistence.
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Sets the drawing identifier used for DrawingManager-based persistence.
   *
   * @param drawingId - Unique identifier of the drawing.
   */
  setDrawingId(drawingId: string): void {
    this.drawingId = drawingId;
  }

  /**
   * Returns the current drawing identifier, or `null` if not set.
   *
   * @returns The drawing ID, or `null` when using file-based persistence without a DrawingManager.
   */
  getDrawingId(): string | null {
    return this.drawingId;
  }

  /**
   * Assigns a {@link DrawingManager} for managed persistence. When both a drawing ID
   * and DrawingManager are set, saves go through the manager instead of direct file I/O.
   *
   * @param manager - The DrawingManager instance to use for saving.
   */
  setDrawingManager(manager: DrawingManager): void {
    this.drawingManager = manager;
  }

  /**
   * Immediately persists the current document state, cancelling any pending debounced save.
   * If a save is already in progress, the call is silently skipped to prevent concurrent writes.
   * Errors during persistence are logged to the console but do not throw.
   *
   * @returns A promise that resolves when the save completes (or is skipped).
   */
  async saveNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // If a save is already in progress, wait for it then do another save
    // to ensure the latest state is persisted
    if (this.saving && this.savePromise) {
      await this.savePromise;
    }

    this.saving = true;
    this.savePromise = (async () => {
      try {
        if (this.drawingId && this.drawingManager) {
          const state = Y.encodeStateAsUpdate(this.doc);
          await this.drawingManager.saveDrawing(this.drawingId, state);
        } else {
          await saveDocument(this.doc, this.filePath);
        }
      } catch (err) {
        console.error("AutoSave: failed to save document", err);
      } finally {
        this.saving = false;
        this.savePromise = null;
      }
    })();
    await this.savePromise;
  }

  private scheduleSave(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.saveNow().catch(() => {});
    }, this.debounceMs);
  }
}
