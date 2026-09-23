// BuildingShadowLayer
// Real-time sun shadows for the 3D building map, in the style of ShadeMap.
//
// A MapLibre custom WebGL layer doing classic shadow mapping:
//   1. prerender: draw every building into a depth texture as seen from the sun
//      (orthographic projection along the sun direction).
//   2. render: redraw the ground and the building surfaces with the map camera,
//      look each fragment up in that depth texture, and darken it when something
//      sits between it and the sun. Walls facing away from the sun are shaded too.
// Because receivers include walls and roofs, shadows fall across neighbouring
// buildings instead of only being painted flat on the ground.

import type * as maplibregl from 'maplibre-gl';
import { MercatorCoordinate } from 'maplibre-gl';
import earcut from 'earcut';

export interface ShadowCaster {
  /** Outer ring followed by holes, as [lng, lat] positions. */
  rings: number[][][];
  /** Top of the extrusion, metres. */
  height: number;
  /** Bottom of the extrusion, metres. */
  base?: number;
}

export interface BuildingShadowLayerOptions {
  id?: string;
  /** Opacity of a fully shadowed surface, 0-1. */
  opacity?: number;
  /** Shadow tint (RGB, 0-1). */
  color?: [number, number, number];
}

type Mat4 = Float64Array;

const mat4 = (): Mat4 => new Float64Array(16);

function multiply(a: ArrayLike<number>, b: ArrayLike<number>): Mat4 {
  const out = mat4();
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function lookAt(eye: number[], center: number[], up: number[]): Mat4 {
  let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
  let len = Math.hypot(zx, zy, zz);
  zx /= len; zy /= len; zz /= len;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz);
  xx /= len; xy /= len; xz /= len;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const out = mat4();
  out[0] = xx; out[1] = yx; out[2] = zx;
  out[4] = xy; out[5] = yy; out[6] = zy;
  out[8] = xz; out[9] = yz; out[10] = zz;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

function ortho(l: number, r: number, b: number, t: number, n: number, f: number): Mat4 {
  const out = mat4();
  out[0] = 2 / (r - l);
  out[5] = 2 / (t - b);
  out[10] = -2 / (f - n);
  out[12] = -(r + l) / (r - l);
  out[13] = -(t + b) / (t - b);
  out[14] = -(f + n) / (f - n);
  out[15] = 1;
  return out;
}

function transformPoint(m: ArrayLike<number>, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// Depth is packed into RGBA8 so the shadow map works on every WebGL context,
// without depth-texture or float-render-target extensions.
//
// Only faces turned away from the sun are stored ("second depth" mapping). Any
// ray to the sun that is blocked must pass through such a face, and because
// they sit on the far side of each building, sunlit walls and roofs never
// compare against their own depth — which is what causes shadow acne.
const DEPTH_VS = `
attribute vec3 a_pos;
attribute vec3 a_normal;
uniform mat4 u_light;
uniform vec3 u_sun_dir;
varying float v_depth;
varying float v_ndl;
void main() {
  vec4 p = u_light * vec4(a_pos, 1.0);
  gl_Position = p;
  v_depth = p.z * 0.5 + 0.5;
  v_ndl = dot(a_normal, u_sun_dir);
}`;

const DEPTH_FS = `
precision highp float;
varying float v_depth;
varying float v_ndl;
void main() {
  if (v_ndl > 0.0) discard;
  vec4 enc = fract(vec4(1.0, 255.0, 65025.0, 16581375.0) * v_depth);
  enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
  gl_FragColor = enc;
}`;

const SHADE_VS = `
attribute vec3 a_pos;
attribute vec3 a_normal;
uniform mat4 u_matrix;
uniform mat4 u_light;
uniform float u_normal_offset;
varying vec3 v_light_pos;
varying vec3 v_normal;
varying vec2 v_local;
void main() {
  gl_Position = u_matrix * vec4(a_pos, 1.0);
  // Normal-offset lookup keeps flat surfaces from shadowing themselves (acne)
  vec4 lp = u_light * vec4(a_pos + a_normal * u_normal_offset, 1.0);
  v_light_pos = lp.xyz * 0.5 + 0.5;
  v_normal = a_normal;
  v_local = a_pos.xy;
}`;

const SHADE_FS = `
precision highp float;
uniform sampler2D u_shadow_map;
uniform float u_texel;
uniform vec3 u_sun_dir;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_radius;
uniform float u_bias;
varying vec3 v_light_pos;
varying vec3 v_normal;
varying vec2 v_local;

float unpackDepth(vec4 c) {
  return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
}

void main() {
  float ndl = dot(normalize(v_normal), u_sun_dir);
  float shade = 0.0;
  if (ndl > 0.0) {
    // 4x4 percentage-closer filter for soft, anti-aliased shadow edges
    float lit = 0.0;
    for (int x = 0; x < 4; x++) {
      for (int y = 0; y < 4; y++) {
        vec2 offset = (vec2(float(x), float(y)) - 1.5) * u_texel;
        float closest = unpackDepth(texture2D(u_shadow_map, v_light_pos.xy + offset));
        lit += v_light_pos.z - u_bias > closest ? 0.0 : 1.0;
      }
    }
    shade = 1.0 - lit / 16.0;
  }
  // Faces turned away from the sun (and grazing ones) are in their own shade
  shade = max(shade, 1.0 - smoothstep(0.0, 0.12, ndl));

  // Fade out at the edge of the simulated area instead of a hard cut
  float fade = 1.0 - smoothstep(u_radius * 0.8, u_radius, length(v_local));
  float alpha = shade * u_opacity * fade;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(u_color * alpha, alpha);
}`;

function compile(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const make = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`BuildingShadowLayer shader: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`BuildingShadowLayer link: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

interface LocalSolid {
  rings: [number, number][][];
  top: number;
  base: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function pointInRing(x: number, y: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Uniform grid over footprint bounding boxes for fast point-in-solid tests. */
class SolidIndex {
  private readonly cell = 40;
  private readonly grid = new Map<string, number[]>();

  constructor(private readonly solids: LocalSolid[]) {
    solids.forEach((s, i) => {
      for (let cx = Math.floor(s.minX / this.cell); cx <= Math.floor(s.maxX / this.cell); cx++) {
        for (let cy = Math.floor(s.minY / this.cell); cy <= Math.floor(s.maxY / this.cell); cy++) {
          const key = `${cx},${cy}`;
          const bucket = this.grid.get(key);
          if (bucket) bucket.push(i);
          else this.grid.set(key, [i]);
        }
      }
    });
  }

  /** Is (x, y) inside another solid spanning at least [base, top]? */
  coveredBy(x: number, y: number, base: number, top: number, self: number): boolean {
    const bucket = this.grid.get(`${Math.floor(x / this.cell)},${Math.floor(y / this.cell)}`);
    if (!bucket) return false;
    for (const i of bucket) {
      if (i === self) continue;
      const s = this.solids[i];
      if (s.top < top - 0.01 || s.base > base + 0.01) continue;
      if (x < s.minX || x > s.maxX || y < s.minY || y > s.maxY) continue;
      if (!pointInRing(x, y, s.rings[0])) continue;
      if (s.rings.slice(1).some((hole) => pointInRing(x, y, hole))) continue;
      return true;
    }
    return false;
  }
}

export class BuildingShadowLayer implements maplibregl.CustomLayerInterface {
  readonly id: string;
  readonly type = 'custom' as const;
  readonly renderingMode = '3d' as const;

  private map: maplibregl.Map | null = null;
  private gl: WebGLRenderingContext | null = null;
  private depthProgram: WebGLProgram | null = null;
  private shadeProgram: WebGLProgram | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private shadowTexture: WebGLTexture | null = null;
  private depthBuffer: WebGLRenderbuffer | null = null;
  private shadowSize = 2048;

  private buildingBuffer: WebGLBuffer | null = null;
  private groundBuffer: WebGLBuffer | null = null;
  private buildingVertexCount = 0;
  private pendingGeometry: { building: Float32Array; ground: Float32Array } | null = null;

  // Local frame: metres east / south / up of `origin` (mercator is conformal,
  // so one scale factor keeps all three axes metric near the origin).
  private origin: MercatorCoordinate | null = null;
  private metresPerUnit = 1;
  private radius = 600;
  private maxHeight = 0;

  private sunDir: [number, number, number] = [0, 0, 1];
  private sunUp = false;
  private visible = true;
  private lightMatrix: Mat4 | null = null;
  private shadowMapDirty = true;

  private opacity: number;
  private color: [number, number, number];

  constructor(options: BuildingShadowLayerOptions = {}) {
    this.id = options.id ?? 'building-sun-shadows';
    this.opacity = options.opacity ?? 0.45;
    this.color = options.color ?? [0.04, 0.07, 0.16];
  }

  /** Sun position in degrees (azimuth clockwise from north). */
  setSun(azimuthDeg: number, altitudeDeg: number): void {
    const az = azimuthDeg * Math.PI / 180;
    const alt = altitudeDeg * Math.PI / 180;
    // Local frame is x = east, y = south, z = up
    this.sunDir = [Math.sin(az) * Math.cos(alt), -Math.cos(az) * Math.cos(alt), Math.sin(alt)];
    this.sunUp = altitudeDeg > 0.5;
    this.shadowMapDirty = true;
    this.map?.triggerRepaint();
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    this.map?.triggerRepaint();
  }

  /**
   * Replace the simulated buildings. Everything within `radiusMetres` of
   * `center` receives shadows; casters outside it are still used if passed.
   */
  setCasters(casters: ShadowCaster[], center: [number, number], radiusMetres: number): void {
    this.origin = MercatorCoordinate.fromLngLat(center);
    this.metresPerUnit = 1 / this.origin.meterInMercatorCoordinateUnits();
    this.radius = radiusMetres;

    const toLocal = (lngLat: number[]): [number, number] => {
      const m = MercatorCoordinate.fromLngLat([lngLat[0], lngLat[1]]);
      return [(m.x - this.origin!.x) * this.metresPerUnit, (m.y - this.origin!.y) * this.metresPerUnit];
    };

    // Convert everything to the local frame first so walls can be tested
    // against neighbouring solids below.
    const solids: LocalSolid[] = [];
    for (const caster of casters) {
      const top = caster.height;
      const base = caster.base ?? 0;
      if (!(top > base) || caster.rings.length === 0) continue;
      const rings: [number, number][][] = [];
      for (const ring of caster.rings) {
        // Drop the closing duplicate so earcut and the wall loop see each vertex once
        const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
        const pts = (closed ? ring.slice(0, -1) : ring).map(toLocal);
        if (pts.length >= 3) rings.push(pts);
        else if (rings.length === 0) break; // degenerate outer ring
      }
      if (rings.length === 0) continue;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of rings[0]) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      solids.push({ rings, top, base, minX, minY, maxX, maxY });
    }
    const index = new SolidIndex(solids);

    const out: number[] = [];
    const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
      out.push(x, y, z, nx, ny, nz);
    };
    let maxHeight = 0;

    solids.forEach((solid, solidIndex) => {
      const { top, base } = solid;
      maxHeight = Math.max(maxHeight, top);

      const flat: number[] = [];
      const holes: number[] = [];
      solid.rings.forEach((local, ringIndex) => {
        if (ringIndex > 0) holes.push(flat.length / 2);

        let area = 0;
        for (let i = 0; i < local.length; i++) {
          const [x1, y1] = local[i];
          const [x2, y2] = local[(i + 1) % local.length];
          area += x1 * y2 - x2 * y1;
        }
        // Outward (away from solid) normal side depends on winding and on
        // whether this ring bounds the building or a courtyard inside it
        const sign = (area > 0) !== (ringIndex > 0) ? 1 : -1;

        for (let i = 0; i < local.length; i++) {
          const [ax, ay] = local[i];
          const [bx, by] = local[(i + 1) % local.length];
          const dx = bx - ax, dy = by - ay;
          const len = Math.hypot(dx, dy);
          if (len < 1e-6) continue;
          const nx = (sign * dy) / len, ny = (-sign * dx) / len;
          // A wall with another solid right outside it is interior: either a
          // tile-boundary cut (vector tiles split buildings, with overlap) or a
          // party wall against a taller neighbour. Drawing it would poke seams
          // through the facade, so skip it.
          const probeX = (ax + bx) / 2 + nx * 0.05;
          const probeY = (ay + by) / 2 + ny * 0.05;
          if (index.coveredBy(probeX, probeY, base, top, solidIndex)) continue;
          push(ax, ay, base, nx, ny, 0);
          push(bx, by, base, nx, ny, 0);
          push(bx, by, top, nx, ny, 0);
          push(ax, ay, base, nx, ny, 0);
          push(bx, by, top, nx, ny, 0);
          push(ax, ay, top, nx, ny, 0);
        }
        for (const [x, y] of local) flat.push(x, y);
      });

      if (flat.length >= 6) {
        const tris = earcut(flat, holes.length ? holes : undefined, 2);
        for (const idx of tris) push(flat[idx * 2], flat[idx * 2 + 1], top, 0, 0, 1);
      }
    });

    // Ground plane covering the simulated disc
    const r = radiusMetres;
    const ground = new Float32Array([
      -r, -r, 0, 0, 0, 1,  r, -r, 0, 0, 0, 1,  r, r, 0, 0, 0, 1,
      -r, -r, 0, 0, 0, 1,  r, r, 0, 0, 0, 1,  -r, r, 0, 0, 0, 1,
    ]);

    this.maxHeight = maxHeight;
    this.pendingGeometry = { building: new Float32Array(out), ground };
    this.shadowMapDirty = true;
    this.map?.triggerRepaint();
  }

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map;
    this.gl = gl as WebGLRenderingContext;
    this.depthProgram = compile(this.gl, DEPTH_VS, DEPTH_FS);
    this.shadeProgram = compile(this.gl, SHADE_VS, SHADE_FS);

    // 4096² gives ~0.3 m texels over the default area; phones get 2048² to
    // stay well inside mobile GPU memory.
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const isSmallScreen = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700;
    this.shadowSize = Math.min(maxTex, isSmallScreen ? 2048 : 4096);

    this.shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.shadowSize, this.shadowSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.shadowSize, this.shadowSize);

    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.buildingBuffer = gl.createBuffer();
    this.groundBuffer = gl.createBuffer();
    this.shadowMapDirty = true;
  }

  onRemove(): void {
    const gl = this.gl;
    if (gl) {
      gl.deleteProgram(this.depthProgram);
      gl.deleteProgram(this.shadeProgram);
      gl.deleteFramebuffer(this.framebuffer);
      gl.deleteTexture(this.shadowTexture);
      gl.deleteRenderbuffer(this.depthBuffer);
      gl.deleteBuffer(this.buildingBuffer);
      gl.deleteBuffer(this.groundBuffer);
    }
    this.gl = null;
    this.map = null;
  }

  private uploadPendingGeometry(gl: WebGLRenderingContext): void {
    if (!this.pendingGeometry) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buildingBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.pendingGeometry.building, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.pendingGeometry.ground, gl.STATIC_DRAW);
    this.buildingVertexCount = this.pendingGeometry.building.length / 6;
    this.pendingGeometry = null;
  }

  /** Orthographic sun camera fitted around the simulated area. */
  private computeLightMatrix(): Mat4 {
    const r = this.radius;
    const h = Math.max(this.maxHeight, 1);
    const [sx, sy, sz] = this.sunDir;
    const distance = r * 2 + h * 4;
    const up = Math.abs(sz) > 0.999 ? [0, -1, 0] : [0, 0, 1];
    const view = lookAt([sx * distance, sy * distance, sz * distance], [0, 0, 0], up);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const x of [-r, r]) for (const y of [-r, r]) for (const z of [0, h]) {
      const [vx, vy, vz] = transformPoint(view, x, y, z);
      minX = Math.min(minX, vx); maxX = Math.max(maxX, vx);
      minY = Math.min(minY, vy); maxY = Math.max(maxY, vy);
      minZ = Math.min(minZ, vz); maxZ = Math.max(maxZ, vz);
    }
    // View space looks down -z, so near/far are the negated z range
    return multiply(ortho(minX, maxX, minY, maxY, -maxZ - 1, -minZ + 1), view);
  }

  private bindAttributes(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const pos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 24, 0);
    const normal = gl.getAttribLocation(program, 'a_normal');
    gl.enableVertexAttribArray(normal);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);
  }

  prerender(glContext: WebGLRenderingContext | WebGL2RenderingContext): void {
    const gl = glContext as WebGLRenderingContext;
    if (!this.visible || !this.sunUp || !this.origin || !this.depthProgram) return;
    this.uploadPendingGeometry(gl);
    if (!this.shadowMapDirty) return;

    this.lightMatrix = this.computeLightMatrix();

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.shadowSize, this.shadowSize);
    gl.disable(gl.BLEND);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.depthRange(0, 1);
    gl.colorMask(true, true, true, true);
    gl.clearColor(1, 1, 1, 1); // "infinitely far": nothing blocks the sun
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (this.buildingVertexCount > 0) {
      gl.useProgram(this.depthProgram);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.depthProgram, 'u_light'), false, new Float32Array(this.lightMatrix));
      gl.uniform3fv(gl.getUniformLocation(this.depthProgram, 'u_sun_dir'), this.sunDir);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buildingBuffer);
      this.bindAttributes(gl, this.depthProgram);
      gl.drawArrays(gl.TRIANGLES, 0, this.buildingVertexCount);
      gl.disableVertexAttribArray(gl.getAttribLocation(this.depthProgram, 'a_pos'));
      gl.disableVertexAttribArray(gl.getAttribLocation(this.depthProgram, 'a_normal'));
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.shadowMapDirty = false;
  }

  render(glContext: WebGLRenderingContext | WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    const gl = glContext as WebGLRenderingContext;
    if (!this.visible || !this.sunUp || !this.origin || !this.shadeProgram || !this.lightMatrix) return;

    // Model: local metres -> mercator units, then MapLibre's float64 camera
    // matrix. Composing on the CPU in float64 avoids jitter at building scale.
    const s = 1 / this.metresPerUnit;
    const model = mat4();
    model[0] = s; model[5] = s; model[10] = s; model[15] = 1;
    model[12] = this.origin.x; model[13] = this.origin.y;
    const matrix = multiply(options.defaultProjectionData.mainMatrix, model);

    const program = this.shadeProgram;
    gl.useProgram(program);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_matrix'), false, new Float32Array(matrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_light'), false, new Float32Array(this.lightMatrix));
    gl.uniform3fv(gl.getUniformLocation(program, 'u_sun_dir'), this.sunDir);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), this.color);
    gl.uniform1f(gl.getUniformLocation(program, 'u_opacity'), this.opacity);
    gl.uniform1f(gl.getUniformLocation(program, 'u_radius'), this.radius);
    gl.uniform1f(gl.getUniformLocation(program, 'u_texel'), 1 / this.shadowSize);
    // One shadow-map texel in metres drives both acne guards
    const texelMetres = (this.radius * 2 + this.maxHeight) / this.shadowSize;
    gl.uniform1f(gl.getUniformLocation(program, 'u_normal_offset'), texelMetres * 1.5);
    gl.uniform1f(gl.getUniformLocation(program, 'u_bias'), 0.0005);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_shadow_map'), 0);

    // Premultiplied blending like the rest of MapLibre. Our surfaces coincide
    // with the fill-extrusions already in the depth buffer (which handle
    // occlusion), so pull them a hair towards the camera and leave depth alone.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);

    // Buildings near tile edges arrive once per tile, overlapping. Shade each
    // pixel at most once, using a fresh stencil ID exactly the way MapLibre's
    // own translucent extrusions do (internal API; skipped if it ever moves).
    const painter = (this.map as unknown as { painter?: { stencilModeFor3D?: () => { ref: number } } } | null)?.painter;
    if (painter?.stencilModeFor3D) {
      const { ref } = painter.stencilModeFor3D();
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
      gl.stencilFunc(gl.NOTEQUAL, ref, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    }
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -2);

    if (this.buildingVertexCount > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buildingBuffer);
      this.bindAttributes(gl, program);
      gl.drawArrays(gl.TRIANGLES, 0, this.buildingVertexCount);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundBuffer);
    this.bindAttributes(gl, program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0, 0);
    gl.disable(gl.STENCIL_TEST);
    gl.disableVertexAttribArray(gl.getAttribLocation(program, 'a_pos'));
    gl.disableVertexAttribArray(gl.getAttribLocation(program, 'a_normal'));
  }
}

/**
 * Collect building footprints + heights from a vector source around `center`,
 * using the same height rules as the '3d-buildings' extrusion layer.
 */
export function collectBuildingCasters(
  map: maplibregl.Map,
  sourceId: string,
  sourceLayer: string | undefined,
  center: [number, number],
  radiusMetres: number,
): ShadowCaster[] {
  let features: GeoJSON.Feature[];
  try {
    features = map.querySourceFeatures(sourceId, sourceLayer ? { sourceLayer } : undefined);
  } catch {
    return [];
  }

  const metresPerDegLat = 110540;
  const metresPerDegLng = 111320 * Math.cos(center[1] * Math.PI / 180);
  // Keep buildings whose shadow can reach the area, not just those inside it
  const reach = radiusMetres + 150;
  const seen = new Set<string>();
  const casters: ShadowCaster[] = [];

  for (const feature of features) {
    const props = feature.properties || {};
    if (props.hide_3d === true || props.hide_3d === 'true') continue;

    const renderHeight = Number(props.render_height);
    const levels = Number(props['building:levels']);
    const height = Number.isFinite(renderHeight) && renderHeight > 0
      ? renderHeight
      : Number.isFinite(levels) && levels > 0 ? levels * 3.5 : 10;
    const minHeight = Number(props.render_min_height);
    const base = Number.isFinite(minHeight) && minHeight > 0 ? minHeight : 0;

    const polygons = feature.geometry.type === 'Polygon'
      ? [(feature.geometry as GeoJSON.Polygon).coordinates]
      : feature.geometry.type === 'MultiPolygon'
        ? (feature.geometry as GeoJSON.MultiPolygon).coordinates
        : [];

    for (const rings of polygons) {
      const outer = rings[0];
      if (!outer || outer.length < 4) continue;
      const [lng, lat] = outer[0];
      const dx = (lng - center[0]) * metresPerDegLng;
      const dy = (lat - center[1]) * metresPerDegLat;
      if (dx * dx + dy * dy > reach * reach) continue;

      // Same building appears once per loaded tile (and parent tiles while zooming)
      const key = `${height}|${outer.length}|${outer[0][0].toFixed(6)},${outer[0][1].toFixed(6)}|${outer[1][0].toFixed(6)},${outer[1][1].toFixed(6)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      casters.push({ rings, height, base });
    }
  }
  return casters;
}
