import { LuaRuntime, TurtleCommand, ExecutionResult } from "./LuaRuntime";
import { TurtleState } from "./TurtleState";
import { TurtleDrawing } from "./TurtleDrawing";

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
 * Manages the full turtle script lifecycle: parse → run → animate → complete.
 *
 * The LuaRuntime collects all commands synchronously, then TurtleExecutor
 * replays them with animation delays based on speed:
 * - speed(0) = instant (no delay)
 * - speed(1) = 100ms per step (slowest)
 * - speed(10) = 1ms per step (fastest animated)
 */
export class TurtleExecutor {
  private runtime: LuaRuntime;
  private state: TurtleState;
  private drawing: TurtleDrawing;
  private events: TurtleExecutorEvents;

  private running = false;
  private stopRequested = false;

  constructor(
    runtime: LuaRuntime,
    state: TurtleState,
    drawing: TurtleDrawing,
    events: TurtleExecutorEvents = {},
  ) {
    this.runtime = runtime;
    this.state = state;
    this.drawing = drawing;
    this.events = events;

    // Wire up state query so Lua can read position/heading/isdown
    this.runtime.setStateQuery(this.state);
  }

  /** Whether a script is currently executing. */
  isRunning(): boolean {
    return this.running;
  }

  /** Request the currently running script to stop after the current step. */
  stop(): void {
    this.stopRequested = true;
  }

  /**
   * Execute a Lua script with animated playback.
   *
   * 1. Reset turtle state
   * 2. Run the Lua script to collect all commands
   * 3. Replay commands one-by-one with speed-based delays
   */
  async run(script: string): Promise<ExecutionResult> {
    if (this.running) {
      return { success: false, error: "A script is already running" };
    }

    this.running = true;
    this.stopRequested = false;
    this.state.reset();
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

    // Flush any remaining batched segments
    this.drawing.flush();
    this.running = false;
    this.events.onComplete?.(replayResult);
    return replayResult;
  }

  private async replayCommands(
    commands: TurtleCommand[],
  ): Promise<ExecutionResult> {
    for (let i = 0; i < commands.length; i++) {
      if (this.stopRequested) {
        return { success: false, error: "Execution stopped by user" };
      }

      const cmd = commands[i];
      this.processCommand(cmd);
      this.events.onStep?.();

      // Yield to the browser between steps based on speed
      const delay = this.getStepDelay();
      if (delay > 0) {
        await this.wait(delay);
      }
    }

    return { success: true };
  }

  private processCommand(cmd: TurtleCommand): void {
    if (cmd.type === "print") {
      this.events.onPrint?.(cmd.message);
      return;
    }

    if (cmd.type === "clear") {
      this.drawing.clearTurtleStrokes();
      return;
    }

    // sleep and speed are handled via the command replay timing
    // but speed still needs to update state
    const segment = this.state.applyCommand(cmd);
    if (segment) {
      const batching = this.state.speed === 0;
      this.drawing.addSegment(segment, batching);
    }
  }

  /**
   * Compute the delay in ms between steps based on current speed.
   * speed(0) = 0ms (instant), speed(1) = 100ms, speed(10) = 1ms
   * Linear interpolation: delay = 100 - (speed - 1) * 11 for speed 1-10
   */
  private getStepDelay(): number {
    const s = this.state.speed;
    if (s === 0) return 0;
    // Clamp to 1-10 range
    const clamped = Math.max(1, Math.min(10, s));
    // speed 1 → 100ms, speed 10 → 1ms
    return Math.round(100 - ((clamped - 1) * 99) / 9);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
