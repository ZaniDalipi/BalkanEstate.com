import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@/constants';
import { SoftIcon } from '@/src/shared/illustrations';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

interface RailActionsProps {
  /** The professional whose badge is up front, if any. */
  person: BusinessListing | null;
  onOpen: (listing: BusinessListing) => void;
  onShare: (listing: BusinessListing) => void;
  onListYourself: () => void;
}

const BTN = 'inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Full-size buttons under the lanyard rail. The links printed on a badge are
 * badge-sized; these are the touch targets: open or share whoever is up
 * front, or list yourself.
 */
const RailActions: React.FC<RailActionsProps> = ({ person, onOpen, onShare, onListYourself }) => {
  const { t } = useTranslation('businessDirectory');
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {person && (
        <>
          <button type="button" onClick={() => onOpen(person)} className={`${BTN} liquid-tint`}>
            {t('individuals.profile', 'View profile')}
          </button>
          <button type="button" onClick={() => onShare(person)} className={`${BTN} liquid-control text-primary`}>
            <SoftIcon name="share" className="h-5 w-5" />
            {t('shareCard.share', 'Share card')}
          </button>
        </>
      )}
      <button type="button" onClick={onListYourself} className={`${BTN} ${person ? 'liquid-control text-neutral-800' : 'liquid-tint'}`}>
        <PlusIcon className="h-4 w-4" />
        {t('individuals.cta', 'Offer your services')}
      </button>
    </div>
  );
};

export default RailActions;
