import * as Y from "yjs";
import { saveDocument } from "./LocalStorage";

const DEFAULT_DEBOUNCE_MS = 2000;

export class AutoSave {
  private doc: Y.Doc;
  private filePath: string;
  private debounceMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private updateHandler: ((update: Uint8Array, origin: unknown) => void) | null =
    null;
  private saving = false;

  constructor(
    doc: Y.Doc,
    filePath: string,
    debounceMs: number = DEFAULT_DEBOUNCE_MS,
  ) {
    this.doc = doc;
    this.filePath = filePath;
    this.debounceMs = debounceMs;
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

  async saveNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.saving) return;

    this.saving = true;
    try {
      await saveDocument(this.doc, this.filePath);
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
