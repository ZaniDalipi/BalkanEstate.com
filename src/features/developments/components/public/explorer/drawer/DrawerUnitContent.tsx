import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicUnit } from '../../../../hooks/useDevelopment';
import type { PublicUnit } from '../../../../types';
import { formatPrice } from '../../../../utils/format';
import { unitArea } from '../../../../utils/unitFilters';
import { AvailabilityBadge } from '../../../shared/Badges';
import { useUnitText } from '../useUnitText';
import { UnitMedia } from './UnitMedia';
import { UnitSpecs } from './UnitSpecs';
import { UnitActions } from './UnitActions';
import { DrawerCompanions } from './DrawerCompanions';
import { useUnitDrawer } from '../../../../hooks/useUnitDrawer';
import { TourBadge } from '../../../shared/TourBadge';
import { TourButton } from './TourButton';

interface DrawerUnitContentProps {
  slug: string;
  unitId: string;
  preview?: PublicUnit;
  onChildModalChange: (open: boolean) => void;
}

/** The drawer body: media, heading + price, specs, features and the actions. */
export const DrawerUnitContent: React.FC<DrawerUnitContentProps> = ({ slug, unitId, preview, onChildModalChange }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const { unit: full, development, listings, companions, isLoading, error } = usePublicUnit(slug, unitId);
  const drawer = useUnitDrawer();
  const unit = full ?? preview;

  if (!unit) {
    return isLoading ? (
      <div className="space-y-3 p-5" aria-busy="true">
        <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    ) : (
      <p role="alert" className="p-6 text-sm text-slate-600">
        {error ? t('explorer.drawer.loadError', 'This apartment could not be loaded.') : t('errors.notFound', 'Not found')}
      </p>
    );
  }

  const primary = listings.find((l) => l.id === unit.primaryListingId);
  const area = unitArea(unit);
  const showPrice = !unit.priceOnRequest && typeof unit.price === 'number' && unit.price > 0;
  const perSqm = unit.pricePerSqm ?? (showPrice && area ? Math.round(unit.price! / area) : undefined);

  return (
    <div className="pb-6">
      <UnitMedia unit={unit} primaryListing={primary} onModalChange={onChildModalChange} />
      <div className="space-y-5 px-5 pt-5">
        <header>
          <div className="flex flex-wrap items-center gap-2 pr-12">
            <h2 className="text-2xl font-bold text-slate-900">{txt.title(unit)}</h2>
            <AvailabilityBadge state={unit.availability} />
            {unit.virtualTourUrl && <TourBadge />}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[unit.buildingName, unit.floorLabel || null, unit.unitType ? t(`explorer.unitType.${unit.unitType}`, unit.unitType.replace(/_/g, ' ')) : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">{txt.price(unit)}</p>
            {showPrice && perSqm ? (
              <p className="text-sm text-slate-500">{formatPrice(perSqm, unit.currency)}/m²</p>
            ) : null}
          </div>
        </header>

        <TourButton unit={unit} />

        <UnitSpecs unit={unit} />

        <DrawerCompanions companions={companions} onOpen={drawer.open} />

        {unit.description && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{unit.description}</p>}

        {full && (
          <UnitActions
            slug={slug}
            unit={full}
            development={development}
            onModalChange={onChildModalChange}
          />
        )}
      </div>
    </div>
  );
};
