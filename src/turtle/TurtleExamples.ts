export interface TurtleExample {
  name: string;
  description: string;
  script: string;
}

export const TURTLE_EXAMPLES: TurtleExample[] = [
  {
    name: "Spiral",
    description: "A colorful angular spiral",
    script: `-- Angular spiral
for i = 1, 200 do
  forward(i)
  right(91)
end`,
  },
  {
    name: "Star",
    description: "A repeating star pattern",
    script: `-- Star pattern
for i = 1, 36 do
  forward(100)
  right(170)
end`,
  },
  {
    name: "Koch Curve",
    description: "Recursive Koch snowflake fractal",
    script: `-- Koch snowflake
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
