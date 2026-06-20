import { describe, it, expect } from "vitest";
import {
  IMAGE_FRAGMENT_SHADER,
  IMAGE_VERTEX_SHADER,
  STROKE_FRAGMENT_SHADER,
  STROKE_VERTEX_SHADER,
} from "../ShaderProgram";

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

  it("image vertex shader transforms positions and passes UV coordinates", () => {
    expect(IMAGE_VERTEX_SHADER).toContain("in vec2 a_position");
    expect(IMAGE_VERTEX_SHADER).toContain("in vec2 a_uv");
    expect(IMAGE_VERTEX_SHADER).toContain("uniform mat3 u_camera");
    expect(IMAGE_VERTEX_SHADER).toContain("v_uv = a_uv");
  });

  it("image fragment shader samples the texture with opacity", () => {
    expect(IMAGE_FRAGMENT_SHADER).toContain("uniform sampler2D u_sampler");
    expect(IMAGE_FRAGMENT_SHADER).toContain("uniform float u_opacity");
    expect(IMAGE_FRAGMENT_SHADER).toContain("texture(u_sampler, v_uv)");
    expect(IMAGE_FRAGMENT_SHADER).toContain("vec4(1.0, 1.0, 1.0, u_opacity)");
  });
});
