import { orbitDirection, type OrbitDir } from './orbitDirection';

/**
 * How the explorer moves from one picture to the next:
 *  - `orbit`: another camera view of the same building (1 next, -1 previous);
 *  - `lift`: another floor of the same building, like an elevator (1 up, -1 down);
 *  - `zoom`: from the building into one of its floors (1), or back out (-1);
 *  - `fade`: anything else (the residence, another building).
 */
export type SceneMove = { kind: 'orbit' | 'lift' | 'zoom'; dir: 1 | -1 } | { kind: 'fade' };

/** Where the explorer is: the target's crumb keys (`residence/b:…/f:…`), the floor's level, and the camera view. */
export interface SceneSpot {
  targetKey: string;
  /** The floor's level when the target is a floor. */
  level?: number;
  index: number;
  count: number;
}

const part = (key: string, kind: 'b' | 'f') => key.split('/').find((p) => p.startsWith(`${kind}:`));
const sign = (n: number): 1 | -1 => (n < 0 ? -1 : 1);

export const FADE: SceneMove = { kind: 'fade' };

/** The move from `prev` to `next`; `asked` is the way the buyer pressed for a camera view (← / →). */
export function sceneMove(prev: SceneSpot, next: SceneSpot, asked?: OrbitDir): SceneMove {
  if (prev.targetKey === next.targetKey) {
    const way = asked || orbitDirection(prev.index, next.index, next.count);
    return way ? { kind: 'orbit', dir: way } : FADE;
  }
  const building = part(next.targetKey, 'b');
  if (!building || building !== part(prev.targetKey, 'b')) return FADE;
  const from = part(prev.targetKey, 'f');
  const to = part(next.targetKey, 'f');
  if (from && to) {
    if (prev.level === undefined || next.level === undefined || prev.level === next.level) return FADE;
    return { kind: 'lift', dir: sign(next.level - prev.level) };
  }
  if (!from && to) return { kind: 'zoom', dir: 1 };
  if (from && !to) return { kind: 'zoom', dir: -1 };
  return FADE;
}
