import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Navigation } from 'lucide-react';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { directionsUrl, fullAddress } from '../../utils/businessFacts';
import { DetailSection } from './DetailSection';
import { PRIMARY_ACTION, SECONDARY_ACTION } from './glassStyles';

const BusinessLocationMap = lazy(() => import('./BusinessLocationMap'));

const hasPin = (l: BusinessListing): l is BusinessListing & { latitude: number; longitude: number } =>
  Number.isFinite(l.latitude) && Number.isFinite(l.longitude);

/** Where to find them: a view-only map, the address, and directions. */
export const BusinessLocationSection: React.FC<{ listing: BusinessListing; onCopy: (value: string) => void }> = ({ listing, onCopy }) => {
  const { t } = useTranslation('businessDirectory');
  const address = fullAddress(listing);

  return (
    <DetailSection id="business-location" icon="pin" title={t('detail.location', 'Location')}>
      {hasPin(listing) && (
        <div className="relative isolate -mx-1 mb-4 h-56 overflow-hidden rounded-2xl ring-1 ring-black/[0.06] sm:h-64">
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-200/70" aria-hidden="true" />}>
            <BusinessLocationMap lat={listing.latitude} lng={listing.longitude} label={listing.name} />
          </Suspense>
        </div>
      )}
      <address className="text-[15px] not-italic leading-relaxed text-neutral-800">{address}</address>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <a href={directionsUrl(listing)} target="_blank" rel="noopener noreferrer" className={`${PRIMARY_ACTION} min-h-[48px]`}>
          <Navigation className="h-[18px] w-[18px]" aria-hidden="true" />
          {t('detail.getDirections', 'Get Directions')}
        </a>
        <button type="button" onClick={() => onCopy(address)} className={`${SECONDARY_ACTION} min-h-[48px] min-w-[48px]`} aria-label={t('detail.copyAddress', 'Copy address')}>
          <Copy className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="hidden sm:inline">{t('detail.copy', 'Copy')}</span>
        </button>
      </div>
    </DetailSection>
  );
};
