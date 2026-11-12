/**
 * The one colour scale of the terrain tool: slope in percent → colour, running
 * smoothly from green (flat) through yellow and orange to deep red (very
 * steep). The map is painted from it pixel by pixel; the legend, the labels
 * and the 3D view take their colours from it too, so they always agree.
 */

export type Rgb = [number, number, number];

/** [slope %, colour] — the colours the scale passes through. */
const STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#22b573'],
  [3, '#7bcf52'],
  [8, '#f7d33c'],
  [15, '#fb9a34'],
  [25, '#f25f3a'],
  [40, '#d63a3d'],
  [60, '#a3243f'],
];

/** Slopes past this all get the last colour. */
export const RAMP_MAX_SLOPE = STOPS[STOPS.length - 1][0];

const parseHex = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const STOP_RGB = STOPS.map(([pct, hex]) => [pct, parseHex(hex)] as const);

/** Colour for a slope, blended between the two nearest stops. */
export function rampColor(slopePct: number): Rgb {
  const s = Math.min(RAMP_MAX_SLOPE, Math.max(0, Number.isFinite(slopePct) ? slopePct : 0));
  let k = 1;
  while (k < STOP_RGB.length - 1 && s > STOP_RGB[k][0]) k++;
  const [p0, c0] = STOP_RGB[k - 1];
  const [p1, c1] = STOP_RGB[k];
  const t = (s - p0) / (p1 - p0);
  return [0, 1, 2].map((i) => Math.round(c0[i] + (c1[i] - c0[i]) * t)) as Rgb;
}

export const rgbToHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** `#rrggbb` for a slope. */
export const rampHex = (slopePct: number): string => rgbToHex(rampColor(slopePct));

/** Entries per percent in the lookup table. */
const LUT_STEPS = 10;

/** The scale as a flat table (r, g, b per 0.1 %), for painting millions of pixels. */
export function rampLookup(): Uint8Array {
  const n = RAMP_MAX_SLOPE * LUT_STEPS + 1;
  const lut = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) lut.set(rampColor(i / LUT_STEPS), i * 3);
  return lut;
}

/** Index of a slope's entry in the lookup table (multiply by 3 for the offset). */
export const rampIndex = (slopePct: number): number =>
  Math.min(RAMP_MAX_SLOPE * LUT_STEPS, Math.max(0, Math.round(slopePct * LUT_STEPS)));

/** Slopes marked along the legend bar, evenly spaced. */
export const LEGEND_TICKS = [0, 3, 8, 15, 25, 40] as const;

/** The scale as a CSS gradient with the legend ticks evenly spaced along it. */
export function rampGradientCss(): string {
  const last = LEGEND_TICKS.length - 1;
  const stops = LEGEND_TICKS.map((pct, i) => `${rampHex(pct)} ${((i / last) * 100).toFixed(0)}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
