/**
 * Web Mercator tile maths (the XYZ scheme every web map uses). Pure.
 */

export interface TileId {
  z: number;
  x: number;
  y: number;
}

const clampLat = (lat: number) => Math.max(-85.0511, Math.min(85.0511, lat));

/** The tile containing a point at zoom `z`. */
export const tileFor = (lat: number, lng: number, z: number): TileId => {
  const n = 2 ** z;
  const rad = (clampLat(lat) * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * n);
  return { z, x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
};

/** Every tile at zoom `z` that a circle of `radiusM` around the point touches (via its bounding box). */
export const tilesCovering = (lat: number, lng: number, radiusM: number, z: number): TileId[] => {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const nw = tileFor(lat + dLat, lng - dLng, z);
  const se = tileFor(lat - dLat, lng + dLng, z);
  const tiles: TileId[] = [];
  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) tiles.push({ z, x, y });
  }
  return tiles;
};
