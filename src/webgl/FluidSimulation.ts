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

// BFECC Advection for Velocity
const FS_ADVECTION_VELOCITY = /* glsl */ `#version 300 es
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

  if (isnan(advectedVelocity.x) || isnan(advectedVelocity.y) ||
      isinf(advectedVelocity.x) || isinf(advectedVelocity.y)) {
    advectedVelocity = vec2(0.0);
  }

  fragColor = vec4(advectedVelocity, 0.0, 1.0);
}
`;

// Advection for Density / Dye field
const FS_ADVECTION_DENSITY = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_density;
uniform vec2 u_ratio;
uniform float u_dt;
uniform float u_dissipation;
out vec4 fragColor;

void main() {
  vec2 q = v_uv;
  vec2 v0 = texture(u_velocity, q).xy;
  vec2 qBack = clamp(q - v0 * u_dt * u_ratio, 0.0, 1.0);
  float dBack = texture(u_density, qBack).r;

  vec2 qForward = qBack + texture(u_velocity, qBack).xy * u_dt * u_ratio;
  vec2 error = qForward - q;

  vec2 qCorrected = clamp(q - 0.5 * error, 0.0, 1.0);
  vec2 vCorrected = texture(u_velocity, qCorrected).xy;

  vec2 qSample = clamp(qCorrected - vCorrected * u_dt * u_ratio, 0.0, 1.0);
  float advectedDensity = texture(u_density, qSample).r * u_dissipation;

  if (isnan(advectedDensity) || isinf(advectedDensity) || advectedDensity < 0.0) {
    advectedDensity = 0.0;
  }

  fragColor = vec4(advectedDensity, 0.0, 0.0, 1.0);
}
`;

// Splat impulse into Velocity field with CSS-pixel aspect-corrected radius
const FS_SPLAT_VELOCITY = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_cursorUV;
uniform vec2 u_force;
uniform vec2 u_radiusUV;
out vec4 fragColor;

void main() {
  vec2 v = texture(u_velocity, v_uv).xy;
  vec2 diff = (v_uv - u_cursorUV) / u_radiusUV;
  float distSq = dot(diff, diff);
  if (distSq < 1.0) {
    float weight = 1.0 - distSq;
    weight = weight * weight;
    v += u_force * weight;
  }
  fragColor = vec4(v, 0.0, 1.0);
}
`;

// Splat positive scalar Density into Dye field with CSS-pixel aspect-corrected radius
const FS_SPLAT_DENSITY = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_density;
uniform vec2 u_cursorUV;
uniform float u_amount;
uniform vec2 u_radiusUV;
out vec4 fragColor;

void main() {
  float d = texture(u_density, v_uv).r;
  vec2 diff = (v_uv - u_cursorUV) / u_radiusUV;
  float distSq = dot(diff, diff);
  if (distSq < 1.0) {
    float weight = 1.0 - distSq;
    weight = weight * weight;
    d += u_amount * weight;
  }
  // Soft saturation cap so density accumulates cleanly without exploding
  fragColor = vec4(min(d, 2.5), 0.0, 0.0, 1.0);
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

export interface SplatPoint {
  cursorUV: [number, number];
  force: [number, number];
  density: number;
}

export class FluidSimulation {
  private gl: WebGL2RenderingContext;
  private quadVAO: WebGLVertexArrayObject;
  private quadBuffer: WebGLBuffer;

  private fboConfig: ReturnType<typeof checkFloatFboSupport>;
  public isSupported: boolean;

  // Simulation resolution (tuned so small brush occupies ~8-14 cells instead of 1-2 cells)
  public simWidth = 0;
  public simHeight = 0;

  // Physics parameters
  public dt = 0.016;
  public dissipationVelocity = 0.94;
  public dissipationDensity = 0.978;
  public mouseForce = 35.0; // Clamped maximum impulse
  public iterationsPoisson = 4;
  public straightness = 1.0;

  // Ping-pong Framebuffers for Velocity & Density
  private velocityA!: FBO;
  private velocityB!: FBO;
  private densityA!: FBO;
  private densityB!: FBO;
  private divergence!: FBO;
  private pressureA!: FBO;
  private pressureB!: FBO;

  private currentVelIsA = true;
  private currentDensityIsA = true;

  // Shader Programs
  private prgAdvectionVel!: WebGLProgram;
  private prgAdvectionDensity!: WebGLProgram;
  private prgSplatVel!: WebGLProgram;
  private prgSplatDensity!: WebGLProgram;
  private prgDivergence!: WebGLProgram;
  private prgPressure!: WebGLProgram;
  private prgProjection!: WebGLProgram;

  // Uniform locations cache
  private locAdvVel_velocity: WebGLUniformLocation | null = null;
  private locAdvVel_ratio: WebGLUniformLocation | null = null;
  private locAdvVel_dt: WebGLUniformLocation | null = null;
  private locAdvVel_dissipation: WebGLUniformLocation | null = null;

  private locAdvDen_velocity: WebGLUniformLocation | null = null;
  private locAdvDen_density: WebGLUniformLocation | null = null;
  private locAdvDen_ratio: WebGLUniformLocation | null = null;
  private locAdvDen_dt: WebGLUniformLocation | null = null;
  private locAdvDen_dissipation: WebGLUniformLocation | null = null;

  private locSplatVel_velocity: WebGLUniformLocation | null = null;
  private locSplatVel_cursorUV: WebGLUniformLocation | null = null;
  private locSplatVel_force: WebGLUniformLocation | null = null;
  private locSplatVel_radiusUV: WebGLUniformLocation | null = null;

  private locSplatDen_density: WebGLUniformLocation | null = null;
  private locSplatDen_cursorUV: WebGLUniformLocation | null = null;
  private locSplatDen_amount: WebGLUniformLocation | null = null;
  private locSplatDen_radiusUV: WebGLUniformLocation | null = null;

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

  constructor(gl: WebGL2RenderingContext, widthCss: number, heightCss: number) {
    this.gl = gl;
    this.fboConfig = checkFloatFboSupport(gl);
    this.isSupported = this.fboConfig.supported;

    const quad = createQuad(gl);
    this.quadVAO = quad.vao;
    this.quadBuffer = quad.buffer;

    this.initPrograms();
    this.resize(widthCss, heightCss);
  }

  private initPrograms() {
    const gl = this.gl;

    this.prgAdvectionVel = createProgram(gl, VS_QUAD, FS_ADVECTION_VELOCITY);
    this.locAdvVel_velocity = gl.getUniformLocation(this.prgAdvectionVel, 'u_velocity');
    this.locAdvVel_ratio = gl.getUniformLocation(this.prgAdvectionVel, 'u_ratio');
    this.locAdvVel_dt = gl.getUniformLocation(this.prgAdvectionVel, 'u_dt');
    this.locAdvVel_dissipation = gl.getUniformLocation(this.prgAdvectionVel, 'u_dissipation');

    this.prgAdvectionDensity = createProgram(gl, VS_QUAD, FS_ADVECTION_DENSITY);
    this.locAdvDen_velocity = gl.getUniformLocation(this.prgAdvectionDensity, 'u_velocity');
    this.locAdvDen_density = gl.getUniformLocation(this.prgAdvectionDensity, 'u_density');
    this.locAdvDen_ratio = gl.getUniformLocation(this.prgAdvectionDensity, 'u_ratio');
    this.locAdvDen_dt = gl.getUniformLocation(this.prgAdvectionDensity, 'u_dt');
    this.locAdvDen_dissipation = gl.getUniformLocation(this.prgAdvectionDensity, 'u_dissipation');

    this.prgSplatVel = createProgram(gl, VS_QUAD, FS_SPLAT_VELOCITY);
    this.locSplatVel_velocity = gl.getUniformLocation(this.prgSplatVel, 'u_velocity');
    this.locSplatVel_cursorUV = gl.getUniformLocation(this.prgSplatVel, 'u_cursorUV');
    this.locSplatVel_force = gl.getUniformLocation(this.prgSplatVel, 'u_force');
    this.locSplatVel_radiusUV = gl.getUniformLocation(this.prgSplatVel, 'u_radiusUV');

    this.prgSplatDensity = createProgram(gl, VS_QUAD, FS_SPLAT_DENSITY);
    this.locSplatDen_density = gl.getUniformLocation(this.prgSplatDensity, 'u_density');
    this.locSplatDen_cursorUV = gl.getUniformLocation(this.prgSplatDensity, 'u_cursorUV');
    this.locSplatDen_amount = gl.getUniformLocation(this.prgSplatDensity, 'u_amount');
    this.locSplatDen_radiusUV = gl.getUniformLocation(this.prgSplatDensity, 'u_radiusUV');

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

  /**
   * Computes brush radius strictly in CSS pixels:
   * desktop radiusPx = clamp(18, min(viewportWidth, viewportHeight) * 0.025, 32);
   * DPR does NOT scale visible size.
   */
  public getRadiusPx(viewportWidthCss: number, viewportHeightCss: number): number {
    const minDim = Math.min(viewportWidthCss, viewportHeightCss);
    return Math.min(Math.max(minDim * 0.025, 18), 32);
  }

  public resize(viewportWidthCss: number, viewportHeightCss: number) {
    const gl = this.gl;
    // Set simulation resolution so grid cells provide smooth round brush splats
    // Target min dimension ~280-360 cells so a ~20px radius occupies ~8-12 cells
    const minDim = Math.max(1, Math.min(viewportWidthCss, viewportHeightCss));
    const scale = Math.min(320 / minDim, 1.0);

    const W = Math.max(64, Math.round(viewportWidthCss * scale));
    const H = Math.max(64, Math.round(viewportHeightCss * scale));

    if (W === this.simWidth && H === this.simHeight) return;

    this.simWidth = W;
    this.simHeight = H;

    if (!this.velocityA) {
      this.velocityA = createFBO(gl, W, H, this.fboConfig);
      this.velocityB = createFBO(gl, W, H, this.fboConfig);
      this.densityA = createFBO(gl, W, H, this.fboConfig);
      this.densityB = createFBO(gl, W, H, this.fboConfig);
      this.divergence = createFBO(gl, W, H, this.fboConfig);
      this.pressureA = createFBO(gl, W, H, this.fboConfig);
      this.pressureB = createFBO(gl, W, H, this.fboConfig);
    } else {
      resizeFBO(gl, this.velocityA, W, H, this.fboConfig);
      resizeFBO(gl, this.velocityB, W, H, this.fboConfig);
      resizeFBO(gl, this.densityA, W, H, this.fboConfig);
      resizeFBO(gl, this.densityB, W, H, this.fboConfig);
      resizeFBO(gl, this.divergence, W, H, this.fboConfig);
      resizeFBO(gl, this.pressureA, W, H, this.fboConfig);
      resizeFBO(gl, this.pressureB, W, H, this.fboConfig);
    }
  }

  public step(splats: SplatPoint[], viewportWidthCss: number, viewportHeightCss: number) {
    if (!this.isSupported) return;

    const gl = this.gl;
    const W = this.simWidth;
    const H = this.simHeight;
    const pxX = 1.0 / W;
    const pxY = 1.0 / H;
    const maxWH = Math.max(W, H);
    const ratioX = maxWH / W;
    const ratioY = maxWH / H;

    const radiusPx = this.getRadiusPx(viewportWidthCss, viewportHeightCss);
    const radiusUVX = radiusPx / Math.max(1, viewportWidthCss);
    const radiusUVY = radiusPx / Math.max(1, viewportHeightCss);

    gl.bindVertexArray(this.quadVAO);
    gl.viewport(0, 0, W, H);

    // ==========================================
    // 1. Advect Velocity
    // ==========================================
    let curVel = this.currentVelIsA ? this.velocityA : this.velocityB;
    let nextVel = this.currentVelIsA ? this.velocityB : this.velocityA;

    gl.bindFramebuffer(gl.FRAMEBUFFER, nextVel.framebuffer);
    gl.useProgram(this.prgAdvectionVel);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, curVel.texture);
    gl.uniform1i(this.locAdvVel_velocity, 0);
    gl.uniform2f(this.locAdvVel_ratio, ratioX, ratioY);
    gl.uniform1f(this.locAdvVel_dt, this.dt);
    gl.uniform1f(this.locAdvVel_dissipation, this.dissipationVelocity);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    curVel = nextVel;
    nextVel = curVel === this.velocityA ? this.velocityB : this.velocityA;

    // ==========================================
    // 2. Advect Density (using advected velocity)
    // ==========================================
    let curDen = this.currentDensityIsA ? this.densityA : this.densityB;
    let nextDen = this.currentDensityIsA ? this.densityB : this.densityA;

    gl.bindFramebuffer(gl.FRAMEBUFFER, nextDen.framebuffer);
    gl.useProgram(this.prgAdvectionDensity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, curVel.texture);
    gl.uniform1i(this.locAdvDen_velocity, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, curDen.texture);
    gl.uniform1i(this.locAdvDen_density, 1);
    gl.uniform2f(this.locAdvDen_ratio, ratioX, ratioY);
    gl.uniform1f(this.locAdvDen_dt, this.dt);
    gl.uniform1f(this.locAdvDen_dissipation, this.dissipationDensity);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    curDen = nextDen;
    nextDen = curDen === this.densityA ? this.densityB : this.densityA;

    // ==========================================
    // 3. Splat Velocity & Positive Density
    // ==========================================
    for (const splat of splats) {
      const fx = Math.min(Math.max(splat.force[0], -this.mouseForce), this.mouseForce);
      const fy = Math.min(Math.max(splat.force[1], -this.mouseForce), this.mouseForce);
      const hasForce = Math.abs(fx) > 1e-5 || Math.abs(fy) > 1e-5;
      const hasDensity = splat.density > 1e-4;

      if (hasForce) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, nextVel.framebuffer);
        gl.useProgram(this.prgSplatVel);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, curVel.texture);
        gl.uniform1i(this.locSplatVel_velocity, 0);
        gl.uniform2f(this.locSplatVel_cursorUV, splat.cursorUV[0], splat.cursorUV[1]);
        gl.uniform2f(this.locSplatVel_force, fx, fy);
        gl.uniform2f(this.locSplatVel_radiusUV, radiusUVX, radiusUVY);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        curVel = nextVel;
        nextVel = curVel === this.velocityA ? this.velocityB : this.velocityA;
      }

      if (hasDensity) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, nextDen.framebuffer);
        gl.useProgram(this.prgSplatDensity);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, curDen.texture);
        gl.uniform1i(this.locSplatDen_density, 0);
        gl.uniform2f(this.locSplatDen_cursorUV, splat.cursorUV[0], splat.cursorUV[1]);
        gl.uniform1f(this.locSplatDen_amount, splat.density);
        gl.uniform2f(this.locSplatDen_radiusUV, radiusUVX, radiusUVY);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        curDen = nextDen;
        nextDen = curDen === this.densityA ? this.densityB : this.densityA;
      }
    }

    // ==========================================
    // 4. Divergence of Velocity
    // ==========================================
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.divergence.framebuffer);
    gl.useProgram(this.prgDivergence);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, curVel.texture);
    gl.uniform1i(this.locDivVel, 0);
    gl.uniform2f(this.locDivPx, pxX, pxY);
    gl.uniform1f(this.locDivDt, this.dt);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // ==========================================
    // 5. Pressure Poisson Solve (4 Iterations)
    // ==========================================
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

      const tmp = pIn;
      pIn = pOut;
      pOut = tmp;
    }

    // ==========================================
    // 6. Projection (Subtract gradient of pressure)
    // ==========================================
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

    this.currentVelIsA = nextVel === this.velocityA;
    this.currentDensityIsA = curDen === this.densityA;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  public getVelocityTexture(): WebGLTexture | null {
    if (!this.isSupported) return null;
    return this.currentVelIsA ? this.velocityA.texture : this.velocityB.texture;
  }

  public getDensityTexture(): WebGLTexture | null {
    if (!this.isSupported) return null;
    return this.currentDensityIsA ? this.densityA.texture : this.densityB.texture;
  }

  public dispose() {
    const gl = this.gl;
    if (this.velocityA) gl.deleteFramebuffer(this.velocityA.framebuffer);
    if (this.velocityA) gl.deleteTexture(this.velocityA.texture);
    if (this.velocityB) gl.deleteFramebuffer(this.velocityB.framebuffer);
    if (this.velocityB) gl.deleteTexture(this.velocityB.texture);
    if (this.densityA) gl.deleteFramebuffer(this.densityA.framebuffer);
    if (this.densityA) gl.deleteTexture(this.densityA.texture);
    if (this.densityB) gl.deleteFramebuffer(this.densityB.framebuffer);
    if (this.densityB) gl.deleteTexture(this.densityB.texture);
    if (this.divergence) gl.deleteFramebuffer(this.divergence.framebuffer);
    if (this.divergence) gl.deleteTexture(this.divergence.texture);
    if (this.pressureA) gl.deleteFramebuffer(this.pressureA.framebuffer);
    if (this.pressureA) gl.deleteTexture(this.pressureA.texture);
    if (this.pressureB) gl.deleteFramebuffer(this.pressureB.framebuffer);
    if (this.pressureB) gl.deleteTexture(this.pressureB.texture);

    gl.deleteProgram(this.prgAdvectionVel);
    gl.deleteProgram(this.prgAdvectionDensity);
    gl.deleteProgram(this.prgSplatVel);
    gl.deleteProgram(this.prgSplatDensity);
    gl.deleteProgram(this.prgDivergence);
    gl.deleteProgram(this.prgPressure);
    gl.deleteProgram(this.prgProjection);
    gl.deleteVertexArray(this.quadVAO);
    gl.deleteBuffer(this.quadBuffer);
  }
}
