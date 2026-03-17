import { describe, it, expect } from "vitest";
import { STROKE_VERTEX_SHADER, STROKE_FRAGMENT_SHADER } from "../ShaderProgram";

describe("ShaderProgram shaders", () => {
  it("vertex shader contains required attributes and uniforms", () => {
    expect(STROKE_VERTEX_SHADER).toContain("in vec2 a_position");
    expect(STROKE_VERTEX_SHADER).toContain("in vec4 a_color");
    expect(STROKE_VERTEX_SHADER).toContain("uniform mat3 u_camera");
    expect(STROKE_VERTEX_SHADER).toContain("v_color = a_color");
  });

  it("fragment shader passes through vertex color", () => {
    expect(STROKE_FRAGMENT_SHADER).toContain("in vec4 v_color");
    expect(STROKE_FRAGMENT_SHADER).toContain("fragColor = v_color");
  });

  it("shaders use GLSL ES 300", () => {
    expect(STROKE_VERTEX_SHADER).toContain("#version 300 es");
    expect(STROKE_FRAGMENT_SHADER).toContain("#version 300 es");
  });
});
