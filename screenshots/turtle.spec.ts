import { test } from "@playwright/test";
import {
  navigateToCanvas,
  setCamera,
  waitForRender,
  captureScreenshot,
} from "./helpers";

/**
 * Cherry blossom (sakura) tree — the actual exchange script from:
 * https://github.com/needmorecowbell/drawfinity_turtle_exchange/blob/main/scripts/cherry-blossom-tree/cherry-blossom-tree.lua
 *
 * This is the full script with multi-petal blossom clusters, bark gradients,
 * fallen petals, and organic branching at depth 8. Uses position()/goto_pos()
 * for backtracking to avoid drift.
 *
 * For Playwright capture, speed(0) is used since the exchange script
 * generates ~19k commands — manageable for batch rendering. The exchange
 * version leaves speed at default for interactive use.
 */
const CHERRY_BLOSSOM_SCRIPT = `
-- Cherry Blossom Tree
-- A lush sakura tree with multi-petal blossom clusters, bark gradients,
-- fallen petals, and organic branching. Uses position()/goto_pos() for
-- all backtracking to avoid drift from backward().

-- speed(0) is used here for Playwright screenshot capture only.
-- In the exchange version, speed is left at default for interactive use.
speed(0)
math.randomseed(42)

-- Heading helper: compute delta and turn.
function set_heading(target)
  local delta = target - heading()
  while delta > 180 do delta = delta - 360 end
  while delta <= -180 do delta = delta + 360 end
  if delta > 0 then
    right(delta)
  elseif delta < 0 then
    left(-delta)
  end
end

-- Colour palettes
local bark_colors = {
  "#3B2112", "#4A2D1A", "#5C3822", "#6B4A2E", "#7C5F3A",
  "#8B7048", "#9B7B5B", "#A8896A", "#B59878",
}

local petal_colors = {
  "#FFB7C5", "#FFC1CC", "#FFDDE4", "#FFE8ED",
  "#FFFFFF", "#F8A4B8", "#E8829A", "#FCD2D8",
}

-- Draw a multi-petal blossom cluster
function draw_blossom(cx, cy, size, depth)
  local num_petals = math.random(4, 6)
  local base_radius = size * 0.45
  local petal_rx = size * 0.6
  local petal_ry = size * 0.4
  local depth_factor = (4 - depth) / 3

  for i = 1, num_petals do
    local angle = (i - 1) * (2 * math.pi / num_petals) + math.random() * 0.3
    local px = cx + math.cos(angle) * base_radius
    local py = cy + math.sin(angle) * base_radius

    local color = petal_colors[math.random(1, #petal_colors)]
    pencolor(color)
    fillcolor(color)
    penopacity(0.50 + depth_factor * 0.35 + math.random() * 0.15)
    penwidth(0.5)

    penup()
    goto_pos(px, py)
    pendown()
    ellipse(petal_rx * (0.8 + math.random() * 0.4),
            petal_ry * (0.8 + math.random() * 0.4))
  end

  -- Stamen centre dot
  pencolor("#D4A84B")
  fillcolor("#E8C65A")
  penopacity(0.9)
  penup()
  goto_pos(cx, cy)
  pendown()
  ellipse(size * 0.12, size * 0.12)

  fillcolor(nil)
  penopacity(1.0)
end

-- Main recursive branch
local MAX_DEPTH = 8

function branch(size, depth)
  if depth <= 0 or size < 2 then return end

  local sx, sy = position()
  local sh = heading()

  local color_idx = math.min(depth, #bark_colors)
  pencolor(bark_colors[color_idx])
  local width = depth * 2.5 + 1.0
  penwidth(width)
  penopacity(1.0)
  fillcolor(nil)

  forward(size)
  local ex, ey = position()
  local eh = heading()

  if depth <= 3 then
    local blossom_scale = (depth == 3) and 0.8 or 1.4
    draw_blossom(ex, ey, size * blossom_scale, depth)
  end

  if depth > 1 then
    local spread = 28 + math.random() * 22
    local left_angle = spread + (math.random() - 0.5) * 12
    local right_angle = spread + (math.random() - 0.5) * 12

    set_heading(eh)
    left(left_angle)
    branch(size * (0.68 + math.random() * 0.14), depth - 1)

    penup()
    goto_pos(ex, ey)
    pendown()
    set_heading(eh)
    right(right_angle)
    branch(size * (0.68 + math.random() * 0.14), depth - 1)

    if depth >= 3 and math.random() < 0.45 then
      penup()
      goto_pos(ex, ey)
      pendown()
      set_heading(eh)
      local centre_offset = (math.random() - 0.5) * 10
      if centre_offset >= 0 then left(centre_offset) else right(-centre_offset) end
      branch(size * (0.55 + math.random() * 0.1), depth - 2)
    end
  end

  penup()
  goto_pos(sx, sy)
  set_heading(sh)
  pendown()
end

-- Trunk base texture
function draw_trunk_base(bx, by)
  local base_width = MAX_DEPTH * 2.5 + 6
  for i = 1, 5 do
    local ox = (math.random() - 0.5) * 4
    local shade = math.random(35, 55)
    pencolor(string.format("#%02X%02X%02X", shade, math.floor(shade * 0.7), math.floor(shade * 0.4)))
    penwidth(base_width + math.random() * 3 - 1.5)
    penup()
    goto_pos(bx + ox, by)
    pendown()
    set_heading(0)
    forward(15 + math.random() * 8)
  end
end

-- Fallen petals on the ground
function draw_fallen_petals(ground_y, cx)
  for i = 1, 35 do
    local px = cx + (math.random() - 0.5) * 340
    local py = ground_y + math.random() * 12 - 3
    local color = petal_colors[math.random(1, 5)]
    pencolor(color)
    fillcolor(color)
    penopacity(0.3 + math.random() * 0.5)
    penwidth(0.5)
    local rx = 2 + math.random() * 3
    local ry = 1.5 + math.random() * 2
    penup()
    goto_pos(px, py)
    pendown()
    ellipse(rx, ry)
  end
  fillcolor(nil)
  penopacity(1.0)
end

-- Falling petals in the air
function draw_falling_petals(base_x, base_y)
  for i = 1, 18 do
    local px = base_x + (math.random() - 0.5) * 280
    local py = base_y - math.random() * 240
    local color = petal_colors[math.random(1, 5)]
    pencolor(color)
    fillcolor(color)
    penopacity(0.2 + math.random() * 0.4)
    penwidth(0.3)
    local rx = 1.5 + math.random() * 2.5
    local ry = 1 + math.random() * 1.5
    penup()
    goto_pos(px, py)
    pendown()
    ellipse(rx, ry)
  end
  fillcolor(nil)
  penopacity(1.0)
end

-- MAIN DRAWING
local ox, oy = position()
local base_x = ox
local base_y = oy + 120

-- Ground hint
pencolor("#5E4B35")
penwidth(2)
penopacity(0.25)
penup()
goto_pos(base_x - 200, base_y + 2)
pendown()
goto_pos(base_x + 200, base_y + 2)

-- Trunk base
draw_trunk_base(base_x, base_y)

-- Main tree
penup()
goto_pos(base_x, base_y)
set_heading(0)
pendown()

branch(90, MAX_DEPTH)

-- Fallen petals
draw_fallen_petals(base_y + 4, base_x)

-- Drifting petals
draw_falling_petals(base_x, base_y)

-- Clean up
penup()
penopacity(1.0)
hide()
`;

test("Sakura cherry blossom screenshot", async ({ page }) => {
  // ~19k commands with speed(0) — batch rendering completes in ~20s.
  test.setTimeout(120_000);

  await page.goto("/");
  await navigateToCanvas(page);

  // Open the turtle panel via Ctrl+`
  await page.keyboard.press("Control+Backquote");
  await waitForRender(page);

  // Start script execution — fire and forget, poll for completion.
  // Don't await inside page.evaluate to avoid blocking Playwright.
  await page.evaluate((script) => {
    const vm = (window as any).__drawfinity.viewManager;
    const app = vm.getCanvasApp();
    const { turtlePanel, turtleExecutor } = app.getInternals();

    turtlePanel.show();
    turtlePanel.setScript(script);

    (window as any).__turtleRunDone = false;
    turtleExecutor.run(script, 1.0).then(() => {
      (window as any).__turtleRunDone = true;
    });
  }, CHERRY_BLOSSOM_SCRIPT);

  // Poll for completion every 5 seconds
  await page.waitForFunction(
    () => (window as any).__turtleRunDone === true,
    null,
    { timeout: 60_000, polling: 1000 }
  );

  // Give WebGL a moment to flush all the strokes
  await page.waitForTimeout(500);
  await waitForRender(page);

  // Frame the tree — grows upward from base_y (origin + 120).
  // The canopy extends roughly 300px above base and 200px wide each side.
  await setCamera(page, { x: 0, y: 50, zoom: 0.8 });
  await waitForRender(page);

  // Capture the screenshot with turtle panel visible
  await captureScreenshot(page, "turtle");
});
