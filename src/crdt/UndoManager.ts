import * as Y from "yjs";

/**
 * Collaboration-safe undo/redo manager.
 * Wraps Y.UndoManager scoped to the local user's changes on the strokes array.
 * Only reverts strokes from the local origin, leaving remote changes untouched.
 */
export class UndoManager {
  private undoManager: Y.UndoManager;
  private batchDepth = 0;

  constructor(strokes: Y.Array<Y.Map<unknown>>) {
    this.undoManager = new Y.UndoManager(strokes, {
      captureTimeout: 0,
    });
  }

  /**
   * Begin batching subsequent operations into a single undo step.
   * Call {@link endBatch} when the batch is complete.
   * Supports nesting — only the outermost begin/end pair takes effect.
   */
  beginBatch(): void {
    if (this.batchDepth === 0) {
      this.undoManager.stopCapturing();
      this.undoManager.captureTimeout = Number.MAX_SAFE_INTEGER;
    }
    this.batchDepth++;
  }

  /**
   * End a batch started by {@link beginBatch}. The next operation after this
   * will start a new undo step.
   */
  endBatch(): void {
    if (this.batchDepth <= 0) return;
    this.batchDepth--;
    if (this.batchDepth === 0) {
      this.undoManager.captureTimeout = 0;
      this.undoManager.stopCapturing();
    }
  }

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  /** Clears all undo/redo history. */
  clear(): void {
    this.undoManager.clear();
  }

  /**
   * Listen for stack changes (undo/redo availability changed).
   */
  onStackChange(callback: () => void): void {
    this.undoManager.on("stack-item-added", callback);
    this.undoManager.on("stack-item-popped", callback);
  }

  /** Access underlying Y.UndoManager for advanced use. */
  getRawUndoManager(): Y.UndoManager {
    return this.undoManager;
  }
}
