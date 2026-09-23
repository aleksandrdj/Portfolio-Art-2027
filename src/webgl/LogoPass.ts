import { LOGO_FILLED_PATH, LOGO_VIEWBOX } from '../data/logoData';
import { createProgram } from './webglUtils';

const VS_LOGO = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;

uniform vec4 u_rect; // [x, y, w, h] in pixels from bottom-left
uniform vec2 u_resolution; // viewport [width, height] in pixels
uniform vec2 u_parallax; // parallax offset in pixels
uniform vec2 u_rotation; // [rotX, rotY] in radians

out vec2 v_uv;

void main() {
  v_uv = a_uv;

  // Local quad [0, 1] relative to center
  vec2 localOffset = (a_position - 0.5) * u_rect.zw;

  // 3D rotation
  float cx = cos(u_rotation.x);
  float sx = sin(u_rotation.x);
  float cy = cos(u_rotation.y);
  float sy = sin(u_rotation.y);

  // Rotate around Y then X
  vec3 p = vec3(localOffset.x, localOffset.y, 0.0);
  vec3 pRotY = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  vec3 pRot = vec3(pRotY.x, pRotY.y * cx - pRotY.z * sx, pRotY.y * sx + pRotY.z * cx);

  // Perspective projection with focal distance d = 1200.0 px
  float z = pRot.z;
  float persp = 1.0 / max(1.0 - z / 1200.0, 0.1);
  vec2 projectedOffset = pRot.xy * persp;

  // Final screen pixel position
  vec2 centerPixel = u_rect.xy + 0.5 * u_rect.zw + u_parallax;
  vec2 pixelPos = centerPixel + projectedOffset;

  // Pixel position to NDC [-1, 1]
  vec2 ndc = (pixelPos / u_resolution) * 2.0 - 1.0;

  gl_Position = vec4(ndc, 0.0, 1.0);
}
`;

const FS_LOGO = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_logoTex;
uniform sampler2D u_velocity;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform vec3 u_baseLogoColor;

out vec4 fragColor;

void main() {
  vec4 sampleColor = texture(u_logoTex, v_uv);
  float alpha = sampleColor.a * u_opacity;

  if (alpha < 0.003) {
    discard;
  }

  // Screen UV for perfectly aligned fluid mask sampling
  vec2 screenUV = gl_FragCoord.xy / u_resolution;

  // Fluid velocity & mask derivation
  vec2 v = texture(u_velocity, screenUV).xy;
  float speed = length(v);
  vec3 encoded = vec3(v * 0.5 + 0.5, 1.0);
  vec3 flowColor = mix(vec3(1.0), encoded, speed);

  float signal = 1.0 - flowColor.r;
  float aa = max(fwidth(signal), 0.001);
  float mask = smoothstep(0.1 - aa, 0.1 + aa, signal);

  // Logo color: black in normal state, inverted white inside the liquid mask
  vec3 whiteLogo = vec3(1.0, 1.0, 1.0);
  vec3 logoColor = mix(u_baseLogoColor, whiteLogo, mask);

  fragColor = vec4(logoColor, alpha);
}
`;

export class LogoPass {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private logoTexture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;

  private locRect: WebGLUniformLocation | null = null;
  private locResolution: WebGLUniformLocation | null = null;
  private locParallax: WebGLUniformLocation | null = null;
  private locRotation: WebGLUniformLocation | null = null;
  private locLogoTex: WebGLUniformLocation | null = null;
  private locVelocity: WebGLUniformLocation | null = null;
  private locOpacity: WebGLUniformLocation | null = null;
  private locBaseLogoColor: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    this.program = createProgram(gl, VS_LOGO, FS_LOGO);
    this.locRect = gl.getUniformLocation(this.program, 'u_rect');
    this.locResolution = gl.getUniformLocation(this.program, 'u_resolution');
    this.locParallax = gl.getUniformLocation(this.program, 'u_parallax');
    this.locRotation = gl.getUniformLocation(this.program, 'u_rotation');
    this.locLogoTex = gl.getUniformLocation(this.program, 'u_logoTex');
    this.locVelocity = gl.getUniformLocation(this.program, 'u_velocity');
    this.locOpacity = gl.getUniformLocation(this.program, 'u_opacity');
    this.locBaseLogoColor = gl.getUniformLocation(this.program, 'u_baseLogoColor');

    // Quad geometry [0, 1] x [0, 1]
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO for logo');
    this.vao = vao;
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Failed to create logo buffer');
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    // Quad in [0, 1] with bottom-left at (0, 0)
    const verts = new Float32Array([
      0.0, 0.0,  0.0, 0.0,
      1.0, 0.0,  1.0, 0.0,
      0.0, 1.0,  0.0, 1.0,
      0.0, 1.0,  0.0, 1.0,
      1.0, 0.0,  1.0, 0.0,
      1.0, 1.0,  1.0, 1.0,
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.generateLogoTexture();
  }

  private generateLogoTexture() {
    const gl = this.gl;
    const canvas = document.createElement('canvas');
    // High-resolution rasterization of the original SVG geometry
    canvas.width = 2048;
    canvas.height = Math.round(2048 * (420 / 1000)); // 860
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render path directly from original SVG data
    const scale = canvas.width / 1000;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF'; // White silhouette texture; fragment shader colors it
    const p = new Path2D(LOGO_FILLED_PATH);
    ctx.fill(p);

    const texture = gl.createTexture();
    if (!texture) return;
    this.logoTexture = texture;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  public render(
    velocityTex: WebGLTexture | null,
    viewportWidth: number,
    viewportHeight: number,
    parallax: [number, number],
    rotation: [number, number] = [0, 0],
    opacity: number = 1.0,
    baseColor: [number, number, number] = [17 / 255, 17 / 255, 17 / 255]
  ) {
    if (!this.logoTexture || opacity <= 0.001) return;

    const gl = this.gl;

    // Calculate logo size on screen matching layout:
    // w-[82vw] md:w-[50vw] max-w-[850px] aspect-[1000/420]
    let logoW = viewportWidth * (viewportWidth >= 768 ? 0.5 : 0.82);
    if (logoW > 850) logoW = 850;
    const logoH = logoW * (420 / 1000);

    const logoX = (viewportWidth - logoW) * 0.5;
    const logoY = (viewportHeight - logoH) * 0.5;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
    gl.uniform1i(this.locLogoTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocityTex);
    gl.uniform1i(this.locVelocity, 1);

    gl.uniform4f(this.locRect, logoX, logoY, logoW, logoH);
    gl.uniform2f(this.locResolution, viewportWidth, viewportHeight);
    gl.uniform2f(this.locParallax, parallax[0], parallax[1]);
    gl.uniform2f(this.locRotation, rotation[0], rotation[1]);
    gl.uniform1f(this.locOpacity, opacity);
    gl.uniform3f(this.locBaseLogoColor, baseColor[0], baseColor[1], baseColor[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  public dispose() {
    const gl = this.gl;
    if (this.logoTexture) gl.deleteTexture(this.logoTexture);
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.buffer);
  }
}
