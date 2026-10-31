import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { formatCoordinate } from '../../../utils/format';
import type { LocationValue } from './useLocationFields';

// The app's own listing location picker (Leaflet, search, satellite, drag).
// Loaded on demand so the map library only ships with this form.
const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));

interface LocationPinMapProps {
  value: LocationValue;
  onChange: (patch: Partial<LocationValue>) => void;
  disabled?: boolean;
}

const toNumber = (v: string): number | null => {
  const n = v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Drag or click the pin to set the residence's exact coordinates; the
 * latitude/longitude fields follow (6 decimals, as everywhere in the app). The
 * map starts on the saved pin, else on the chosen city.
 */
export const LocationPinMap: React.FC<LocationPinMapProps> = ({ value, onChange, disabled = false }) => {
  const { t } = useTranslation('developments');
  const city = BALKAN_LOCATIONS.find((c) => c.name === value.country)?.cities.find((c) => c.name === value.city);
  const lat = toNumber(value.lat) ?? city?.lat;
  const lng = toNumber(value.lng) ?? city?.lng;

  if (lat === undefined || lng === undefined) {
    return <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{t('details.pinNeedsCity', 'Choose a city to place the pin on the map.')}</p>;
  }
  const defaultAddress = `${value.city}, ${value.country}`;
  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : undefined} aria-disabled={disabled || undefined}>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />}>
        <MapLocationPicker
          lat={lat}
          lng={lng}
          address={value.address || defaultAddress}
          country={value.country}
          city={value.city}
          cityLat={city?.lat}
          cityLng={city?.lng}
          title={t('details.pinTitle', 'Pin the residence on the map')}
          onLocationChange={(nextLat, nextLng) => onChange({ lat: formatCoordinate(nextLat), lng: formatCoordinate(nextLng) })}
          // Fill the address from the pin only while it is empty or still the city default.
          onAddressChange={(address) => {
            if (!value.address.trim() || value.address === defaultAddress) onChange({ address });
          }}
        />
      </Suspense>
    </div>
  );
};
