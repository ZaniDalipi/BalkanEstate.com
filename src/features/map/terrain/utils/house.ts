/**
 * The house drawn at the best place to build: a typical one-storey Balkan
 * house (about 12 × 9 m) to show where and how a home fits. Its long side
 * runs along the slope (across the fall line), which is how a house is
 * normally sited on sloping ground; on level ground it faces south for the
 * sun. Real size, never exaggerated, so it is also a scale reference.
 */
import type { BuildSpot, TerrainPoint } from '../types';
import { METERS_PER_DEG_LAT, METERS_PER_DEG_LNG } from './gridGeometry';

export const HOUSE = {
  lengthM: 12,
  widthM: 9,
  wallM: 3.2,
  roofM: 2.8,
  /** Roof eaves reach past the walls by this much. */
  overhangM: 0.5,
  wallColor: '#f3ede3',
  roofColor: '#b4532a',
} as const;

/** Steps the pitched roof is built from (MapLibre extrusions are flat-topped). */
const ROOF_STEPS = 7;

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Compass bearing of the house's long side: across the fall line, or east–west on level ground. */
export function houseAxis(spot: Pick<BuildSpot, 'downhill'>): number {
  return spot.downhill === null ? 90 : (spot.downhill + 90) % 360;
}

/** The four corners of a lengthM × widthM rectangle centred on `center`, its long side along `axisDeg`. */
export function rectangleAround(center: TerrainPoint, axisDeg: number, lengthM: number, widthM: number): TerrainPoint[] {
  const ue = Math.sin(rad(axisDeg));
  const un = Math.cos(rad(axisDeg));
  // Perpendicular, a quarter turn clockwise.
  const ve = un;
  const vn = -ue;
  const mPerLng = METERS_PER_DEG_LNG * Math.cos(rad(center.lat));
  const corner = (a: number, b: number): TerrainPoint => {
    const east = (a * ue * lengthM + b * ve * widthM) / 2;
    const north = (a * un * lengthM + b * vn * widthM) / 2;
    return { lat: center.lat + north / METERS_PER_DEG_LAT, lng: center.lng + east / mPerLng };
  };
  return [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
}

/** The house's footprint on the ground. */
export function houseFootprint(spot: BuildSpot): TerrainPoint[] {
  return rectangleAround(spot, houseAxis(spot), HOUSE.lengthM, HOUSE.widthM);
}

/** Total height of the house to the ridge, metres. */
export const HOUSE_HEIGHT_M = HOUSE.wallM + HOUSE.roofM;

const ring = (pts: TerrainPoint[]): number[][] => {
  const coords = pts.map((p) => [p.lng, p.lat]);
  return [...coords, coords[0]];
};

/**
 * The house as extrusions for MapLibre: walls, then a gable roof built from
 * thin slabs narrowing towards the ridge. `base` and `height` are metres above
 * the ground the house stands on.
 */
export function houseFeatures(spot: BuildSpot): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const axis = houseAxis(spot);
  const walls: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: { base: 0, height: HOUSE.wallM, color: HOUSE.wallColor },
    geometry: { type: 'Polygon', coordinates: [ring(rectangleAround(spot, axis, HOUSE.lengthM, HOUSE.widthM))] },
  };
  const roofLength = HOUSE.lengthM + 2 * HOUSE.overhangM;
  const roofWidth = HOUSE.widthM + 2 * HOUSE.overhangM;
  const step = HOUSE.roofM / ROOF_STEPS;
  const roof = Array.from({ length: ROOF_STEPS }, (_, k): GeoJSON.Feature<GeoJSON.Polygon> => ({
    type: 'Feature',
    properties: { base: HOUSE.wallM + k * step, height: HOUSE.wallM + (k + 1) * step, color: HOUSE.roofColor },
    geometry: {
      type: 'Polygon',
      coordinates: [ring(rectangleAround(spot, axis, roofLength, roofWidth * (1 - k / ROOF_STEPS)))],
    },
  }));
  return { type: 'FeatureCollection', features: [walls, ...roof] };
}
