import { LuaRuntime } from "./LuaRuntime";
import type { TurtleCommand } from "./LuaRuntime";

/**
 * Result of executing a single REPL line.
 * - `commands`: turtle commands produced by the line
 * - `output`: stringified return value (if the line was an expression), or null
 * - `error`: error message if execution failed, or null
 */
export interface ReplResult {
  commands: TurtleCommand[];
  output: string | null;
  error: string | null;
}

/**
 * A persistent Lua VM for REPL (Read-Eval-Print Loop) mode.
 *
 * Unlike `LuaRuntime` which is used for batch execution where `execute()`
 * resets internal tracking state, `ReplRuntime` keeps the Lua engine alive
 * between calls so that variables and state persist across REPL lines.
 *
 * Expression vs statement detection: each line is first compiled as an
 * expression (`return <line>`). If compilation succeeds the expression is
 * executed and its return value is captured. If compilation fails (syntax
 * error), the line is compiled and executed as a statement instead.
 *
 * Inherits from `LuaRuntime` to share the full turtle API surface without
 * duplication — the same `registerTurtleAPI()` runs during `init()`.
 */
export class ReplRuntime extends LuaRuntime {
  /**
   * Initialize the REPL runtime: creates the Lua engine, registers the
   * turtle API (via the parent class), then registers the REPL eval helper.
   */
  async init(): Promise<void> {
    await super.init();
    await this.registerReplHelper();
  }

  /**
   * Register the `_repl_exec` Lua helper that handles expression-vs-statement
   * detection. Uses Lua's `load()` to check compilation before execution,
   * avoiding partial side-effects from failed expression attempts.
   */
  private async registerReplHelper(): Promise<void> {
    if (!this.engine) return;
    await this.engine.doString(`
      function _repl_exec(line)
        -- Try compiling as expression first
        local fn, err = load("return " .. line, "=repl")
        if fn then
          local results = table.pack(pcall(fn))
          if results[1] then
            -- Check if there are any non-nil return values
            local has_value = false
            for i = 2, results.n do
              if results[i] ~= nil then
                has_value = true
                break
              end
            end
            if not has_value then return nil end
            local parts = {}
            for i = 2, results.n do
              parts[#parts+1] = tostring(results[i])
            end
            return table.concat(parts, "\\t")
          else
            error(results[2])
          end
        end

        -- Expression didn't compile, try as statement
        local fn2, err2 = load(line, "=repl")
        if fn2 then
          local ok, runtime_err = pcall(fn2)
          if not ok then
            error(runtime_err)
          end
          return nil
        end

        -- Neither compiled
        error(err2)
      end
    `);
  }

  /**
   * Execute a single REPL line. Commands are collected fresh for each line,
   * but Lua state (variables, functions) persists between calls.
   *
   * @param line  A single Lua statement or expression
   * @returns     The commands produced, any expression output, and any error
   */
  async executeLine(line: string): Promise<ReplResult> {
    if (!this.engine) {
      return { commands: [], output: null, error: "REPL runtime not initialized" };
    }

    // Collect fresh commands for this line only
    this.commands = [];

    try {
      this.engine.global.set("_repl_input", line);
      const result = await this.engine.doString("return _repl_exec(_repl_input)");
      const output =
        result !== undefined && result !== null ? String(result) : null;
      return { commands: [...this.commands], output, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { commands: [...this.commands], output: null, error: message };
    }
  }

  /**
   * Reset the REPL: destroys the current Lua engine and creates a fresh one.
   * All Lua state (variables, functions) is lost. The turtle API is
   * re-registered automatically.
   */
  async reset(): Promise<void> {
    this.close();
    this.spawnedThisExecution.clear();
    await super.init();
    await this.registerReplHelper();
  }

  /**
   * Destroy the REPL runtime, releasing the Lua engine.
   * After calling this, the runtime cannot be used until `init()` is called.
   */
  destroy(): void {
    this.close();
  }
}
