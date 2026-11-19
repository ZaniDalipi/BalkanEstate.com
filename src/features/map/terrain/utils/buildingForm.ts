/**
 * What shape a building is drawn as. Most buildings round a Balkan plot are
 * houses: near-rectangular outlines under a hipped tile roof. Those are
 * squared to their best-fitting rectangle and given one; anything large,
 * tall or irregular keeps its outline under a flat roof. Pure, in the
 * model's ground plane (x east, z south).
 */
export interface XZ { x: number; z: number }

/** The smallest rectangle round a set of points, turned to fit. */
export interface OrientedBox {
  cx: number;
  cz: number;
  /** Unit vector along the long side. */
  ux: number;
  uz: number;
  /** Half the long and the short side. */
  halfL: number;
  halfW: number;
}

export type BuildingForm =
  | { kind: 'hipped'; box: OrientedBox; wallM: number; riseM: number }
  | { kind: 'flat'; wallM: number };

/** Roof pitch of a typical tiled house. */
const PITCH = Math.tan((28 * Math.PI) / 180);
const MAX_RISE_M = 4.5;
/** The outline must fill this much of its rectangle to be squared to it. */
const MIN_FILL = 0.8;
/** Bigger or taller than these: blocks of flats, halls, shops: flat roofs. */
const MAX_HOUSE_AREA_M2 = 700;
const MAX_HOUSE_HEIGHT_M = 16;
const MIN_SIDE_M = 3.5;
/** Walls are never lower than a storey. */
const MIN_WALL_M = 2.6;

export function polygonArea(pts: XZ[]): number {
  let s = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    s += p.x * q.z - q.x * p.z;
  });
  return Math.abs(s) / 2;
}

/** The tightest rectangle lined up with one of the outline's own edges (exact for convex outlines). */
export function orientedBox(pts: XZ[]): OrientedBox {
  let best: OrientedBox | null = null;
  let bestArea = Infinity;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    if (len === 0) return;
    const ux = (q.x - p.x) / len;
    const uz = (q.z - p.z) / len;
    let minA = Infinity; let maxA = -Infinity; let minB = Infinity; let maxB = -Infinity;
    for (const r of pts) {
      const a = r.x * ux + r.z * uz;
      const b = -r.x * uz + r.z * ux;
      minA = Math.min(minA, a); maxA = Math.max(maxA, a);
      minB = Math.min(minB, b); maxB = Math.max(maxB, b);
    }
    const area = (maxA - minA) * (maxB - minB);
    if (area >= bestArea) return;
    bestArea = area;
    const ca = (minA + maxA) / 2;
    const cb = (minB + maxB) / 2;
    const cx = ca * ux - cb * uz;
    const cz = ca * uz + cb * ux;
    const along = (maxA - minA) / 2;
    const across = (maxB - minB) / 2;
    best = along >= across
      ? { cx, cz, ux, uz, halfL: along, halfW: across }
      : { cx, cz, ux: -uz, uz: ux, halfL: across, halfW: along };
  });
  return best ?? { cx: pts[0]?.x ?? 0, cz: pts[0]?.z ?? 0, ux: 1, uz: 0, halfL: 0, halfW: 0 };
}

/** The corners of a box, going round. */
export function boxCorners(b: OrientedBox, grow = 0): XZ[] {
  const vx = -b.uz;
  const vz = b.ux;
  const l = b.halfL + grow;
  const w = b.halfW + grow;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sl, sw]) => ({
    x: b.cx + sl * l * b.ux + sw * w * vx,
    z: b.cz + sl * l * b.uz + sw * w * vz,
  }));
}

/**
 * The form for an outline (in model units, `scale` units per metre) whose
 * roof stands `heightM` above the ground: for a house the height is to the
 * ridge, the walls stop below it.
 */
export function buildingForm(pts: XZ[], heightM: number, scale: number): BuildingForm {
  const box = orientedBox(pts);
  const boxArea = 4 * box.halfL * box.halfW;
  const fill = boxArea > 0 ? polygonArea(pts) / boxArea : 0;
  const areaM2 = boxArea / (scale * scale);
  const shortM = (2 * box.halfW) / scale;
  if (fill < MIN_FILL || areaM2 > MAX_HOUSE_AREA_M2 || heightM > MAX_HOUSE_HEIGHT_M || shortM < MIN_SIDE_M) {
    return { kind: 'flat', wallM: Math.max(MIN_WALL_M, heightM) };
  }
  const riseM = Math.min(MAX_RISE_M, (shortM / 2) * PITCH, Math.max(0.8, heightM - MIN_WALL_M));
  return { kind: 'hipped', box, wallM: Math.max(MIN_WALL_M, heightM - riseM), riseM };
}
