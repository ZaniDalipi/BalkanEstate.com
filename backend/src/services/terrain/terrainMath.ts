/**
 * Web-Mercator tile maths for the elevation tiles. Pure functions only.
 *
 * Elevation comes from "Terrain Tiles" (AWS Open Data, Terrarium encoding):
 * 256 px PNG tiles in the usual z/x/y layout, where each pixel's colour holds a
 * height in metres. In the Balkans the source survey is ~30 m (SRTM / EU-DEM),
 * so tiles finer than zoom 14 add nothing but download size.
 */

export const TILE_SIZE = 256;
export const MIN_TILE_ZOOM = 8;
export const MAX_TILE_ZOOM = 14;
/** Ground distance between survey points in the source data, in metres. */
export const SOURCE_RESOLUTION_M = 30;

const EARTH_CIRCUMFERENCE_M = 40075016.686;
/** Metres per degree of latitude (close enough at any latitude for cell sizing). */
export const METERS_PER_DEG_LAT = 110574;
/** Metres per degree of longitude at the equator. */
export const METERS_PER_DEG_LNG = 111320;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Global pixel column of a longitude at a zoom (pixel edges, not centres). */
export function lngToPixelX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

/** Global pixel row of a latitude at a zoom (pixel edges, not centres). */
export function latToPixelY(lat: number, zoom: number): number {
  const sin = Math.sin(toRad(lat));
  const y = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  return y * TILE_SIZE * 2 ** zoom;
}

/** Ground size of one tile pixel at this latitude and zoom, in metres. */
export function pixelMeters(lat: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos(toRad(lat))) / (TILE_SIZE * 2 ** zoom);
}

/**
 * The coarsest zoom whose pixels are at most half a grid cell, so every cell
 * is interpolated from real neighbours — capped where the source data stops
 * getting sharper.
 */
export function chooseTileZoom(cellSizeM: number, lat: number): number {
  for (let z = MIN_TILE_ZOOM; z <= MAX_TILE_ZOOM; z++) {
    if (pixelMeters(lat, z) <= cellSizeM / 2) return z;
  }
  return MAX_TILE_ZOOM;
}

/** Terrarium: height = R·256 + G + B/256 − 32768 metres. */
export function decodeTerrarium(rgb: Uint8Array, channels: number): Float32Array {
  const out = new Float32Array(Math.floor(rgb.length / channels));
  for (let i = 0, p = 0; p < out.length; i += channels, p++) {
    out[p] = rgb[i] * 256 + rgb[i + 1] + rgb[i + 2] / 256 - 32768;
  }
  return out;
}

/** The tile URL for a template with {z}/{x}/{y} placeholders. */
export function tileUrl(template: string, z: number, x: number, y: number): string {
  return template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}
