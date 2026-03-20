import { LuaFactory, LuaEngine, LuaLibraries, LuaMultiReturn } from "wasmoon";

/** A command produced by a turtle API call during script execution. */
export type TurtleCommand =
  | { type: "forward"; distance: number }
  | { type: "backward"; distance: number }
  | { type: "right"; angle: number }
  | { type: "left"; angle: number }
  | { type: "goto"; x: number; y: number }
  | { type: "home" }
  | { type: "penup" }
  | { type: "pendown" }
  | { type: "pencolor"; color: string }
  | { type: "penwidth"; width: number }
  | { type: "penopacity"; opacity: number }
  | { type: "speed"; value: number }
  | { type: "clear" }
  | { type: "sleep"; ms: number }
  | { type: "print"; message: string };

/** Callback queried between steps to support stop button. */
export type StopCheck = () => boolean;

/** Callback for each turtle command produced during execution. */
export type CommandHandler = (cmd: TurtleCommand) => void | Promise<void>;

/** Result of script execution. */
export interface ExecutionResult {
  success: boolean;
  error?: string;
}

/**
 * Query callbacks so the Lua script can read turtle state.
 * These are called synchronously from within the Lua execution.
 */
export interface TurtleStateQuery {
  getPosition: () => { x: number; y: number };
  getHeading: () => number;
  isDown: () => boolean;
}

/**
 * Manages a sandboxed Lua 5.4 environment (via wasmoon/WASM) with turtle
 * graphics API functions registered as globals. Scripts are executed and
 * produce an ordered list of TurtleCommands that the executor processes.
 */
export class LuaRuntime {
  private factory: LuaFactory;
  private engine: LuaEngine | null = null;
  private commands: TurtleCommand[] = [];
  private stateQuery: TurtleStateQuery | null = null;

  constructor() {
    this.factory = new LuaFactory();
  }

  /** Initialize the Lua engine. Must be called once before execute(). */
  async init(): Promise<void> {
    this.engine = await this.factory.createEngine({
      openStandardLibs: false,
      injectObjects: false,
      enableProxy: false,
    });

    // Load only safe libraries
    this.engine.global.loadLibrary(LuaLibraries.Base);
    this.engine.global.loadLibrary(LuaLibraries.Table);
    this.engine.global.loadLibrary(LuaLibraries.String);
    this.engine.global.loadLibrary(LuaLibraries.UTF8);
    this.engine.global.loadLibrary(LuaLibraries.Math);
    this.engine.global.loadLibrary(LuaLibraries.Coroutine);

    // Remove unsafe globals that Base library exposes
    this.engine.global.set("dofile", undefined);
    this.engine.global.set("loadfile", undefined);

    this.registerTurtleAPI();
  }

  /** Set the state query callbacks so Lua can read position/heading/isdown. */
  setStateQuery(query: TurtleStateQuery): void {
    this.stateQuery = query;
  }

  /**
   * Execute a Lua script. Returns the list of commands produced.
   * The commands are collected synchronously — the executor is responsible
   * for animating them with delays.
   */
  async execute(script: string): Promise<ExecutionResult> {
    if (!this.engine) {
      return { success: false, error: "Lua runtime not initialized" };
    }

    this.commands = [];

    try {
      await this.engine.doString(script);
      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /** Get the commands produced by the last execution. */
  getCommands(): TurtleCommand[] {
    return this.commands;
  }

  /** Clean up the Lua engine. */
  close(): void {
    if (this.engine) {
      this.engine.global.close();
      this.engine = null;
    }
  }

  private pushCommand(cmd: TurtleCommand): void {
    this.commands.push(cmd);
  }

  private registerTurtleAPI(): void {
    const engine = this.engine!;
    const g = engine.global;
    const push = this.pushCommand.bind(this);
    const getQuery = () => this.stateQuery;

    // Movement
    g.set("forward", (distance: number) => {
      push({ type: "forward", distance });
    });

    g.set("backward", (distance: number) => {
      push({ type: "backward", distance });
    });

    g.set("right", (angle: number) => {
      push({ type: "right", angle });
    });

    g.set("left", (angle: number) => {
      push({ type: "left", angle });
    });

    g.set("goto_pos", (x: number, y: number) => {
      push({ type: "goto", x, y });
    });

    g.set("home", () => {
      push({ type: "home" });
    });

    // Pen control
    g.set("penup", () => {
      push({ type: "penup" });
    });

    g.set("pendown", () => {
      push({ type: "pendown" });
    });

    g.set("pencolor", (rOrHex: number | string, gVal?: number, b?: number) => {
      if (typeof rOrHex === "string") {
        push({ type: "pencolor", color: rOrHex });
      } else {
        const r = Math.round(Math.max(0, Math.min(255, rOrHex)));
        const gC = Math.round(Math.max(0, Math.min(255, gVal ?? 0)));
        const bC = Math.round(Math.max(0, Math.min(255, b ?? 0)));
        const hex = `#${r.toString(16).padStart(2, "0")}${gC.toString(16).padStart(2, "0")}${bC.toString(16).padStart(2, "0")}`;
        push({ type: "pencolor", color: hex });
      }
    });

    g.set("penwidth", (w: number) => {
      push({ type: "penwidth", width: w });
    });

    g.set("penopacity", (o: number) => {
      push({ type: "penopacity", opacity: Math.max(0, Math.min(1, o)) });
    });

    // State queries
    g.set("position", () => {
      const q = getQuery();
      if (!q) {
        const r = new LuaMultiReturn();
        r.push(0, 0);
        return r;
      }
      const pos = q.getPosition();
      const r = new LuaMultiReturn();
      r.push(pos.x, pos.y);
      return r;
    });

    g.set("heading", () => {
      const q = getQuery();
      return q ? q.getHeading() : 0;
    });

    g.set("isdown", () => {
      const q = getQuery();
      return q ? q.isDown() : true;
    });

    // Canvas
    g.set("clear", () => {
      push({ type: "clear" });
    });

    g.set("speed", (n: number) => {
      push({ type: "speed", value: Math.max(0, Math.min(10, n)) });
    });

    // Utility
    g.set("sleep", (ms: number) => {
      push({ type: "sleep", ms: Math.max(0, ms) });
    });

    // Override print to capture output
    g.set("print", (...args: unknown[]) => {
      const message = args.map(String).join("\t");
      push({ type: "print", message });
    });

    g.set("repeat_n", (n: number, fn: () => void) => {
      for (let i = 0; i < n; i++) {
        fn();
      }
    });

    // Register `goto` as an alias (goto is a Lua keyword in 5.4, so we use a wrapper)
    engine.doStringSync(`
      -- 'goto' is a reserved keyword in Lua, so we alias via goto_pos
      -- and provide a table-call syntax workaround
      turtle_goto = goto_pos
    `);
  }
}
