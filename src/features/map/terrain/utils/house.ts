/**
 * The house shown at the best place to build: a typical one-storey house
 * (about 12 × 9 m) with a pitched roof, to show where and how a home fits.
 * Its long side runs along the slope (across the fall line), which is how a
 * house is normally sited on sloping ground; on level ground it faces south
 * for the sun. Real size, never exaggerated, so it is also a scale reference.
 *
 * `houseFootprint` / `roofHalves` draw it from above on the 2D map;
 * houseModel3d builds it for the 3D model.
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
