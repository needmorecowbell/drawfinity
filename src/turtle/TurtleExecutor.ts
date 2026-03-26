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

/**
 * @deprecated Use `TurtleCommand` directly — it now includes `turtleId?: string`.
 */
export type TaggedCommand = TurtleCommand;

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

    // Wire up state query and spawn context for Lua
    this.runtime.setStateQuery(mainEntry.state);
    this.runtime.setActiveTurtle("main");
    this.runtime.setSpawnContext(this.registry, this.scriptId, this.doc);

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

    const commands = this.runtime.getCommands();

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

  /**
   * Replay commands with interleaved multi-turtle execution.
   *
   * Commands are organized into per-turtle queues. On each tick, one command
   * is advanced for every active turtle that has remaining commands (round-robin).
   * Animation delay is applied once per tick (not per turtle), using the maximum
   * delay across all turtles that executed in that tick.
   *
   * When a SpawnCommand is encountered, the new turtle's queue becomes active
   * starting on the next tick.
   */
  private async replayCommands(
    commands: TurtleCommand[],
  ): Promise<ExecutionResult> {
    // Build per-turtle command queues
    const queues = new Map<string, TurtleCommand[]>();
    for (const cmd of commands) {
      const id = cmd.turtleId ?? "main";
      if (!queues.has(id)) {
        queues.set(id, []);
      }
      queues.get(id)!.push(cmd);
    }

    // Track active turtle queues and their current position
    const activeTurtles: string[] = ["main"];
    const indices = new Map<string, number>();
    for (const id of queues.keys()) {
      indices.set(id, 0);
    }

    // Interleaved replay: one command per active turtle per tick
    while (true) {
      if (this.stopRequested) {
        return { success: false, error: "Execution stopped by user" };
      }

      let processedAny = false;
      let maxDelay = 0;
      const newlySpawned: string[] = [];

      // Process one command for each active turtle
      for (const turtleId of activeTurtles) {
        const queue = queues.get(turtleId);
        if (!queue) continue;
        const idx = indices.get(turtleId) ?? 0;
        if (idx >= queue.length) continue;

        const cmd = queue[idx];
        this.processCommand(cmd);

        const delay = this.getStepDelay(cmd);
        if (delay > maxDelay) maxDelay = delay;

        indices.set(turtleId, idx + 1);
        processedAny = true;

        // If spawn command, activate the new turtle for the next tick
        if (cmd.type === "spawn") {
          newlySpawned.push(cmd.id);
        }
      }

      if (!processedAny) break;

      // Activate newly spawned turtles after this tick completes
      for (const id of newlySpawned) {
        if (!activeTurtles.includes(id)) {
          activeTurtles.push(id);
        }
      }

      this.events.onStep?.();

      if (maxDelay > 0) {
        await this.wait(maxDelay);
      }
    }

    return { success: true };
  }

  private processCommand(cmd: TurtleCommand): void {
    // Handle spawn commands — create or re-initialize the turtle
    if (cmd.type === "spawn") {
      const fullId = `${this.scriptId}:${cmd.id}`;
      if (!this.registry.has(fullId)) {
        this.registry.spawn(cmd.id, this.scriptId, this.doc, undefined, {
          x: cmd.x, y: cmd.y, heading: cmd.heading, color: cmd.color, width: cmd.width,
        });
      } else {
        // Turtle was created during collection — reset to spawn options
        const entry = this.registry.get(fullId)!;
        entry.state.reset();
        if (cmd.x !== undefined) entry.state.x = cmd.x;
        if (cmd.y !== undefined) entry.state.y = cmd.y;
        if (cmd.heading !== undefined) entry.state.angle = cmd.heading;
        if (cmd.color !== undefined) entry.state.pen.color = cmd.color;
        if (cmd.width !== undefined) entry.state.pen.width = cmd.width;
      }
      // Inherit zoom scale from main turtle
      const spawnedEntry = this.registry.get(fullId);
      const mainEntry = this.registry.get(`${this.scriptId}:main`);
      if (spawnedEntry && mainEntry) {
        spawnedEntry.state.zoomScale = mainEntry.state.zoomScale;
      }
      return;
    }

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
  private getStepDelay(cmd: TurtleCommand): number {
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
