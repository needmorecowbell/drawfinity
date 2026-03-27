/**
 * Autocompletion source for the Drawfinity turtle Lua editor.
 *
 * Provides completions for:
 * 1. All turtle API functions (extracted from LuaRuntime.ts globals)
 * 2. Lua keywords
 * 3. Lua standard math functions
 * 4. Lua string functions
 */

import type { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import { autocompletion } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";

/** Turtle API function completions with signatures and descriptions. */
const turtleAPICompletions: Completion[] = [
  // Movement
  { label: "forward", type: "function", detail: "forward(distance) — move forward" },
  { label: "backward", type: "function", detail: "backward(distance) — move backward" },
  { label: "right", type: "function", detail: "right(angle) — turn right by degrees" },
  { label: "left", type: "function", detail: "left(angle) — turn left by degrees" },
  { label: "goto_pos", type: "function", detail: "goto_pos(x, y) — move to position" },
  { label: "turtle_goto", type: "function", detail: "turtle_goto(x, y) — alias for goto_pos" },
  { label: "home", type: "function", detail: "home() — return to origin" },

  // Pen control
  { label: "penup", type: "function", detail: "penup() — stop drawing" },
  { label: "pendown", type: "function", detail: "pendown() — start drawing" },
  { label: "pencolor", type: "function", detail: "pencolor(hex) or pencolor(r, g, b) — set pen color" },
  { label: "penwidth", type: "function", detail: "penwidth(w) — set pen width" },
  { label: "penopacity", type: "function", detail: "penopacity(o) — set pen opacity (0-1)" },
  { label: "penmode", type: "function", detail: 'penmode("draw"|"erase") — set pen mode' },
  { label: "penpreset", type: "function", detail: "penpreset(name) — set brush preset" },
  { label: "fillcolor", type: "function", detail: "fillcolor(hex) or fillcolor(r, g, b) — set fill color" },

  // State queries
  { label: "position", type: "function", detail: "position() — returns x, y of turtle" },
  { label: "heading", type: "function", detail: "heading() — returns current heading in degrees" },
  { label: "isdown", type: "function", detail: "isdown() — returns true if pen is down" },

  // Canvas
  { label: "clear", type: "function", detail: "clear() — clear all strokes" },
  { label: "speed", type: "function", detail: "speed(n) — set animation speed (0-10)" },
  { label: "sleep", type: "function", detail: "sleep(ms) — pause execution for ms milliseconds" },
  { label: "print", type: "function", detail: "print(...) — output to turtle console" },

  // Drawing settings
  { label: "set_world_space", type: "function", detail: "set_world_space(bool) — use world coordinates" },
  { label: "min_pixel_size", type: "function", detail: "min_pixel_size(px) — LOD skip threshold" },
  { label: "scale_pen", type: "function", detail: "scale_pen(bool) — scale pen with zoom" },

  // Visibility
  { label: "hide", type: "function", detail: "hide() — hide turtle indicator" },
  { label: "show", type: "function", detail: "show() — show turtle indicator" },

  // Shapes
  { label: "rectangle", type: "function", detail: "rectangle(width, height) — draw rectangle" },
  { label: "ellipse", type: "function", detail: "ellipse(width, height) — draw ellipse" },
  { label: "polygon", type: "function", detail: "polygon(sides, radius) — draw regular polygon" },
  { label: "star", type: "function", detail: "star(points, outerR, innerR) — draw star" },

  // Iteration
  { label: "repeat_n", type: "function", detail: "repeat_n(n, fn) — repeat function n times" },

  // Spawn / multi-turtle
  { label: "spawn", type: "function", detail: "spawn(id, opts?) — create a new turtle" },
  { label: "kill", type: "function", detail: "kill(id) — remove a spawned turtle" },
  { label: "killall", type: "function", detail: "killall() — remove all spawned turtles" },
  { label: "activate", type: "function", detail: "activate(id) — switch active turtle context" },
  { label: "list_turtles", type: "function", detail: "list_turtles() — list active turtle IDs" },
  { label: "set_spawn_limit", type: "function", detail: "set_spawn_limit(n) — set max turtle count" },
  { label: "set_spawn_depth", type: "function", detail: "set_spawn_depth(n) — set max spawn depth" },
  { label: "environment_turtles", type: "function", detail: "environment_turtles() — all turtles across scripts" },

  // Spatial queries
  { label: "nearby_turtles", type: "function", detail: "nearby_turtles(radius, includeRemote?) — find nearby turtles" },
  { label: "nearby_strokes", type: "function", detail: "nearby_strokes(radius) — find nearby stroke IDs" },
  { label: "distance_to", type: "function", detail: "distance_to(id) — distance to another turtle" },
  { label: "collides_with", type: "function", detail: "collides_with(id) — check collision with turtle" },
  { label: "set_collision_radius", type: "function", detail: "set_collision_radius(r) — set collision radius" },

  // Messaging
  { label: "send", type: "function", detail: "send(targetId, data) — send message to turtle" },
  { label: "receive", type: "function", detail: "receive() — receive next message" },
  { label: "peek", type: "function", detail: "peek() — peek at next message" },
  { label: "broadcast", type: "function", detail: "broadcast(data) — send to all turtles" },
  { label: "publish", type: "function", detail: "publish(key, value) — write to blackboard" },
  { label: "read_board", type: "function", detail: "read_board(key) — read from blackboard" },
  { label: "board_keys", type: "function", detail: "board_keys() — list blackboard keys" },

  // Simulation
  { label: "simulate", type: "function", detail: "simulate(steps, fn) — multi-step simulation" },
  { label: "get_step", type: "function", detail: "get_step() — current simulation step number" },
  { label: "set_max_steps", type: "function", detail: "set_max_steps(n) — max simulate steps" },
];

/** Lua language keyword completions. */
const luaKeywordCompletions: Completion[] = [
  { label: "local", type: "keyword", detail: "local variable declaration" },
  { label: "function", type: "keyword", detail: "function definition" },
  { label: "if", type: "keyword", detail: "conditional" },
  { label: "then", type: "keyword", detail: "if/elseif clause body" },
  { label: "else", type: "keyword", detail: "else clause" },
  { label: "elseif", type: "keyword", detail: "else-if clause" },
  { label: "end", type: "keyword", detail: "block terminator" },
  { label: "for", type: "keyword", detail: "for loop" },
  { label: "while", type: "keyword", detail: "while loop" },
  { label: "do", type: "keyword", detail: "block start" },
  { label: "repeat", type: "keyword", detail: "repeat-until loop" },
  { label: "until", type: "keyword", detail: "repeat-until condition" },
  { label: "return", type: "keyword", detail: "return from function" },
  { label: "break", type: "keyword", detail: "exit loop" },
  { label: "not", type: "keyword", detail: "logical negation" },
  { label: "and", type: "keyword", detail: "logical and" },
  { label: "or", type: "keyword", detail: "logical or" },
  { label: "in", type: "keyword", detail: "iterator variable" },
  { label: "nil", type: "constant", detail: "nil value" },
  { label: "true", type: "constant", detail: "boolean true" },
  { label: "false", type: "constant", detail: "boolean false" },
];

/** Lua standard math library completions. */
const luaMathCompletions: Completion[] = [
  { label: "math.sin", type: "function", detail: "math.sin(x) — sine" },
  { label: "math.cos", type: "function", detail: "math.cos(x) — cosine" },
  { label: "math.pi", type: "constant", detail: "math.pi — 3.14159..." },
  { label: "math.random", type: "function", detail: "math.random([m [, n]]) — random number" },
  { label: "math.floor", type: "function", detail: "math.floor(x) — round down" },
  { label: "math.ceil", type: "function", detail: "math.ceil(x) — round up" },
  { label: "math.abs", type: "function", detail: "math.abs(x) — absolute value" },
  { label: "math.sqrt", type: "function", detail: "math.sqrt(x) — square root" },
];

/** Lua standard string library completions. */
const luaStringCompletions: Completion[] = [
  { label: "string.format", type: "function", detail: "string.format(fmt, ...) — formatted string" },
  { label: "string.sub", type: "function", detail: "string.sub(s, i [, j]) — substring" },
  { label: "string.len", type: "function", detail: "string.len(s) — string length" },
  { label: "string.rep", type: "function", detail: "string.rep(s, n) — repeat string" },
];

/** All completions combined. */
const allCompletions: Completion[] = [
  ...turtleAPICompletions,
  ...luaKeywordCompletions,
  ...luaMathCompletions,
  ...luaStringCompletions,
];

/**
 * CodeMirror completion source for turtle Lua scripts.
 * Triggers on any word character, matching against all known completions.
 */
function turtleCompletionSource(context: CompletionContext): CompletionResult | null {
  // Match word characters and dots (for math.sin, string.format, etc.)
  const word = context.matchBefore(/[\w.]+/);
  if (!word) return null;
  // Don't trigger for very short input unless explicitly requested
  if (word.from === word.to && !context.explicit) return null;

  return {
    from: word.from,
    options: allCompletions,
    validFor: /^[\w.]*$/,
  };
}

/**
 * Returns a CodeMirror Extension that provides autocompletion
 * for turtle API functions, Lua keywords, and standard library functions.
 */
export function turtleAutocompletion(): Extension {
  return autocompletion({
    override: [turtleCompletionSource],
    activateOnTyping: true,
  });
}

export { turtleCompletionSource, allCompletions, turtleAPICompletions, luaKeywordCompletions };
