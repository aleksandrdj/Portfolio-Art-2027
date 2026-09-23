import { SIMPLEX_NOISE_3D } from './shaders/simplexNoise';
import { createProgram, createQuad } from './webglUtils';

const VS_COMPOSITE = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_BACKGROUND_COMPOSITE = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_fluidMask;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_opacity;
uniform float u_dpr;
uniform float u_scrollProgress;

out vec4 fragColor;

${SIMPLEX_NOISE_3D}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  // 1. Normalized coordinates
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Constants: slow, elegant, meditative drift
  const float SCALE = 1.0;
  const float SPEED = 0.02;
  const float DISTORT_SCALE = 0.8;
  const float DISTORT_INTENSITY = 0.35;
  const float NOISE_DETAIL = 3.0;

  // Slow autonomous organic distortion field:
  float warp = 0.5 + 0.5 * snoise(vec3(p * DISTORT_SCALE, u_time * SPEED * 0.25));

  // Shifted coordinates depend only on the gentle organic warp
  vec2 shifted = p + vec2(warp * DISTORT_INTENSITY);
  float noiseValue = 0.5 + 0.5 * snoise(vec3(shifted * SCALE, u_time * SPEED));

  // Repeating levels
  float fVal = noiseValue * NOISE_DETAIL;

  // Resolution-stable anti-aliased contour extraction
  float twoF = 2.0 * fVal;
  float distToBoundary = abs(round(twoF) - twoF);
  float dF = max(fwidth(twoF), 0.0001);
  float pxDist = distToBoundary / dF;

  // Target thickness: ~0.75 CSS px (scaled by DPR)
  float targetPxWidth = 0.75 * max(u_dpr, 1.0);
  float lineAlpha = 1.0 - smoothstep(targetPxWidth * 0.35, targetPxWidth * 0.95, pxDist);

  // Living gradient palette (from specification):
  // Bright cyan-blue: #008CB2 -> vec3(0.0, 140.0 / 255.0, 178.0 / 255.0)
  // Deep blue:       #005879 -> vec3(0.0, 88.0 / 255.0, 121.0 / 255.0)
  // Dark blue-green: #063B4B -> vec3(6.0 / 255.0, 59.0 / 255.0, 75.0 / 255.0)
  vec3 colBright = vec3(0.0, 140.0 / 255.0, 178.0 / 255.0);
  vec3 colDeep   = vec3(0.0, 88.0 / 255.0, 121.0 / 255.0);
  vec3 colDark   = vec3(6.0 / 255.0, 59.0 / 255.0, 75.0 / 255.0);

  // Slow, meditative drift with natural period ~25-30 seconds (independent of scroll)
  float tGrad = u_time * 0.035;

  // Gentle wandering color regions
  vec2 c1 = vec2(0.35 + 0.22 * sin(tGrad * 1.1 + 0.5), 0.75 + 0.16 * cos(tGrad * 0.9));
  vec2 c2 = vec2(0.70 + 0.25 * cos(tGrad * 0.8 + 1.2), 0.40 + 0.20 * sin(tGrad * 1.05));
  vec2 c3 = vec2(0.40 + 0.20 * sin(tGrad * 0.7 + 2.5), 0.15 + 0.12 * cos(tGrad * 1.2));

  float d1 = length(uv - c1);
  float gradNoise = 0.5 + 0.5 * snoise(vec3(uv * 0.75, tGrad * 0.5));

  // Base background distribution: lighter cyan-blue at top/sides, deep blue in middle, dark blue-green at bottom
  vec3 livingGradient = mix(colDark, colDeep, smoothstep(0.05, 0.75, uv.y));
  float wBright = (1.0 - smoothstep(0.15, 0.95, d1)) * 0.85 + smoothstep(0.3, 1.0, uv.y) * 0.25;
  livingGradient = mix(livingGradient, colBright, clamp(wBright + gradNoise * 0.15, 0.0, 1.0));

  // Blend from pure white base to living gradient according to scroll progress (0.0 -> 1.0)
  vec3 baseBg = mix(vec3(1.0, 1.0, 1.0), livingGradient, u_scrollProgress);

  // Topographic lines:
  // - On white base: delicate, distinguishable cool gray (~#9CA8B0)
  // - On saturated dark gradient: low-contrast cyan-blue slightly lighter than background
  vec3 lineWhiteBg = vec3(156.0 / 255.0, 168.0 / 255.0, 176.0 / 255.0);
  vec3 lineGradientBg = mix(livingGradient, vec3(0.58, 0.86, 0.93), 0.70);
  vec3 lineColor = mix(lineWhiteBg, lineGradientBg, u_scrollProgress);

  // Single clear line strength parameter (no compounding nested factors extinguishing lines)
  // White state: 0.40 strength -> soft legible 0.75px contour lines
  // Blue state: 0.38 strength with a pale cyan target keeps contours visible.
  float lineStrength = mix(0.40, 0.30, u_scrollProgress) * u_opacity;
  float currentLineAlpha = lineAlpha * lineStrength;

  vec3 backgroundWithContours = mix(baseBg, lineColor, currentLineAlpha);

  float liquid = texture(u_fluidMask, uv).r * (1.0 - smoothstep(0.0, 0.18, u_scrollProgress));
  backgroundWithContours = mix(backgroundWithContours, vec3(0.86, 0.87, 0.88), liquid * u_opacity);
  fragColor = vec4(backgroundWithContours, 1.0);
}
`;

export class BackgroundField {
  private gl: WebGL2RenderingContext;
  private quadVAO: WebGLVertexArrayObject;
  private quadBuffer: WebGLBuffer;
  private program: WebGLProgram;

  private locFluidMask: WebGLUniformLocation | null = null;
  private locResolution: WebGLUniformLocation | null = null;
  private locTime: WebGLUniformLocation | null = null;
  private locOpacity: WebGLUniformLocation | null = null;
  private locDpr: WebGLUniformLocation | null = null;
  private locScrollProgress: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const quad = createQuad(gl);
    this.quadVAO = quad.vao;
    this.quadBuffer = quad.buffer;

    this.program = createProgram(gl, VS_COMPOSITE, FS_BACKGROUND_COMPOSITE);
    this.locFluidMask = gl.getUniformLocation(this.program, 'u_fluidMask');
    this.locResolution = gl.getUniformLocation(this.program, 'u_resolution');
    this.locTime = gl.getUniformLocation(this.program, 'u_time');
    this.locOpacity = gl.getUniformLocation(this.program, 'u_opacity');
    this.locDpr = gl.getUniformLocation(this.program, 'u_dpr');
    this.locScrollProgress = gl.getUniformLocation(this.program, 'u_scrollProgress');
  }

  public render(
    fluidMask: WebGLTexture | null,
    width: number,
    height: number,
    time: number,
    opacity: number,
    dpr: number,
    scrollProgress: number = 0.0
  ) {
    const gl = this.gl;
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVAO);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fluidMask);
    gl.uniform1i(this.locFluidMask, 0);
    gl.uniform2f(this.locResolution, width, height);
    gl.uniform1f(this.locTime, time);
    gl.uniform1f(this.locOpacity, opacity);
    gl.uniform1f(this.locDpr, dpr);
    gl.uniform1f(this.locScrollProgress, scrollProgress);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
  }

  public dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.quadVAO);
    gl.deleteBuffer(this.quadBuffer);
  }
}
