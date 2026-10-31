import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronRight } from 'lucide-react';
import { localizePath, navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useListingResidence } from '../../../hooks/useListingResidence';

interface ListingResidenceBadgeProps {
  listingId: string | undefined;
  className?: string;
}

/**
 * "Part of Plaza Tirana · Apartment T1203, Plaza Tower" on a listing's detail
 * page, linking to the apartment in the residence explorer (or the residence).
 * Renders nothing when the listing is not in a published residence.
 */
export const ListingResidenceBadge: React.FC<ListingResidenceBadgeProps> = ({ listingId, className }) => {
  const { t } = useTranslation('developments');
  const { data: residence } = useListingResidence(listingId);
  if (!residence) return null;

  const unit = residence.unit;
  const href = unit ? paths.developmentUnit(residence.slug, unit.id) : paths.development(residence.slug);
  const place = unit
    ? [t('listingResidence.apartment', { number: unit.unitNumber, defaultValue: 'Apartment {{number}}' }), unit.buildingName, unit.floorLabel].filter(Boolean).join(' · ')
    : residence.city;

  return (
    <a
      href={localizePath(href)}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      className={`group flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 transition-colors hover:bg-primary/10 ${className ?? ''}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-primary/15">
        <Building2 className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">
          {t('listingResidence.partOf', { name: residence.name, defaultValue: 'Part of {{name}}' })}
        </span>
        <span className="block truncate text-xs text-slate-600">{place}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary">
        {unit ? t('listingResidence.viewApartment', 'See it in the residence') : t('listingResidence.viewResidence', 'View residence')}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </a>
  );
};
