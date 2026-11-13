/**
 * The WebGL plumbing for the morph gallery: capability check, program, quad,
 * and photo textures. Plain functions over a context, no React.
 */

import { MORPH_FRAG, MORPH_UNIFORMS, MORPH_VERT, type MorphUniform } from './morphShaders';

export type MorphUniforms = Record<MorphUniform, WebGLUniformLocation | null>;

export interface MorphProgram {
  program: WebGLProgram;
  buffer: WebGLBuffer | null;
  uniforms: MorphUniforms;
}

/**
 * Whether this browser can run the morph at all. Checked without creating a
 * context (each one is a scarce resource), so it is cheap to call in render.
 * jsdom and very old browsers answer false and keep the plain slider.
 */
export const supportsWebGL = (): boolean =>
  typeof window !== 'undefined' && typeof window.WebGLRenderingContext !== 'undefined';

export const getMorphContext = (canvas: HTMLCanvasElement): WebGLRenderingContext | null => {
  try {
    return canvas.getContext('webgl', { alpha: false, antialias: false });
  } catch {
    return null;
  }
};

const compile = (gl: WebGLRenderingContext, type: number, src: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('could not create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('shader compile failed: ' + log);
  }
  return shader;
};

/** Compiles, links and binds the program and its full-screen quad. Throws on a refusing driver. */
export const createMorphProgram = (gl: WebGLRenderingContext): MorphProgram => {
  const vert = compile(gl, gl.VERTEX_SHADER, MORPH_VERT);
  const frag = compile(gl, gl.FRAGMENT_SHADER, MORPH_FRAG);
  const program = gl.createProgram();
  if (!program) throw new Error('could not create program');
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  // Owned by the program once attached; freed with it rather than per mount.
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('program link failed: ' + log);
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const uniforms = {} as MorphUniforms;
  for (const name of MORPH_UNIFORMS) uniforms[name] = gl.getUniformLocation(program, 'u_' + name);
  return { program, buffer, uniforms };
};

/**
 * Loads a photo for texturing. `crossOrigin` must be set, or the upload throws
 * on a tainted image; a host without CORS headers then fails here instead,
 * where the caller can see it and fall back.
 */
export const loadTextureImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });

/** Uploads a photo. Throws if the browser refuses it (e.g. a tainted image). */
export const uploadTexture = (gl: WebGLRenderingContext, img: HTMLImageElement): WebGLTexture => {
  const tex = gl.createTexture();
  if (!tex) throw new Error('could not create texture');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  // Photos are not powers of two: in WebGL1 clamp + linear is the only legal
  // pair, and the wrong one renders black with no error.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
};

/** Matches the canvas backing store to its box (DPR capped at 2). True when it changed. */
export const fitCanvas = (gl: WebGLRenderingContext, canvas: HTMLCanvasElement): boolean => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (w === 0 || h === 0 || (canvas.width === w && canvas.height === h)) return false;
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, w, h);
  return true;
};
