import { LuaRuntime, TurtleCommand, ExecutionResult } from "./LuaRuntime";
import { TurtleRegistry } from "./TurtleRegistry";
import type { DocumentModel } from "../model/Stroke";

/** Events emitted by TurtleExecutor during script execution. */
export interface TurtleExecutorEvents {
  /** Called when a print() command is executed. */
  onPrint?: (message: string) => void;
  /** Called when execution starts. */
  onStart?: () => void;
  /** Called when execution completes or is stopped. */
  onComplete?: (result: ExecutionResult) => void;
  /** Called after each step so the UI can update the turtle indicator. */
  onStep?: () => void;
}

/** A command tagged with the turtle it targets. */
export type TaggedCommand = TurtleCommand & { turtleId?: string };

/**
 * Manages the full turtle script lifecycle: parse → run → animate → complete.
 *
 * The LuaRuntime collects all commands synchronously, then TurtleExecutor
 * replays them with animation delays based on speed:
 * - speed(0) = instant (no delay)
 * - speed(1) = 100ms per step (slowest)
 * - speed(10) = 1ms per step (fastest animated)
 *
 * Each executor is associated with a `scriptId` and uses the global
 * `TurtleRegistry` to manage turtle instances. The "main" turtle is
 * created automatically for each script execution.
 */
export class TurtleExecutor {
  private runtime: LuaRuntime;
  private registry: TurtleRegistry;
  private scriptId: string;
  private doc: DocumentModel;
  private events: TurtleExecutorEvents;

  private running = false;
  private stopRequested = false;

  constructor(
    runtime: LuaRuntime,
    registry: TurtleRegistry,
    scriptId: string,
    doc: DocumentModel,
    events: TurtleExecutorEvents = {},
  ) {
    this.runtime = runtime;
    this.registry = registry;
    this.scriptId = scriptId;
    this.doc = doc;
    this.events = events;
  }

  /** Whether a script is currently executing. */
  isRunning(): boolean {
    return this.running;
  }

  /** Request the currently running script to stop after the current step. */
  stop(): void {
    this.stopRequested = true;
  }

  /** Get the main turtle's state (for external queries like indicator position). */
  getMainState() {
    const mainId = `${this.scriptId}:main`;
    return this.registry.get(mainId)?.state ?? null;
  }

  /**
   * Ensure the main turtle exists in the registry. Creates it on first
   * call; subsequent calls return the existing entry. This allows
   * external code (e.g. TurtleIndicator, origin placement) to hold a
   * stable reference to the main turtle's state across multiple runs.
   */
  ensureMainTurtle(): string {
    const mainId = `${this.scriptId}:main`;
    if (!this.registry.has(mainId)) {
      this.registry.createMain(this.scriptId, this.doc);
    }
    return mainId;
  }

  /**
   * Execute a Lua script with animated playback.
   *
   * 1. Clear spawned (non-main) turtles for this script
   * 2. Reset the main turtle's state
   * 3. Run the Lua script to collect all commands
   * 4. Replay commands one-by-one with speed-based delays
   *
   * @param script  Lua source code to execute
   * @param zoom    Current camera zoom level (default 1). Movement distances
   *                and pen width are scaled by `1/zoom` so that turtle output
   *                is proportional to what the user sees on screen.
   */
  async run(script: string, zoom = 1): Promise<ExecutionResult> {
    if (this.running) {
      return { success: false, error: "A script is already running" };
    }

    this.running = true;
    this.stopRequested = false;

    // Clear spawned (non-main) turtles, keep the main turtle's state stable
    this.clearSpawnedTurtles();
    const mainId = this.ensureMainTurtle();
    const mainEntry = this.registry.get(mainId)!;
    mainEntry.state.reset();
    mainEntry.state.zoomScale = zoom > 0 ? 1 / zoom : 1;

    // Wire up state query so Lua can read position/heading/isdown of main turtle
    this.runtime.setStateQuery(mainEntry.state);

    this.events.onStart?.();

    // Phase 1: Execute Lua to collect commands
    const luaResult = await this.runtime.execute(script);
    if (!luaResult.success) {
      this.running = false;
      const result: ExecutionResult = {
        success: false,
        error: luaResult.error,
      };
      this.events.onComplete?.(result);
      return result;
    }

    const commands = this.runtime.getCommands() as TaggedCommand[];

    // Phase 2: Replay commands with animation
    const replayResult = await this.replayCommands(commands);

    // Flush any remaining batched segments for all owned turtles
    const owned = this.registry.getOwned(this.scriptId);
    for (const [, entry] of owned) {
      entry.drawing.flush();
    }

    this.running = false;
    this.events.onComplete?.(replayResult);
    return replayResult;
  }

  private async replayCommands(
    commands: TaggedCommand[],
  ): Promise<ExecutionResult> {
    for (let i = 0; i < commands.length; i++) {
      if (this.stopRequested) {
        return { success: false, error: "Execution stopped by user" };
      }

      const cmd = commands[i];
      this.processCommand(cmd);
      this.events.onStep?.();

      // Yield to the browser between steps based on speed
      const delay = this.getStepDelay(cmd);
      if (delay > 0) {
        await this.wait(delay);
      }
    }

    return { success: true };
  }

  private processCommand(cmd: TaggedCommand): void {
    // Resolve turtle ID: default to "main", prefix with scriptId
    const localId = cmd.turtleId ?? "main";
    const fullId = `${this.scriptId}:${localId}`;
    const entry = this.registry.get(fullId);

    if (cmd.type === "print") {
      this.events.onPrint?.(cmd.message);
      return;
    }

    if (cmd.type === "clear") {
      // Clear strokes for the targeted turtle
      if (entry) {
        entry.drawing.clearTurtleStrokes();
      }
      return;
    }

    if (!entry) {
      // Turtle doesn't exist (yet or was killed) — skip command
      return;
    }

    // sleep and speed are handled via the command replay timing
    // but speed still needs to update state
    const segment = entry.state.applyCommand(cmd);
    if (segment) {
      const batching = entry.state.speed === 0;
      entry.drawing.addSegment(segment, batching);
    }
  }

  /**
   * Compute the delay in ms between steps based on current speed.
   * speed(0) = 0ms (instant), speed(1) = 100ms, speed(10) = 1ms
   * Linear interpolation: delay = 100 - (speed - 1) * 11 for speed 1-10
   */
  private getStepDelay(cmd: TaggedCommand): number {
    // Look up the speed from the targeted turtle's state
    const localId = cmd.turtleId ?? "main";
    const fullId = `${this.scriptId}:${localId}`;
    const entry = this.registry.get(fullId);
    const s = entry?.state.speed ?? 5;
    if (s === 0) return 0;
    // Clamp to 1-10 range
    const clamped = Math.max(1, Math.min(10, s));
    // speed 1 → 100ms, speed 10 → 1ms
    return Math.round(100 - ((clamped - 1) * 99) / 9);
  }

  /** Remove all spawned (non-main) turtles for this script. */
  private clearSpawnedTurtles(): void {
    const mainId = `${this.scriptId}:main`;
    const owned = this.registry.getOwned(this.scriptId);
    for (const [id] of owned) {
      if (id !== mainId) {
        this.registry.remove(id, this.scriptId);
      }
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
