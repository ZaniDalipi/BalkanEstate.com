import React from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/config/mediaConfig';
import type { PublicUnit } from '../../../types';
import { AvailabilityBadge } from '../../shared/Badges';
import { useUnitText } from './useUnitText';

export interface Fact {
  label: string;
  value: string;
}

/** "• Label ........ value" rows, as on the East Gate hover cards. */
export const FactRows: React.FC<{ facts: Fact[] }> = ({ facts }) => (
  <dl className="space-y-1.5">
    {facts.map((f) => (
      <div key={f.label} className="flex items-baseline justify-between gap-6 text-sm">
        <dt className="flex items-center gap-2 text-slate-600">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" aria-hidden="true" />
          {f.label}
        </dt>
        <dd className="text-right font-semibold tabular-nums text-slate-900">{f.value}</dd>
      </div>
    ))}
  </dl>
);

/** Card body for an apartment: floor-plan preview, key facts, price and status. */
export const UnitFacts: React.FC<{ unit: PublicUnit }> = ({ unit }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const facts: Fact[] = [
    { label: t('explorer.card.apartment', 'Apartment'), value: unit.unitNumber },
    unit.floorLabel ? { label: t('explorer.floor', 'Floor'), value: String(unit.floorLevel ?? unit.floorLabel) } : null,
    txt.area(unit) ? { label: t('explorer.card.area', 'Area'), value: txt.area(unit) } : null,
    typeof unit.beds === 'number' ? { label: t('explorer.card.rooms', 'Bedrooms'), value: unit.beds === 0 ? t('explorer.studio', 'Studio') : String(unit.beds) } : null,
    { label: t('explorer.card.price', 'Price'), value: txt.price(unit) },
  ].filter((f): f is Fact => !!f);

  return (
    <>
      {unit.floorplan?.url && (
        <div className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-xl border-b border-slate-100 bg-slate-50">
          <img
            src={optimizeImageUrl(unit.floorplan.url, { width: 560 })}
            alt={t('explorer.drawer.floorplan', 'Floor plan')}
            className="mx-auto h-32 w-full object-contain p-2"
            loading="lazy"
          />
        </div>
      )}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-base font-bold text-slate-900">{txt.title(unit)}</p>
        <AvailabilityBadge state={unit.availability} />
      </div>
      <FactRows facts={facts} />
      {unit.hasListing && (
        <p className="mt-3 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-800">
          {t('explorer.card.hasListing', 'This apartment also has a listing with photos and details.')}
        </p>
      )}
    </>
  );
};
