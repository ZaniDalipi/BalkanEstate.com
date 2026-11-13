/**
 * GLSL for the morph dissolve: one full-screen pass over two textures.
 *
 * An fbm noise field gives every pixel a threshold and the progress value
 * sweeps past it, so the outgoing photo tears away in drifting tatters instead
 * of fading uniformly. The threshold is biased by the incoming photo's
 * brightness, so its lit areas burn through first.
 */

export const MORPH_VERT = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const MORPH_FRAG = `
precision highp float;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform vec2 u_resolution;
uniform float u_fromAspect;
uniform float u_toAspect;
uniform float u_fromContain;
uniform float u_toContain;
uniform float u_scale;
uniform float u_direction;
uniform float u_edge;
uniform float u_drift;

varying vec2 v_uv;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 v) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(v);
    v *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// The drift pushes UVs past the photo's edge; CLAMP_TO_EDGE would smear the
// last row into streaks. Reflecting keeps real picture there. Done here because
// MIRRORED_REPEAT is illegal on the non-power-of-two textures photos produce.
vec2 mirror(vec2 uv) {
  return 1.0 - abs(1.0 - mod(uv, 2.0));
}

vec2 coverUV(vec2 uv, float imgAspect) {
  float canvasAspect = u_resolution.x / u_resolution.y;
  vec2 scale = (canvasAspect > imgAspect)
    ? vec2(1.0, imgAspect / canvasAspect)
    : vec2(canvasAspect / imgAspect, 1.0);
  return mirror((uv - 0.5) * scale + 0.5);
}

vec2 containUV(vec2 uv, float imgAspect) {
  float canvasAspect = u_resolution.x / u_resolution.y;
  vec2 scale = (canvasAspect > imgAspect)
    ? vec2(canvasAspect / imgAspect, 1.0)
    : vec2(1.0, imgAspect / canvasAspect);
  return (uv - 0.5) * scale + 0.5;
}

// One photo in the frame. Cover crops to fill; contain shows the whole photo
// over a dimmed, blurred copy of itself, so the side bars carry the photo's
// own colours rather than a black slab.
vec4 framed(sampler2D tex, vec2 uv, float aspect, float contain) {
  vec2 cuv = coverUV(uv, aspect);
  if (contain < 0.5) return texture2D(tex, cuv);
  vec2 iuv = containUV(uv, aspect);
  if (iuv.x >= 0.0 && iuv.x <= 1.0 && iuv.y >= 0.0 && iuv.y <= 1.0) return texture2D(tex, iuv);
  // Bars: a wide golden-angle spiral of taps reads as a blur. Mipmaps would be
  // cheaper, but WebGL1 has none for non-power-of-two photos.
  vec4 sum = vec4(0.0);
  for (int k = 0; k < 12; k++) {
    float a = float(k) * 2.39996;
    float r = 0.03 + 0.12 * float(k) / 11.0;
    sum += texture2D(tex, mirror(cuv + r * vec2(cos(a), sin(a))));
  }
  return sum / 12.0 * 0.5;
}

void main() {
  // Widen the sweep by one edge at each end, so progress 0 and 1 are fully one
  // photo or the other rather than already half-dissolved.
  float adjusted = u_progress * (1.0 + 2.0 * u_edge) - u_edge;

  float noise = fbm(v_uv * u_scale + vec2(0.0, u_progress * u_direction)) * 0.5 + 0.5;
  noise = smoothstep(0.0, 2.0, length(texture2D(u_to, coverUV(v_uv, u_toAspect)).rgb) + noise);

  float mixFactor = 1.0 - smoothstep(adjusted - u_edge, adjusted + u_edge, noise);

  // Both frames slide, by different amounts and in opposite directions, so the
  // tatters have parallax against each other instead of sitting in one plane.
  vec2 fromUV = v_uv + vec2(0.0, noise * u_progress * u_drift * u_direction);
  vec2 toUV = v_uv + vec2(0.0, noise * (1.0 - u_progress) * -0.5 * u_drift * u_direction);

  gl_FragColor = mix(
    framed(u_from, fromUV, u_fromAspect, u_fromContain),
    framed(u_to, toUV, u_toAspect, u_toContain),
    mixFactor
  );
}
`;

export const MORPH_UNIFORMS = [
  'from', 'to', 'progress', 'resolution', 'fromAspect', 'toAspect',
  'fromContain', 'toContain', 'scale', 'direction', 'edge', 'drift',
] as const;

export type MorphUniform = (typeof MORPH_UNIFORMS)[number];
