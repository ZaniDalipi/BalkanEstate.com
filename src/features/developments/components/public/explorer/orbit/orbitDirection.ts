/** Which way the camera swings round the building: 1 next (clockwise), -1 back, 0 no orbit (a plain fade). */
export type OrbitDir = -1 | 0 | 1;

/**
 * The short way round a ring of `count` camera views from `from` to `to`
 * (a tie, e.g. two views apart of four, goes forward). 0 when they are the
 * same view or either is unknown.
 */
export function orbitDirection(from: number, to: number, count: number): OrbitDir {
  if (count < 2 || from < 0 || to < 0 || from === to) return 0;
  const ahead = (((to - from) % count) + count) % count;
  return ahead <= count / 2 ? 1 : -1;
}
