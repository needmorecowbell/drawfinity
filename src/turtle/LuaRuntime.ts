import { LuaFactory, LuaEngine, LuaLibraries, LuaMultiReturn } from "wasmoon";
import type { TurtleRegistry } from "./TurtleRegistry";
import type { DocumentModel } from "../model/Stroke";

/**
 * Base command variants produced by turtle API calls during script execution.
 * Each command may optionally carry a `turtleId` identifying which turtle
 * the command targets. When absent, defaults to `"main"`.
 */
type TurtleCommandVariant =
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
  | { type: "print"; message: string }
  | { type: "set_world_space"; enabled: boolean }
  | { type: "spawn"; id: string; x?: number; y?: number; heading?: number; color?: string; width?: number }
  | { type: "kill"; id: string }
  | { type: "killall" }
  | { type: "hide" }
  | { type: "show" }
  | { type: "penmode"; mode: "draw" | "erase"; turtleOnly: boolean }
  | { type: "penpreset"; preset: string | null };

/** A command produced by a turtle API call, optionally tagged with a turtle ID. */
export type TurtleCommand = TurtleCommandVariant & { turtleId?: string };

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
  /** The turtle ID that new commands will be tagged with. Defaults to "main". */
  private activeTurtleId = "main";
  /** Spawn context set by TurtleExecutor before script execution. */
  private spawnRegistry: TurtleRegistry | null = null;
  private spawnScriptId: string | null = null;
  private spawnDoc: DocumentModel | null = null;
  /** Tracks turtle IDs spawned during current collection to detect duplicates. */
  private spawnedThisExecution = new Set<string>();

  constructor() {
    this.factory = new LuaFactory();
  }

  /** Set the active turtle ID. All subsequent commands will be tagged with this ID. */
  setActiveTurtle(id: string): void {
    this.activeTurtleId = id;
  }

  /** Get the current active turtle ID. */
  getActiveTurtle(): string {
    return this.activeTurtleId;
  }

  /**
   * Set the spawn context so `spawn()` can create turtles in the registry.
   * Called by TurtleExecutor before each script execution.
   */
  setSpawnContext(registry: TurtleRegistry, scriptId: string, doc: DocumentModel): void {
    this.spawnRegistry = registry;
    this.spawnScriptId = scriptId;
    this.spawnDoc = doc;
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
    this.spawnedThisExecution.clear();

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

  private pushCommand(cmd: TurtleCommandVariant): void {
    const tagged: TurtleCommand = this.activeTurtleId === "main"
      ? cmd
      : { ...cmd, turtleId: this.activeTurtleId };
    this.commands.push(tagged);
  }

  /** Push a command explicitly tagged with a specific turtle ID. Used by spawn handles. */
  private pushTaggedCommand(turtleId: string, cmd: TurtleCommandVariant): void {
    this.commands.push({ ...cmd, turtleId });
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

    g.set("set_world_space", (enabled: boolean) => {
      push({ type: "set_world_space", enabled: !!enabled });
    });

    // Pen mode (draw / erase)
    g.set("penmode", (mode: unknown, options?: unknown) => {
      if (typeof mode !== "string" || (mode !== "draw" && mode !== "erase")) {
        throw new Error('penmode() requires "draw" or "erase" as first argument');
      }
      let turtleOnly = false;
      if (mode === "erase" && options != null && typeof options === "object") {
        const opts = options as Record<string, unknown>;
        if (opts.turtle_only != null) {
          turtleOnly = !!opts.turtle_only;
        }
      }
      push({ type: "penmode", mode, turtleOnly });
    });

    // Brush preset
    g.set("penpreset", (name: unknown) => {
      if (name === null || name === undefined) {
        push({ type: "penpreset", preset: null });
        return;
      }
      if (typeof name !== "string") {
        throw new Error("penpreset() requires a string name or nil");
      }
      push({ type: "penpreset", preset: name });
    });

    // Indicator visibility (main turtle)
    g.set("hide", () => {
      push({ type: "hide" });
    });

    g.set("show", () => {
      push({ type: "show" });
    });

    g.set("repeat_n", (n: number, fn: () => void) => {
      for (let i = 0; i < n; i++) {
        fn();
      }
    });

    // --- Spawn infrastructure ---

    const pushTagged = this.pushTaggedCommand.bind(this);
    const getSpawnCtx = () => ({
      registry: this.spawnRegistry,
      scriptId: this.spawnScriptId,
      doc: this.spawnDoc,
      spawned: this.spawnedThisExecution,
    });

    // Internal: create turtle in registry and push SpawnCommand
    g.set(
      "_spawn_impl",
      (
        id: string,
        x?: number | null,
        y?: number | null,
        heading?: number | null,
        color?: string | null,
        width?: number | null,
      ) => {
        const ctx = getSpawnCtx();
        if (!ctx.registry || !ctx.scriptId || !ctx.doc) {
          throw new Error("Spawn context not set — cannot spawn turtles outside of TurtleExecutor");
        }
        if (typeof id !== "string" || id.length === 0) {
          throw new Error("spawn() requires a non-empty string ID");
        }
        if (id === "main") {
          throw new Error('Cannot spawn a turtle with reserved ID "main"');
        }
        if (ctx.spawned.has(id)) {
          throw new Error(`Turtle "${id}" already exists`);
        }

        // Validate limits before spawning
        if (ctx.registry.count() >= ctx.registry.getMaxTurtles()) {
          throw new Error(
            `Maximum turtle limit reached (${ctx.registry.getMaxTurtles()})`,
          );
        }

        const options: { x?: number; y?: number; heading?: number; color?: string; width?: number } = {};
        if (x != null) options.x = x;
        if (y != null) options.y = y;
        if (heading != null) options.heading = heading;
        if (color != null) options.color = color;
        if (width != null) options.width = width;

        // Create turtle eagerly so state queries work during collection.
        // Spawn x/y are offsets from origin — inherit origin from main turtle.
        ctx.registry.spawn(id, ctx.scriptId, ctx.doc, undefined, options);
        const mainFullId = `${ctx.scriptId}:main`;
        const mainEntry = ctx.registry.get(mainFullId);
        if (mainEntry) {
          const spawnedFullId = `${ctx.scriptId}:${id}`;
          const spawnedEntry = ctx.registry.get(spawnedFullId);
          if (spawnedEntry) {
            const mainOrigin = mainEntry.state.getOrigin();
            spawnedEntry.state.setOrigin(mainOrigin.x, mainOrigin.y);
            spawnedEntry.state.x = mainOrigin.x + (options.x ?? 0);
            spawnedEntry.state.y = mainOrigin.y + (options.y ?? 0);
          }
        }
        ctx.spawned.add(id);

        // Push spawn command for executor replay
        push({ type: "spawn", id, ...options });

        return id;
      },
    );

    // Internal: generic command dispatcher for turtle handle methods
    g.set(
      "_tcmd",
      (
        turtleId: string,
        cmdType: string,
        arg1?: unknown,
        arg2?: unknown,
        arg3?: unknown,
      ) => {
        // Enforce ownership: only allow commands on turtles owned by this script
        const ctx = getSpawnCtx();
        if (ctx.registry && ctx.scriptId && turtleId !== "main") {
          const fullId = `${ctx.scriptId}:${turtleId}`;
          const entry = ctx.registry.get(fullId);
          if (!entry) {
            throw new Error(`Cannot control turtle "${turtleId}" — turtle does not exist`);
          }
          if (entry.scriptId !== ctx.scriptId) {
            throw new Error(`Cannot control turtle "${turtleId}" — not owned by this script`);
          }
        }
        switch (cmdType) {
          case "forward":
            pushTagged(turtleId, { type: "forward", distance: arg1 as number });
            break;
          case "backward":
            pushTagged(turtleId, { type: "backward", distance: arg1 as number });
            break;
          case "right":
            pushTagged(turtleId, { type: "right", angle: arg1 as number });
            break;
          case "left":
            pushTagged(turtleId, { type: "left", angle: arg1 as number });
            break;
          case "penup":
            pushTagged(turtleId, { type: "penup" });
            break;
          case "pendown":
            pushTagged(turtleId, { type: "pendown" });
            break;
          case "pencolor":
            if (typeof arg1 === "string") {
              pushTagged(turtleId, { type: "pencolor", color: arg1 });
            } else {
              const r = Math.round(Math.max(0, Math.min(255, arg1 as number)));
              const gC = Math.round(Math.max(0, Math.min(255, (arg2 as number) ?? 0)));
              const bC = Math.round(Math.max(0, Math.min(255, (arg3 as number) ?? 0)));
              const hex = `#${r.toString(16).padStart(2, "0")}${gC.toString(16).padStart(2, "0")}${bC.toString(16).padStart(2, "0")}`;
              pushTagged(turtleId, { type: "pencolor", color: hex });
            }
            break;
          case "penwidth":
            pushTagged(turtleId, { type: "penwidth", width: arg1 as number });
            break;
          case "penopacity":
            pushTagged(turtleId, {
              type: "penopacity",
              opacity: Math.max(0, Math.min(1, arg1 as number)),
            });
            break;
          case "speed":
            pushTagged(turtleId, {
              type: "speed",
              value: Math.max(0, Math.min(10, arg1 as number)),
            });
            break;
          case "goto":
            pushTagged(turtleId, { type: "goto", x: arg1 as number, y: arg2 as number });
            break;
          case "home":
            pushTagged(turtleId, { type: "home" });
            break;
          case "clear":
            pushTagged(turtleId, { type: "clear" });
            break;
          case "print":
            pushTagged(turtleId, { type: "print", message: String(arg1) });
            break;
          case "sleep":
            pushTagged(turtleId, { type: "sleep", ms: Math.max(0, arg1 as number) });
            break;
          case "set_world_space":
            pushTagged(turtleId, { type: "set_world_space", enabled: !!arg1 });
            break;
          case "hide":
            pushTagged(turtleId, { type: "hide" });
            break;
          case "show":
            pushTagged(turtleId, { type: "show" });
            break;
          case "penmode": {
            const mode = arg1 as string;
            if (mode !== "draw" && mode !== "erase") {
              throw new Error('penmode() requires "draw" or "erase" as first argument');
            }
            let turtleOnly = false;
            if (mode === "erase" && arg2 != null && typeof arg2 === "object") {
              const opts = arg2 as Record<string, unknown>;
              if (opts.turtle_only != null) {
                turtleOnly = !!opts.turtle_only;
              }
            }
            pushTagged(turtleId, { type: "penmode", mode, turtleOnly });
            break;
          }
          case "penpreset": {
            if (arg1 === null || arg1 === undefined) {
              pushTagged(turtleId, { type: "penpreset", preset: null });
            } else {
              pushTagged(turtleId, { type: "penpreset", preset: arg1 as string });
            }
            break;
          }
        }
      },
    );

    // Internal: state query dispatcher for turtle handle methods
    g.set("_tquery", (turtleId: string, queryType: string) => {
      const ctx = getSpawnCtx();
      if (ctx.registry && ctx.scriptId) {
        const fullId = `${ctx.scriptId}:${turtleId}`;
        const entry = ctx.registry.get(fullId);
        if (entry) {
          switch (queryType) {
            case "position": {
              const pos = entry.state.getPosition();
              const r = new LuaMultiReturn();
              r.push(pos.x, pos.y);
              return r;
            }
            case "heading":
              return entry.state.getHeading();
            case "isdown":
              return entry.state.isDown();
          }
        }
      }
      // Fallback defaults if turtle not found
      switch (queryType) {
        case "position": {
          const r = new LuaMultiReturn();
          r.push(0, 0);
          return r;
        }
        case "heading":
          return 0;
        case "isdown":
          return true;
      }
      return null;
    });

    // Internal: kill a turtle by local ID (ownership enforced in JS)
    g.set("_kill_impl", (id: string) => {
      const ctx = getSpawnCtx();
      if (!ctx.registry || !ctx.scriptId) {
        throw new Error("Spawn context not set — cannot kill turtles outside of TurtleExecutor");
      }
      if (typeof id !== "string" || id.length === 0) {
        throw new Error("kill() requires a non-empty string ID");
      }
      if (id === "main") {
        throw new Error('Cannot kill the main turtle');
      }
      const fullId = `${ctx.scriptId}:${id}`;
      if (!ctx.registry.has(fullId)) {
        throw new Error(`Turtle "${id}" does not exist`);
      }
      const entry = ctx.registry.get(fullId)!;
      if (entry.scriptId !== ctx.scriptId) {
        throw new Error(`Cannot kill turtle "${id}" — not owned by this script`);
      }
      // Push kill command for executor replay; also remove from eager registry
      push({ type: "kill", id });
      ctx.registry.remove(fullId, ctx.scriptId);
      ctx.spawned.delete(id);
    });

    // Internal: killall — remove all spawned (non-main) turtles for current script
    g.set("_killall_impl", () => {
      const ctx = getSpawnCtx();
      if (!ctx.registry || !ctx.scriptId) {
        throw new Error("Spawn context not set");
      }
      push({ type: "killall" });
      // Eagerly remove from registry
      const owned = ctx.registry.getOwned(ctx.scriptId);
      const mainId = `${ctx.scriptId}:main`;
      for (const [id] of owned) {
        if (id !== mainId) {
          ctx.registry.remove(id, ctx.scriptId);
        }
      }
      ctx.spawned.clear();
    });

    // Internal: list_turtles — return array of local turtle IDs owned by current script
    g.set("_list_turtles_impl", () => {
      const ctx = getSpawnCtx();
      if (!ctx.registry || !ctx.scriptId) {
        return [];
      }
      const owned = ctx.registry.getOwned(ctx.scriptId);
      const prefix = `${ctx.scriptId}:`;
      const ids: string[] = [];
      for (const [fullId] of owned) {
        ids.push(fullId.substring(prefix.length));
      }
      return ids;
    });

    // Internal: set_spawn_limit
    g.set("_set_spawn_limit_impl", (n: number) => {
      const ctx = getSpawnCtx();
      if (!ctx.registry) {
        throw new Error("Spawn context not set");
      }
      if (typeof n !== "number" || n < 1) {
        throw new Error("set_spawn_limit() requires a positive number");
      }
      ctx.registry.setMaxTurtles(Math.floor(n));
    });

    // Internal: environment_turtles — return all turtles across all scripts
    g.set("_environment_turtles_impl", () => {
      const ctx = getSpawnCtx();
      if (!ctx.registry || !ctx.scriptId) {
        return [];
      }
      const all = ctx.registry.getAll();
      const result: Array<{
        id: string;
        x: number;
        y: number;
        heading: number;
        color: string;
        visible: boolean;
        owned: boolean;
      }> = [];
      for (const [fullId, entry] of all) {
        // Extract local ID from full ID (scriptId:localId)
        const colonIdx = fullId.indexOf(":");
        const localId = colonIdx >= 0 ? fullId.substring(colonIdx + 1) : fullId;
        result.push({
          id: localId,
          x: entry.state.x,
          y: entry.state.y,
          heading: entry.state.angle,
          color: entry.state.pen.color,
          visible: entry.state.visible,
          owned: entry.scriptId === ctx.scriptId,
        });
      }
      return result;
    });

    // Internal: set_spawn_depth
    g.set("_set_spawn_depth_impl", (n: number) => {
      const ctx = getSpawnCtx();
      if (!ctx.registry) {
        throw new Error("Spawn context not set");
      }
      if (typeof n !== "number" || n < 1) {
        throw new Error("set_spawn_depth() requires a positive number");
      }
      ctx.registry.setMaxDepth(Math.floor(n));
    });

    // Register `goto` as an alias (goto is a Lua keyword in 5.4, so we use a wrapper)
    engine.doStringSync(`
      -- 'goto' is a reserved keyword in Lua, so we alias via goto_pos
      -- and provide a table-call syntax workaround
      turtle_goto = goto_pos

      -- kill(id) — remove a spawned turtle
      function kill(id)
        _kill_impl(id)
      end

      -- killall() — remove all spawned turtles owned by current script
      function killall()
        _killall_impl()
      end

      -- list_turtles() — return array of active turtle IDs for current script
      function list_turtles()
        return _list_turtles_impl()
      end

      -- set_spawn_limit(n) — configure max total turtles
      function set_spawn_limit(n)
        _set_spawn_limit_impl(n)
      end

      -- set_spawn_depth(n) — configure max spawn depth
      function set_spawn_depth(n)
        _set_spawn_depth_impl(n)
      end

      -- environment_turtles() — return all turtles across all scripts
      function environment_turtles()
        return _environment_turtles_impl()
      end

      -- spawn(id, opts?) — create a new turtle and return a handle table
      function spawn(id, opts)
        if type(id) ~= "string" or #id == 0 then
          error("spawn() requires a non-empty string ID")
        end
        opts = opts or {}
        _spawn_impl(id, opts.x, opts.y, opts.heading, opts.color, opts.width)

        local h = {}
        h.forward = function(d) _tcmd(id, "forward", d) end
        h.backward = function(d) _tcmd(id, "backward", d) end
        h.right = function(a) _tcmd(id, "right", a) end
        h.left = function(a) _tcmd(id, "left", a) end
        h.penup = function() _tcmd(id, "penup") end
        h.pendown = function() _tcmd(id, "pendown") end
        h.pencolor = function(r, g, b) _tcmd(id, "pencolor", r, g, b) end
        h.penwidth = function(w) _tcmd(id, "penwidth", w) end
        h.penopacity = function(o) _tcmd(id, "penopacity", o) end
        h.speed = function(n) _tcmd(id, "speed", n) end
        h.goto_pos = function(x, y) _tcmd(id, "goto", x, y) end
        h.home = function() _tcmd(id, "home") end
        h.clear = function() _tcmd(id, "clear") end
        h.sleep = function(ms) _tcmd(id, "sleep", ms) end
        h.set_world_space = function(e) _tcmd(id, "set_world_space", e) end
        h.print = function(...)
          local parts = {}
          for i = 1, select("#", ...) do
            parts[i] = tostring(select(i, ...))
          end
          _tcmd(id, "print", table.concat(parts, "\\t"))
        end
        h.position = function() return _tquery(id, "position") end
        h.heading = function() return _tquery(id, "heading") end
        h.isdown = function() return _tquery(id, "isdown") end
        h.hide = function() _tcmd(id, "hide") end
        h.show = function() _tcmd(id, "show") end
        h.penmode = function(mode, opts)
          if type(mode) ~= "string" or (mode ~= "draw" and mode ~= "erase") then
            error('penmode() requires "draw" or "erase" as first argument')
          end
          _tcmd(id, "penmode", mode, opts)
        end
        h.penpreset = function(name)
          _tcmd(id, "penpreset", name)
        end
        h.rectangle = function() error("rectangle() not yet implemented") end
        h.ellipse = function() error("ellipse() not yet implemented") end
        h.polygon = function() error("polygon() not yet implemented") end
        h.star = function() error("star() not yet implemented") end
        h.fillcolor = function() error("fillcolor() not yet implemented") end

        return h
      end
    `);
  }
}
