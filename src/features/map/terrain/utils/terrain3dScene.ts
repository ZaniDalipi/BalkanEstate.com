/**
 * Shared settings for the 3D model of the plot: where the satellite photo
 * comes from, how far heights can be stretched, which way the view opens,
 * and the easing its moves use. Pure.
 */
import type { TerrainAnalysis, TerrainStats } from '../types';
import { patchDownhill } from './buildSpot';

/** The satellite imagery the business map already uses. */
export const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
/**
 * Esri has no photos past this zoom in much of the rural Balkans and answers
 * with a "Map data not yet available" picture instead (a valid image, so
 * nothing would notice). Zoom 17 exists almost everywhere.
 */
export const SATELLITE_MAX_ZOOM = 17;

/** The haze the surroundings fade into at their edges (the picture, the fog and the backdrop share it). */
export const HAZE = '#e6ebf1';

export const EXAGGERATIONS = [1, 2, 3, 5] as const;
export type Exaggeration = (typeof EXAGGERATIONS)[number];

/** The view opens looking this way when the land is level. */
export const START_BEARING = -25;

/**
 * Which way the view first looks: uphill, from the low side, when the area
 * slopes — so the slope faces the viewer. Level areas get the default.
 */
export function openingBearing(analysis: TerrainAnalysis): number {
  const cells: number[] = [];
  analysis.inside.forEach((v, i) => { if (v && !Number.isNaN(analysis.field.slope[i])) cells.push(i); });
  const downhill = cells.length ? patchDownhill(cells, analysis.field) : null;
  return downhill === null ? START_BEARING : (downhill + 180) % 360;
}

/**
 * Stretch the land so its shape shows on the model: a lot on nearly level
 * plots, not at all on hills. Relief is the height range against the width.
 */
export function defaultExaggeration(stats: TerrainStats): Exaggeration {
  const widthM = Math.sqrt(Math.max(stats.areaM2, 1));
  const relief = (stats.maxElevation - stats.minElevation) / widthM;
  if (relief < 0.03) return 5;
  if (relief < 0.06) return 3;
  if (relief < 0.15) return 2;
  return 1;
}

/** Ease in and out (0–1 → 0–1), for camera moves and height changes. */
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
