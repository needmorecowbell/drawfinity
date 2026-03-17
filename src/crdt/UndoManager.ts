import * as Y from "yjs";

/**
 * Collaboration-safe undo/redo manager.
 * Wraps Y.UndoManager scoped to the local user's changes on the strokes array.
 * Only reverts strokes from the local origin, leaving remote changes untouched.
 */
export class UndoManager {
  private undoManager: Y.UndoManager;

  constructor(strokes: Y.Array<Y.Map<unknown>>) {
    this.undoManager = new Y.UndoManager(strokes, {
      captureTimeout: 0,
    });
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
