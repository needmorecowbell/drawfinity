---
title: Turtle API Reference
description: Complete API reference for the Drawfinity turtle graphics Lua environment — all functions, types, defaults, and sandbox details.
---

# Turtle API Reference

This is the authoritative reference for every function available in the Drawfinity turtle graphics Lua environment. For a tutorial-style introduction, see the [Turtle Graphics guide](/turtle-graphics). To browse community scripts, visit the [Turtle Exchange](/turtle-exchange).

[[toc]]

## Environment Overview {#environment}

The turtle environment runs **Lua 5.4** inside a WebAssembly sandbox (via [wasmoon](https://github.com/nicander/wasmoon)). Scripts execute in two phases:

1. **Collection phase** — your Lua code runs to completion. Each turtle function call records a command rather than executing immediately.
2. **Replay phase** — the collected commands are replayed with animation delays determined by the current `speed` setting.

This means all Lua logic (loops, conditionals, recursion) resolves before any drawing appears on screen.

## Default State {#defaults}

When a script starts, the turtle has the following state:

| Property | Default |
|----------|---------|
| Position | `(0, 0)` — camera center, or placed via the **Place** button |
| Heading | `0` — facing up |
| Pen | **Down** (drawing) |
| Color | Black (`#000000`) |
| Width | `2` pixels |
| Opacity | `1.0` (fully opaque) |
| Speed | `5` (medium) |

## Coordinate System {#coordinates}

- **Origin:** `(0, 0)` defaults to the camera center. Click the **Place** button to reposition it.
- **X axis:** increases to the right.
- **Y axis:** increases downward.
- **Heading:** `0°` points up. Angles increase clockwise — `right(90)` faces east, `right(180)` faces down.
- **Units:** logical pixels. By default, turtle output is **zoom-scaled** so that a `forward(100)` looks the same size on screen regardless of the current camera zoom. If you need raw world-space units, call [`set_world_space(true)`](#set-world-space) at the start of your script.

---

## Function Reference {#functions}

### Movement {#movement}

#### `forward(distance)` {#forward}

Move the turtle forward by `distance` pixels along its current heading. Draws a line if the pen is down.

| Parameter | Type | Description |
|-----------|------|-------------|
| `distance` | `number` | Distance in pixels |

```lua
forward(100)  -- move 100px in the current direction
```

#### `backward(distance)` {#backward}

Move the turtle backward by `distance` pixels (opposite of its heading). Draws a line if the pen is down.

| Parameter | Type | Description |
|-----------|------|-------------|
| `distance` | `number` | Distance in pixels |

```lua
backward(50)  -- move 50px in the opposite direction
```

#### `goto_pos(x, y)` {#goto-pos}

Move the turtle to the absolute position (`x`, `y`). Draws a line if the pen is down. Does **not** change the heading.

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Target X coordinate |
| `y` | `number` | Target Y coordinate |

```lua
goto_pos(200, 150)  -- jump to (200, 150)
```

Also available as `turtle_goto(x, y)` — an alias provided because `goto` is a reserved keyword in Lua 5.4.

#### `home()` {#home}

Return the turtle to `(0, 0)` and reset the heading to `0` (facing up). Draws a line if the pen is down.

```lua
home()  -- return to origin, face up
```

---

### Rotation {#rotation}

#### `right(angle)` {#right}

Turn the turtle clockwise by `angle` degrees.

| Parameter | Type | Description |
|-----------|------|-------------|
| `angle` | `number` | Degrees to rotate clockwise |

```lua
right(90)   -- face east
right(45)   -- turn 45° clockwise
```

#### `left(angle)` {#left}

Turn the turtle counter-clockwise by `angle` degrees.

| Parameter | Type | Description |
|-----------|------|-------------|
| `angle` | `number` | Degrees to rotate counter-clockwise |

```lua
left(90)    -- face west
left(120)   -- turn 120° counter-clockwise
```

---

### Pen Control {#pen-control}

#### `penup()` {#penup}

Lift the pen. Subsequent movement commands will not draw lines.

```lua
penup()
forward(50)   -- moves without drawing
```

#### `pendown()` {#pendown}

Lower the pen. Subsequent movement commands will draw lines.

```lua
pendown()
forward(50)   -- draws a line
```

#### `pencolor(r, g, b)` {#pencolor-rgb}

Set the pen color using RGB integer values. Each component is clamped to the range **0–255** and rounded to the nearest integer.

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `r` | `number` | 0–255 | Red component |
| `g` | `number` | 0–255 | Green component |
| `b` | `number` | 0–255 | Blue component |

**Clamping:** values below 0 are set to 0; values above 255 are set to 255. Fractional values are rounded.

```lua
pencolor(255, 0, 0)     -- red
pencolor(0, 128, 255)   -- sky blue
```

#### `pencolor(hex)` {#pencolor-hex}

Set the pen color using a hex string. Must be a 6-digit hex code with a `#` prefix.

| Parameter | Type | Description |
|-----------|------|-------------|
| `hex` | `string` | Color in `"#rrggbb"` format |

```lua
pencolor("#ff6600")   -- orange
pencolor("#333333")   -- dark gray
```

::: warning
Three-digit shorthand (e.g., `"#333"`) is not expanded — always use the full 6-digit form.
:::

#### `penwidth(width)` {#penwidth}

Set the pen stroke width in pixels.

| Parameter | Type | Description |
|-----------|------|-------------|
| `width` | `number` | Stroke width in pixels |

```lua
penwidth(5)    -- thick line
penwidth(0.5)  -- thin line
```

#### `penopacity(opacity)` {#penopacity}

Set the pen opacity. **Clamped** to the range `[0.0, 1.0]`.

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `opacity` | `number` | 0.0–1.0 | `0.0` = fully transparent, `1.0` = fully opaque |

**Clamping:** values below 0 are set to 0; values above 1 are set to 1.

```lua
penopacity(0.5)   -- semi-transparent
penopacity(1.0)   -- fully opaque (default)
```

---

### State Queries {#state-queries}

#### `position()` {#position}

Returns two values: the turtle's current X and Y coordinates.

**Returns:** `number, number` — X and Y position.

```lua
local x, y = position()
print("Position: " .. x .. ", " .. y)
```

#### `heading()` {#heading}

Returns the turtle's current heading in degrees.

**Returns:** `number` — heading where `0` = up, `90` = right, `180` = down, `270` = left.

```lua
local h = heading()
print("Heading: " .. h)
```

#### `isdown()` {#isdown}

Returns whether the pen is currently down (drawing).

**Returns:** `boolean` — `true` if pen is down, `false` if up.

```lua
if isdown() then
  print("Pen is drawing")
end
```

---

### Canvas {#canvas}

#### `clear()` {#clear}

Remove all strokes previously drawn by the turtle in this session. This action is undoable with <kbd>Ctrl</kbd>+<kbd>Z</kbd>.

```lua
clear()   -- erase all turtle-drawn strokes
```

---

### Execution Control {#execution}

#### `speed(n)` {#speed}

Set the animation speed for subsequent commands. The value is **clamped** to the range `[0, 10]`.

| Value | Delay per step | Effect |
|-------|---------------|--------|
| `0` | None | Instant — no animation, strokes batched for best performance |
| `1` | 100 ms | Slowest animated |
| `2` | ~89 ms | |
| `3` | ~78 ms | |
| `4` | ~67 ms | |
| `5` | ~56 ms | Medium (default) |
| `6` | ~44 ms | |
| `7` | ~33 ms | |
| `8` | ~22 ms | |
| `9` | ~11 ms | |
| `10` | 1 ms | Fastest animated |

Speed scales linearly between 1 (100 ms) and 10 (1 ms). Setting speed to `0` is special — it skips all animation delays entirely.

```lua
speed(0)    -- instant drawing, ideal for complex patterns
speed(10)   -- fast but still animated
```

#### `sleep(ms)` {#sleep}

Pause execution for `ms` milliseconds. Negative values are clamped to `0`. Works at any speed setting, including `speed(0)`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `ms` | `number` | Milliseconds to pause (≥ 0) |

```lua
forward(100)
sleep(1000)    -- wait 1 second
forward(100)
```

---

### Zoom Control {#zoom-control}

#### `set_world_space(enabled)` {#set-world-space}

Enable or disable world-space mode. By default, turtle distances and pen widths are automatically scaled by the inverse of the camera zoom so that drawings appear the same visual size on screen regardless of zoom level. Calling `set_world_space(true)` disables this — all distances use raw world-space units.

| Parameter | Type | Description |
|-----------|------|-------------|
| `enabled` | `boolean` | `true` to use raw world units, `false` to use zoom-scaled units (default) |

```lua
set_world_space(true)   -- distances are in raw world units
forward(100)            -- always exactly 100 world-space pixels
```

::: tip When to use
Most scripts should leave zoom scaling enabled (the default). Use `set_world_space(true)` when you need pixel-precise control over world-space coordinates — for example, to align turtle output with existing hand-drawn content.
:::

::: warning
Call this at the **beginning** of your script (before any drawing commands) or after a `penup()`. Toggling mid-drawing while the pen is down will cause a visual discontinuity in the stroke path.
:::

---

### Output {#output}

#### `print(...)` {#print}

Print values to the turtle console panel. Accepts multiple arguments of any type — they are converted to strings and separated by tabs.

| Parameter | Type | Description |
|-----------|------|-------------|
| `...` | `any` | One or more values to print |

```lua
print("Hello, turtle!")
print("x =", 42, "y =", 7)  -- output: x =	42	y =	7
```

---

### Utilities {#utilities}

#### `repeat_n(n, fn)` {#repeat-n}

Call function `fn` exactly `n` times. A convenience wrapper around a numeric for-loop.

| Parameter | Type | Description |
|-----------|------|-------------|
| `n` | `number` | Number of iterations |
| `fn` | `function` | Function to call each iteration |

```lua
-- Draw a hexagon
repeat_n(6, function()
  forward(80)
  right(60)
end)
```

---

## Available Lua Libraries {#lua-libraries}

The sandbox loads a curated subset of Lua 5.4 standard libraries.

### Included

| Library | Key functions |
|---------|--------------|
| `math` | `math.pi`, `math.sin`, `math.cos`, `math.tan`, `math.atan`, `math.floor`, `math.ceil`, `math.abs`, `math.sqrt`, `math.random`, `math.randomseed`, `math.huge`, `math.maxinteger`, `math.mininteger` |
| `string` | `string.format`, `string.sub`, `string.len`, `string.upper`, `string.lower`, `string.rep`, `string.reverse`, `string.byte`, `string.char`, `string.find`, `string.gmatch`, `string.gsub`, `string.match` |
| `table` | `table.insert`, `table.remove`, `table.sort`, `table.concat`, `table.move`, `table.pack`, `table.unpack` |
| `utf8` | `utf8.char`, `utf8.codepoint`, `utf8.len`, `utf8.offset`, `utf8.codes` |
| `coroutine` | `coroutine.create`, `coroutine.resume`, `coroutine.yield`, `coroutine.status`, `coroutine.wrap` |

### Disabled (for security)

The following modules and globals are **not available**:

- `io` — file input/output
- `os` — operating system access
- `dofile` — loading external Lua files
- `loadfile` — loading external Lua files

---

## Function Summary {#summary}

| Function | Category | Description |
|----------|----------|-------------|
| [`forward(distance)`](#forward) | Movement | Move forward |
| [`backward(distance)`](#backward) | Movement | Move backward |
| [`goto_pos(x, y)`](#goto-pos) | Movement | Move to absolute position |
| [`turtle_goto(x, y)`](#goto-pos) | Movement | Alias for `goto_pos` |
| [`home()`](#home) | Movement | Return to origin, reset heading |
| [`right(angle)`](#right) | Rotation | Turn clockwise |
| [`left(angle)`](#left) | Rotation | Turn counter-clockwise |
| [`penup()`](#penup) | Pen Control | Stop drawing |
| [`pendown()`](#pendown) | Pen Control | Start drawing |
| [`pencolor(r, g, b)`](#pencolor-rgb) | Pen Control | Set color (RGB) |
| [`pencolor(hex)`](#pencolor-hex) | Pen Control | Set color (hex string) |
| [`penwidth(width)`](#penwidth) | Pen Control | Set stroke width |
| [`penopacity(opacity)`](#penopacity) | Pen Control | Set stroke opacity |
| [`position()`](#position) | State Query | Get current position |
| [`heading()`](#heading) | State Query | Get current heading |
| [`isdown()`](#isdown) | State Query | Check if pen is down |
| [`clear()`](#clear) | Canvas | Remove turtle strokes |
| [`speed(n)`](#speed) | Execution | Set animation speed |
| [`sleep(ms)`](#sleep) | Execution | Pause execution |
| [`set_world_space(enabled)`](#set-world-space) | Zoom Control | Toggle zoom-scaled vs raw world units |
| [`print(...)`](#print) | Output | Print to console |
| [`repeat_n(n, fn)`](#repeat-n) | Utility | Repeat a function N times |
