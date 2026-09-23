import {
  checkFloatFboSupport,
  createFBO,
  createProgram,
  createQuad,
  FBO,
  resizeFBO,
} from './webglUtils';

const VS_QUAD = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_ADVECTION = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_ratio;
uniform float u_dt;
uniform float u_dissipation;
out vec4 fragColor;

void main() {
  vec2 q = v_uv;
  vec2 v0 = texture(u_velocity, q).xy;
  vec2 qBack = clamp(q - v0 * u_dt * u_ratio, 0.0, 1.0);
  vec2 vBack = texture(u_velocity, qBack).xy;

  vec2 qForward = qBack + vBack * u_dt * u_ratio;
  vec2 error = qForward - q;

  vec2 qCorrected = clamp(q - 0.5 * error, 0.0, 1.0);
  vec2 vCorrected = texture(u_velocity, qCorrected).xy;

  vec2 qSample = clamp(qCorrected - vCorrected * u_dt * u_ratio, 0.0, 1.0);
  vec2 advectedVelocity = texture(u_velocity, qSample).xy * u_dissipation;

  // Prevent NaN or infinite values
  if (isnan(advectedVelocity.x) || isnan(advectedVelocity.y) ||
      isinf(advectedVelocity.x) || isinf(advectedVelocity.y)) {
    advectedVelocity = vec2(0.0);
  }

  fragColor = vec4(advectedVelocity, 0.0, 1.0);
}
`;

const FS_SPLAT = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_cursorUV;
uniform vec2 u_force;
uniform vec2 u_cursorSizePx;
out vec4 fragColor;

void main() {
  vec2 v = texture(u_velocity, v_uv).xy;
  vec2 diff = (v_uv - u_cursorUV) / u_cursorSizePx;
  float r = length(diff);
  float weight = pow(max(1.0 - r, 0.0), 2.0);
  v += u_force * weight;
  fragColor = vec4(v, 0.0, 1.0);
}
`;

const FS_DIVERGENCE = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_px;
uniform float u_dt;
out vec4 fragColor;

void main() {
  vec2 q = v_uv;
  float div = (
    texture(u_velocity, q + vec2(u_px.x, 0.0)).x -
    texture(u_velocity, q - vec2(u_px.x, 0.0)).x +
    texture(u_velocity, q + vec2(0.0, u_px.y)).y -
    texture(u_velocity, q - vec2(0.0, u_px.y)).y
  ) / (2.0 * u_dt);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

const FS_PRESSURE = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_px;
uniform float u_straightness;
out vec4 fragColor;

void main() {
  vec2 q = v_uv;
  float div = texture(u_divergence, q).x;
  float pNext = (
    texture(u_pressure, q + vec2(2.0 * u_px.x, 0.0)).x +
    texture(u_pressure, q - vec2(2.0 * u_px.x, 0.0)).x +
    texture(u_pressure, q + vec2(0.0, 2.0 * u_px.y)).x +
    texture(u_pressure, q - vec2(0.0, 2.0 * u_px.y)).x
  ) / (4.0 + u_straightness) - div;
  fragColor = vec4(pNext, 0.0, 0.0, 1.0);
}
`;

const FS_PROJECTION = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_pressure;
uniform vec2 u_px;
uniform float u_dt;
out vec4 fragColor;

void main() {
  vec2 q = v_uv;
  vec2 gradP = 0.5 * vec2(
    texture(u_pressure, q + vec2(u_px.x, 0.0)).x - texture(u_pressure, q - vec2(u_px.x, 0.0)).x,
    texture(u_pressure, q + vec2(0.0, u_px.y)).x - texture(u_pressure, q - vec2(0.0, u_px.y)).x
  );
  vec2 vFinal = texture(u_velocity, q).xy - gradP * u_dt;
  fragColor = vec4(vFinal, 0.0, 1.0);
}
`;

export class FluidSimulation {
  private gl: WebGL2RenderingContext;
  private quadVAO: WebGLVertexArrayObject;
  private quadBuffer: WebGLBuffer;

  private fboConfig: ReturnType<typeof checkFloatFboSupport>;
  public isSupported: boolean;

  // Buffer dimensions
  public simWidth = 0;
  public simHeight = 0;

  // Parameters
  public resolution = 0.1;
  public dt = 0.014;
  public dissipation = 0.96;
  public mouseForce = 50.0;
  public cursorSize = 18.0;
  public iterationsPoisson = 4;
  public straightness = 1.0;

  // Framebuffers
  private velocityA!: FBO;
  private velocityB!: FBO;
  private divergence!: FBO;
  private pressureA!: FBO;
  private pressureB!: FBO;
  private currentVelIsA = true;

  // Programs
  private prgAdvection!: WebGLProgram;
  private prgSplat!: WebGLProgram;
  private prgDivergence!: WebGLProgram;
  private prgPressure!: WebGLProgram;
  private prgProjection!: WebGLProgram;

  // Locations cache
  private locAdvVelocity: WebGLUniformLocation | null = null;
  private locAdvRatio: WebGLUniformLocation | null = null;
  private locAdvDt: WebGLUniformLocation | null = null;
  private locAdvDissipation: WebGLUniformLocation | null = null;

  private locSplatVel: WebGLUniformLocation | null = null;
  private locSplatCursorUV: WebGLUniformLocation | null = null;
  private locSplatForce: WebGLUniformLocation | null = null;
  private locSplatCursorSizePx: WebGLUniformLocation | null = null;

  private locDivVel: WebGLUniformLocation | null = null;
  private locDivPx: WebGLUniformLocation | null = null;
  private locDivDt: WebGLUniformLocation | null = null;

  private locPressP: WebGLUniformLocation | null = null;
  private locPressDiv: WebGLUniformLocation | null = null;
  private locPressPx: WebGLUniformLocation | null = null;
  private locPressStraight: WebGLUniformLocation | null = null;

  private locProjVel: WebGLUniformLocation | null = null;
  private locProjPress: WebGLUniformLocation | null = null;
  private locProjPx: WebGLUniformLocation | null = null;
  private locProjDt: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    this.fboConfig = checkFloatFboSupport(gl);
    this.isSupported = this.fboConfig.supported;

    const quad = createQuad(gl);
    this.quadVAO = quad.vao;
    this.quadBuffer = quad.buffer;

    this.initPrograms();
    this.resize(width, height);
  }

  private initPrograms() {
    const gl = this.gl;
    this.prgAdvection = createProgram(gl, VS_QUAD, FS_ADVECTION);
    this.locAdvVelocity = gl.getUniformLocation(this.prgAdvection, 'u_velocity');
    this.locAdvRatio = gl.getUniformLocation(this.prgAdvection, 'u_ratio');
    this.locAdvDt = gl.getUniformLocation(this.prgAdvection, 'u_dt');
    this.locAdvDissipation = gl.getUniformLocation(this.prgAdvection, 'u_dissipation');

    this.prgSplat = createProgram(gl, VS_QUAD, FS_SPLAT);
    this.locSplatVel = gl.getUniformLocation(this.prgSplat, 'u_velocity');
    this.locSplatCursorUV = gl.getUniformLocation(this.prgSplat, 'u_cursorUV');
    this.locSplatForce = gl.getUniformLocation(this.prgSplat, 'u_force');
    this.locSplatCursorSizePx = gl.getUniformLocation(this.prgSplat, 'u_cursorSizePx');

    this.prgDivergence = createProgram(gl, VS_QUAD, FS_DIVERGENCE);
    this.locDivVel = gl.getUniformLocation(this.prgDivergence, 'u_velocity');
    this.locDivPx = gl.getUniformLocation(this.prgDivergence, 'u_px');
    this.locDivDt = gl.getUniformLocation(this.prgDivergence, 'u_dt');

    this.prgPressure = createProgram(gl, VS_QUAD, FS_PRESSURE);
    this.locPressP = gl.getUniformLocation(this.prgPressure, 'u_pressure');
    this.locPressDiv = gl.getUniformLocation(this.prgPressure, 'u_divergence');
    this.locPressPx = gl.getUniformLocation(this.prgPressure, 'u_px');
    this.locPressStraight = gl.getUniformLocation(this.prgPressure, 'u_straightness');

    this.prgProjection = createProgram(gl, VS_QUAD, FS_PROJECTION);
    this.locProjVel = gl.getUniformLocation(this.prgProjection, 'u_velocity');
    this.locProjPress = gl.getUniformLocation(this.prgProjection, 'u_pressure');
    this.locProjPx = gl.getUniformLocation(this.prgProjection, 'u_px');
    this.locProjDt = gl.getUniformLocation(this.prgProjection, 'u_dt');
  }

  public resize(viewportWidth: number, viewportHeight: number) {
    const gl = this.gl;
    const W = Math.max(16, Math.round(viewportWidth * this.resolution));
    const H = Math.max(16, Math.round(viewportHeight * this.resolution));

    if (W === this.simWidth && H === this.simHeight) return;

    this.simWidth = W;
    this.simHeight = H;

    if (!this.velocityA) {
      this.velocityA = createFBO(gl, W, H, this.fboConfig);
      this.velocityB = createFBO(gl, W, H, this.fboConfig);
      this.divergence = createFBO(gl, W, H, this.fboConfig);
      this.pressureA = createFBO(gl, W, H, this.fboConfig);
      this.pressureB = createFBO(gl, W, H, this.fboConfig);
    } else {
      resizeFBO(gl, this.velocityA, W, H, this.fboConfig);
      resizeFBO(gl, this.velocityB, W, H, this.fboConfig);
      resizeFBO(gl, this.divergence, W, H, this.fboConfig);
      resizeFBO(gl, this.pressureA, W, H, this.fboConfig);
      resizeFBO(gl, this.pressureB, W, H, this.fboConfig);
    }
  }

  public step(splats: { cursorUV: [number, number]; force: [number, number] }[]) {
    if (!this.isSupported) return;

    const gl = this.gl;
    const W = this.simWidth;
    const H = this.simHeight;
    const k = W / (1100.0 * this.resolution);
    const pxX = (1.0 / W) * k;
    const pxY = (1.0 / H) * k;
    const maxWH = Math.max(W, H);
    const ratioX = maxWH / W;
    const ratioY = maxWH / H;

    gl.bindVertexArray(this.quadVAO);
    gl.viewport(0, 0, W, H);

    let curVel = this.currentVelIsA ? this.velocityA : this.velocityB;
    let nextVel = this.currentVelIsA ? this.velocityB : this.velocityA;

    // 1. BFECC Advection
    gl.bindFramebuffer(gl.FRAMEBUFFER, nextVel.framebuffer);
    gl.useProgram(this.prgAdvection);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, curVel.texture);
    gl.uniform1i(this.locAdvVelocity, 0);
    gl.uniform2f(this.locAdvRatio, ratioX, ratioY);
    gl.uniform1f(this.locAdvDt, this.dt);
    gl.uniform1f(this.locAdvDissipation, this.dissipation);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Swap curVel
    curVel = nextVel;
    nextVel = curVel === this.velocityA ? this.velocityB : this.velocityA;

    // 2. Splat Mouse Force(s)
    for (const splat of splats) {
      if (Math.abs(splat.force[0]) < 1e-5 && Math.abs(splat.force[1]) < 1e-5) continue;

      gl.bindFramebuffer(gl.FRAMEBUFFER, nextVel.framebuffer);
      gl.useProgram(this.prgSplat);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, curVel.texture);
      gl.uniform1i(this.locSplatVel, 0);
      gl.uniform2f(this.locSplatCursorUV, splat.cursorUV[0], splat.cursorUV[1]);
      gl.uniform2f(this.locSplatForce, splat.force[0], splat.force[1]);
      gl.uniform2f(this.locSplatCursorSizePx, this.cursorSize * pxX, this.cursorSize * pxY);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      curVel = nextVel;
      nextVel = curVel === this.velocityA ? this.velocityB : this.velocityA;
    }

    // 3. Divergence
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.divergence.framebuffer);
    gl.useProgram(this.prgDivergence);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, curVel.texture);
    gl.uniform1i(this.locDivVel, 0);
    gl.uniform2f(this.locDivPx, pxX, pxY);
    gl.uniform1f(this.locDivDt, this.dt);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 4. Pressure Solve (4 Poisson iterations)
    let pIn = this.pressureA;
    let pOut = this.pressureB;

    gl.useProgram(this.prgPressure);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.divergence.texture);
    gl.uniform1i(this.locPressDiv, 1);
    gl.uniform2f(this.locPressPx, pxX, pxY);
    gl.uniform1f(this.locPressStraight, this.straightness);

    for (let i = 0; i < this.iterationsPoisson; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, pOut.framebuffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pIn.texture);
      gl.uniform1i(this.locPressP, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Ping pong
      const tmp = pIn;
      pIn = pOut;
      pOut = tmp;
    }
    // After 4 iterations, pIn holds the latest pressure result

    // 5. Projection (subtract pressure gradient from velocity)
    gl.bindFramebuffer(gl.FRAMEBUFFER, nextVel.framebuffer);
    gl.useProgram(this.prgProjection);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, curVel.texture);
    gl.uniform1i(this.locProjVel, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pIn.texture);
    gl.uniform1i(this.locProjPress, 1);
    gl.uniform2f(this.locProjPx, pxX, pxY);
    gl.uniform1f(this.locProjDt, this.dt);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Final velocity is in nextVel
    this.currentVelIsA = nextVel === this.velocityA;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  public getVelocityTexture(): WebGLTexture | null {
    if (!this.isSupported) return null;
    return this.currentVelIsA ? this.velocityA.texture : this.velocityB.texture;
  }

  public dispose() {
    const gl = this.gl;
    if (this.velocityA) gl.deleteFramebuffer(this.velocityA.framebuffer);
    if (this.velocityA) gl.deleteTexture(this.velocityA.texture);
    if (this.velocityB) gl.deleteFramebuffer(this.velocityB.framebuffer);
    if (this.velocityB) gl.deleteTexture(this.velocityB.texture);
    if (this.divergence) gl.deleteFramebuffer(this.divergence.framebuffer);
    if (this.divergence) gl.deleteTexture(this.divergence.texture);
    if (this.pressureA) gl.deleteFramebuffer(this.pressureA.framebuffer);
    if (this.pressureA) gl.deleteTexture(this.pressureA.texture);
    if (this.pressureB) gl.deleteFramebuffer(this.pressureB.framebuffer);
    if (this.pressureB) gl.deleteTexture(this.pressureB.texture);

    gl.deleteProgram(this.prgAdvection);
    gl.deleteProgram(this.prgSplat);
    gl.deleteProgram(this.prgDivergence);
    gl.deleteProgram(this.prgPressure);
    gl.deleteProgram(this.prgProjection);
    gl.deleteVertexArray(this.quadVAO);
    gl.deleteBuffer(this.quadBuffer);
  }
}
