/**
 * Compiles and links a vertex + fragment shader pair.
 */
export class ShaderProgram {
  readonly program: WebGLProgram;
  private gl: WebGL2RenderingContext;

  constructor(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ) {
    this.gl = gl;
    const vertShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create shader program");

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader program link failed: ${info}`);
    }

    // Shaders are attached to the program and no longer needed individually
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    this.program = program;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  getUniformLocation(name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(this.program, name);
  }

  getAttribLocation(name: string): number {
    return this.gl.getAttribLocation(this.program, name);
  }

  destroy(): void {
    this.gl.deleteProgram(this.program);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }

    return shader;
  }
}

export const STROKE_VERTEX_SHADER = `#version 300 es
  precision highp float;

  in vec2 a_position;
  in vec4 a_color;

  uniform mat3 u_camera;

  out vec4 v_color;

  void main() {
    vec3 transformed = u_camera * vec3(a_position, 1.0);
    gl_Position = vec4(transformed.xy, 0.0, 1.0);
    v_color = a_color;
  }
`;

export const STROKE_FRAGMENT_SHADER = `#version 300 es
  precision highp float;

  in vec4 v_color;
  out vec4 fragColor;

  void main() {
    fragColor = v_color;
  }
`;
