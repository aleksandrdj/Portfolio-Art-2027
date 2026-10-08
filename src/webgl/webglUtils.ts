export interface FBO {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create WebGL shader');
  gl.shaderSource(shader, source.trim());
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation error: ${info}`);
  }
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSrc: string,
  fragmentSrc: string
): WebGLProgram {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create WebGL program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getShaderInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

export function createQuad(gl: WebGL2RenderingContext): { vao: WebGLVertexArrayObject; buffer: WebGLBuffer } {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('Failed to create VAO');
  gl.bindVertexArray(vao);

  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create quad buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Fullscreen triangle or 2-triangle quad in NDC: positions (x, y), uv (u, v)
  const vertices = new Float32Array([
    -1.0, -1.0,  0.0, 0.0,
     1.0, -1.0,  1.0, 0.0,
    -1.0,  1.0,  0.0, 1.0,
    -1.0,  1.0,  0.0, 1.0,
     1.0, -1.0,  1.0, 0.0,
     1.0,  1.0,  1.0, 1.0,
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); // pos
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0);
  gl.enableVertexAttribArray(1); // uv
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, buffer };
}

export function checkFloatFboSupport(gl: WebGL2RenderingContext): {
  supported: boolean;
  internalFormat: number;
  format: number;
  type: number;
  linearSupported: boolean;
} {
  const extFloat = gl.getExtension('EXT_color_buffer_float');

  if (!extFloat) {
    return {
      supported: false,
      internalFormat: gl.RGBA8,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      linearSupported: true,
    };
  }

  // RGBA16F is widely supported and optimal for velocity/fluid
  return {
    supported: true,
    internalFormat: gl.RGBA16F,
    format: gl.RGBA,
    type: gl.HALF_FLOAT,
    // RGBA16F + HALF_FLOAT is linearly filterable in WebGL2 core.
    linearSupported: true,
  };
}

export function createFBO(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  fboConfig: { internalFormat: number; format: number; type: number; linearSupported: boolean }
): FBO {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Failed to create texture');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    fboConfig.internalFormat,
    width,
    height,
    0,
    fboConfig.format,
    fboConfig.type,
    null
  );

  const filter = fboConfig.linearSupported ? gl.LINEAR : gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Failed to create framebuffer');
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  // Validate framebuffer completeness
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
  }

  // Clear with 0.0 values initially
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { framebuffer, texture, width, height };
}

export function resizeFBO(
  gl: WebGL2RenderingContext,
  fbo: FBO,
  width: number,
  height: number,
  fboConfig: { internalFormat: number; format: number; type: number; linearSupported: boolean }
): void {
  if (fbo.width === width && fbo.height === height) return;
  fbo.width = width;
  fbo.height = height;

  gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    fboConfig.internalFormat,
    width,
    height,
    0,
    fboConfig.format,
    fboConfig.type,
    null
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
  
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.warn(`Framebuffer resize incomplete: 0x${status.toString(16)}`);
  }

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * Creates a neutral 1x1 zero-velocity texture for fallbacks or uninitialized passes.
 */
export function createZeroTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error('Failed to create zero texture');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const zeroPixel = new Uint8Array([0, 0, 0, 0]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, zeroPixel);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}
