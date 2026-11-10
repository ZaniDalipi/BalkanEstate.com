/**
 * Styles and English fallbacks for the noise and traffic cards. Pure.
 */

import type { NoiseBand, SourceKind, TrafficLevel } from '../../api/surroundingsApi';

export interface BandStyle {
  label: string;
  badge: string;
  dot: string;
}

export const NOISE_BANDS: Record<NoiseBand, BandStyle> = {
  quiet: { label: 'Quiet', badge: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  moderate: { label: 'Moderate', badge: 'bg-lime-50 text-lime-800', dot: 'bg-lime-500' },
  noisy: { label: 'Noisy', badge: 'bg-orange-50 text-orange-800', dot: 'bg-orange-500' },
  veryNoisy: { label: 'Very noisy', badge: 'bg-red-50 text-red-800', dot: 'bg-red-500' },
};

export const TRAFFIC_LEVELS: Record<TrafficLevel, BandStyle> = {
  calm: { label: 'Quiet streets', badge: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  moderate: { label: 'Moderate traffic', badge: 'bg-amber-50 text-amber-800', dot: 'bg-amber-400' },
  busy: { label: 'Busy street nearby', badge: 'bg-red-50 text-red-800', dot: 'bg-red-500' },
};

export const SOURCE_LABELS: Record<SourceKind, string> = {
  motorway: 'Motorway',
  trunk: 'Expressway',
  primary: 'Main road',
  secondary: 'Secondary road',
  tertiary: 'Local through road',
  railway: 'Railway',
  tram: 'Tram line',
  airport: 'Airport',
  nightclub: 'Nightclub',
  bar: 'Bar',
};

/** "80 m" under a kilometre, "2.4 km" above, in the reader's number format. */
export const formatDistance = (metres: number, locale: string): string => {
  if (metres < 1000) {
    const rounded = metres < 100 ? Math.round(metres / 5) * 5 : Math.round(metres / 10) * 10;
    return `${new Intl.NumberFormat(locale).format(Math.max(rounded, 5))} m`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(metres / 1000)} km`;
};
