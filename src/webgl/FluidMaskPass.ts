import { checkFloatFboSupport, createFBO, createProgram, createQuad, FBO, resizeFBO } from './webglUtils';

const VS_QUAD = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_FLUID_MASK = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_velocity;
out vec4 fragColor;

void main() {
  vec2 v = texture(u_velocity, v_uv).xy;
  float speed = length(v);
  vec3 encoded = vec3(v * 0.5 + 0.5, 1.0);
  vec3 flowColor = mix(vec3(1.0), encoded, speed);

  // Exact signal formulation specified in design:
  // signal = 1.0 - flowColor.r
  float signal = 1.0 - flowColor.r;

  // Sharp anti-aliased threshold edge around 0.1 using fwidth
  // Eliminates fuzzy halos and wide smoothstep banding
  float aa = max(fwidth(signal), 0.001);
  float mask = smoothstep(0.1 - aa, 0.1 + aa, signal);

  fragColor = vec4(mask, mask, mask, 1.0);
}
`;

export class FluidMaskPass {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private quadVAO: WebGLVertexArrayObject;
  private quadBuffer: WebGLBuffer;
  private fbo: FBO | null = null;
  private fboConfig: ReturnType<typeof checkFloatFboSupport>;

  private locVelocity: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    this.fboConfig = checkFloatFboSupport(gl);

    const quad = createQuad(gl);
    this.quadVAO = quad.vao;
    this.quadBuffer = quad.buffer;

    this.program = createProgram(gl, VS_QUAD, FS_FLUID_MASK);
    this.locVelocity = gl.getUniformLocation(this.program, 'u_velocity');

    this.resize(width, height);
  }

  public resize(width: number, height: number) {
    const gl = this.gl;
    const w = Math.max(1, width);
    const h = Math.max(1, height);

    if (!this.fbo) {
      this.fbo = createFBO(gl, w, h, {
        internalFormat: gl.RGBA8,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        linearSupported: true,
      });
    } else {
      resizeFBO(gl, this.fbo, w, h, {
        internalFormat: gl.RGBA8,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        linearSupported: true,
      });
    }
  }

  public render(velocityTex: WebGLTexture | null, width: number, height: number): WebGLTexture | null {
    if (!this.fbo) return null;
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.framebuffer);
    gl.viewport(0, 0, width, height);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVAO);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocityTex);
    gl.uniform1i(this.locVelocity, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return this.fbo.texture;
  }

  public getMaskTexture(): WebGLTexture | null {
    return this.fbo ? this.fbo.texture : null;
  }

  public dispose() {
    const gl = this.gl;
    if (this.fbo) {
      gl.deleteFramebuffer(this.fbo.framebuffer);
      gl.deleteTexture(this.fbo.texture);
      this.fbo = null;
    }
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.quadVAO);
    gl.deleteBuffer(this.quadBuffer);
  }
}
