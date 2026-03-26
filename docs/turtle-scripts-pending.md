# Turtle Scripts — Pending for Turtle Exchange

Scripts created during feature development that should be added to the Turtle Exchange.

**Design notes:**
- All scripts use `position()` to get the starting origin so they work correctly with the Place button.
- `goto_pos()` uses absolute logical coordinates, NOT relative to placement. To draw at the placement point, query `position()` at script start and offset from there.
- Erase (`penmode("erase")`) removes **whole strokes** that intersect the erase path — it cannot carve pixels out of a shape. To simulate carving, overdraw with a background color instead.
- Spawned turtle handle methods use **dot notation** (`t.ellipse(18, 18)`), NOT colon notation (`t:ellipse()`), because handle functions are plain table values.

## 1. Shape Showcase

**Tags:** shapes, fillcolor, beginner
**Description:** Displays all four shape types (rectangle, ellipse, polygon, star) side by side with fill colors.
**Status:** Tested, working (v2 — placement-aware).

```lua
speed(0)

-- Get origin so placement works correctly
local ox, oy = position()

local shapes = {
  {dx = -200, fn = "rect"},
  {dx = -80,  fn = "ellipse"},
  {dx = 40,   fn = "polygon"},
  {dx = 160,  fn = "star"},
}

for _, s in ipairs(shapes) do
  pencolor("#333333")
  fillcolor("#6699cc")
  penwidth(2)
  penup()
  goto_pos(ox + s.dx, oy)
  pendown()

  if s.fn == "rect" then
    rectangle(80, 100)
  elseif s.fn == "ellipse" then
    ellipse(50, 70)
  elseif s.fn == "polygon" then
    polygon(6, 50)
  elseif s.fn == "star" then
    star(5, 50, 20)
  end
end
```

## 2. Smiley Face

**Tags:** shapes, fillcolor, overdraw, creative
**Description:** Draws a filled blue circle then overdraws white shapes for eyes and a smile arc. Demonstrates layered drawing with fill colors.
**Status:** v3 — uses overdraw instead of erase (erase removes whole strokes, can't carve). Placement-aware.

```lua
speed(0)

-- Get origin so placement works correctly
local ox, oy = position()

-- Draw a filled circle backdrop
pencolor("#2255aa")
fillcolor("#2255aa")
penup()
goto_pos(ox, oy)
pendown()
ellipse(150, 150)

-- Overdraw white shapes for eyes (erase can't carve into shapes)
pencolor("#ffffff")
fillcolor("#ffffff")

-- Left eye
penup()
goto_pos(ox - 40, oy - 30)
pendown()
ellipse(12, 18)

-- Right eye
penup()
goto_pos(ox + 40, oy - 30)
pendown()
ellipse(12, 18)

-- Smile — overdraw a white arc using thick line segments
penwidth(10)
penup()
goto_pos(ox - 55, oy + 15)
pendown()
for i = 1, 20 do
  local t = i / 20
  local x = ox - 55 + t * 110
  local y = oy + 15 + math.sin(t * math.pi) * 40
  goto_pos(x, y)
end

-- Add a hat on top
penwidth(3)
pencolor("#cc3333")
fillcolor("#cc3333")
penup()
goto_pos(ox, oy - 100)
pendown()
rectangle(120, 20)
penup()
goto_pos(ox, oy - 130)
pendown()
rectangle(70, 40)
```

## 3. Brush Preset Comparison

**Tags:** penpreset, penopacity, penwidth, comparison
**Description:** Draws wavy lines with each brush preset at thin, thick, and semi-transparent settings. Shows visual differences between pen, pencil, marker, and highlighter.
**Status:** Tested, working (v3 — placement-aware).

```lua
speed(0)

-- Get origin so placement works correctly
local ox, oy = position()

local presets = {"pen", "pencil", "marker", "highlighter"}
local colors  = {"#222222", "#555555", "#2266aa", "#ffaa00"}

for i, preset in ipairs(presets) do
  local baseY = oy - 150 + (i - 1) * 100

  penpreset(preset)
  pencolor(colors[i])

  -- Thin stroke
  penwidth(2)
  penopacity(1.0)
  penup()
  goto_pos(ox - 180, baseY - 15)
  pendown()
  for step = 0, 40 do
    goto_pos(ox - 180 + step * 9, baseY - 15 + math.sin(step * 0.4) * 12)
  end

  -- Thick stroke
  penwidth(8)
  penup()
  goto_pos(ox - 180, baseY + 15)
  pendown()
  for step = 0, 40 do
    goto_pos(ox - 180 + step * 9, baseY + 15 + math.sin(step * 0.4) * 12)
  end

  -- Semi-transparent stroke
  penwidth(5)
  penopacity(0.4)
  penup()
  goto_pos(ox - 180, baseY + 40)
  pendown()
  for step = 0, 40 do
    goto_pos(ox - 180 + step * 9, baseY + 40 + math.sin(step * 0.4) * 12)
  end
end

penpreset(nil)
penopacity(1.0)
```

## 4. Flower Garden

**Tags:** spawn, shapes, multi-turtle, creative
**Description:** Uses spawned turtles to draw flowers with ellipse petals, then adds stems and ground with the main turtle.
**Status:** v4 — fixed spawn IDs, replaced setheading with trig, fixed colon→dot notation on handle methods, placement-aware.

```lua
speed(0)

-- Get origin so placement works correctly
local ox, oy = position()

function draw_flower(id, cx, cy, petalColor, centerColor)
  local t = spawn(id, {x = cx, y = cy})
  t.pencolor(petalColor)
  t.fillcolor(petalColor)

  -- Draw petals as ellipses arranged in a circle using trig
  for p = 1, 6 do
    local angle = (p - 1) * math.pi / 3
    local px = cx + math.sin(angle) * 25
    local py = cy - math.cos(angle) * 25
    t.penup()
    t.goto_pos(px, py)
    t.pendown()
    t.ellipse(18, 18)
  end

  -- Center
  t.pencolor(centerColor)
  t.fillcolor(centerColor)
  t.penup()
  t.goto_pos(cx, cy)
  t.pendown()
  t.ellipse(14, 14)
end

draw_flower("rose", ox - 120, oy + 40, "#ff6688", "#ffdd44")
draw_flower("violet", ox, oy + 20, "#aa66ff", "#ffdd44")
draw_flower("marigold", ox + 120, oy + 50, "#ff8844", "#ffdd44")

-- Stems
pencolor("#338833")
penwidth(3)
for _, dx in ipairs({-120, 0, 120}) do
  penup()
  goto_pos(ox + dx, oy + 60)
  pendown()
  goto_pos(ox + dx, oy + 140)
end

-- Ground
pencolor("#558855")
fillcolor("#558855")
penup()
goto_pos(ox, oy + 150)
pendown()
rectangle(400, 20)
```

## 5. Spirograph with Erasing

**Tags:** penmode, erase, shapes, math, spirograph
**Description:** Draws a dense spirograph using line segments, erases an X through it, then draws a star at the center. Demonstrates draw→erase→draw on line-based art.
**Status:** v4 — placement-aware. Erase works here because the spirograph is made of line segments (not shapes).

```lua
speed(0)

-- Get origin so placement works correctly
local ox, oy = position()

-- Draw a dense spirograph
pencolor("#cc2244")
penwidth(2)

-- Start with pen down at first point
local startAngle = 0.13
local startR = 80 + 30 * math.sin(0.03)
penup()
goto_pos(ox + math.cos(startAngle) * startR, oy + math.sin(startAngle) * startR)
pendown()

for i = 2, 600 do
  local angle = i * 0.13
  local r = 100 + 40 * math.sin(i * 0.03)
  goto_pos(ox + math.cos(angle) * r, oy + math.sin(angle) * r)
end

-- Erase two crossing slashes through the spirograph
penmode("erase")
penwidth(12)
penup()
goto_pos(ox - 110, oy - 110)
pendown()
goto_pos(ox + 110, oy + 110)

penup()
goto_pos(ox + 110, oy - 110)
pendown()
goto_pos(ox - 110, oy + 110)

-- Draw a star where the slashes cross
penmode("draw")
penwidth(2)
pencolor("#ffaa00")
fillcolor("#ffdd44")
penup()
goto_pos(ox, oy)
pendown()
star(8, 30, 12)
```

## 6. Sierpinski Zoom (Fractal Zoom Spawning)

**Tags:** fractal, spawn, zoom, scale, advanced
**Description:** Fractal zoom Sierpinski triangle — each sub-triangle is a spawned turtle at half scale. Zoom into any corner to explore self-similar detail at every level. Uses `min_pixel_size(1)` for LOD optimization and depth-based coloring from red (outermost) to purple (innermost). Depth 6 produces 1093 turtles across 7 scale levels.
**Status:** Added to exchange snapshot.

```lua
-- Sierpinski Triangle — Fractal Zoom Spawning
-- Each sub-triangle is drawn by a spawned turtle at half scale.
-- Zoom into any corner to see self-similar structure at every level.
-- Depth 6: 1093 turtles across 7 scale levels.

speed(0)
set_spawn_limit(1100)
hide()

local ox, oy = position()
local side = 400
local sqrt3_4 = math.sqrt(3) / 4

-- Depth colors: warm-to-cool spectrum
local colors = {
  [6] = "#e64553",
  [5] = "#fe640b",
  [4] = "#df8e1d",
  [3] = "#40a02b",
  [2] = "#209fb5",
  [1] = "#1e66f5",
  [0] = "#8839ef",
}

local count = 0

function sierpinski(depth, wx, wy, s)
  count = count + 1
  local t = spawn("s" .. count, {
    x = wx - ox, y = wy - oy,
    scale = s, heading = 90
  })
  t.pencolor(colors[depth] or "#333333")
  t.penwidth(2)
  t.min_pixel_size(1)

  for i = 1, 3 do
    t.forward(side)
    t.left(120)
  end

  if depth > 0 then
    local W = side * s
    sierpinski(depth - 1, wx,         wy,               s / 2)
    sierpinski(depth - 1, wx + W / 2, wy,               s / 2)
    sierpinski(depth - 1, wx + W / 4, wy - W * sqrt3_4, s / 2)
  end
end

sierpinski(6, ox, oy, 1)
```

## 7. Fractal Zoom Tree

**Tags:** fractal, spawn, zoom, scale, advanced
**Description:** Recursive branching tree that reveals hidden detail as you zoom in. Each branch tip spawns a child tree at 1/10 scale — what looks like a dot becomes an entire tree when magnified. Uses `min_pixel_size(1)` for LOD optimization and `scale_pen(true)` so pen width scales with the tree. 5 depth-based colors from brown trunk to purple tips. Depth 4 produces ~73 turtles.
**Status:** Added to exchange snapshot.

```lua
-- Fractal Zoom Tree
-- A recursive branching tree where each branch tip spawns a child
-- tree at 1/10 scale. Zoom into any tip to discover a whole new tree.
-- Depth 4: up to 73 turtles (1 + 3 + 9 + 27 + 33 tips spawn children).

speed(0)
hide()

local ox, oy = position()

-- Depth colors: dark trunk to bright tips
local colors = {
  [4] = "#5c3d2e",
  [3] = "#7c5f3a",
  [2] = "#40a02b",
  [1] = "#209fb5",
  [0] = "#8839ef",
}

local count = 0

function branch(depth, wx, wy, angle, s)
  count = count + 1
  local t = spawn("b" .. count, {
    x = wx - ox, y = wy - oy,
    scale = s, heading = angle
  })
  t.pencolor(colors[depth] or "#333333")
  t.penwidth(math.max(1, depth))
  t.min_pixel_size(1)
  t.scale_pen(true)

  -- Draw trunk segment
  local len = 80
  t.forward(len)

  if depth > 0 then
    -- Branch into 3 sub-branches
    local bx = wx + math.cos(math.rad(angle - 90)) * len * s
    local by = wy + math.sin(math.rad(angle - 90)) * len * s
    branch(depth - 1, bx, by, angle - 30, s * 0.65)
    branch(depth - 1, bx, by, angle,      s * 0.65)
    branch(depth - 1, bx, by, angle + 30, s * 0.65)
  else
    -- At the tips, spawn a zoomed-in copy at 1/10 scale
    local tipX = wx + math.cos(math.rad(angle - 90)) * len * s
    local tipY = wy + math.sin(math.rad(angle - 90)) * len * s
    count = count + 1
    local child = spawn("z" .. count, {
      x = tipX - ox, y = tipY - oy,
      scale = s * 0.1, heading = 0
    })
    child.pencolor("#e64553")
    child.penwidth(2)
    child.min_pixel_size(1)
    child.scale_pen(true)
    -- Draw a small signature pattern at the tip
    for i = 1, 4 do
      child.forward(60)
      child.right(90)
    end
  end
end

branch(4, ox, oy, 0, 1)
```

## 8. Game of Life (Conway's Cellular Automaton)

**Tags:** cellular-automata, spawn, simulate, blackboard, advanced
**Description:** Conway's Game of Life using turtle spawning and blackboard communication. Each cell is a spawned turtle on a 20x20 grid. Cells use `nearby_turtles()` to count live neighbors and `read_board()` to check their alive/dead state. B3/S23 rules: a dead cell with exactly 3 live neighbors is born; a live cell with 2-3 neighbors survives; all others die. Initial pattern is the R-pentomino (produces chaotic growth). Alive cells draw filled rectangles; dead cells use `penmode("erase")` to remove their rectangle. After erasing, turtles return to their grid position so `nearby_turtles()` works correctly in subsequent generations.
**Status:** Added to exchange snapshot.

```lua
-- Conway's Game of Life
-- Each cell is a spawned turtle on a grid. Cells use nearby_turtles()
-- to find neighbors and read_board() to check their alive/dead state.
-- B3/S23 rules: birth with 3 neighbors, survive with 2 or 3.
-- Initial pattern: R-pentomino (produces chaotic growth).

speed(0)
hide()
set_spawn_limit(500)

local ox, oy = position()
local ROWS = 20
local COLS = 20
local CELL = 15
local GENS = 30
local RADIUS = CELL * 1.5

-- Colors for alive cells by generation parity
local ALIVE_COLOR = "#1e1e2e"
local GRID_COLOR = "#ccd0da"

-- Initialize grid state
local alive = {}
for r = 1, ROWS do
  alive[r] = {}
  for c = 1, COLS do
    alive[r][c] = false
  end
end

-- R-pentomino in center
local mr = math.floor(ROWS / 2)
local mc = math.floor(COLS / 2)
alive[mr][mc + 1]     = true
alive[mr][mc + 2]     = true
alive[mr + 1][mc]     = true
alive[mr + 1][mc + 1] = true
alive[mr + 2][mc + 1] = true

-- Spawn cell turtles at grid positions
local cells = {}
for r = 1, ROWS do
  cells[r] = {}
  for c = 1, COLS do
    local id = "c" .. r .. "_" .. c
    local x = (c - 1) * CELL - (COLS * CELL / 2)
    local y = (r - 1) * CELL - (ROWS * CELL / 2)
    cells[r][c] = spawn(id, {x = x, y = y})
    cells[r][c].hide()
    publish(id, alive[r][c] and 1 or 0)
  end
end

-- Draw grid lines
pencolor(GRID_COLOR)
penwidth(1)
local gw = COLS * CELL
local gh = ROWS * CELL
for r = 0, ROWS do
  penup()
  goto_pos(ox - gw / 2, oy - gh / 2 + r * CELL)
  pendown()
  goto_pos(ox + gw / 2, oy - gh / 2 + r * CELL)
end
for c = 0, COLS do
  penup()
  goto_pos(ox - gw / 2 + c * CELL, oy - gh / 2)
  pendown()
  goto_pos(ox - gw / 2 + c * CELL, oy + gh / 2)
end

-- Draw initial alive cells
for r = 1, ROWS do
  for c = 1, COLS do
    if alive[r][c] then
      local t = cells[r][c]
      t.fillcolor(ALIVE_COLOR)
      t.pencolor(ALIVE_COLOR)
      t.rectangle(CELL, CELL)
    end
  end
end

-- Run simulation
simulate(GENS, function(gen)
  -- Count neighbors for each cell using nearby_turtles
  local next_alive = {}
  for r = 1, ROWS do
    next_alive[r] = {}
    for c = 1, COLS do
      local id = "c" .. r .. "_" .. c
      activate(id)
      local neighbors = nearby_turtles(RADIUS)
      local live_count = 0
      for _, n in ipairs(neighbors) do
        if n.id ~= "main" then
          local state = read_board(n.id)
          if state == 1 then
            live_count = live_count + 1
          end
        end
      end

      -- B3/S23 rules
      if alive[r][c] then
        next_alive[r][c] = (live_count == 2 or live_count == 3)
      else
        next_alive[r][c] = (live_count == 3)
      end
    end
  end

  -- Update state and draw/erase changed cells
  for r = 1, ROWS do
    for c = 1, COLS do
      if next_alive[r][c] ~= alive[r][c] then
        local t = cells[r][c]
        if next_alive[r][c] then
          t.penmode("draw")
          t.fillcolor(ALIVE_COLOR)
          t.pencolor(ALIVE_COLOR)
          t.rectangle(CELL, CELL)
        else
          t.penmode("erase")
          t.forward(CELL)
          t.penmode("draw")
          t.penup()
          t.backward(CELL)
          t.pendown()
        end
      end
      alive[r][c] = next_alive[r][c]
      publish("c" .. r .. "_" .. c, alive[r][c] and 1 or 0)
    end
  end
end)
```

## 9. Langton's Ant (Cellular Automaton)

**Tags:** cellular-automata, simulate, blackboard, advanced
**Description:** Langton's Ant — a single turtle walks on an infinite grid flipping cell colors. On a white cell: turn right 90°, color black, advance. On a black cell: turn left 90°, color white, advance. Cell state is tracked via `publish()`/`read_board()` blackboard. Uses `simulate()` for stepping through 10000 iterations. After the initial chaotic phase (~10000 steps), the ant produces the characteristic diagonal "highway" pattern — order emerging from two simple rules. Red ellipse markers show the ant's start and end positions.
**Status:** Added to exchange snapshot.

```lua
-- Langton's Ant
-- A single turtle (the ant) walks on an infinite grid, flipping cell colors.
-- White cell: turn right 90, color black, advance.
-- Black cell: turn left 90, color white, advance.
-- After ~10000 steps the ant breaks free of chaotic scribbling and
-- builds a diagonal "highway" — order emerging from simple rules.

speed(0)
hide()
set_max_steps(11000)

local ox, oy = position()
local CELL = 6
local STEPS = 10000

-- Ant state: grid position and direction (0=up,1=right,2=down,3=left)
local ax, ay = 0, 0
local dir = 0

local dx = {[0] = 0, [1] = 1, [2] = 0, [3] = -1}
local dy = {[0] = -1, [1] = 0, [2] = 1, [3] = 0}

local BLACK_COLOR = "#1e1e2e"
local WHITE_COLOR = "#eff1f5"

-- Mark ant starting position
pencolor("#e64553")
fillcolor("#e64553")
penup()
goto_pos(ox, oy)
pendown()
ellipse(2, 2)

simulate(STEPS, function(step)
  local key = ax .. "_" .. ay
  local wx = ox + ax * CELL
  local wy = oy + ay * CELL
  local state = read_board(key)

  if state == 1 then
    -- Black cell: turn left, flip to white
    dir = (dir + 3) % 4
    publish(key, 0)
    penup()
    goto_pos(wx, wy)
    pendown()
    fillcolor(WHITE_COLOR)
    pencolor(WHITE_COLOR)
    rectangle(CELL, CELL)
  else
    -- White cell: turn right, flip to black
    dir = (dir + 1) % 4
    publish(key, 1)
    penup()
    goto_pos(wx, wy)
    pendown()
    fillcolor(BLACK_COLOR)
    pencolor(BLACK_COLOR)
    rectangle(CELL, CELL)
  end

  ax = ax + dx[dir]
  ay = ay + dy[dir]
end)

-- Mark ant final position
pencolor("#e64553")
fillcolor("#e64553")
penup()
goto_pos(ox + ax * CELL, oy + ay * CELL)
pendown()
ellipse(3, 3)
```
