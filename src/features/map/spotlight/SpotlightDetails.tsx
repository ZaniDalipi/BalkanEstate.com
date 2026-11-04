import React from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/config/mediaConfig';
import type { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { resolveDisplayArea } from '@/shared/property/area';
import { SoftIcon } from '@/src/shared/illustrations';
import { formatDistance, pricePerSquareMetre } from './spotlightUtils';
import TravelTime from './TravelTime';
import type { SpotlightRoute } from './useSpotlightRoute';

interface SpotlightDetailsProps {
  property: Property;
  route: SpotlightRoute;
  onViewDetails: () => void;
  onShowRoute: () => void;
}

const MAX_PHOTOS = 6;

/** Photos, price, the key facts and how far it is — the listing at a glance. */
const SpotlightDetails: React.FC<SpotlightDetailsProps> = ({ property, route, onViewDetails, onShowRoute }) => {
  const { t } = useTranslation(['search', 'property']);
  const area = resolveDisplayArea(property);
  const perSqm = pricePerSquareMetre(property.price, area?.value);
  const photos = (property.images?.length ? property.images.map((i) => (typeof i === 'string' ? i : i.url)) : [property.imageUrl])
    .filter((u): u is string => typeof u === 'string' && u !== '')
    .slice(0, MAX_PHOTOS);

  const facts = [
    { icon: 'bed', label: t('search:spotlight.details.beds', 'Bedrooms'), value: property.beds },
    { icon: 'bath', label: t('search:spotlight.details.baths', 'Bathrooms'), value: property.baths },
    { icon: 'area', label: t('search:spotlight.details.area', 'Area'), value: area ? `${area.value.toLocaleString()} m²` : null },
    { icon: 'building', label: t('search:spotlight.details.floor', 'Floor'), value: property.floorNumber },
    { icon: 'calendar', label: t('search:spotlight.details.yearBuilt', 'Year built'), value: property.yearBuilt || null },
  ].filter((f) => f.value !== null && f.value !== undefined && f.value !== '');

  const travel = route.result?.ok ? route.result : null;

  return (
    <div className="space-y-4">
      {photos.length > 0 ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {photos.map((url, i) => (
            <img key={url + i} src={optimizeImageUrl(url, { width: 480 }) || url} alt="" loading={i < 2 ? 'eager' : 'lazy'}
              className="h-36 w-56 flex-none snap-start rounded-xl object-cover bg-neutral-100" />
          ))}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-xl bg-neutral-100 text-sm text-neutral-500">
          {t('search:spotlight.details.noPhoto', 'No photos yet')}
        </div>
      )}

      <div>
        <p className="text-2xl font-bold text-neutral-900">{formatPrice(property.price, property.country)}</p>
        {perSqm && (
          <p className="text-sm text-neutral-500">
            {t('search:spotlight.details.perSqm', '{{price}} per m²', { price: formatPrice(perSqm, property.country) })}
          </p>
        )}
        <p className="mt-1 text-sm text-neutral-700">{[property.address, property.city].filter(Boolean).join(', ')}</p>
      </div>

      {facts.length > 0 && (
        <dl className="grid grid-cols-3 gap-2">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-neutral-50 px-2 py-2 text-center ring-1 ring-neutral-100">
              <SoftIcon name={f.icon} className="mx-auto h-5 w-5" />
              <dd className="mt-1 text-sm font-semibold text-neutral-900">{String(f.value)}</dd>
              <dt className="text-[11px] text-neutral-500">{f.label}</dt>
            </div>
          ))}
        </dl>
      )}

      <button type="button" onClick={onShowRoute}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl bg-blue-50 px-3 py-2 text-left ring-1 ring-blue-100 hover:bg-blue-100/70">
        <SoftIcon name="pin" className="h-6 w-6 flex-none" />
        <span className="text-sm text-blue-900">
          {travel ? (
            <><strong><TravelTime seconds={travel.seconds} /></strong> · {formatDistance(travel.meters)} {t('search:spotlight.details.fromYourPlace', 'from your place')}</>
          ) : route.straightMeters !== null ? (
            t('search:spotlight.route.straightLine', '{{distance}} as the crow flies', { distance: formatDistance(route.straightMeters) })
          ) : (
            t('search:spotlight.details.howFar', 'How far is it from your place?')
          )}
        </span>
      </button>

      <button type="button" onClick={onViewDetails}
        className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-primary to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 active:scale-[0.99]">
        {t('search:spotlight.details.viewFull', 'View full listing')} →
      </button>
    </div>
  );
};

export default SpotlightDetails;
