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

  // Target thickness: ~0.7 CSS px (scaled by DPR)
  float targetPxWidth = 0.7 * max(u_dpr, 1.0);
  float lineAlpha = 1.0 - smoothstep(targetPxWidth * 0.4, targetPxWidth * 0.85, pxDist);

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
  // On white: delicate warm gray #E4E6E3
  // On rich gradient: delicate shade slightly lighter than background (mix with cyan), no glow!
  vec3 lineWhiteBg = vec3(228.0 / 255.0, 230.0 / 255.0, 227.0 / 255.0);
  vec3 lineGradientBg = mix(livingGradient, colBright, 0.22);
  vec3 lineColor = mix(lineWhiteBg, lineGradientBg, u_scrollProgress);

  // Target opacity for contours on saturated gradient: strictly 0.08 (range 0.06 - 0.10)
  float lineOpacity = mix(0.18, 0.08, u_scrollProgress) * u_opacity;
  float currentLineAlpha = lineAlpha * lineOpacity;

  vec3 backgroundWithContours = mix(baseBg, lineColor, currentLineAlpha);

  fragColor = vec4(backgroundWithContours, 1.0);
}
`;

export class BackgroundField {
  private gl: WebGL2RenderingContext;
  private quadVAO: WebGLVertexArrayObject;
  private quadBuffer: WebGLBuffer;
  private program: WebGLProgram;

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
    this.locResolution = gl.getUniformLocation(this.program, 'u_resolution');
    this.locTime = gl.getUniformLocation(this.program, 'u_time');
    this.locOpacity = gl.getUniformLocation(this.program, 'u_opacity');
    this.locDpr = gl.getUniformLocation(this.program, 'u_dpr');
    this.locScrollProgress = gl.getUniformLocation(this.program, 'u_scrollProgress');
  }

  public render(
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
