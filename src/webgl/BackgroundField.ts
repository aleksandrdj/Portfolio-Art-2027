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

  // Palette:
  // Background: #FFFFFF
  // Lines: #E3E4E2
  // Trail Light: #EEEEEB (slightly darker than white)
  // Trail Dark:  #DDDFD9
  vec3 bgColor = vec3(1.0, 1.0, 1.0);
  vec3 lineColor = vec3(227.0 / 255.0, 228.0 / 255.0, 226.0 / 255.0);
  vec3 trailLight = vec3(238.0 / 255.0, 238.0 / 255.0, 235.0 / 255.0);
  vec3 trailDark  = vec3(221.0 / 255.0, 223.0 / 255.0, 217.0 / 255.0);

  // Combine background and contours
  vec3 backgroundWithContours = mix(bgColor, lineColor, lineAlpha * u_opacity);

  // Read unified fluid mask in exact screen coordinates
  // screenUV = gl_FragCoord.xy / u_resolution
  vec2 screenUV = gl_FragCoord.xy / u_resolution;
  float mask = texture(u_fluidMask, screenUV).r;

  // Fluid trail color slightly darker than white background
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
  }

  public render(
    fluidMaskTex: WebGLTexture | null,
    width: number,
    height: number,
    time: number,
    mouseNDC: [number, number],
    mousePace: number,
    opacity: number,
    dpr: number
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
