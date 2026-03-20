import { describe, it, expect } from "vitest";
import { TURTLE_EXAMPLES } from "../TurtleExamples";

describe("TurtleExamples", () => {
  it("exports a non-empty array of examples", () => {
    expect(Array.isArray(TURTLE_EXAMPLES)).toBe(true);
    expect(TURTLE_EXAMPLES.length).toBeGreaterThanOrEqual(5);
  });

  it("each example has name, description, and non-empty script", () => {
    for (const example of TURTLE_EXAMPLES) {
      expect(typeof example.name).toBe("string");
      expect(example.name.length).toBeGreaterThan(0);
      expect(typeof example.description).toBe("string");
      expect(example.description.length).toBeGreaterThan(0);
      expect(typeof example.script).toBe("string");
      expect(example.script.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes the required examples from the spec", () => {
    const names = TURTLE_EXAMPLES.map((e) => e.name);
    expect(names).toContain("Spiral");
    expect(names).toContain("Star");
    expect(names).toContain("Koch Curve");
    expect(names).toContain("Tree");
    expect(names).toContain("Sierpinski Triangle");
  });

  it("has unique names", () => {
    const names = TURTLE_EXAMPLES.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each script contains turtle commands", () => {
    const turtleCommands = ["forward", "backward", "right", "left", "penup", "pendown", "pencolor", "penwidth"];
    for (const example of TURTLE_EXAMPLES) {
      const hasCommand = turtleCommands.some((cmd) => example.script.includes(cmd));
      expect(hasCommand).toBe(true);
    }
  });
});
