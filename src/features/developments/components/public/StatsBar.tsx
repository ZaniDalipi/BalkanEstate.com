import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Home, KeyRound, Tag } from 'lucide-react';
import type { UnitsSummary } from '../../types';
import { formatPrice } from '../../utils/format';

interface StatsBarProps {
  summary?: UnitsSummary;
  buildings: number;
}

const Tile: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      {icon}
    </span>
    <div className="min-w-0">
      <div className="truncate text-lg font-bold leading-tight text-foreground">{value}</div>
      <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  </div>
);

/** An icon KPI row summarising the development for buyers. */
export const StatsBar: React.FC<StatsBarProps> = ({ summary, buildings }) => {
  const { t } = useTranslation('developments');
  const priceRange =
    summary?.priceMin != null
      ? summary.priceMin === summary.priceMax
        ? formatPrice(summary.priceMin, summary.currency)
        : `${formatPrice(summary.priceMin, summary.currency)}+`
      : '—';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile icon={<Building2 className="h-5 w-5" aria-hidden="true" />} label={t('detail.buildings')} value={buildings} />
      <Tile icon={<Home className="h-5 w-5" aria-hidden="true" />} label={t('detail.units')} value={summary?.total ?? 0} />
      <Tile
        icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}
        label={t('availability.available')}
        value={summary?.available ?? 0}
      />
      <Tile icon={<Tag className="h-5 w-5" aria-hidden="true" />} label={t('units.from')} value={priceRange} />
    </div>
  );
};
