/**
 * European Air Quality Index bands (EEA): 0–20 good, 20–40 fair, 40–60
 * moderate, 60–80 poor, 80–100 very poor, above 100 extremely poor.
 */

import type { SeasonAirQuality } from '../../api/airQualityApi';

export type AqiBandKey = 'good' | 'fair' | 'moderate' | 'poor' | 'veryPoor' | 'extremelyPoor';

export interface AqiBand {
  key: AqiBandKey;
  /** Upper bound (exclusive); the last band has none. */
  below: number;
  /** English fallback for the translated label. */
  label: string;
  /** Tailwind classes for the badge and its dot. */
  badge: string;
  dot: string;
}

export const AQI_BANDS: readonly AqiBand[] = [
  { key: 'good', below: 20, label: 'Good', badge: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  { key: 'fair', below: 40, label: 'Fair', badge: 'bg-green-50 text-green-800', dot: 'bg-green-400' },
  { key: 'moderate', below: 60, label: 'Moderate', badge: 'bg-amber-50 text-amber-800', dot: 'bg-amber-400' },
  { key: 'poor', below: 80, label: 'Poor', badge: 'bg-orange-50 text-orange-800', dot: 'bg-orange-500' },
  { key: 'veryPoor', below: 100, label: 'Very poor', badge: 'bg-red-50 text-red-800', dot: 'bg-red-500' },
  { key: 'extremelyPoor', below: Infinity, label: 'Extremely poor', badge: 'bg-purple-50 text-purple-800', dot: 'bg-purple-600' },
];

export const aqiBand = (aqi: number): AqiBand =>
  AQI_BANDS.find((b) => aqi < b.below) ?? AQI_BANDS[AQI_BANDS.length - 1];

/** "2026" for a summer, "2025–26" for a winter that spans two years. */
export const seasonYears = (s: Pick<SeasonAirQuality, 'start' | 'end'>): string => {
  const from = s.start.slice(0, 4);
  const to = s.end.slice(0, 4);
  return from === to ? from : `${from}–${to.slice(2)}`;
};

/** Summer first, then winter: the clean season, then the heating season. */
export const orderSeasons = (seasons: SeasonAirQuality[]): SeasonAirQuality[] =>
  [...seasons].sort((a, b) => (a.season === b.season ? 0 : a.season === 'summer' ? -1 : 1));
