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

Return the turtle to the origin (0, 0) and reset the heading to 0 (facing up). Draws a line if the pen is down. Also resets pen mode to `"draw"`, clears the active brush preset, and clears the fill color.

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

#### `penmode(mode, options?)`

Switch the pen between draw and erase modes. In `"erase"` mode, movement erases strokes under the turtle's path instead of drawing new ones.

```lua
penmode("erase")                          -- erase all strokes under path
penmode("erase", {turtle_only = true})    -- only erase turtle-drawn strokes
penmode("draw")                           -- back to normal drawing
```

#### `penpreset(name)`

Apply a named brush preset (`"pen"`, `"pencil"`, `"marker"`, `"highlighter"`). Pass `nil` to clear.

```lua
penpreset("marker")
forward(100)             -- marker-style stroke
penpreset(nil)           -- back to raw pen
```

#### `fillcolor(r, g, b)` / `fillcolor(hex)` / `fillcolor(nil)`

Set the fill color for shape commands. Pass `nil` to clear (outline only).

```lua
fillcolor(255, 200, 0)   -- set fill color
fillcolor("#ff6600")      -- hex format
fillcolor(nil)            -- no fill
```

### Shapes

Shape commands create geometric objects at the turtle's current position without moving the turtle. They use the current pen color, width, opacity, heading, and fill color.

#### `rectangle(width, height)`

Draw a rectangle centered at the turtle.

```lua
rectangle(120, 80)
```

#### `ellipse(width, height)`

Draw an ellipse centered at the turtle.

```lua
ellipse(100, 60)
```

#### `polygon(sides, radius)`

Draw a regular polygon. `sides` must be ≥ 3.

```lua
polygon(6, 50)   -- hexagon
```

#### `star(points, outerRadius, innerRadius)`

Draw a star. `points` must be ≥ 2.

```lua
star(5, 60, 25)  -- classic 5-pointed star
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

### Architecture — Building a Scene with Shapes and Erasing

Build a house scene using shape commands for walls, roof, and windows, then use the eraser to cut a doorway:

```lua
speed(0)

-- Ground
pencolor("#558855")
fillcolor("#558855")
penup()
goto_pos(0, 120)
pendown()
rectangle(500, 40)

-- Main house body
pencolor("#884422")
fillcolor("#ddbb88")
penup()
goto_pos(0, 20)
pendown()
rectangle(200, 160)

-- Roof (triangle)
pencolor("#882222")
fillcolor("#cc4444")
penup()
goto_pos(0, -80)
pendown()
polygon(3, 120)

-- Left window
pencolor("#336699")
fillcolor("#aaddff")
penup()
goto_pos(-50, 10)
pendown()
ellipse(40, 40)

-- Right window
penup()
goto_pos(50, 10)
pendown()
ellipse(40, 40)

-- Door frame
pencolor("#553311")
fillcolor("#774422")
penup()
goto_pos(0, 60)
pendown()
rectangle(40, 70)

-- Chimney
pencolor("#666666")
fillcolor("#888888")
penup()
goto_pos(70, -100)
pendown()
rectangle(25, 50)

-- Sun
pencolor("#ffaa00")
fillcolor(255, 220, 50)
penup()
goto_pos(-180, -120)
pendown()
star(8, 40, 18)

-- Erase a doorway opening in the door
penmode("erase")
penwidth(30)
penup()
goto_pos(0, 55)
pendown()
goto_pos(0, 95)

-- Back to draw mode — add a doorknob
penmode("draw")
penwidth(2)
pencolor("#ffcc00")
fillcolor("#ffcc00")
penup()
goto_pos(10, 65)
pendown()
ellipse(6, 6)
```

### Brush Sampler — Comparing Brush Presets

Draw the same spiral pattern with each brush preset side by side to visualize the differences:

```lua
speed(0)

local presets = {"pen", "pencil", "marker", "highlighter"}
local colors = {"#2244cc", "#cc4422", "#22aa44", "#ff8800"}
local labels = {"Pen", "Pencil", "Marker", "Highlighter"}

for i, preset in ipairs(presets) do
  -- Position each sample in a row
  local offsetX = -225 + (i - 1) * 150

  -- Label
  penpreset(nil)
  pencolor("#000000")
  penwidth(2)
  penopacity(1.0)
  penup()
  goto_pos(offsetX, -100)
  pendown()

  -- Draw label as a small underline
  forward(0)
  penup()
  goto_pos(offsetX - 30, -85)
  pendown()
  goto_pos(offsetX + 30, -85)

  -- Apply the preset and draw a spiral
  penpreset(preset)
  pencolor(colors[i])
  penwidth(3)
  penup()
  goto_pos(offsetX, 0)
  pendown()

  -- Save heading, draw spiral from this position
  local cx, cy = offsetX, 0
  for step = 1, 60 do
    local angle = step * 0.15
    local radius = step * 1.0
    local nx = cx + math.cos(angle) * radius
    local ny = cy + math.sin(angle) * radius
    goto_pos(nx, ny)
  end
end

-- Reset preset
penpreset(nil)
```

### Shape Scene with Selective Erasing

Build a scene with shapes, then use the eraser to cut patterns through it:

```lua
speed(0)

-- Draw a row of colored rectangles
penwidth(2)
for i = 0, 4 do
  penup()
  goto_pos(-200 + i * 100, 0)
  pendown()

  -- Alternate colors
  local colors = {"#ff4444", "#44aa44", "#4444ff", "#ffaa00", "#aa44aa"}
  pencolor(colors[i + 1])
  fillcolor(colors[i + 1])
  rectangle(80, 120)
end

-- Add stars on top
fillcolor(255, 215, 0)
pencolor("#ffdd00")
for i = 0, 4 do
  penup()
  goto_pos(-200 + i * 100, -40)
  pendown()
  star(5, 20, 8)
end

-- Now erase a diagonal slash through the scene
penmode("erase")
penwidth(15)
penup()
goto_pos(-250, 80)
pendown()
goto_pos(250, -80)

-- Switch back to draw mode and add a polygon
penmode("draw")
penwidth(3)
pencolor("#000000")
fillcolor(nil)
penup()
goto_pos(0, 100)
pendown()
polygon(6, 40)
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

### Example: Flocking (Boid Rules)

Spawn 20 turtles that use `activate()` and `nearby_turtles()` to implement simple boid rules — separation, alignment, and cohesion — over 200 simulation steps:

```lua
speed(0)
math.randomseed(os.clock())

local count = 20
local ids = {}

-- Spawn turtles in a cluster
for i = 1, count do
  ids[i] = "boid" .. i
  spawn(ids[i], {
    x = math.random(-150, 150),
    y = math.random(-150, 150),
    heading = math.random(0, 359),
    color = string.format("#%02x%02x%02x",
      math.random(100, 255), math.random(50, 200), math.random(50, 200)),
    width = 2,
  })
end

-- Simulate 200 generations of flocking
simulate(200, function(step)
  for i = 1, count do
    activate(ids[i])  -- switch context so queries/commands affect this boid
    local neighbors = nearby_turtles(80)

    if #neighbors > 0 then
      local myX, myY = position()
      local myH = heading()
      local sepX, sepY = 0, 0     -- separation
      local avgHdg = 0            -- alignment
      local avgX, avgY = 0, 0     -- cohesion

      for _, n in ipairs(neighbors) do
        -- Separation: steer away from very close neighbors
        if n.distance < 30 and n.distance > 0 then
          sepX = sepX + (myX - n.x)
          sepY = sepY + (myY - n.y)
        end
        avgHdg = avgHdg + n.heading
        avgX = avgX + n.x
        avgY = avgY + n.y
      end

      -- Apply a gentle turn based on combined forces
      local turn = 0

      -- Separation: turn away from crowded areas
      if math.abs(sepX) + math.abs(sepY) > 1 then
        turn = turn + math.atan(sepY, sepX) * 2
      end

      -- Alignment: steer toward average heading
      avgHdg = avgHdg / #neighbors
      local diff = avgHdg - myH
      turn = turn + diff * 0.05

      -- Clamp turn
      if turn > 15 then turn = 15 end
      if turn < -15 then turn = -15 end

      right(turn)
    end

    forward(4)
  end
  activate("main")
end)
```

### Example: Message Relay

Spawn a chain of turtles that pass a color value down the line via `send()`/`receive()`. Each turtle draws a segment in the color it receives:

```lua
speed(0)

local chain_len = 8
local spacing = 60
local seg_len = 50

-- Spawn a chain of turtles in a row
local ids = {}
for i = 1, chain_len do
  local id = "relay" .. i
  ids[i] = id
  spawn(id, {
    x = (i - 1) * spacing - (chain_len - 1) * spacing / 2,
    y = 0,
    heading = 180,   -- face down
    color = "#888888",
    width = 3,
  })
end

-- Seed the first turtle with a color message
send("relay1", "#ff0000")

-- Each step, turtles check for messages and pass them along
simulate(chain_len + 5, function(step)
  for i = 1, chain_len do
    activate(ids[i])  -- switch to this turtle for receive/draw
    local msg = receive()
    if msg then
      -- Use the received color to draw
      pencolor(msg.data)
      forward(seg_len)

      -- Pass a shifted color to the next turtle in the chain
      if i < chain_len then
        -- Shift hue by rotating RGB components
        local hex = msg.data
        local r = tonumber(hex:sub(2, 3), 16) or 0
        local g = tonumber(hex:sub(4, 5), 16) or 0
        local b = tonumber(hex:sub(6, 7), 16) or 0
        -- Rotate: shift red -> green -> blue
        local nr = math.floor((r + 80) % 256)
        local ng = math.floor((g + 40) % 256)
        local nb = math.floor((b + 120) % 256)
        local newColor = string.format("#%02x%02x%02x", nr, ng, nb)
        send(ids[i + 1], newColor)
      end
    end
  end
  activate("main")
end)
```

For complete API details, see the [Turtle API Reference](/turtle-api#spawning).

## Communication & Awareness

When multiple turtles are spawned, they can sense their environment, exchange messages, and share state through a global blackboard. These capabilities enable emergent behaviors like flocking, cellular automata, and cooperative drawing.

### Spatial Awareness

Turtles can query their surroundings with `nearby_turtles(radius)`, `nearby_strokes(radius)`, and `distance_to(id)`. These execute immediately — turtles can read the world and make decisions in the same tick.

```lua
local neighbors = nearby_turtles(100)
for _, t in ipairs(neighbors) do
  print(t.id .. " at distance " .. t.distance)
end
```

### Messaging

Use `send(id, data)` and `receive()` for point-to-point communication. `broadcast(data)` sends to all turtles. Messages carry any Lua value — strings, numbers, or tables.

```lua
send("helper", {action = "move", amount = 50})

local msg = receive()
if msg then
  print("Got: " .. tostring(msg.data) .. " from " .. msg.from)
end
```

### Shared Blackboard

The blackboard is a global key-value store accessible to all turtles via `publish(key, value)`, `read_board(key)`, and `board_keys()`.

```lua
publish("generation", 1)
local gen = read_board("generation")
```

### Switching Active Turtle

By default, global functions like `forward()`, `receive()`, and `nearby_turtles()` operate on the main turtle. Use `activate(id)` to switch context to a spawned turtle, then call `activate("main")` to switch back. This is essential inside `simulate()` loops where each turtle needs to act independently.

```lua
spawn("scout", { x = 50, y = 0 })

simulate(20, function(step)
  activate("scout")
  local near = nearby_turtles(100)
  forward(5)       -- moves scout, not main
  activate("main")
  forward(3)       -- moves main
end)
```

### Multi-Step Simulation

`simulate(steps, fn)` runs a step function over multiple generations. During simulate, movement commands eagerly update turtle state so spatial queries reflect real-time positions. This is essential for reactive patterns like flocking and cellular automata.

```lua
simulate(100, function(step)
  activate("worker")
  local near = nearby_turtles(30)
  if #near > 3 then
    pencolor(255, 0, 0)   -- crowded = red
  else
    pencolor(0, 255, 0)   -- sparse = green
  end
  forward(5)
  activate("main")
end)
```

### Collision Detection

`collides_with(id)` checks if two turtles overlap based on pen width. Use `set_collision_radius(r)` for custom hit areas.

```lua
if collides_with("enemy") then
  pencolor(255, 0, 0)
  print("Hit!")
end
```

For the complete API reference, see [Communication & Awareness](/turtle-api#communication).

## Multiplayer

When collaborating in a shared room (connected via <kbd>Ctrl</kbd>+<kbd>K</kbd>), turtle graphics are multiplayer-aware.

### Automatic Stroke Sync

Turtle-drawn strokes are regular document strokes — they sync to all connected clients automatically through the Yjs CRDT layer. No special setup is needed. Collaborators see your turtle art appear in real time, and they can undo, erase, or draw over it just like any other stroke.

### Turtle Indicator Visibility

While your script is running, your turtle indicators (position and heading arrows) are broadcast to all connected clients via the Yjs awareness protocol. Collaborators see your turtles moving on their canvas in real time, rendered with a semi-transparent appearance and a unique hue derived from your client ID to distinguish them from their own local turtles.

When your script finishes or is stopped, your turtle indicators are automatically cleared from other clients' views.

### Sensing Remote Turtles

The `nearby_turtles()` function accepts an optional second parameter to include turtles from other connected clients:

```lua
-- Only local turtles (default)
local neighbors = nearby_turtles(200)

-- Include remote turtles from other clients
local all_nearby = nearby_turtles(200, true)
for _, t in ipairs(all_nearby) do
  if t.remote then
    print(t.id .. " is a remote turtle at distance " .. t.distance)
  end
end
```

Remote turtle entries include `remote = true` and an ID prefixed with `remote:<userId>:<turtleId>`. Local turtles have `remote = false`. Results are sorted by distance regardless of origin.

> **Note:** Remote turtle awareness is read-only — you can sense their positions but cannot control them or send them messages.

### Sharing Scripts

Click the **Share** button in the turtle panel to publish your current script to the room. All connected clients receive a notification and can find shared scripts in the **Shared Scripts** section of the script browser. Click **Run Shared** to load and execute a shared script.

Shared scripts are persisted in the document via the Yjs CRDT, so they survive reconnections and are available to anyone who joins the room later.

### Example: Chase

A collaborative example for two users. **User A** runs the "trail" script, which draws a colorful wandering path. **User B** runs the "chaser" script, which uses `nearby_turtles(500, true)` to detect User A's turtle and steer toward it.

**User A — Trail:**
```lua
-- Wander randomly, leaving a colorful trail
speed(0)
math.randomseed(os.clock())

simulate(300, function(step)
  local hue = (step * 5) % 360
  local h = hue / 60
  local x = math.floor(h)
  local f = h - x
  local r, g, b
  if x == 0 then r, g, b = 255, math.floor(f * 255), 0
  elseif x == 1 then r, g, b = math.floor((1 - f) * 255), 255, 0
  elseif x == 2 then r, g, b = 0, 255, math.floor(f * 255)
  elseif x == 3 then r, g, b = 0, math.floor((1 - f) * 255), 255
  elseif x == 4 then r, g, b = math.floor(f * 255), 0, 255
  else r, g, b = 255, 0, math.floor((1 - f) * 255)
  end
  pencolor(r, g, b)
  penwidth(3)
  right(math.random(-30, 30))
  forward(8)
end)
```

**User B — Chaser:**
```lua
-- Chase the nearest remote turtle
speed(0)
pencolor(255, 50, 50)
penwidth(2)

simulate(300, function(step)
  local targets = nearby_turtles(500, true)
  for _, t in ipairs(targets) do
    if t.remote then
      -- Steer toward the remote turtle
      local myX, myY = position()
      local dx = t.x - myX
      local dy = t.y - myY
      local targetAngle = math.deg(math.atan(dx, -dy)) % 360
      local myH = heading()
      local diff = targetAngle - myH
      if diff > 180 then diff = diff - 360 end
      if diff < -180 then diff = diff + 360 end
      right(diff * 0.3)
      break
    end
  end
  forward(10)
end)
```

When both scripts run simultaneously in a shared room, User B's turtle visibly chases User A's turtle across the canvas, leaving intersecting trails.

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
