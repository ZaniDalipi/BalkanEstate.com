/**
 * Where the camera of the Google photorealistic 3D map starts: over the
 * middle of the plot, far enough back for the plot and its surroundings to
 * fit, low and side-on to the slope, so the fall of the land shows in
 * profile instead of being flattened by a view from above. Pure.
 */
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { metresBetween, pointsBounds } from './gridGeometry';
import { fitRadius } from './orbitCamera';

export interface GoogleCamera {
  center: { lat: number; lng: number; altitude: number };
  /** Metres from the camera to the centre. */
  range: number;
  /** Degrees from straight down. */
  tilt: number;
  /** Compass degrees the camera looks towards. */
  heading: number;
}

/** Google's 3D map draws with about this vertical field of view. */
const FOV_DEG = 35;
/** Room round the plot, so its surroundings show from the start. */
const ROOM = 1.35;
/** Closer than this the photo turns soft; further than this the plot is a speck. */
export const MIN_RANGE = 120;
export const MAX_RANGE = 25000;
/** The tilted view, low enough to see slopes in profile; the 2D/3D button goes between this and straight down. */
export const GOOGLE_TILT = 72;
/** The view opens this far round from looking uphill: side-on to the slope. */
export const SIDE_ON_DEG = 90;
/** Tilted further than this counts as tilted. */
export const TILTED_FROM_DEG = 12;

export const clampRange = (range: number): number => Math.min(MAX_RANGE, Math.max(MIN_RANGE, range));
export const normalHeading = (deg: number): number => ((deg % 360) + 360) % 360;

/** The middle of the plot's bounding box. */
export function plotCenter(polygon: TerrainPoint[]): TerrainPoint {
  const b = pointsBounds(polygon);
  return { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 };
}

/** `uphill`: compass bearing up the slope (or any bearing on level ground). */
export function startCamera(analysis: TerrainAnalysis, polygon: TerrainPoint[], uphill: number, aspect: number): GoogleCamera {
  const b = pointsBounds(polygon);
  const halfDiagonal = metresBetween({ lat: b.north, lng: b.west }, { lat: b.south, lng: b.east }) / 2;
  const { minElevation, maxElevation } = analysis.stats;
  return {
    center: { ...plotCenter(polygon), altitude: (minElevation + maxElevation) / 2 },
    range: clampRange(fitRadius(halfDiagonal * ROOM, FOV_DEG, aspect > 0 ? aspect : 1)),
    tilt: GOOGLE_TILT,
    heading: normalHeading(uphill + SIDE_ON_DEG),
  };
}
