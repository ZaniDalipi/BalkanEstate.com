import React from 'react';
import { useTranslation } from 'react-i18next';
import type { UnitsSummary } from '../../types';
import { formatPrice } from '../../utils/format';

interface StatsBarProps {
  summary?: UnitsSummary;
  buildings: number;
}

const Tile: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col rounded-2xl border border-border bg-card px-4 py-3">
    <span className="text-xl font-bold text-foreground">{value}</span>
    <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
  </div>
);

/** A compact KPI row summarising the development for buyers. */
export const StatsBar: React.FC<StatsBarProps> = ({ summary, buildings }) => {
  const { t } = useTranslation('developments');
  const priceRange =
    summary?.priceMin != null
      ? summary.priceMin === summary.priceMax
        ? formatPrice(summary.priceMin, summary.currency)
        : `${formatPrice(summary.priceMin, summary.currency)}+`
      : '—';

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label={t('detail.buildings')} value={buildings} />
      <Tile label={t('detail.units')} value={summary?.total ?? 0} />
      <Tile label={t('availability.available')} value={summary?.available ?? 0} />
      <Tile label={t('units.from')} value={priceRange} />
    </div>
  );
};
