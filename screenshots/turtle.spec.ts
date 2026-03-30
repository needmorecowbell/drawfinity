import { test } from "@playwright/test";
import {
  navigateToCanvas,
  setCamera,
  waitForRender,
  captureScreenshot,
} from "./helpers";

/**
 * Cherry blossom (sakura) tree Lua script.
 *
 * Draws a recursive fractal tree with brown trunk/branches that transition
 * to pink cherry blossom clusters at the leaf tips. The tree grows upward
 * from the turtle's starting position.
 */
const CHERRY_BLOSSOM_SCRIPT = `
-- Cherry Blossom Tree
-- A recursive fractal tree with sakura blossoms

-- Draw a cluster of small pink petals at the branch tip
function blossom()
  local colors = {"#FFB7C5", "#FF92A5", "#FFC0CB", "#FFD1DC", "#FF69B4"}
  for i = 1, 5 do
    pencolor(colors[((i - 1) % #colors) + 1])
    penwidth(3)
    forward(4)
    backward(4)
    right(72)
  end
end

-- Main recursive tree-drawing function
function branch(size, depth)
  if depth == 0 then
    -- Draw blossoms at the tips
    blossom()
    return
  end

  -- Trunk and branches get thinner with depth
  local w = math.max(1, depth * 1.2)
  penwidth(w)

  -- Color transitions from dark brown (trunk) to lighter brown (branches)
  if depth > 5 then
    pencolor("#5D3A1A")
  elseif depth > 3 then
    pencolor("#8B5E3C")
  else
    pencolor("#A0724E")
  end

  -- Draw the branch segment
  forward(size)

  -- Left sub-branch
  left(25)
  branch(size * 0.7, depth - 1)
  right(25)

  -- Right sub-branch
  right(30)
  branch(size * 0.65, depth - 1)
  left(30)

  -- Extra small branch on deeper levels for fullness
  if depth > 3 then
    left(40)
    branch(size * 0.5, depth - 1)
    right(40)
  end

  -- Return to the base of this branch
  backward(size)
end

-- Point the turtle upward and draw
left(90)
branch(60, 8)
`;

test("Sakura cherry blossom screenshot", async ({ page }) => {
  test.setTimeout(120_000); // 2 minutes for complex recursive drawing

  await page.goto("/");
  await navigateToCanvas(page);

  // Open the turtle panel via Ctrl+`
  await page.keyboard.press("Control+Backquote");
  await waitForRender(page);

  // Set the script in the turtle panel editor and execute it
  await page.evaluate(async (script) => {
    const vm = (window as any).__drawfinity.viewManager;
    const app = vm.getCanvasApp();
    const { turtlePanel, turtleExecutor } = app.getInternals();

    // Show panel and load script into the editor
    turtlePanel.show();
    turtlePanel.setScript(script);

    // Set speed to 0 (instant) for faster execution
    turtlePanel.setSpeed(0);

    // Execute the script
    await turtleExecutor.run(script, 1.0);
  }, CHERRY_BLOSSOM_SCRIPT);

  // Give WebGL a moment to flush all the strokes
  await page.waitForTimeout(500);
  await waitForRender(page);

  // Frame the tree: it grows upward from origin, roughly 300px wide, 400px tall
  // Center camera slightly above origin to show the full tree with breathing room
  await setCamera(page, { x: 0, y: -180, zoom: 1.2 });
  await waitForRender(page);

  // Capture the screenshot with turtle panel visible
  await captureScreenshot(page, "turtle");
});
