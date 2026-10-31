import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Home, KeyRound, Tag } from 'lucide-react';
import type { UnitsSummary } from '../../types';
import { formatPrice } from '../../utils/format';

interface StatsBarProps {
  summary?: UnitsSummary;
  buildings: number;
}

const Tile: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; accent?: boolean }> = ({
  icon,
  label,
  value,
  accent,
}) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <span
      className={
        accent
          ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-sm'
          : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'
      }
    >
      {icon}
    </span>
    <div className="min-w-0">
      <div className="truncate text-xl font-extrabold leading-tight tracking-tight text-slate-900">{value}</div>
      <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  </div>
);

/**
 * A floating glass KPI strip summarising the development. Meant to overlap the
 * hero's lower edge, giving the page a premium, layered feel.
 */
export const StatsBar: React.FC<StatsBarProps> = ({ summary, buildings }) => {
  const { t } = useTranslation('developments');
  const priceRange =
    summary?.priceMin != null
      ? summary.priceMin === summary.priceMax
        ? formatPrice(summary.priceMin, summary.currency)
        : `${formatPrice(summary.priceMin, summary.currency)}+`
      : summary && summary.total > 0
        ? t('unit.priceOnRequest', 'Price on request')
        : '—';

  return (
    <div className="grid grid-cols-2 divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)] sm:grid-cols-4 sm:divide-x">
      <Tile icon={<Building2 className="h-5 w-5" aria-hidden="true" />} label={t('detail.buildings', 'Buildings')} value={buildings} />
      <Tile icon={<Home className="h-5 w-5" aria-hidden="true" />} label={t('detail.units', 'Units')} value={summary?.total ?? 0} />
      <Tile
        icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}
        label={t('availability.available', 'Available')}
        value={summary?.available ?? 0}
        accent
      />
      <Tile icon={<Tag className="h-5 w-5" aria-hidden="true" />} label={t('units.from', 'From')} value={priceRange} />
    </div>
  );
};
