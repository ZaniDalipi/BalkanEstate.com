import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import type { VisitorLocation } from '../../hooks/useVisitorLocation';
import { useTravelRoute } from '../../hooks/useTravelRoute';
import { directionsUrl, fullAddress } from '../../utils/businessFacts';
import type { TravelMode } from '../../utils/travel';
import { DetailSection } from './DetailSection';
import { GlassSegmented } from './GlassSegmented';
import { SECONDARY_ACTION } from './glassStyles';
import { RoutePlanner } from './RoutePlanner';
import type { MapLayer } from './BusinessLocationMap';

const BusinessLocationMap = lazy(() => import('./BusinessLocationMap'));

const hasPin = (l: BusinessListing): l is BusinessListing & { latitude: number; longitude: number } =>
  Number.isFinite(l.latitude) && Number.isFinite(l.longitude);

interface BusinessLocationSectionProps {
  listing: BusinessListing;
  location: VisitorLocation;
  onLocate: () => void;
  onCopy: (value: string) => void;
}

/** Where they are and how to get there: map (or satellite), route from the visitor, address. */
export const BusinessLocationSection: React.FC<BusinessLocationSectionProps> = ({ listing, location, onLocate, onCopy }) => {
  const { t } = useTranslation('businessDirectory');
  const [layer, setLayer] = useState<MapLayer>('map');
  const [mode, setMode] = useState<TravelMode>('car');
  const address = fullAddress(listing);
  const business = hasPin(listing) ? { lat: listing.latitude, lng: listing.longitude } : null;
  const visitor = location.status === 'ready' ? location.position : null;
  const route = useTravelRoute(visitor, business, mode);

  return (
    <DetailSection id="business-location" icon="pin" title={t('detail.location', 'Location')}>
      {business && (
        <div className="relative isolate -mx-1 mb-4 h-64 overflow-hidden rounded-2xl ring-1 ring-black/[0.06] sm:h-72">
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-200/70" aria-hidden="true" />}>
            <BusinessLocationMap business={business} label={listing.name} layer={layer} visitor={visitor} path={route.data?.path} />
          </Suspense>
          <GlassSegmented<MapLayer>
            size="sm"
            className="absolute right-2.5 top-2.5 z-[500]"
            label={t('detail.map.layer', 'Map style')}
            value={layer}
            onChange={setLayer}
            options={[{ value: 'map', label: t('detail.map.standard', 'Map') }, { value: 'satellite', label: t('detail.map.satellite', 'Satellite') }]}
          />
        </div>
      )}

      {business ? (
        <RoutePlanner business={business} location={location} onLocate={onLocate} mode={mode} onModeChange={setMode} route={route} />
      ) : (
        <a href={directionsUrl(listing)} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_ACTION} min-h-[48px] w-full`}>
          {t('detail.getDirections', 'Get Directions')}
        </a>
      )}

      <div className="mt-4 flex items-start gap-3 border-t border-black/[0.06] pt-4">
        <address className="min-w-0 flex-1 text-[15px] not-italic leading-relaxed text-neutral-800">{address}</address>
        <button type="button" onClick={() => onCopy(address)} className={`${SECONDARY_ACTION} min-h-[44px] min-w-[44px] shrink-0 !px-3`} aria-label={t('detail.copyAddress', 'Copy address')}>
          <Copy className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
    </DetailSection>
  );
};
