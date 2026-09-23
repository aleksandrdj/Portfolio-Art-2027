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
uniform sampler2D u_density;
out vec4 fragColor;

void main() {
  // Sample scalar dye / density field directly (isotropic in all directions)
  float density = texture(u_density, v_uv).r;

  // Single unified fluidMask threshold with fwidth anti-aliased edge
  // Smoothly anti-aliased exactly at threshold boundary without blurring the whole fluid body
  float threshold = 0.12;
  float aa = max(fwidth(density), 0.0015);
  float mask = smoothstep(threshold - aa, threshold + aa, density);

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

  private locDensity: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    this.fboConfig = checkFloatFboSupport(gl);

    const quad = createQuad(gl);
    this.quadVAO = quad.vao;
    this.quadBuffer = quad.buffer;

    this.program = createProgram(gl, VS_QUAD, FS_FLUID_MASK);
    this.locDensity = gl.getUniformLocation(this.program, 'u_density');

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

  public render(densityTex: WebGLTexture | null, width: number, height: number): WebGLTexture | null {
    if (!this.fbo) return null;
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.framebuffer);
    gl.viewport(0, 0, width, height);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVAO);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, densityTex);
    gl.uniform1i(this.locDensity, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return this.fbo.texture;
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
