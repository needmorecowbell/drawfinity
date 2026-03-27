import { ReplRuntime, ReplResult } from "./ReplRuntime";
import { TurtleRegistry } from "./TurtleRegistry";
import { TurtleAwareness } from "./TurtleAwareness";
import type { TurtleCommand } from "./LuaRuntime";
import type { DocumentModel } from "../model/Stroke";
import type { SyncManager } from "../sync/SyncManager";

/** Result returned to the REPL UI after executing a command. */
export interface ReplCommandResult {
  output: string | null;
  error: string | null;
}

/**
 * Orchestrates REPL command execution: holds a persistent `ReplRuntime`,
 * wires it to the main turtle's state and drawing, and instantly replays
 * any commands produced by each line.
 *
 * Unlike `TurtleExecutor` (which animates playback), `ReplExecutor`
 * always replays at speed 0 (instant) so the REPL feels responsive.
 */
export class ReplExecutor {
  private runtime: ReplRuntime;
  private registry: TurtleRegistry;
  private scriptId: string;
  private doc: DocumentModel;
  private awareness: TurtleAwareness | null = null;
  private initialized = false;

  constructor(
    registry: TurtleRegistry,
    scriptId: string,
    doc: DocumentModel,
  ) {
    this.runtime = new ReplRuntime();
    this.registry = registry;
    this.scriptId = scriptId;
    this.doc = doc;
  }

  /**
   * Initialize the REPL executor: creates the Lua engine, ensures the
   * main turtle exists, and wires the runtime to the turtle state.
   */
  async init(): Promise<void> {
    await this.runtime.init();
    this.ensureMainTurtle();
    this.wireRuntime();
    this.initialized = true;
  }

  /**
   * Attach a SyncManager for multiplayer turtle awareness broadcasting.
   * When set, turtle states are broadcast after each command execution.
   */
  setSyncManager(syncManager: SyncManager | null): void {
    if (syncManager) {
      this.awareness = new TurtleAwareness(
        syncManager,
        this.registry,
        this.scriptId,
      );
    } else {
      this.awareness = null;
    }
  }

  /**
   * Execute a single REPL command. Runs the line through ReplRuntime,
   * then instantly replays any collected commands against the turtle state
   * and drawing. Returns output/error for display in the REPL UI.
   */
  async executeCommand(line: string): Promise<ReplCommandResult> {
    if (!this.initialized) {
      return { output: null, error: "REPL executor not initialized" };
    }

    const result: ReplResult = await this.runtime.executeLine(line);

    // Instantly replay commands against the turtle state and drawing
    if (result.commands.length > 0) {
      this.replayInstant(result.commands);
    }

    // Broadcast updated turtle position
    this.awareness?.forceUpdate();

    return {
      output: result.output,
      error: result.error,
    };
  }

  /**
   * Reset the REPL runtime and turtle state. Clears all Lua state
   * (variables, functions) and resets the turtle to its initial position.
   * Does NOT clear drawn strokes — use `clearDrawing()` for that.
   */
  async reset(): Promise<void> {
    await this.runtime.reset();
    const mainId = `${this.scriptId}:main`;
    const entry = this.registry.get(mainId);
    if (entry) {
      entry.state.reset();
    }
    this.wireRuntime();
    this.awareness?.clear();
  }

  /**
   * Clear all strokes drawn by the REPL session's main turtle.
   */
  clearDrawing(): void {
    const mainId = `${this.scriptId}:main`;
    const entry = this.registry.get(mainId);
    if (entry) {
      entry.drawing.clearTurtleStrokes();
    }
  }

  /**
   * Destroy the REPL executor, releasing the Lua engine.
   * After calling this, the executor cannot be used until `init()` is called.
   */
  destroy(): void {
    this.runtime.destroy();
    this.awareness?.clear();
    this.initialized = false;
  }

  /** Get the main turtle's state (for external queries like indicator position). */
  getMainState() {
    const mainId = `${this.scriptId}:main`;
    return this.registry.get(mainId)?.state ?? null;
  }

  /**
   * Ensure the main turtle exists in the registry. Creates it on first
   * call; subsequent calls return the existing entry.
   */
  private ensureMainTurtle(): string {
    const mainId = `${this.scriptId}:main`;
    if (!this.registry.has(mainId)) {
      this.registry.createMain(this.scriptId, this.doc);
    }
    return mainId;
  }

  /** Wire the ReplRuntime to the main turtle's state query. */
  private wireRuntime(): void {
    const mainId = `${this.scriptId}:main`;
    const entry = this.registry.get(mainId);
    if (entry) {
      this.runtime.setStateQuery(entry.state);
    }
  }

  /**
   * Replay commands instantly (speed 0) against the main turtle's state
   * and drawing. Simplified version of TurtleExecutor's replay — no
   * animation delays, no multi-turtle interleaving, no spawn handling.
   */
  private replayInstant(commands: TurtleCommand[]): void {
    const mainId = `${this.scriptId}:main`;
    const entry = this.registry.get(mainId);
    if (!entry) return;

    for (const cmd of commands) {
      if (cmd.type === "print" || cmd.type === "step_boundary") {
        continue;
      }

      if (cmd.type === "clear") {
        entry.drawing.clearTurtleStrokes();
        continue;
      }

      if (cmd.type === "hide" || cmd.type === "show") {
        entry.state.applyCommand(cmd);
        continue;
      }

      const segment = entry.state.applyCommand(cmd);
      if (segment) {
        if (entry.state.penMode === "erase") {
          entry.drawing.flush();
          const eraseScale = entry.state.worldSpace
            ? 1
            : Math.max(1e-3, Math.min(1e3, entry.state.zoomScale));
          const radius = (entry.state.pen.width * eraseScale) / 2;
          entry.drawing.eraseAlongSegment(segment, radius, null);
        } else {
          // Always batch at speed 0 for instant replay
          entry.drawing.addSegment(segment, true);
        }
      }
    }

    // Flush any remaining batched segments
    entry.drawing.flush();
  }
}
