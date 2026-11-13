/**
 * Pure helpers for the morph gallery: index wrapping, easing, and which photos
 * deserve a GPU texture right now. No WebGL and no React, so all of it is
 * unit-tested directly.
 */

/** Wrap past the ends when looping, clamp at them when not. */
export const wrapIndex = (i: number, n: number, loop: boolean): number => {
  if (n <= 0) return 0;
  return loop ? ((i % n) + n) % n : Math.min(Math.max(i, 0), n - 1);
};

/** Quintic in-out: the dissolve starts and ends still, and hurries the middle. */
export const easeInOutQuint = (t: number): number => {
  const x = Math.min(Math.max(t, 0), 1);
  return x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2;
};

/**
 * `object-fit: cover` as a UV scale about the centre. Both factors are <= 1:
 * the sampled window shrinks, so the image crops rather than stretches.
 */
export const coverScale = (canvasAspect: number, imgAspect: number): [number, number] =>
  canvasAspect > imgAspect ? [1, imgAspect / canvasAspect] : [canvasAspect / imgAspect, 1];

/**
 * `object-fit: contain` as a UV scale about the centre. Both factors are >= 1:
 * the sampled window grows past the photo, and what falls outside is the bars.
 */
export const containScale = (canvasAspect: number, imgAspect: number): [number, number] =>
  canvasAspect > imgAspect ? [canvasAspect / imgAspect, 1] : [1, imgAspect / canvasAspect];

/**
 * Signed steps from `from` to `to`. Looping takes the short way round, so going
 * from the last photo to the first counts as one step forward.
 */
export const stepsBetween = (from: number, to: number, n: number, loop: boolean): number => {
  if (n <= 1) return 0;
  let delta = to - from;
  if (loop) {
    if (delta > n / 2) delta -= n;
    if (delta < -n / 2) delta += n;
  }
  return delta;
};

/** +1 drifts forward, -1 back. A wrap from last to first drifts forward. */
export const driftDirection = (from: number, to: number, n: number, loop: boolean): 1 | -1 =>
  stepsBetween(from, to, n, loop) >= 0 ? 1 : -1;

/**
 * Photos that should hold a texture: the visible one and `radius` either side.
 *
 * Uploading every photo of a 40-photo listing at once costs hundreds of MB of
 * GPU memory, which is how a phone loses its WebGL context. A short window
 * covers an arrow tap, a swipe and the auto-advance; the rest load on the way.
 * Nearest first, so the photo about to be shown is fetched before the far ones.
 */
export const textureWindow = (active: number, n: number, loop: boolean, radius: number): number[] => {
  if (n <= 0) return [];
  const out: number[] = [wrapIndex(active, n, loop)];
  for (let d = 1; d <= radius; d += 1) {
    for (const i of [active + d, active - d]) {
      if (!loop && (i < 0 || i >= n)) continue;
      const w = wrapIndex(i, n, loop);
      if (!out.includes(w)) out.push(w);
    }
  }
  return out;
};
