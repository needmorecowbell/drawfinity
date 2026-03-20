export interface TurtleExample {
  name: string;
  description: string;
  script: string;
}

export const TURTLE_EXAMPLES: TurtleExample[] = [
  {
    name: "Spiral",
    description: "A colorful angular spiral",
    script: `-- Colorful angular spiral
penwidth(2)
for i = 1, 200 do
  -- Cycle through rainbow colors
  local hue = (i * 3) % 360
  local r, g, b
  if hue < 60 then
    r, g, b = 255, math.floor(hue * 255 / 60), 0
  elseif hue < 120 then
    r, g, b = math.floor((120 - hue) * 255 / 60), 255, 0
  elseif hue < 180 then
    r, g, b = 0, 255, math.floor((hue - 120) * 255 / 60)
  elseif hue < 240 then
    r, g, b = 0, math.floor((240 - hue) * 255 / 60), 255
  elseif hue < 300 then
    r, g, b = math.floor((hue - 240) * 255 / 60), 0, 255
  else
    r, g, b = 255, 0, math.floor((360 - hue) * 255 / 60)
  end
  pencolor(r, g, b)
  forward(i)
  right(91)
end`,
  },
  {
    name: "Star",
    description: "A repeating star pattern",
    script: `-- Star pattern
pencolor("#e64553")
penwidth(2)
for i = 1, 36 do
  forward(100)
  right(170)
end`,
  },
  {
    name: "Koch Curve",
    description: "Recursive Koch snowflake fractal",
    script: `-- Koch snowflake
pencolor("#1e66f5")
penwidth(2)

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

local size = 300
local depth = 3

-- Position to center the snowflake
penup()
backward(size / 2)
left(90)
forward(size / 3)
right(90)
pendown()

-- Draw three sides
for i = 1, 3 do
  koch(size, depth)
  right(120)
end`,
  },
  {
    name: "Tree",
    description: "Recursive branching fractal tree",
    script: `-- Fractal tree
function tree(size, depth)
  if depth == 0 then return end
  -- Branches get thinner and greener as they grow
  penwidth(math.max(1, depth * 0.8))
  if depth > 4 then
    pencolor("#7c5f3a")
  else
    pencolor("#40a02b")
  end
  forward(size)
  left(25)
  tree(size * 0.7, depth - 1)
  right(50)
  tree(size * 0.7, depth - 1)
  left(25)
  backward(size)
end

tree(80, 8)`,
  },
  {
    name: "Sierpinski Triangle",
    description: "Sierpinski triangle via recursive subdivision",
    script: `-- Sierpinski triangle
pencolor("#8839ef")
penwidth(1)

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

sierpinski(256, 5)`,
  },
];
