import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { findCityCentre } from '@/shared/geo';

// Leaflet plus the tile layers is a heavy import for a modal most admin edits
// never open, so it is only fetched once the map is actually revealed.
const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));

export interface AdminPropertyLocation {
  lat: number;
  lng: number;
  address: string;
}

interface AdminPropertyLocationEditorProps {
  country: string;
  city: string;
  location: AdminPropertyLocation;
  onChange: (patch: Partial<AdminPropertyLocation>) => void;
}

/** Fallback centre when a listing has no usable pin yet: roughly the Balkans. */
const FALLBACK_CENTRE = { lat: 42.0, lng: 21.0 };

const hasPin = (value: number): boolean => Number.isFinite(value) && value !== 0;

const coordinateInputClasses =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm';

/**
 * Map-based location editor for the admin property form.
 *
 * Admins are correcting listings, not creating them: a listing whose pin and
 * city disagree is exactly the case they are here to fix, so the picker accepts
 * whatever position they drop the marker on.
 */
const AdminPropertyLocationEditor: React.FC<AdminPropertyLocationEditorProps> = ({
  country,
  city,
  location,
  onChange,
}) => {
  const { t } = useTranslation(['admin', 'search']);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const isPinned = hasPin(location.lat) && hasPin(location.lng);
  const cityCentre = findCityCentre(country, city);
  const mapCentre = isPinned
    ? { lat: location.lat, lng: location.lng }
    : cityCentre ?? FALLBACK_CENTRE;

  // Coordinates are edited as text so a half-typed or cleared field stays
  // visible instead of being committed as 0 — which is a real point in the
  // Gulf of Guinea, and would silently move the listing there.
  const [draft, setDraft] = useState<{ lat?: string; lng?: string }>({});
  const limits = { lat: 90, lng: 180 } as const;

  const handleCoordinateChange = (field: 'lat' | 'lng') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setDraft((current) => ({ ...current, [field]: raw }));

    const parsed = Number(raw);
    if (raw.trim() && Number.isFinite(parsed) && Math.abs(parsed) <= limits[field]) {
      onChange({ [field]: parsed } as Partial<AdminPropertyLocation>);
    }
  };

  // The map writes straight to the form, so drop the draft once it diverges.
  const displayValue = (field: 'lat' | 'lng'): string => {
    const drafted = draft[field];
    return drafted !== undefined && Number(drafted) === location[field] ? drafted : String(location[field]);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">{t('admin:properties.mapLocation', 'Map location')}</p>
          <p className="text-xs text-gray-500">
            {isPinned
              ? t('admin:properties.mapLocationPinned', 'This pin is what the listing page and search map show.')
              : t('admin:properties.mapLocationMissing', 'No pin set — this listing will not appear on the map.')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsMapOpen((open) => !open)}
          className="px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
        >
          {isMapOpen
            ? t('admin:properties.hideMap', 'Hide map')
            : t('admin:properties.editOnMap', 'Edit on map')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="admin-property-lat">
            {t('search:map.latitude')}
          </label>
          <input
            id="admin-property-lat"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={displayValue('lat')}
            onChange={handleCoordinateChange('lat')}
            className={coordinateInputClasses}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="admin-property-lng">
            {t('search:map.longitude')}
          </label>
          <input
            id="admin-property-lng"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={displayValue('lng')}
            onChange={handleCoordinateChange('lng')}
            className={coordinateInputClasses}
          />
        </div>
      </div>

      {isMapOpen && (
        <Suspense
          fallback={
            <div className="h-96 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <MapLocationPicker
            lat={mapCentre.lat}
            lng={mapCentre.lng}
            address={location.address || `${city}, ${country}`}
            country={country}
            city={city}
            onLocationChange={(lat, lng) => onChange({ lat, lng })}
            onAddressChange={(address) => onChange({ address })}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AdminPropertyLocationEditor;
