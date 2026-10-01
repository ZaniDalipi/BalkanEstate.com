/** Shared formatting and colours for the neighbourhood prices section. */

import type { NeighbourStatus } from '../../api/areaPricesApi';

/**
 * One colour per kind of home, used by the strip, the map and the chart alike
 * so a colour means the same thing everywhere. Validated as a categorical pair
 * (CVD ΔE 24.7, both ≥ 3:1 on white); the status is also always spelled out.
 */
export const AREA_COLORS = {
  active: '#2a78d6',
  closed: '#eb6834',
  subject: '#0b0b0b',
} as const;

export const colorFor = (status: NeighbourStatus): string =>
  status === 'active' ? AREA_COLORS.active : AREA_COLORS.closed;

export const fmtEur = (n: number): string => `€${Math.round(n).toLocaleString()}`;

/** "€85k", "€1.2M" — short enough for a map pin. */
export const fmtCompactEur = (n: number): string => {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `€${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `€${Math.round(n)}`;
};

export const fmtDistance = (m: number): string =>
  m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;

export const fmtMonthYear = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

/** "2026-Q3" → "Q3 '26" */
export const fmtQuarter = (period: string): string => {
  const [year, q] = period.split('-');
  return `${q} '${year.slice(2)}`;
};
