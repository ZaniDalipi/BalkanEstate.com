import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicUnit } from '../../../../types';
import { formatArea, formatPrice } from '../../../../utils/format';
import { unitArea } from '../../../../utils/unitFilters';
import { AvailabilityBadge } from '../../../shared/Badges';
import { TourBadge } from '../../../shared/TourBadge';
import { useUnitText } from '../useUnitText';

interface UnitHeaderProps {
  unit: PublicUnit;
  /** 'sheet': the phone sheet / plain drawer. 'card': the floating card beside the showcase. */
  variant: 'sheet' | 'card';
}

/** The apartment's name, status, key facts and price at the top of its details. */
export const UnitHeader: React.FC<UnitHeaderProps> = ({ unit, variant }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const area = unitArea(unit);
  const showPrice = !unit.priceOnRequest && typeof unit.price === 'number' && unit.price > 0;
  const perSqm = unit.pricePerSqm ?? (showPrice && area ? Math.round(unit.price! / area) : undefined);
  const kind = unit.unitType ? t(`explorer.unitType.${unit.unitType}`, unit.unitType.replace(/_/g, ' ')) : null;

  if (variant === 'card') {
    const facts = [
      typeof unit.beds === 'number' ? txt.bedrooms(unit.beds) : null,
      typeof unit.baths === 'number' ? t('explorer.bathrooms', { count: unit.baths, defaultValue: unit.baths === 1 ? '{{count}} bathroom' : '{{count}} bathrooms' }) : null,
      area ? formatArea(area) : null,
    ].filter(Boolean);
    return (
      <header className="pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityBadge state={unit.availability} />
          {unit.floorLabel && <span className="text-xs font-medium text-slate-500">{unit.floorLabel}</span>}
          {unit.virtualTourUrl && <TourBadge />}
        </div>
        <h2 className="mt-3 text-3xl font-light tracking-tight text-slate-900">{txt.title(unit)}</h2>
        {facts.length > 0 && <p className="mt-1 text-sm text-slate-500">{facts.join(' · ')}</p>}
        <div className="mt-4 rounded-2xl bg-slate-900 px-5 py-4 text-white">
          <p className="text-2xl font-semibold tracking-tight">{txt.price(unit)}</p>
          {showPrice && perSqm ? <p className="mt-0.5 text-sm text-white/65">{formatPrice(perSqm, unit.currency)}/m²</p> : null}
        </div>
      </header>
    );
  }
  return (
    <header>
      <div className="flex flex-wrap items-center gap-2 pr-12">
        <h2 className="text-2xl font-bold text-slate-900">{txt.title(unit)}</h2>
        <AvailabilityBadge state={unit.availability} />
        {unit.virtualTourUrl && <TourBadge />}
      </div>
      <p className="mt-1 text-sm text-slate-500">{[unit.buildingName, unit.floorLabel || null, kind].filter(Boolean).join(' · ')}</p>
      <div className="mt-3">
        <p className="text-2xl font-extrabold text-slate-900">{txt.price(unit)}</p>
        {showPrice && perSqm ? <p className="text-sm text-slate-500">{formatPrice(perSqm, unit.currency)}/m²</p> : null}
      </div>
    </header>
  );
};
