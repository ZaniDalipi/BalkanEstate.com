/**
 * Relief shading: slopes facing the light (from the north-west, as on
 * printed maps) are drawn a little lighter, slopes facing away a little
 * darker, so hills read as hills. Heights are exaggerated for the lighting
 * only, so gentle ground still shows its shape. Kept soft: the colour must
 * stay readable against the legend.
 */

const LIGHT_AZIMUTH_DEG = 315;
const LIGHT_ALTITUDE_DEG = 45;
const EXAGGERATION = 4;
/** How strongly the lighting changes the colour. */
const STRENGTH = 0.7;
const MIN_FACTOR = 0.86;
const MAX_FACTOR = 1.1;

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Unit vector pointing at the light: east, north, up. */
export const LIGHT = {
  east: Math.sin(rad(LIGHT_AZIMUTH_DEG)) * Math.cos(rad(LIGHT_ALTITUDE_DEG)),
  north: Math.cos(rad(LIGHT_AZIMUTH_DEG)) * Math.cos(rad(LIGHT_ALTITUDE_DEG)),
  up: Math.sin(rad(LIGHT_ALTITUDE_DEG)),
} as const;

/**
 * Brightness factor for ground from its height gradient (metres per metre):
 * 1 on flat ground, above 1 facing the light, below 1 facing away.
 */
export function shadeFactor(gradEast: number, gradNorth: number): number {
  const ex = -gradEast * EXAGGERATION;
  const ny = -gradNorth * EXAGGERATION;
  const length = Math.hypot(ex, ny, 1);
  const lit = (ex * LIGHT.east + ny * LIGHT.north + LIGHT.up) / length;
  const factor = 1 + (lit - LIGHT.up) * STRENGTH;
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, factor));
}

/** One colour channel (0–255) darkened (factor < 1) or lightened towards white (factor > 1). */
export function shadeChannel(value: number, factor: number): number {
  return factor <= 1 ? value * factor : value + (255 - value) * (factor - 1);
}
