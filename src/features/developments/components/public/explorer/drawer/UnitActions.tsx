import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicUnit, PublicUnitDetail } from '../../../../types';
import { isPursuable } from '../../../../utils/availability';
import { ListingActions } from './ListingActions';
import { UnitInquiryForm } from './UnitInquiryForm';

interface UnitActionsProps {
  slug: string;
  unit: PublicUnit;
  development?: PublicUnitDetail['development'];
  onModalChange: (open: boolean) => void;
}

/**
 * What a buyer can do about this unit, reusing the platform's own flows:
 *  - unit with a primary listing → that listing's inquiry, viewing, favourite,
 *    compare, share and "open full listing";
 *  - no listing → a unit inquiry to the developer (when the development allows it);
 *  - sold / rented / unavailable → no contact or viewing CTAs at all.
 */
export const UnitActions: React.FC<UnitActionsProps> = ({ slug, unit, development, onModalChange }) => {
  const { t } = useTranslation('developments');
  const pursuable = isPursuable(unit.availability);

  if (unit.primaryListingId) {
    return <ListingActions listingId={unit.primaryListingId} pursuable={pursuable} onModalChange={onModalChange} />;
  }
  if (!pursuable) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {t('explorer.drawer.notAvailable', 'This apartment is no longer available.')}
      </p>
    );
  }
  if (development?.allowUnitInquiries === false) return null;
  return (
    <UnitInquiryForm
      slug={slug}
      unitId={unit.id}
      defaultMessage={t('explorer.inquiry.defaultMessage', {
        unit: unit.unitNumber,
        development: development?.name ?? '',
        defaultValue: "Hello, I'm interested in apartment {{unit}} at {{development}}. Please send me more information.",
      })}
    />
  );
};
