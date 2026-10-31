import React from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AVAILABILITY_META } from '../../../utils/availability';
import { formatArea, formatPrice } from '../../../utils/format';
import type { DashboardUnit, UnitAvailability } from '../../../types';

/** Availability chip: colour dot (from AVAILABILITY_META) + translated label. */
export const AvailabilityChip: React.FC<{ state: UnitAvailability; className?: string }> = ({ state, className }) => {
  const { t } = useTranslation('developments');
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700', className)}>
      <span className={cn('h-2 w-2 rounded-full', AVAILABILITY_META[state]?.dotClass)} aria-hidden="true" />
      {t(`availability.${state}`)}
    </span>
  );
};

/**
 * Declared availability, plus the effective one when a linked listing
 * overrides it (e.g. declared "available" but the listing is "sold").
 */
export const AvailabilityCell: React.FC<{ unit: DashboardUnit }> = ({ unit }) => {
  const { t } = useTranslation('developments');
  const effective = unit.effectiveAvailability ?? unit.availability;
  if (effective === unit.availability) return <AvailabilityChip state={unit.availability} />;
  const tip =
    unit.availabilitySource === 'listing'
      ? t('inventory.availability.fromListing', 'Buyers see this because of a linked listing’s status')
      : t('inventory.availability.fromUnit', 'Buyers see the unit’s own availability');
  return (
    <div className="flex flex-col items-start gap-1" title={tip}>
      <span className="text-[11px] text-slate-500">{t('inventory.availability.declared', 'Declared')}</span>
      <AvailabilityChip state={unit.availability} />
      <span className="text-[11px] text-slate-500">{t('inventory.availability.effective', 'Buyers see')}</span>
      <AvailabilityChip state={effective} className="border-amber-300 bg-amber-50" />
      <span className="sr-only">{tip}</span>
    </div>
  );
};

export const PriceCell: React.FC<{ unit: DashboardUnit }> = ({ unit }) => {
  const { t } = useTranslation('developments');
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="whitespace-nowrap text-slate-900">
        {unit.price !== undefined && unit.price !== null ? formatPrice(unit.price, unit.currency || 'EUR') : '—'}
      </span>
      {unit.priceVisibility === 'on_request' && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
          {t('unit.priceOnRequest', 'Price on request')}
        </span>
      )}
    </div>
  );
};

export const VisibilityChip: React.FC<{ unit: DashboardUnit }> = ({ unit }) => {
  const { t } = useTranslation('developments');
  if (unit.visibility === 'hidden') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
        <EyeOff className="h-3 w-3" aria-hidden="true" />
        {t('inventory.visibility.hidden', 'Hidden')}
      </span>
    );
  }
  return <span className="text-xs text-slate-600">{t('inventory.visibility.public', 'Public')}</span>;
};

export const ListingsCell: React.FC<{ unit: DashboardUnit }> = ({ unit }) => {
  const { t } = useTranslation('developments');
  const listings = unit.linkedListings ?? [];
  if (listings.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <ul className="space-y-0.5">
      {listings.map((l) => (
        <li key={l.id} className="max-w-[12rem] truncate text-xs text-slate-700" title={l.title}>
          {l.title || l.id}{' '}
          <span className="text-slate-500">· {t(`inventory.listingStatus.${l.status}`, l.status)}</span>
        </li>
      ))}
    </ul>
  );
};

export const areaText = (unit: DashboardUnit): string =>
  formatArea(unit.netArea ?? unit.totalArea ?? null) || '—';

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "3 days ago" in the active locale; full timestamp in the tooltip. */
export const RelativeTime: React.FC<{ iso?: string }> = ({ iso }) => {
  const { i18n } = useTranslation('developments');
  if (!iso) return <span className="text-slate-400">—</span>;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span className="text-slate-400">—</span>;
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(i18n?.language || 'en', { numeric: 'auto' });
  const match = UNITS.find(([, s]) => Math.abs(seconds) >= s);
  const label = match ? rtf.format(Math.round(seconds / match[1]), match[0]) : rtf.format(0, 'minute');
  return (
    <time dateTime={iso} title={date.toLocaleString(i18n?.language || 'en')} className="whitespace-nowrap text-xs text-slate-600">
      {label}
    </time>
  );
};
