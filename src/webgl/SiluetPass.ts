import { createProgram, createQuad } from './webglUtils';

const VS_SILUET = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;

uniform vec4 u_rect; // [x, y, w, h] in physical pixels from bottom-left
uniform vec2 u_resolution; // viewport [width, height] in physical pixels

out vec2 v_uv;

void main() {
  v_uv = a_uv;
  vec2 pixelPos = u_rect.xy + a_position * u_rect.zw;
  vec2 ndc = (pixelPos / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
`;

const FS_SILUET = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_siluetTex;
uniform float u_opacity;

out vec4 fragColor;

void main() {
  vec4 sampleColor = texture(u_siluetTex, v_uv);
  float alpha = sampleColor.a * u_opacity;

  if (alpha < 0.001) {
    discard;
  }

  // Pure white silhouette at controlled low opacity (<= 0.10)
  fragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`;

const SILUET_ASPECT = 1497 / 2079; // viewBox="0 0 1497 2079"

export class SiluetPass {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private quadVAO: WebGLVertexArrayObject;
  private quadBuffer: WebGLBuffer;
  private siluetTexture: WebGLTexture | null = null;
  public isTextureReady = false;

  private locRect: WebGLUniformLocation | null = null;
  private locResolution: WebGLUniformLocation | null = null;
  private locOpacity: WebGLUniformLocation | null = null;
  private locSiluetTex: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgram(gl, VS_SILUET, FS_SILUET);
    const quad = createQuad(gl);
    this.quadVAO = quad.vao;
    this.quadBuffer = quad.buffer;

    this.locRect = gl.getUniformLocation(this.program, 'u_rect');
    this.locResolution = gl.getUniformLocation(this.program, 'u_resolution');
    this.locOpacity = gl.getUniformLocation(this.program, 'u_opacity');
    this.locSiluetTex = gl.getUniformLocation(this.program, 'u_siluetTex');

    this.loadTexture();
  }

  private loadTexture() {
    const gl = this.gl;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/images/siluet.svg';

    img.onload = () => {
      try {
        const offCanvas = document.createElement('canvas');
        // Render at high crisp resolution for Retina/4K displays
        const targetW = 1024;
        const targetH = Math.round(targetW / SILUET_ASPECT);
        offCanvas.width = targetW;
        offCanvas.height = targetH;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) return;

        // Draw the SVG white silhouette
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Turn all non-transparent pixels into solid white
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);

        const tex = gl.createTexture();
        if (!tex) return;

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);

        this.siluetTexture = tex;
        this.isTextureReady = true;
      } catch (err) {
        console.warn('SiluetPass texture generation error:', err);
      }
    };

    img.onerror = () => {
      console.warn('Failed to load /images/siluet.svg, retrying fallback');
      // Retry via direct fetch
      fetch('/images/siluet.svg')
        .then((r) => r.text())
        .then((svgText) => {
          const blob = new Blob([svgText], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          img.src = url;
        })
        .catch((e) => console.warn('Siluet fallback fetch error:', e));
    };
  }

  public render(
    viewportWidth: number,
    viewportHeight: number,
    dpr: number,
    scrollProgress: number
  ) {
    if (!this.isTextureReady || !this.siluetTexture) return;
    if (scrollProgress <= 0.0001) return; // Completely hidden at start

    const gl = this.gl;
    const isMobile = viewportWidth / dpr < 768;

    // Height specification: ~85svh desktop, ~72svh mobile
    const targetHeightCss = (isMobile ? 0.72 : 0.85) * (viewportHeight / dpr);
    const targetWidthCss = targetHeightCss * SILUET_ASPECT;

    const targetHeightPx = targetHeightCss * dpr;
    const targetWidthPx = targetWidthCss * dpr;

    // Horizontal: centered
    const leftPx = (viewportWidth - targetWidthPx) / 2;

    // Vertical transition (0 to 0.85):
    // At scrollProgress = 0, bottom is strictly below viewport (-targetHeightPx - 20)
    // At scrollProgress >= 0.85, bottom is aligned to bottom of screen (bottomY = 0)
    const t = Math.min(scrollProgress / 0.85, 1.0);
    const easedT = t * (2 - t); // Smooth entrance

    const startY = -targetHeightPx - 20 * dpr;
    const endY = 0; // Aligned to bottom edge in WebGL pixel coords
    const bottomY = startY + (endY - startY) * easedT;

    // Strict specification: opacity never exceeds 0.10 (10% max)
    const opacity = t * 0.10;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVAO);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.siluetTexture);
    gl.uniform1i(this.locSiluetTex, 0);

    gl.uniform4f(this.locRect, leftPx, bottomY, targetWidthPx, targetHeightPx);
    gl.uniform2f(this.locResolution, viewportWidth, viewportHeight);
    gl.uniform1f(this.locOpacity, opacity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  public dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.quadVAO);
    gl.deleteBuffer(this.quadBuffer);
    if (this.siluetTexture) {
      gl.deleteTexture(this.siluetTexture);
      this.siluetTexture = null;
    }
  }
}
