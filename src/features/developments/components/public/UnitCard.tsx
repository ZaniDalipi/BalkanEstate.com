import React from 'react';
import { useTranslation } from 'react-i18next';
import { BedDouble, Bath, Maximize, Compass, ArrowUpRight } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../types';
import { AvailabilityBadge } from '../shared/Badges';
import { formatPrice, formatArea } from '../../utils/format';

interface UnitCardProps {
  unit: PublicUnit;
  slug: string;
}

const Spec: React.FC<{ icon: React.ReactNode; value: React.ReactNode }> = ({ icon, value }) => (
  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
    {icon}
    {value}
  </span>
);

/**
 * Buyer-facing unit card: the apartment's number, floor, key specs, price and
 * availability, with a direct link to the marketing listing when one is
 * attached. A sold/rented unit is dimmed so the grid reads at a glance.
 */
export const UnitCard: React.FC<UnitCardProps> = ({ unit, slug }) => {
  const { t } = useTranslation('developments');
  const area = unit.netArea ?? unit.totalArea ?? unit.grossArea;
  const sold = unit.availability === 'sold' || unit.availability === 'rented';
  const open = () => navigate(paths.developmentUnit(slug, unit.id));

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
        'flex cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        sold && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t('unit.number')} {unit.unitNumber}
          </h3>
          <p className="text-xs text-muted-foreground">
            {[unit.buildingName, unit.floorLabel, unit.unitType].filter(Boolean).join(' · ')}
          </p>
        </div>
        <AvailabilityBadge state={unit.availability} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {typeof unit.beds === 'number' && (
          <Spec icon={<BedDouble className="h-4 w-4" aria-hidden="true" />} value={unit.beds} />
        )}
        {typeof unit.baths === 'number' && (
          <Spec icon={<Bath className="h-4 w-4" aria-hidden="true" />} value={unit.baths} />
        )}
        {area ? (
          <Spec icon={<Maximize className="h-4 w-4" aria-hidden="true" />} value={formatArea(area)} />
        ) : null}
        {unit.orientation && (
          <Spec icon={<Compass className="h-4 w-4" aria-hidden="true" />} value={unit.orientation} />
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-1">
        <div>
          {unit.price ? (
            <p className="text-lg font-bold text-foreground">{formatPrice(unit.price, unit.currency)}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t('unit.priceOnRequest')}</p>
          )}
          {unit.price && area ? (
            <p className="text-xs text-muted-foreground">
              {formatPrice(Math.round(unit.price / area), unit.currency)}/m²
            </p>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {t('unit.viewDetails')}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
};
