import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import { SoftIcon } from '@/src/shared/illustrations';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import type { VisitorLocation } from '../../hooks/useVisitorLocation';
import { useTravelRoute } from '../../hooks/useTravelRoute';
import { directionsUrl, fullAddress } from '../../utils/businessFacts';
import type { BusinessPlace } from '../../utils/businessPlace';
import type { TravelMode } from '../../utils/travel';
import { DetailSection } from './DetailSection';
import { GlassSegmented } from './GlassSegmented';
import { SECONDARY_ACTION } from './glassStyles';
import { RoutePlanner } from './RoutePlanner';
import type { MapLayer } from './BusinessLocationMap';

const BusinessLocationMap = lazy(() => import('./BusinessLocationMap'));

interface BusinessLocationSectionProps {
  listing: BusinessListing;
  /** Their pin, or the address looked up; null while looking or when not found. */
  place: BusinessPlace | null;
  isLocatingPlace: boolean;
  location: VisitorLocation;
  onLocate: () => void;
  onCopy: (value: string) => void;
}

/** A big map: most of a phone screen, and the full height of the section on desktop. */
const MAP_BOX = 'liquid-map relative isolate h-[340px] overflow-hidden rounded-[22px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),0_12px_30px_-18px_rgba(15,23,42,0.4)] sm:h-[440px] lg:h-[560px] landscape:h-[300px]';

/**
 * Where they are and how to get there, full width: a big map (or satellite)
 * with the route, and beside it on desktop — under it on phones — the route
 * from the visitor and the address.
 */
export const BusinessLocationSection: React.FC<BusinessLocationSectionProps> = ({ listing, place, isLocatingPlace, location, onLocate, onCopy }) => {
  const { t } = useTranslation('businessDirectory');
  const [layer, setLayer] = useState<MapLayer>('map');
  const [mode, setMode] = useState<TravelMode>('car');
  const address = fullAddress(listing);
  const business = place?.position ?? null;
  const visitor = location.status === 'ready' ? location.position : null;
  const route = useTravelRoute(visitor, business, mode);

  return (
    <DetailSection id="business-location" icon="pin" title={t('detail.location', 'Location')}>
      <div className={`grid gap-4 lg:gap-6 ${place || isLocatingPlace ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
        <div className="min-w-0">
          {place ? (
            <div className={MAP_BOX}>
              <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-200/70" aria-hidden="true" />}>
                <BusinessLocationMap
                  business={place.position}
                  precision={place.precision}
                  name={listing.name}
                  logoUrl={listing.logoUrl}
                  layer={layer}
                  visitor={visitor}
                  path={route.data?.path ?? null}
                />
              </Suspense>
              <GlassSegmented<MapLayer>
                size="sm"
                className="absolute right-2.5 top-2.5 z-10"
                label={t('detail.map.layer', 'Map style')}
                value={layer}
                onChange={setLayer}
                options={[{ value: 'map', label: t('detail.map.standard', 'Map') }, { value: 'satellite', label: t('detail.map.satellite', 'Satellite') }]}
              />
            </div>
          ) : isLocatingPlace ? (
            <div className={`${MAP_BOX} flex items-center justify-center bg-neutral-100 text-sm text-neutral-500`} role="status">
              {t('detail.map.finding', 'Finding the address on the map…')}
            </div>
          ) : null}
          {place && place.precision !== 'pin' && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-neutral-600">
              <SoftIcon name="info" className="h-5 w-5 shrink-0" />
              {place.precision === 'address'
                ? t('detail.map.approximate', 'Approximate — placed from the address')
                : t('detail.map.cityOnly', 'Approximate — city area only')}
            </p>
          )}
        </div>

        <div className="min-w-0 lg:flex lg:flex-col">
          {business ? (
            <RoutePlanner business={business} location={location} onLocate={onLocate} mode={mode} onModeChange={setMode} route={route} />
          ) : (
            <a href={directionsUrl(listing)} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_ACTION} min-h-[48px] w-full`}>
              {t('detail.getDirections', 'Get Directions')}
            </a>
          )}

          <div className="mt-4 flex items-start gap-3 border-t border-black/[0.06] pt-4">
            <address className="min-w-0 flex-1 text-base not-italic leading-relaxed text-neutral-800">{address}</address>
            <button type="button" onClick={() => onCopy(address)} className={`${SECONDARY_ACTION} min-h-[44px] min-w-[44px] shrink-0 !px-3`} aria-label={t('detail.copyAddress', 'Copy address')}>
              <Copy className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </DetailSection>
  );
};
