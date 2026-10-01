/**
 * AreaPriceSummary — this home's value against the neighbourhood median, and
 * four tiles: typical asking and closed values, and how many homes are on the
 * market and have sold or been let nearby.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AreaPricesResponse } from '../../api/areaPricesApi';
import { AREA_COLORS } from './format';
import type { AreaFormat } from './useAreaFormat';

export interface AreaPriceSummaryProps {
  stats: AreaPricesResponse['stats'];
  subjectValue: number | null;
  format: AreaFormat;
}

/** Within this many percent of the median reads as "in line". */
const IN_LINE_PCT = 3;

const AreaPriceSummary: React.FC<AreaPriceSummaryProps> = ({ stats, subjectValue, format }) => {
  const { t } = useTranslation(['property']);
  const { labels } = format;
  const pct = stats.subjectVsMedianPct;
  const dash = '—';

  return (
    <>
      {subjectValue !== null && pct !== null && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
          <p className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">{format.value(subjectValue)}</p>
          <ComparisonPill pct={pct} label={
            Math.abs(pct) < IN_LINE_PCT
              ? t('property:areaPrices.inLine', 'In line with the neighbourhood')
              : pct < 0
                ? t('property:areaPrices.below', '{{pct}}% below the neighbourhood median', { pct: Math.abs(pct) })
                : t('property:areaPrices.above', '{{pct}}% above the neighbourhood median', { pct })
          } />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <Tile label={labels.medianAsking} value={stats.medianAskingValue !== null ? format.value(stats.medianAskingValue) : dash} swatch={AREA_COLORS.active} />
        <Tile label={labels.medianClosed} value={stats.medianClosedValue !== null ? format.value(stats.medianClosedValue) : dash} swatch={AREA_COLORS.closed} />
        <Tile
          label={labels.activeNearby}
          value={String(stats.activeCount)}
          sub={stats.medianAskingPrice !== null
            ? t('property:areaPrices.typically', 'typically {{price}}', { price: format.price(stats.medianAskingPrice) })
            : undefined}
        />
        <Tile label={labels.closedNearby} value={String(stats.closedCount)} />
      </div>
    </>
  );
};

/** Neutral when in line; below the median reads as good value, above as a premium. */
export const ComparisonPill: React.FC<{ pct: number; label: string }> = ({ pct, label }) => {
  const inLine = Math.abs(pct) < IN_LINE_PCT;
  const tone = inLine ? 'bg-neutral-100 text-neutral-700' : pct < 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800';
  return (
    <p className={`inline-flex items-center gap-1 text-sm font-semibold rounded-full px-3 py-1 ${tone}`}>
      <span aria-hidden="true">{inLine ? '≈' : pct < 0 ? '↓' : '↑'}</span>
      {label}
    </p>
  );
};

export const Tile: React.FC<{ label: string; value: string; sub?: string; swatch?: string }> = ({ label, value, sub, swatch }) => (
  <div className="bg-white rounded-xl border border-neutral-100 px-3 py-3 sm:px-4">
    <p className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-0.5">
      {swatch && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: swatch }} />}
      {label}
    </p>
    <p className="text-sm sm:text-base font-black text-neutral-900">{value}</p>
    {sub && <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5">{sub}</p>}
  </div>
);

export default AreaPriceSummary;
