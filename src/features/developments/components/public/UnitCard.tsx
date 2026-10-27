import React from 'react';
import { useTranslation } from 'react-i18next';
import { BedDouble, Bath, Maximize, Compass, ArrowUpRight } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../types';
import { AvailabilityBadge } from '../shared/Badges';
import { CompanionNote } from './explorer/CompanionNote';
import { formatPrice, formatArea } from '../../utils/format';
import { unitArea } from '../../utils/unitFilters';
import { isPursuable } from '../../utils/availability';

interface UnitCardProps {
  unit: PublicUnit;
  slug: string;
  /** Open the unit in place (details drawer); defaults to the unit page. */
  onOpen?: (unitId: string) => void;
  /** Units sold together with it (its parking spot / storage room, or its apartment). */
  companions?: { comesWith: PublicUnit[]; soldWith: PublicUnit[] };
}

const Spec: React.FC<{ icon: React.ReactNode; value: React.ReactNode }> = ({ icon, value }) => (
  <span className="inline-flex items-center gap-1 text-sm text-slate-600">
    {icon}
    {value}
  </span>
);

/**
 * Buyer-facing unit card: number, floor, key specs, price and EFFECTIVE
 * availability. Area is unitArea() — the same field the area filter uses.
 * Units that can no longer be pursued are dimmed so the grid reads at a glance.
 */
export const UnitCard: React.FC<UnitCardProps> = ({ unit, slug, onOpen, companions }) => {
  const { t } = useTranslation('developments');
  const area = unitArea(unit);
  const price = !unit.priceOnRequest && unit.price ? unit.price : undefined;
  const open = () => (onOpen ? onOpen(unit.id) : navigate(paths.developmentUnit(slug, unit.id)));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        !isPursuable(unit.availability) && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {t('unit.number', 'Unit number')} {unit.unitNumber}
          </h3>
          <p className="text-xs text-slate-500">
            {[unit.buildingName, unit.floorLabel, unit.unitType].filter(Boolean).join(' · ')}
          </p>
        </div>
        <AvailabilityBadge state={unit.availability} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {typeof unit.beds === 'number' && <Spec icon={<BedDouble className="h-4 w-4" aria-hidden="true" />} value={unit.beds} />}
        {typeof unit.baths === 'number' && <Spec icon={<Bath className="h-4 w-4" aria-hidden="true" />} value={unit.baths} />}
        {area ? <Spec icon={<Maximize className="h-4 w-4" aria-hidden="true" />} value={formatArea(area)} /> : null}
        {unit.orientation && <Spec icon={<Compass className="h-4 w-4" aria-hidden="true" />} value={unit.orientation} />}
      </div>

      {companions && <CompanionNote {...companions} />}

      <div className="mt-auto flex items-end justify-between gap-2 pt-1">
        <div>
          {price ? (
            <p className="text-lg font-bold text-slate-900">{formatPrice(price, unit.currency)}</p>
          ) : (
            <p className="text-sm text-slate-500">{t('unit.priceOnRequest', 'Price on request')}</p>
          )}
          {price && area ? (
            <p className="text-xs text-slate-500">{formatPrice(unit.pricePerSqm ?? Math.round(price / area), unit.currency)}/m²</p>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {t('unit.viewDetails', 'View details')}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
};
