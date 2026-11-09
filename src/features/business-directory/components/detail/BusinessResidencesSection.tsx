import React from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { useBusinessResidences } from '@/src/features/developments/hooks/useBusinessResidences';
import { DevelopmentCard } from '@/src/features/developments/components/shared/DevelopmentCard';
import { DetailSection } from './DetailSection';

/**
 * The residences this company builds on BalkanEstate: the ones whose builder
 * its owner linked to this business. Nothing shows while there are none (or
 * they could not be loaded: the page is about the business, not them).
 */
export const BusinessResidencesSection: React.FC<{ listing: BusinessListing }> = ({ listing }) => {
  const { t } = useTranslation('businessDirectory');
  const { residences } = useBusinessResidences(listing.slug || listing.id);
  if (residences.length === 0) return null;
  return (
    <div className="mt-5 px-3 sm:mt-6 sm:px-0">
      <DetailSection
        id="business-residences"
        icon="houses"
        title={t('detail.residences', 'Residences')}
        subtitle={t('detail.residencesSubtitle', { name: listing.name, defaultValue: 'Homes {{name}} builds on BalkanEstate' })}
      >
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {residences.map((d) => (
            <li key={d.id}>
              <DevelopmentCard development={d} onOpen={() => navigate(paths.development(d.slug))} />
            </li>
          ))}
        </ul>
      </DetailSection>
    </div>
  );
};
