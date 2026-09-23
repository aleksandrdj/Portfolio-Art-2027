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
uniform vec2 u_mouseNDC;
uniform float u_mousePace;
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

  // Constants: reduced speed for slow, elegant, meditative drift
  const float SCALE = 1.0;
  const float SPEED = 0.02;
  const float DISTORT_SCALE = 0.8;
  const float DISTORT_INTENSITY = 0.35;
  const float NOISE_DETAIL = 3.0;

  // Background must NOT jerk or twitch from cursor movement.
  // Slow autonomous organic distortion field:
  float warp = 0.5 + 0.5 * snoise(vec3(p * DISTORT_SCALE, u_time * SPEED * 0.25));

  // Shifted coordinates depend only on the gentle organic warp
  vec2 shifted = p + vec2(warp * DISTORT_INTENSITY);
  float noiseValue = 0.5 + 0.5 * snoise(vec3(shifted * SCALE, u_time * SPEED));

  // Repeating levels & region
  float fVal = noiseValue * NOISE_DETAIL;
  float phase = fract(fVal);
  float region = step(0.5, phase);

  // Resolution-stable anti-aliased contour extraction
  float twoF = 2.0 * fVal;
  float distToBoundary = abs(round(twoF) - twoF);
  float dF = max(fwidth(twoF), 0.0001);
  float pxDist = distToBoundary / dF;

  // Target thickness: ~0.85 CSS px (scaled by DPR)
  float targetPxWidth = 0.85 * max(u_dpr, 1.0);
  float lineAlpha = 1.0 - smoothstep(targetPxWidth * 0.4, targetPxWidth * 0.9, pxDist);

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
  float wBright = smoothstep(0.95, 0.15, d1) * 0.85 + smoothstep(0.3, 1.0, uv.y) * 0.25;
  livingGradient = mix(livingGradient, colBright, clamp(wBright + gradNoise * 0.15, 0.0, 1.0));

  // Blend from pure white base to living gradient according to scroll progress (0.0 -> 1.0)
  vec3 baseBg = mix(vec3(1.0, 1.0, 1.0), livingGradient, u_scrollProgress);

  // Topographic lines:
  // On white: #E3E4E2
  // On rich gradient: delicate light cyan #8CE8F2
  vec3 lineWhiteBg = vec3(227.0 / 255.0, 228.0 / 255.0, 226.0 / 255.0);
  vec3 lineGradientBg = vec3(140.0 / 255.0, 225.0 / 255.0, 240.0 / 255.0);
  vec3 lineColor = mix(lineWhiteBg, lineGradientBg, u_scrollProgress);

  float currentLineAlpha = lineAlpha * u_opacity * mix(0.85, 0.55, u_scrollProgress);
  vec3 backgroundWithContours = mix(baseBg, lineColor, currentLineAlpha);

  // Unified fluid mask in exact screen coordinates
  vec2 screenUV = gl_FragCoord.xy / u_resolution;
  float mask = texture(u_fluidMask, screenUV).r;

  // Fluid trail color slightly darker than white background on light, or soft glow on dark
  vec3 trailLightWhite = vec3(238.0 / 255.0, 238.0 / 255.0, 235.0 / 255.0);
  vec3 trailDarkWhite  = vec3(221.0 / 255.0, 223.0 / 255.0, 217.0 / 255.0);
  vec3 trailLightGrad  = mix(colDeep, colBright, 0.35);
  vec3 trailDarkGrad   = mix(colDark, colDeep, 0.5);

  vec3 trailLight = mix(trailLightWhite, trailLightGrad, u_scrollProgress);
  vec3 trailDark  = mix(trailDarkWhite, trailDarkGrad, u_scrollProgress);
  vec3 trailColor = mix(trailLight, trailDark, region);

  vec3 finalColor = mix(backgroundWithContours, trailColor, mask * u_opacity);

  fragColor = vec4(finalColor, 1.0);
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
  private locMouseNDC: WebGLUniformLocation | null = null;
  private locMousePace: WebGLUniformLocation | null = null;
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
    this.locMouseNDC = gl.getUniformLocation(this.program, 'u_mouseNDC');
    this.locMousePace = gl.getUniformLocation(this.program, 'u_mousePace');
    this.locOpacity = gl.getUniformLocation(this.program, 'u_opacity');
    this.locDpr = gl.getUniformLocation(this.program, 'u_dpr');
    this.locScrollProgress = gl.getUniformLocation(this.program, 'u_scrollProgress');
  }

  public render(
    fluidMaskTex: WebGLTexture | null,
    width: number,
    height: number,
    time: number,
    mouseNDC: [number, number],
    mousePace: number,
    opacity: number,
    dpr: number,
    scrollProgress: number = 0.0
  ) {
    const gl = this.gl;
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVAO);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fluidMaskTex);
    gl.uniform1i(this.locFluidMask, 0);

    gl.uniform2f(this.locResolution, width, height);
    gl.uniform1f(this.locTime, time);
    gl.uniform2f(this.locMouseNDC, mouseNDC[0], mouseNDC[1]);
    gl.uniform1f(this.locMousePace, mousePace);
    gl.uniform1f(this.locOpacity, opacity);
    gl.uniform1f(this.locDpr, dpr);
    gl.uniform1f(this.locScrollProgress, scrollProgress);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  public dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.quadVAO);
    gl.deleteBuffer(this.quadBuffer);
  }
}
