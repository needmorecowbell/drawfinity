import * as Y from "yjs";
import { saveDocument } from "./LocalStorage";
import type { DrawingManager } from "./DrawingManager";

const DEFAULT_DEBOUNCE_MS = 2000;

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

  constructor(
    doc: Y.Doc,
    filePath: string,
    debounceMs?: number,
  );
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

  start(): void {
    if (this.updateHandler) return; // already started

    this.updateHandler = () => {
      this.scheduleSave();
    };
    this.doc.on("update", this.updateHandler);
  }

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

  setFilePath(filePath: string): void {
    this.filePath = filePath;
  }

  getFilePath(): string {
    return this.filePath;
  }

  setDrawingId(drawingId: string): void {
    this.drawingId = drawingId;
  }

  getDrawingId(): string | null {
    return this.drawingId;
  }

  setDrawingManager(manager: DrawingManager): void {
    this.drawingManager = manager;
  }

  async saveNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.saving) return;

    this.saving = true;
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
    }
  }

  private scheduleSave(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.saveNow();
    }, this.debounceMs);
  }
}
