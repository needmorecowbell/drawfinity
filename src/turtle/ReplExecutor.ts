import { ReplRuntime, ReplResult } from "./ReplRuntime";
import { TurtleRegistry } from "./TurtleRegistry";
import { TurtleAwareness } from "./TurtleAwareness";
import { MessageBus, Blackboard } from "./TurtleMessaging";
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
  private messageBus = new MessageBus();
  private blackboard = new Blackboard();
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

    // Collect print messages before replay (which consumes the commands)
    const printMessages: string[] = [];
    for (const cmd of result.commands) {
      if (cmd.type === "print") {
        printMessages.push(cmd.message);
      }
    }

    // Instantly replay commands against the turtle state and drawing
    if (result.commands.length > 0) {
      this.replayInstant(result.commands);
    }

    // Broadcast updated turtle position
    this.awareness?.forceUpdate();

    // Combine print output and expression return value
    const parts: string[] = [];
    if (printMessages.length > 0) parts.push(printMessages.join("\n"));
    if (result.output !== null) parts.push(result.output);
    const output = parts.length > 0 ? parts.join("\n") : null;

    return {
      output,
      error: result.error,
    };
  }

  /**
   * Reset the REPL runtime and turtle state. Clears all Lua state
   * (variables, functions) and resets the turtle to its initial position.
   * Does NOT clear drawn strokes — use `clearDrawing()` for that.
   */
  async reset(): Promise<void> {
    this.clearSpawnedTurtles();
    await this.runtime.reset();
    const mainId = `${this.scriptId}:main`;
    const entry = this.registry.get(mainId);
    if (entry) {
      entry.state.reset();
    }
    this.messageBus.clear();
    this.blackboard.clear();
    this.wireRuntime();
    this.awareness?.clear();
  }

  /**
   * Clear all strokes drawn by the REPL session (main + spawned turtles).
   */
  clearDrawing(): void {
    for (const [, entry] of this.registry.getOwned(this.scriptId)) {
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

  /** Wire the ReplRuntime to turtle state, spawn context, and messaging. */
  private wireRuntime(): void {
    const mainId = `${this.scriptId}:main`;
    const entry = this.registry.get(mainId);
    if (entry) {
      this.runtime.setStateQuery(entry.state);
    }
    this.runtime.setSpawnContext(this.registry, this.scriptId, this.doc);
    this.runtime.setMessagingContext(this.messageBus, this.blackboard);
    this.messageBus.register(mainId);
  }

  /**
   * Replay commands instantly (speed 0) against turtle state and drawing.
   * Supports spawn/kill/killall and routes commands to the correct turtle
   * by turtleId, mirroring TurtleExecutor's replay logic without animation.
   */
  private replayInstant(commands: TurtleCommand[]): void {
    const mainId = `${this.scriptId}:main`;
    const mainEntry = this.registry.get(mainId);
    if (!mainEntry) return;

    for (const cmd of commands) {
      if (cmd.type === "print" || cmd.type === "step_boundary") {
        continue;
      }

      // Spawn: create or reinitialize a child turtle
      if (cmd.type === "spawn") {
        const fullId = `${this.scriptId}:${cmd.id}`;
        if (!this.registry.has(fullId)) {
          this.registry.spawn(cmd.id, this.scriptId, this.doc, undefined, {
            x: cmd.x, y: cmd.y, heading: cmd.heading, color: cmd.color, width: cmd.width,
          });
        } else {
          const spawned = this.registry.get(fullId)!;
          spawned.state.reset();
          if (cmd.x !== undefined) spawned.state.x = cmd.x;
          if (cmd.y !== undefined) spawned.state.y = cmd.y;
          if (cmd.heading !== undefined) spawned.state.angle = cmd.heading;
          if (cmd.color !== undefined) spawned.state.pen.color = cmd.color;
          if (cmd.width !== undefined) spawned.state.pen.width = cmd.width;
        }
        // Inherit origin, zoom scale, and speed from main turtle
        const spawnedEntry = this.registry.get(fullId);
        if (spawnedEntry) {
          const mainOrigin = mainEntry.state.getOrigin();
          spawnedEntry.state.setOrigin(mainOrigin.x, mainOrigin.y);
          spawnedEntry.state.x = mainOrigin.x + (cmd.x ?? 0);
          spawnedEntry.state.y = mainOrigin.y + (cmd.y ?? 0);
          spawnedEntry.state.zoomScale = mainEntry.state.zoomScale;
          spawnedEntry.state.speed = mainEntry.state.speed;
          spawnedEntry.state.scaleFactor = mainEntry.state.scaleFactor * (cmd.scale ?? 1);
          this.messageBus.register(fullId);
        }
        continue;
      }

      if (cmd.type === "kill") {
        this.registry.remove(cmd.id, this.scriptId);
        continue;
      }

      if (cmd.type === "killall") {
        this.clearSpawnedTurtles();
        continue;
      }

      // Resolve target turtle
      const localId = cmd.turtleId ?? "main";
      const fullId = `${this.scriptId}:${localId}`;
      const entry = this.registry.get(fullId);
      if (!entry) continue;

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
          entry.drawing.addSegment(segment, true);
        }
      }
    }

    // Flush all turtles owned by this script
    for (const [, entry] of this.registry.getOwned(this.scriptId)) {
      entry.drawing.flush();
    }
  }

  /** Remove all spawned (non-main) turtles for this script. */
  private clearSpawnedTurtles(): void {
    const owned = this.registry.getOwned(this.scriptId);
    const mainId = `${this.scriptId}:main`;
    for (const [id] of owned) {
      if (id !== mainId) {
        this.registry.remove(id.replace(`${this.scriptId}:`, ""), this.scriptId);
      }
    }
  }
}
