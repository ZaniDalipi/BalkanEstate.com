import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListingTypePicture, SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import type { PropertyStatus } from '@/types';

const BADGE = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

const STATUS_LOOK: Record<string, { tone: string; icon: SoftIconName }> = {
  active: { tone: 'bg-green-100 text-green-800', icon: 'check' },
  draft: { tone: 'bg-yellow-100 text-yellow-800', icon: 'pencil' },
  pending: { tone: 'bg-blue-100 text-blue-800', icon: 'clock' },
  sold: { tone: 'bg-neutral-200 text-neutral-700', icon: 'tag' },
  rented: { tone: 'bg-orange-100 text-orange-800', icon: 'key' },
};

export const StatusBadge: React.FC<{ status: PropertyStatus }> = ({ status }) => {
  const { t } = useTranslation(['seller']);
  const look = STATUS_LOOK[status] ?? STATUS_LOOK.draft;
  return (
    <span className={`${BADGE} ${look.tone}`}>
      <SoftIcon name={look.icon} className="h-4 w-4" />
      <span className="capitalize">{t(`seller:myListings.${status}`, status)}</span>
    </span>
  );
};

export const ListingTypeBadge: React.FC<{ listingType?: string }> = ({ listingType }) => {
  const { t } = useTranslation(['seller']);
  const isRent = listingType === 'rent';
  return (
    <span className={`${BADGE} ${isRent ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
      <ListingTypePicture type={isRent ? 'rent' : 'sale'} className="h-4 w-4" />
      {isRent ? t('seller:myListings.forRent', 'For Rent') : t('seller:myListings.forSale', 'For Sale')}
    </span>
  );
};

/** Which of the seller's profiles the listing is posted under. */
export const RoleBadge: React.FC<{ role?: string }> = ({ role }) => {
  const { t } = useTranslation(['account']);
  if (!role) return null;
  const isAgent = role === 'agent';
  return (
    <span className={`${BADGE} ${isAgent ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
      <SoftIcon name={isAgent ? 'building' : 'home'} className="h-4 w-4" />
      {isAgent ? t('account:roles.agent', 'Agent') : t('account:roles.privateSeller', 'Private Seller')}
    </span>
  );
};

export const NoMapLocationBadge: React.FC = () => {
  const { t } = useTranslation(['seller', 'account']);
  return (
    <span
      className={`${BADGE} bg-red-100 text-red-700`}
      title={t('account:ui.myListings.thisPropertyWonTAppear', "This property won't appear on the map. Edit to set location.")}
    >
      <SoftIcon name="warning" className="h-4 w-4" />
      {t('seller:myListings.noMapLocation', 'No Map Location')}
    </span>
  );
};
