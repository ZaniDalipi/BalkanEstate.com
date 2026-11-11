import React from 'react';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/components/shared/UserAvatar';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { DetailSection } from './DetailSection';

/** Who runs the listing: avatar, name and role, and how long they've been on BalkanEstate. */
export const BusinessOwnerSection: React.FC<{ listing: BusinessListing }> = ({ listing }) => {
  const { t, i18n } = useTranslation('businessDirectory');
  const owner = listing.owner;
  if (!owner?.name) return null;
  const since = new Date(listing.createdAt);

  return (
    <DetailSection id="business-owner" icon="user" title={t('detail.owner', 'About the Owner')}>
      <div className="flex items-center gap-4">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full shadow-md ring-4 ring-white">
          <UserAvatar src={owner.avatarUrl} alt={owner.name} seed={owner.id || owner.name} width={128} className="h-full w-full object-cover" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-neutral-900">{owner.name}</p>
          <p className="text-[15px] text-neutral-500">
            {listing.listingType === 'individual' ? t('detail.ownerIndividual', 'Independent Professional') : t('detail.ownerBusiness', 'Business Owner')}
          </p>
          {!Number.isNaN(since.getTime()) && (
            <p className="mt-0.5 text-[13px] text-neutral-500">
              {t('detail.stats.memberSince', 'Member since')} {since.toLocaleDateString(i18n.language || 'en', { year: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
      </div>
    </DetailSection>
  );
};
