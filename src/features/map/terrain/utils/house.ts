/**
 * The house shown at the best place to build: a typical one-storey house
 * (about 12 × 9 m) with a pitched roof, to show where and how a home fits.
 * Its long side runs along the slope (across the fall line), which is how a
 * house is normally sited on sloping ground; on level ground it faces south
 * for the sun. Real size, never exaggerated, so it is also a scale reference.
 *
 * `houseFootprint` / `roofHalves` draw it from above on the 2D map;
 * `houseMesh` is the 3D model.
 */
import type { BuildSpot, TerrainPoint } from '../types';
import { METERS_PER_DEG_LAT, METERS_PER_DEG_LNG } from './gridGeometry';
import { LIGHT } from './hillshade';

export const HOUSE = {
  lengthM: 12,
  widthM: 9,
  wallM: 3,
  /** Height of the roof from eaves to ridge. */
  roofM: 2.4,
  /** The roof reaches past the walls by this much. */
  overhangM: 0.5,
  /** Walls go this far below ground, so on a slope no corner hangs in the air. */
  footingM: 2.5,
} as const;

/** Height of the house from the ground to the ridge, metres. */
export const HOUSE_HEIGHT_M = HOUSE.wallM + HOUSE.roofM;
/** Arrows and labels on the map keep this far from the middle of the house, metres. */
export const HOUSE_CLEARANCE_M = 14;

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Compass bearing of the house's long side: across the fall line, or east–west on level ground. */
export function houseAxis(spot: Pick<BuildSpot, 'downhill'>): number {
  return spot.downhill === null ? 90 : (spot.downhill + 90) % 360;
}

/** East and north offsets (metres) of a point `along` the axis and `across` it (to the right of it). */
function turn(axisDeg: number, along: number, across: number): [number, number] {
  const sin = Math.sin(rad(axisDeg));
  const cos = Math.cos(rad(axisDeg));
  return [along * sin + across * cos, along * cos - across * sin];
}

/** The four corners of a lengthM × widthM rectangle centred on `center`, its long side along `axisDeg`. */
export function rectangleAround(center: TerrainPoint, axisDeg: number, lengthM: number, widthM: number): TerrainPoint[] {
  const mPerLng = METERS_PER_DEG_LNG * Math.cos(rad(center.lat));
  const corner = (a: number, b: number): TerrainPoint => {
    const [east, north] = turn(axisDeg, (a * lengthM) / 2, (b * widthM) / 2);
    return { lat: center.lat + north / METERS_PER_DEG_LAT, lng: center.lng + east / mPerLng };
  };
  return [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
}

/** The house's footprint on the ground. */
export function houseFootprint(spot: BuildSpot): TerrainPoint[] {
  return rectangleAround(spot, houseAxis(spot), HOUSE.lengthM, HOUSE.widthM);
}

const midpoint = (a: TerrainPoint, b: TerrainPoint): TerrainPoint => ({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 });

/** The two roof slopes as seen from above, split along the ridge; `lit` marks the one facing the light. */
export function roofHalves(spot: BuildSpot): Array<{ points: TerrainPoint[]; lit: boolean }> {
  const [a, b, c, d] = houseFootprint(spot);
  const ridge: [TerrainPoint, TerrainPoint] = [midpoint(a, d), midpoint(b, c)];
  // The first half lies on the left of the axis; it is lit when that side faces the light.
  const [east, north] = turn(houseAxis(spot), 0, -1);
  const leftLit = east * LIGHT.east + north * LIGHT.north > 0;
  return [
    { points: [a, b, ridge[1], ridge[0]], lit: leftLit },
    { points: [ridge[0], ridge[1], c, d], lit: !leftLit },
  ];
}

type Vec3 = [number, number, number];
type Color = [number, number, number];

const WALL: Color = [0.965, 0.965, 0.975];
const ROOF: Color = [0.27, 0.27, 0.295];
const GLASS: Color = [0.2, 0.24, 0.3];
const DOOR: Color = [0.42, 0.33, 0.27];
/** Light that reaches every face, and the extra a face turned to the light gets. */
const AMBIENT = 0.8;
const DIFFUSE = 0.24;
/** Windows and the door sit this far proud of the wall, so they don't flicker against it. */
const PROUD = 0.04;
/** The roof's thickness: its surface sits this far above the top of the walls, for the same reason. */
const ROOF_THICKNESS = 0.14;

/**
 * The house as triangles for WebGL: `x east, y north, z up` in metres from the
 * spot on the ground, already turned to the house's axis and lit (colour per
 * vertex). Six numbers per vertex: position, then colour.
 */
export function houseMesh(spot: Pick<BuildSpot, 'downhill'>): Float32Array {
  const axis = houseAxis(spot);
  const { lengthM, widthM, wallM, roofM, overhangM, footingM } = HOUSE;
  const hl = lengthM / 2;
  const hw = widthM / 2;
  const centre: Vec3 = [0, 0, wallM / 2];
  const out: number[] = [];
  /** House coordinates (along, across, up) → east, north, up. */
  const world = ([along, across, up]: Vec3): Vec3 => [...turn(axis, along, across), up];

  const face = (corners: Vec3[], color: Color) => {
    const pts = corners.map(world);
    const [p, q, r] = pts;
    const u: Vec3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const v: Vec3 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    let n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(...n) || 1;
    n = [n[0] / len, n[1] / len, n[2] / len];
    // Outward: away from the middle of the house.
    const mid = pts.reduce<Vec3>((s, t) => [s[0] + t[0] / pts.length, s[1] + t[1] / pts.length, s[2] + t[2] / pts.length], [0, 0, 0]);
    if (n[0] * (mid[0] - centre[0]) + n[1] * (mid[1] - centre[1]) + n[2] * (mid[2] - centre[2]) < 0) n = [-n[0], -n[1], -n[2]];
    const light = AMBIENT + DIFFUSE * Math.max(0, n[0] * LIGHT.east + n[1] * LIGHT.north + n[2] * LIGHT.up);
    const lit = color.map((ch) => Math.min(1, ch * light));
    // A fan from the first corner: triangles for 3 corners, quads for 4.
    for (let k = 1; k < pts.length - 1; k++) for (const t of [pts[0], pts[k], pts[k + 1]]) out.push(...t, ...lit);
  };
  /** An upright rectangle on a long wall (side −1 = downhill front, +1 = back). */
  const onLongWall = (side: number, from: number, to: number, low: number, high: number, color: Color) => {
    const y = side * (hw + PROUD);
    face([[from, y, low], [to, y, low], [to, y, high], [from, y, high]], color);
  };
  const onEndWall = (end: number, from: number, to: number, low: number, high: number, color: Color) => {
    const x = end * (hl + PROUD);
    face([[x, from, low], [x, to, low], [x, to, high], [x, from, high]], color);
  };

  // Walls, down to the footing.
  for (const side of [-1, 1]) face([[-hl, side * hw, -footingM], [hl, side * hw, -footingM], [hl, side * hw, wallM], [-hl, side * hw, wallM]], WALL);
  for (const end of [-1, 1]) {
    face([[end * hl, -hw, -footingM], [end * hl, hw, -footingM], [end * hl, hw, wallM], [end * hl, -hw, wallM]], WALL);
    face([[end * hl, -hw, wallM], [end * hl, hw, wallM], [end * hl, 0, wallM + roofM]], WALL); // gable
  }
  // Roof: two slopes meeting at the ridge, reaching past the walls.
  const pitch = roofM / hw;
  const eave = wallM - overhangM * pitch + ROOF_THICKNESS;
  const ridge = wallM + roofM + ROOF_THICKNESS;
  for (const side of [-1, 1]) {
    face([
      [-hl - overhangM, side * (hw + overhangM), eave],
      [hl + overhangM, side * (hw + overhangM), eave],
      [hl + overhangM, 0, ridge],
      [-hl - overhangM, 0, ridge],
    ], ROOF);
  }
  // Front (downhill side): a wide window, the door, a window. Back: three windows. One on each end.
  onLongWall(-1, -4.6, -1.8, 0.9, 2.3, GLASS);
  onLongWall(-1, 0.4, 1.5, 0, 2.2, DOOR);
  onLongWall(-1, 3, 4.6, 0.9, 2.3, GLASS);
  for (const x of [-3.8, 0, 3.8]) onLongWall(1, x - 0.7, x + 0.7, 1, 2.3, GLASS);
  for (const end of [-1, 1]) onEndWall(end, -0.8, 0.8, 1, 2.3, GLASS);

  return Float32Array.from(out);
}

/** Numbers per vertex in `houseMesh`: x, y, z, r, g, b. */
export const HOUSE_VERTEX_SIZE = 6;

/**
 * The matrix that places the house's metres on the map: MapLibre's projection
 * (mercator → screen) times "move to the spot, scale metres to mercator units,
 * north up". Worked out in full precision here; in the shader the mercator
 * numbers would be too close together to tell the house's corners apart.
 */
export function placeOnMap(projection: ArrayLike<number>, origin: { x: number; y: number; z: number }, metre: number): Float32Array {
  const m = projection;
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    out[row] = m[row] * metre;
    out[4 + row] = -m[4 + row] * metre; // mercator y runs south
    out[8 + row] = m[8 + row] * metre;
    out[12 + row] = m[row] * origin.x + m[4 + row] * origin.y + m[8 + row] * origin.z + m[12 + row];
  }
  return out;
}
