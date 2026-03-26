---
title: Turtle Graphics
description: Write Lua scripts to create geometric art, fractals, and patterns on the Drawfinity canvas.
---

# Turtle Graphics

Drawfinity includes a built-in turtle graphics environment powered by Lua 5.4. Write scripts to create geometric art, fractals, and patterns that become permanent strokes on the canvas — fully saveable, syncable, and editable just like hand-drawn art.

## Getting Started

Open the turtle panel with <kbd>Ctrl</kbd>+<kbd>`</kbd> or the turtle button in the toolbar. The panel has a code editor on the left and a console output on the right.

Write a script in the editor and press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> or click **Run** to execute it. The turtle starts at the center of your viewport, facing up.

```lua
-- Draw a square
for i = 1, 4 do
  forward(100)
  right(90)
end
```

## How It Works

The turtle is an invisible cursor that moves around the canvas. When the pen is down (the default), movement commands draw strokes along the turtle's path. You control the turtle by calling Lua functions for movement, rotation, and pen settings.

Scripts execute in two phases: first the Lua code runs and collects all commands, then the commands are replayed with animation. This means your script always runs to completion before drawing begins.

Turtle-drawn strokes are real document strokes — they persist when you save, sync to collaborators, can be undone with <kbd>Ctrl</kbd>+<kbd>Z</kbd>, and can be erased with the eraser tool.

## Coordinate System

- **Origin:** The turtle starts at position (0, 0), which defaults to the camera center. You can reposition the origin by clicking the **Place** button and then clicking on the canvas.
- **Axes:** X increases to the right, Y increases downward.
- **Heading:** 0 degrees points up. Angles increase clockwise (so `right(90)` faces east).
- **Units:** Distances are in logical pixels. Turtle output is automatically scaled by the camera zoom so drawings look the same size on screen at any zoom level. Use [`set_world_space(true)`](#set-world-space) to opt out and work in raw world units.

## API Reference

### Movement

#### `forward(distance)`

Move the turtle forward by `distance` pixels in the direction it's currently facing. Draws a line if the pen is down.

```lua
forward(100)  -- move 100px forward
```

#### `backward(distance)`

Move the turtle backward by `distance` pixels (opposite of its heading). Draws a line if the pen is down.

```lua
backward(50)  -- move 50px backward
```

#### `goto_pos(x, y)`

Move the turtle to the absolute position (`x`, `y`). Draws a line if the pen is down. Does not change the turtle's heading.

Also available as `turtle_goto(x, y)`.

```lua
goto_pos(200, 150)  -- move to position (200, 150)
```

#### `home()`

Return the turtle to the origin (0, 0) and reset the heading to 0 (facing up). Draws a line if the pen is down.

```lua
home()
```

### Rotation

#### `right(angle)`

Turn the turtle clockwise by `angle` degrees.

```lua
right(90)   -- face east
right(45)   -- turn 45 degrees clockwise
```

#### `left(angle)`

Turn the turtle counter-clockwise by `angle` degrees.

```lua
left(90)    -- face west
left(120)   -- turn 120 degrees counter-clockwise
```

### Pen Control

The pen determines whether movement draws a line and what that line looks like. The pen starts **down** (drawing) with a black color, width of 2 pixels, and full opacity.

#### `penup()`

Lift the pen. Subsequent movement will not draw lines.

```lua
penup()
forward(50)   -- moves without drawing
```

#### `pendown()`

Lower the pen. Subsequent movement will draw lines.

```lua
pendown()
forward(50)   -- draws a line
```

#### `pencolor(r, g, b)`

Set the pen color using RGB values. Each component is an integer from 0 to 255.

```lua
pencolor(255, 0, 0)     -- red
pencolor(0, 128, 255)   -- sky blue
```

#### `pencolor(hex)`

Set the pen color using a hex string.

```lua
pencolor("#ff6600")      -- orange
pencolor("#333")         -- dark gray (3-digit shorthand not supported, use 6 digits)
```

#### `penwidth(width)`

Set the pen stroke width in pixels.

```lua
penwidth(5)    -- thick line
penwidth(0.5)  -- thin line
```

#### `penopacity(opacity)`

Set the pen opacity. `0.0` is fully transparent, `1.0` is fully opaque. Values are clamped to the [0, 1] range.

```lua
penopacity(0.5)   -- semi-transparent
```

### State Queries

#### `position()`

Returns two values: the turtle's current X and Y coordinates.

```lua
local x, y = position()
print("Position: " .. x .. ", " .. y)
```

#### `heading()`

Returns the turtle's current heading in degrees.

```lua
local h = heading()
print("Heading: " .. h)   -- 0 = up, 90 = right, 180 = down, 270 = left
```

#### `isdown()`

Returns `true` if the pen is down (drawing), `false` if up.

```lua
if isdown() then
  print("Pen is drawing")
end
```

### Canvas

#### `clear()`

Remove all strokes previously drawn by the turtle. This is undoable with <kbd>Ctrl</kbd>+<kbd>Z</kbd>.

```lua
clear()   -- erase all turtle art
```

### Execution Control

#### `speed(n)`

Set the animation speed for subsequent commands.

| Value | Effect |
|-------|--------|
| `0` | Instant (no animation) |
| `1` | Slowest (100ms per step) |
| `5` | Medium (default) |
| `10` | Fastest animated (1ms per step) |

Speed scales linearly between 1 and 10. Setting speed to 0 skips all animation delays and batches strokes for best performance — ideal for complex drawings.

```lua
speed(0)    -- instant drawing, best for complex patterns
speed(10)   -- fast but still animated
```

#### `sleep(ms)`

Pause execution for `ms` milliseconds. Works at any speed setting.

```lua
forward(100)
sleep(1000)    -- wait 1 second
forward(100)
```

### Zoom Control

#### `set_world_space(enabled)` {#set-world-space}

By default, turtle distances and pen widths are scaled by the camera zoom so that drawings appear the same visual size on screen. Call `set_world_space(true)` at the start of your script to disable this and use raw world-space units instead.

```lua
set_world_space(true)   -- all distances are now in raw world units
forward(100)            -- always 100 world-space pixels, regardless of zoom
```

> **Tip:** Most scripts should leave this at the default. Use world-space mode when you need to align turtle output with existing content on the canvas.

### Output

#### `print(...)`

Print values to the turtle console. Accepts multiple arguments of any type.

```lua
print("Hello, turtle!")
print("x =", 42, "y =", 7)
```

### Utilities

#### `repeat_n(n, fn)`

Call function `fn` exactly `n` times. A convenience wrapper around a for-loop.

```lua
-- Draw a hexagon
repeat_n(6, function()
  forward(80)
  right(60)
end)
```

## Available Libraries

The Lua environment includes these standard libraries:

| Library | Description |
|---------|-------------|
| `math` | `math.pi`, `math.sin`, `math.cos`, `math.floor`, `math.random`, `math.sqrt`, etc. |
| `string` | `string.format`, `string.sub`, `string.len`, `string.upper`, etc. |
| `table` | `table.insert`, `table.remove`, `table.sort`, `table.concat`, etc. |
| `utf8` | UTF-8 string handling |
| `coroutine` | Coroutine creation and management |

For security, file I/O (`io`, `os`, `dofile`, `loadfile`) is disabled.

## Examples

### Colorful Spiral

```lua
speed(0)
for i = 1, 200 do
  -- Cycle through colors using HSV-like math
  local hue = (i * 3) % 360
  local r, g, b
  local h = hue / 60
  local x = math.floor(h)
  local f = h - x
  if x == 0 then r, g, b = 255, math.floor(f * 255), 0
  elseif x == 1 then r, g, b = math.floor((1 - f) * 255), 255, 0
  elseif x == 2 then r, g, b = 0, 255, math.floor(f * 255)
  elseif x == 3 then r, g, b = 0, math.floor((1 - f) * 255), 255
  elseif x == 4 then r, g, b = math.floor(f * 255), 0, 255
  else r, g, b = 255, 0, math.floor((1 - f) * 255)
  end
  pencolor(r, g, b)
  forward(i * 2)
  right(91)
end
```

### Star Pattern

```lua
speed(0)
pencolor(255, 215, 0)
for i = 1, 36 do
  forward(100)
  right(170)
end
```

### Koch Snowflake

```lua
speed(0)

function koch(size, depth)
  if depth == 0 then
    forward(size)
  else
    koch(size / 3, depth - 1)
    left(60)
    koch(size / 3, depth - 1)
    right(120)
    koch(size / 3, depth - 1)
    left(60)
    koch(size / 3, depth - 1)
  end
end

pencolor(0, 100, 200)
penup()
backward(150)
left(90)
backward(100)
right(90)
pendown()

for i = 1, 3 do
  koch(300, 3)
  right(120)
end
```

### Recursive Tree

```lua
speed(0)

function tree(size, depth)
  if depth == 0 then return end
  penwidth(depth)
  if depth <= 2 then
    pencolor(34, 139, 34)    -- green leaves
  else
    pencolor(139, 69, 19)    -- brown trunk
  end
  forward(size)
  left(30)
  tree(size * 0.7, depth - 1)
  right(60)
  tree(size * 0.7, depth - 1)
  left(30)
  backward(size)
end

left(180)    -- face upward on screen
tree(80, 8)
```

### Sierpinski Triangle

```lua
speed(0)

function sierpinski(size, depth)
  if depth == 0 then
    for i = 1, 3 do
      forward(size)
      left(120)
    end
  else
    sierpinski(size / 2, depth - 1)
    forward(size / 2)
    sierpinski(size / 2, depth - 1)
    backward(size / 2)
    left(60)
    forward(size / 2)
    right(60)
    sierpinski(size / 2, depth - 1)
    left(60)
    backward(size / 2)
    right(60)
  end
end

pencolor(128, 0, 128)
sierpinski(256, 5)
```

## Turtle Herding

Scripts can spawn additional turtles that draw concurrently — we call this **turtle herding**. Each spawned turtle has its own position, heading, pen color, and width. During replay, all active turtles execute one command per tick in round-robin order, creating visually interleaved animations. A single script can coordinate dozens or hundreds of turtles to produce complex patterns that would be difficult to express with a single turtle.

### Spawning Turtles

Call `spawn(id)` to create a new turtle and get a handle for controlling it:

```lua
local t = spawn("helper")
t.pencolor(255, 0, 0)
t.forward(100)
t.right(90)
t.forward(100)
```

You can also pass an options table with initial state:

```lua
local t = spawn("offset", { x = 50, y = 50, heading = 45, color = "#00ff00", width = 3 })
t.forward(200)
```

The main turtle (your global `forward`, `right`, etc.) continues to work as normal alongside spawned turtles.

### Lifecycle Management

```lua
kill("helper")         -- remove a specific turtle
killall()              -- remove all spawned turtles (keeps main)
local ids = list_turtles()  -- get list of active turtle IDs
```

### Visibility

```lua
hide()           -- hide the main turtle indicator
show()           -- show it again
local t = spawn("ghost")
t.hide()         -- hide a spawned turtle's indicator
```

### Spawn Limits

To prevent runaway spawning, limits are enforced globally:

```lua
set_spawn_limit(100)   -- max 100 turtles total (default: 1000)
set_spawn_depth(5)     -- max 5 levels of nesting (default: 10)
```

### Cross-Script Observation

When multiple scripts are running, turtles from one script are visible to another. Use `environment_turtles()` to query all turtles in the environment:

```lua
local all = environment_turtles()
for _, t in ipairs(all) do
  print(t.id, t.x, t.y, t.owned)
end
```

Each entry has `id`, `x`, `y`, `heading`, `color`, `visible`, and `owned` fields. You can observe but not control turtles from other scripts.

### Example: Parallel Spirals

Spawn 4 turtles at cardinal directions, each drawing a spiral simultaneously:

```lua
speed(0)

local colors = {"#ff0000", "#00cc00", "#0066ff", "#ff9900"}
local offsets = {
  {x = 0, y = -100, heading = 0},
  {x = 100, y = 0, heading = 90},
  {x = 0, y = 100, heading = 180},
  {x = -100, y = 0, heading = 270},
}

local turtles = {}
for i = 1, 4 do
  local t = spawn("spiral" .. i, {
    x = offsets[i].x,
    y = offsets[i].y,
    heading = offsets[i].heading,
    color = colors[i],
    width = 2,
  })
  turtles[i] = t
end

-- Each turtle draws a spiral
for step = 1, 80 do
  for i = 1, 4 do
    turtles[i].forward(step * 2)
    turtles[i].right(91)
  end
end
```

### Example: Recursive Branching

A fractal tree where each branch tip spawns child turtles that continue the pattern. Since `position()` returns the pre-movement state during the collection phase, tip positions are calculated mathematically:

```lua
speed(0)
local count = 0

function branch(x, y, hdg, size, depth)
  if depth == 0 or size < 4 then return end

  count = count + 1
  local t = spawn("b" .. count, {x = x, y = y, heading = hdg})
  t.penwidth(math.max(1, depth * 1.2))
  if depth <= 2 then
    t.pencolor(34, 139, 34)    -- green leaves
  else
    t.pencolor(139, 69, 19)    -- brown trunk
  end
  t.forward(size)

  -- Calculate tip position (heading 0 = up, clockwise)
  local rad = math.rad(hdg)
  local tipX = x + math.sin(rad) * size
  local tipY = y - math.cos(rad) * size

  branch(tipX, tipY, hdg - 25, size * 0.7, depth - 1)
  branch(tipX, tipY, hdg + 25, size * 0.7, depth - 1)
end

-- Start the tree growing downward from origin
branch(0, 0, 180, 80, 6)
```

> **Tip:** Use `speed(0)` when spawning many turtles — interleaved animation with dozens of turtles can be slow.

For complete API details, see the [Turtle API Reference](/turtle-api#spawning).

## Panel Controls

| Control | Action |
|---------|--------|
| **Run** (<kbd>Ctrl</kbd>+<kbd>Enter</kbd>) | Execute the current script |
| **Stop** | Halt a running script |
| **Place** | Click canvas to reposition the turtle's home origin |
| **Speed slider** | Adjust animation speed (0-10) |
| **Scripts** | Browse and import scripts from the [Turtle Exchange](/turtle-exchange) |
| **Clear Console** | Clear the output log |

Scripts are automatically saved per-drawing and restored when you reopen the panel.

## Turtle Exchange

The [Turtle Exchange](/turtle-exchange) is a community library of turtle scripts. Click **Scripts** in the turtle panel to browse, search by tag, and import scripts with one click. You can also contribute your own — see the [contribution guide](/turtle-exchange#contributing).

## Tips

- Use `speed(0)` for complex drawings — it's dramatically faster because it skips animation and batches strokes.
- Combine `penup()` and `goto_pos()` to jump to specific positions without drawing.
- Use recursion for fractals — Lua handles deep recursion well.
- The `math` library is your friend: `math.sin`, `math.cos`, and `math.pi` are essential for circular and spiral patterns.
- Call `clear()` at the start of a script during development to clean up previous runs.
- Turtle strokes are regular canvas strokes — you can draw over them, erase parts with the eraser, and undo individual runs.
- Turtle output is zoom-aware by default — a script produces the same visual result whether you're zoomed in or out. Call `set_world_space(true)` if you need exact world-space positioning.
