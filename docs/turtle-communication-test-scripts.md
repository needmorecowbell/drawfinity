# Turtle Communication & Awareness — Test Scripts

Open the turtle panel with **Ctrl+`** and paste each script into the editor. Press **Ctrl+Enter** to run.

**Key concept:** `activate(id)` switches which turtle is "active" for global functions like `forward()`, `receive()`, `nearby_turtles()`, etc. Use it inside `simulate()` loops to control spawned turtles. Call `activate("main")` to switch back.

---

## 1. Spatial Queries — nearby_turtles() WORKS

Spawns 5 turtles in a circle. Each turtle checks for neighbors within 120px and prints what it finds.

```lua
speed(0)

-- Spawn 5 turtles in a circle
local count = 5
local radius = 80
for i = 1, count do
  local angle = (i - 1) * (360 / count) * math.pi / 180
  spawn("t" .. i, {
    x = math.cos(angle) * radius,
    y = math.sin(angle) * radius,
    heading = 0,
    color = "#3388ff",
    width = 2,
  })
end

-- Each turtle queries its neighbors from its own perspective
for i = 1, count do
  activate("t" .. i)
  local neighbors = nearby_turtles(120)
  print("t" .. i .. " sees " .. #neighbors .. " neighbors:")
  for _, n in ipairs(neighbors) do
    print("  " .. n.id .. " at distance " .. string.format("%.1f", n.distance))
  end
end
activate("main")
```

**Expected:** Each turtle should report 2-4 neighbors with distances. Console output shows IDs and distances.

---

## 2. Spatial Queries — distance_to() WORKS

```lua
speed(0)

spawn("left", { x = -100, y = 0, heading = 90 })
spawn("right", { x = 100, y = 0, heading = 270 })

-- From main turtle at origin (0,0), distance to "right" at (100,0) = 100
local d = distance_to("right")
print("Distance from main to right: " .. tostring(d))

-- From left turtle at (-100,0), distance to right at (100,0) = 200
activate("left")
local d2 = distance_to("right")
print("Distance from left to right: " .. tostring(d2))
activate("main")
```

**Expected:** Console prints `Distance from main to right: 100.0` and `Distance from left to right: 200.0`.

---

## 3. Direct Messaging — send() / receive() WORKS

Two turtles exchange messages across simulation steps.

```lua
speed(0)

spawn("alice", { x = -80, y = 0, heading = 0, color = "#ff4444", width = 3 })
spawn("bob",   { x =  80, y = 0, heading = 0, color = "#4444ff", width = 3 })

-- Main turtle sends a message to Bob
send("bob", "hello from main!")

simulate(5, function(step)
  -- Step 1: Bob receives the message and replies to alice
  if step == 1 then
    activate("bob")
    local msg = receive()
    if msg then
      print("Bob got: '" .. tostring(msg.data) .. "' from " .. msg.from)
      send("alice", "hey alice, bob here!")
      forward(40)
    end
  end

  -- Step 2: Alice receives Bob's reply
  if step == 2 then
    activate("alice")
    local msg = receive()
    if msg then
      print("Alice got: '" .. tostring(msg.data) .. "' from " .. msg.from)
      forward(40)
    end
  end

  activate("main")
end)
```

**Expected:** Console shows the two messages being exchanged. Both turtles draw short lines upward.

---

## 4. Broadcast WORKS

Main turtle broadcasts to all spawned workers.

```lua
speed(0)

local workers = {}
for i = 1, 4 do
  workers[i] = "worker" .. i
  spawn(workers[i], {
    x = (i - 2.5) * 60,
    y = 0,
    heading = 0,
    color = "#22cc44",
    width = 2,
  })
end

-- Main turtle broadcasts a "go" signal
broadcast("go!")

simulate(3, function(step)
  if step == 1 then
    for i = 1, 4 do
      activate(workers[i])
      local msg = receive()
      if msg then
        print(workers[i] .. " received: " .. tostring(msg.data) .. " from " .. msg.from)
        forward(50)
      end
    end
    activate("main")
  end
end)
```

**Expected:** Console shows 4 workers receiving the broadcast. Each draws a line upward.

---

## 5. Blackboard — publish() / read_board() / board_keys()

```lua
speed(0)
clear()  -- remove strokes from previous runs

-- Publish some shared state
publish("generation", 1)
publish("config", "fast")
publish("count", 42)

-- Read it back
print("generation = " .. tostring(read_board("generation")))
print("config = " .. tostring(read_board("config")))
print("count = " .. tostring(read_board("count")))

-- List all keys
local keys = board_keys()
print("Board keys: " .. table.concat(keys, ", "))

-- Non-existent key returns nil
local missing = read_board("nonexistent")
print("Missing key = " .. tostring(missing))

-- Draw a simple shape to confirm script ran
for i = 1, 4 do
  forward(50)
  right(90)
end
```

**Expected:** Console shows the three published values, the key list, and `nil` for the missing key. A square is drawn.

---

## 6. simulate() — Multi-Step Execution

The main turtle draws a spiral over many steps.

```lua
speed(0)

simulate(60, function(step)
  forward(step * 0.5)
  right(15)
  if step % 10 == 0 then
    print("Step " .. get_step() .. " / 60")
  end
end)
```

**Expected:** An expanding spiral is drawn. Console prints progress at steps 10, 20, 30, 40, 50, 60.

---

## 7. Collision Detection — collides_with() / set_collision_radius() WORKS

```lua
speed(0)

-- Two turtles close together (should collide with default radius)
spawn("a", { x = 0, y = 0, heading = 0, width = 10 })
spawn("b", { x = 5, y = 0, heading = 0, width = 10 })

-- Two turtles far apart (should NOT collide)
spawn("c", { x = 200, y = 200, heading = 0, width = 2 })

-- Check from main turtle's perspective (at origin, near "a" and "b")
local ab = collides_with("b")
print("main collides with b: " .. tostring(ab))  -- expect true

local ac = collides_with("c")
print("main collides with c: " .. tostring(ac))  -- expect false

-- Custom collision radius
set_collision_radius(300)
local ac2 = collides_with("c")
print("main collides with c (radius=300): " .. tostring(ac2))  -- expect true now

-- Draw to confirm
forward(30)
```

**Expected:** Console shows `true`, `false`, `true`.

---

## 8. Message Relay Chain WORKS


A chain of turtles passes a color down the line via `send()`/`receive()`. Each draws a segment in the received color.

```lua
speed(0)

local chain_len = 8
local spacing = 60
local seg_len = 50

local ids = {}
for i = 1, chain_len do
  local id = "relay" .. i
  ids[i] = id
  spawn(id, {
    x = (i - 1) * spacing - (chain_len - 1) * spacing / 2,
    y = 0,
    heading = 180,
    color = "#888888",
    width = 3,
  })
end

-- Seed the first turtle with a color message
send("relay1", "#ff0000")

-- Each step, turtles check for messages and pass them along
simulate(chain_len + 5, function(step)
  for i = 1, chain_len do
    activate(ids[i])
    local msg = receive()
    if msg then
      pencolor(msg.data)
      forward(seg_len)

      -- Pass a shifted color to the next turtle in the chain
      if i < chain_len then
        local hex = msg.data
        local r = tonumber(hex:sub(2, 3), 16) or 0
        local g = tonumber(hex:sub(4, 5), 16) or 0
        local b = tonumber(hex:sub(6, 7), 16) or 0
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

**Expected:** 8 vertical lines drawn downward, each in a different color shifting from red through the spectrum.

---

## 9. Flocking Simulation (Integration Test)

Tests spatial queries + simulate + activate + nearby_turtles together. Uses separation, alignment, and cohesion forces.

```lua
speed(0)

local count = 12
local ids = {}

-- Spawn turtles in a loose cluster, all roughly facing right
for i = 1, count do
  ids[i] = "boid" .. i
  spawn(ids[i], {
    x = math.random(-80, 80),
    y = math.random(-80, 80),
    heading = math.random(70, 110),  -- roughly facing down-right
    color = string.format("#%02x%02x%02x",
      math.random(30, 100), math.random(80, 200), math.random(150, 255)),
    width = 1,
  })
end

simulate(150, function(step)
  for i = 1, count do
    activate(ids[i])
    local neighbors = nearby_turtles(120)
    local myX, myY = position()
    local myH = heading()

    if #neighbors > 0 then
      local turn = 0

      -- Separation: steer away from very close neighbors
      local sepX, sepY = 0, 0
      local sepCount = 0
      for _, n in ipairs(neighbors) do
        if n.distance < 25 and n.distance > 0 then
          sepX = sepX + (myX - n.x)
          sepY = sepY + (myY - n.y)
          sepCount = sepCount + 1
        end
      end
      if sepCount > 0 then
        local sepAngle = math.deg(math.atan(sepX, -sepY))  -- heading space
        local sepDiff = sepAngle - myH
        -- Normalize to [-180, 180]
        while sepDiff > 180 do sepDiff = sepDiff - 360 end
        while sepDiff < -180 do sepDiff = sepDiff + 360 end
        turn = turn + sepDiff * 0.15
      end

      -- Alignment: steer toward average heading
      local avgHdg = 0
      for _, n in ipairs(neighbors) do
        avgHdg = avgHdg + n.heading
      end
      avgHdg = avgHdg / #neighbors
      local alignDiff = avgHdg - myH
      while alignDiff > 180 do alignDiff = alignDiff - 360 end
      while alignDiff < -180 do alignDiff = alignDiff + 360 end
      turn = turn + alignDiff * 0.08

      -- Cohesion: steer toward center of neighbors
      local avgX, avgY = 0, 0
      for _, n in ipairs(neighbors) do
        avgX = avgX + n.x
        avgY = avgY + n.y
      end
      avgX = avgX / #neighbors
      avgY = avgY / #neighbors
      local cohAngle = math.deg(math.atan(avgX - myX, -(avgY - myY)))
      local cohDiff = cohAngle - myH
      while cohDiff > 180 do cohDiff = cohDiff - 360 end
      while cohDiff < -180 do cohDiff = cohDiff + 360 end
      turn = turn + cohDiff * 0.03

      -- Clamp turn per step
      if turn > 12 then turn = 12 end
      if turn < -12 then turn = -12 end
      right(turn)
    end

    forward(3)
  end
  activate("main")

  if step % 50 == 0 then
    print("Flock step " .. step .. " / 150")
  end
end)
```

**Expected:** 12 turtles draw colored trails that gradually converge into aligned movement patterns. Turtles that start close together should cluster and flow in similar directions. Console prints at steps 50, 100, 150.

---

## 10. Blackboard Coordination WORKS

Turtles use the blackboard to coordinate a shared counter.

```lua
speed(0)

publish("total_distance", 0)

local ids = {}
for i = 1, 4 do
  ids[i] = "walker" .. i
  spawn(ids[i], {
    x = (i - 2.5) * 50,
    y = 0,
    heading = math.random(0, 359),
    color = string.format("#%02x%02x%02x", math.random(100, 255), math.random(50, 200), math.random(50, 200)),
    width = 2,
  })
end

simulate(20, function(step)
  -- Each turtle walks and adds to the shared counter
  for i = 1, 4 do
    activate(ids[i])
    forward(10)
    right(math.random(-30, 30))
    local current = read_board("total_distance") or 0
    publish("total_distance", current + 10)
  end
  activate("main")

  if step == 20 then
    print("Total distance traveled: " .. tostring(read_board("total_distance")))
  end
end)
```

**Expected:** 4 colorful random walks. Final console output shows accumulated distance (should be `20 steps * 10 distance * 4 walkers = 800`).

---

## Quick Checklist

| # | Feature Tested | Key Functions | Pass? |
|---|----------------|---------------|-------|
| 1 | Spatial queries | `nearby_turtles()`, `activate()` | |
| 2 | Distance | `distance_to()`, `activate()` | |
| 3 | Direct messaging | `send()`, `receive()`, `activate()` | |
| 4 | Broadcast | `broadcast()`, `receive()`, `activate()` | |
| 5 | Blackboard | `publish()`, `read_board()`, `board_keys()` | |
| 6 | Simulation | `simulate()`, `get_step()` | |
| 7 | Collision | `collides_with()`, `set_collision_radius()` | |
| 8 | Relay chain | `send()`, `receive()`, `activate()`, `simulate()` | |
| 9 | Flocking | `nearby_turtles()`, `activate()`, `simulate()` | |
| 10 | Blackboard coord | `publish()`, `read_board()`, `activate()`, `simulate()` | |
