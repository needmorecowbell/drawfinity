# Feature 05: Turtle Mode

Add a programmable turtle graphics system that allows users to write Lua scripts to algorithmically generate art on the canvas. The turtle draws permanent strokes visible to all collaborators, with real-time animated drawing that can be speed-controlled.

## Design Decisions

**Lua with a turtle DSL.** Lua is lightweight, embeddable, easy to learn, and powerful enough for complex generative art. The turtle API provides simple primitives (`forward`, `right`, `penup`, `pendown`, `color`, `width`) that beginners can use immediately, while advanced users can leverage full Lua (loops, functions, recursion, math library) for fractals, L-systems, spirals, and other algorithmic art.

**User-defined functions.** Users can define their own Lua functions that compose turtle primitives, building up a personal library of patterns. These functions persist with the script in the drawing.

**Real-time animated drawing.** The turtle moves visibly across the canvas, drawing strokes as it goes. Drawing speed is configurable: slow (watch each line drawn), normal, fast, and instant (compute all at once). The turtle position is rendered as a small triangle/arrow indicator on the canvas.

**Permanent strokes in the CRDT.** Each line the turtle draws becomes a real stroke in the Yjs document, visible to all collaborators and subject to undo, erasing, and persistence. This means turtle art is indistinguishable from hand-drawn art once placed.

**Slide-up panel.** The turtle scripting interface is a panel that slides up from the bottom of the canvas (like a terminal). It contains a code editor area, a run/stop button, speed control, and output/error log.

**Lua runtime in the browser.** Use a JavaScript-based Lua interpreter (e.g., `fengari` or `wasmoon`) to run Lua in the browser. No server-side execution needed. The interpreter runs in the main thread with yielding (via coroutines or requestAnimationFrame scheduling) to keep the UI responsive during animated drawing.

## Turtle API (DSL)

```lua
-- Movement
forward(distance)       -- Move forward, drawing if pen is down
backward(distance)      -- Move backward
right(angle)            -- Turn right by angle (degrees)
left(angle)             -- Turn left by angle (degrees)
goto(x, y)             -- Move to absolute position (draws if pen down)
home()                  -- Return to (0, 0) facing up

-- Pen control
penup()                 -- Lift pen (stop drawing)
pendown()               -- Lower pen (start drawing)
pencolor(r, g, b)       -- Set pen color (0-255 each)
pencolor("#hex")        -- Set pen color (hex string)
penwidth(w)             -- Set pen width (pixels, screen-space → divided by zoom)
penopacity(o)           -- Set pen opacity (0.0-1.0)

-- State queries
position()              -- Returns x, y
heading()               -- Returns current angle (degrees, 0 = up)
isdown()                -- Returns true if pen is down

-- Canvas
clear()                 -- Remove all turtle-drawn strokes (undoable)
speed(n)                -- Set animation speed: 0=instant, 1=slow, 5=normal, 10=fast

-- Utility
sleep(ms)               -- Pause execution for ms milliseconds
print(...)              -- Output to the turtle console log
repeat_n(n, fn)         -- Call fn() n times (convenience for loops)

-- Math (standard Lua math library available)
-- math.sin, math.cos, math.pi, math.random, etc.
```

## Tasks

- [ ] Integrate a Lua runtime:
  - Evaluate `fengari` (pure JS Lua 5.3) vs `wasmoon` (Lua 5.4 via WASM) — both run in the browser
  - Add as an npm dependency
  - Create `src/turtle/LuaRuntime.ts`:
    - Initialize Lua state
    - Register turtle API functions as Lua globals
    - Execute user scripts with error handling (syntax errors, runtime errors)
    - Support yielding for animated drawing (coroutine-based or step-based execution)
    - Sandbox: disable `os`, `io`, `loadfile`, `dofile` — only allow safe operations

- [ ] Implement the turtle state machine:
  - Create `src/turtle/TurtleState.ts`:
    - Position: `x`, `y` (world coordinates, starts at current camera center)
    - Heading: `angle` (degrees, 0 = up, clockwise positive)
    - Pen state: `down` (boolean), `color` (hex), `width` (screen-space px), `opacity` (0-1)
    - Speed: `0-10` (controls animation delay between steps)
    - Methods: `forward()`, `right()`, `left()`, `penup()`, `pendown()`, `setColor()`, `setWidth()`, `home()`, `goto()`

- [ ] Wire turtle drawing to CRDT:
  - When the turtle moves with pen down, create a stroke from the previous position to the new position
  - Add the stroke to `DrawfinityDoc` via `addStroke()` — this makes it permanent, synced, and undoable
  - Batch rapid turtle moves: if speed is high or instant, batch multiple segments into a single stroke before adding to the doc (reduces CRDT overhead)
  - The pen width should be divided by current zoom (screen-space, matching the brush behavior)

- [ ] Animated execution:
  - Create `src/turtle/TurtleExecutor.ts`:
    - Manages script execution lifecycle: parse → run → animate → complete
    - Step-based execution: each turtle command is one "step"
    - Between steps, yield to the browser via `requestAnimationFrame` or `setTimeout`
    - Speed control: `speed(0)` = no delay (instant), `speed(1)` = 100ms/step, `speed(10)` = 1ms/step
    - Stop button: sets a flag that the executor checks between steps, halting execution
    - Error handling: Lua errors are caught and displayed in the console log

- [ ] Render the turtle indicator:
  - Draw a small triangle/arrow at the turtle's position and heading
  - Render as a CSS-positioned HTML element (like remote cursors) or as a WebGL overlay
  - The turtle is visible during script execution and hidden when idle
  - Color matches the current pen color

- [ ] Turtle panel UI:
  - Create `src/ui/TurtlePanel.ts`:
    - Slide-up panel from bottom edge (~300px tall, resizable)
    - Toggle via toolbar button (turtle icon) or keyboard shortcut (`` Ctrl+` ``)
    - Layout:
      - Left: code editor area (monospace `<textarea>` or a lightweight code editor)
      - Right: console output log (shows `print()` output and errors)
      - Bottom bar: Run button, Stop button, Speed slider (0-10), Clear Console button
    - Run button: sends the textarea content to `TurtleExecutor.run()`
    - Stop button: halts current execution
    - Script persistence: save the last-used script to localStorage (per drawing) so it survives page refresh
    - Syntax highlighting: basic Lua keyword highlighting via CSS (nice-to-have, not required initially)

- [ ] Toolbar integration:
  - Add a turtle icon button to the toolbar
  - Click toggles the turtle panel
  - When turtle is actively executing, show an animated indicator on the button (e.g., pulsing border)

- [ ] Example scripts (bundled):
  - Provide a dropdown or "Examples" button in the panel with pre-built scripts:
    - Spiral: `for i = 1, 200 do forward(i) right(91) end`
    - Square fractal: recursive Koch curve
    - Star: `for i = 1, 36 do forward(100) right(170) end`
    - Tree: recursive branching fractal
    - Sierpinski triangle
  - Selecting an example populates the code editor

- [ ] Tests:
  - Unit tests for TurtleState (movement, heading, pen state)
  - Unit tests for Lua API bindings (forward produces correct position change)
  - Unit tests for stroke generation from turtle movement
  - Unit test for speed control / step scheduling
  - Integration test: run a simple script, verify strokes appear in the document
