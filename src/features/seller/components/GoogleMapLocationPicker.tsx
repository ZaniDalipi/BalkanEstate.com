import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useGoogleMapLoader } from '@/src/features/map/hooks/useGoogleMapLoader';
import { reverseGeocode } from '@/services/osmService';
import { useAppContext } from '@/context/AppContext';

interface GoogleMapLocationPickerProps {
  lat: number;
  lng: number;
  address: string;
  zoom?: number;
  country?: string;
  city?: string;
  cityLat?: number;
  cityLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string) => void;
  autoDetectLocation?: boolean;
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const COUNTRY_CODE_MAP: Record<string, string> = {
  Serbia: 'rs',
  Kosovo: 'xk',
  Albania: 'al',
  'North Macedonia': 'mk',
  'Bosnia and Herzegovina': 'ba',
  Montenegro: 'me',
  Croatia: 'hr',
  Slovenia: 'si',
  Bulgaria: 'bg',
  Romania: 'ro',
  Greece: 'gr',
};

const GoogleMapLocationPicker: React.FC<GoogleMapLocationPickerProps> = ({
  lat,
  lng,
  address,
  zoom = 15,
  country,
  city,
  cityLat,
  cityLng,
  onLocationChange,
  onAddressChange,
  autoDetectLocation,
}) => {
  const { t } = useTranslation(['search']);
  const { dispatch } = useAppContext();
  const { isLoaded, loadError } = useGoogleMapLoader();

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>({ lat, lng });

  // Keep refs for validation inside callbacks
  const cityRef = useRef(city);
  const cityLatRef = useRef(cityLat);
  const cityLngRef = useRef(cityLng);
  const markerPosRef = useRef(markerPos);

  useEffect(() => { cityRef.current = city; }, [city]);
  useEffect(() => { cityLatRef.current = cityLat; }, [cityLat]);
  useEffect(() => { cityLngRef.current = cityLng; }, [cityLng]);
  useEffect(() => { markerPosRef.current = markerPos; }, [markerPos]);

  // Sync marker when parent updates lat/lng externally
  useEffect(() => {
    setMarkerPos({ lat, lng });
  }, [lat, lng]);

  // Auto-detect location on mount
  useEffect(() => {
    if (!autoDetectLocation || !navigator.geolocation) return;
    const timer = setTimeout(() => {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          onLocationChange(latitude, longitude);
          if (onAddressChange) {
            try {
              const result = await reverseGeocode(latitude, longitude);
              if (result) onAddressChange(result.display_name);
            } catch { /* silent */ }
          }
          setIsGettingLocation(false);
        },
        () => setIsGettingLocation(false),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [autoDetectLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateAndMove = useCallback(
    async (newLat: number, newLng: number) => {
      const currentCity = cityRef.current;
      const cLat = cityLatRef.current;
      const cLng = cityLngRef.current;

      if (currentCity && cLat && cLng) {
        const dist = calculateDistance(cLat, cLng, newLat, newLng);
        if (dist > 30) {
          // Snap back
          setMarkerPos({ ...markerPosRef.current });
          dispatch({
            type: 'SHOW_ALERT',
            payload: {
              type: 'warning',
              title: t('search:map.locationTooFarTitle', 'Location Too Far'),
              message: t('search:map.locationTooFar', { distance: dist.toFixed(1), city: currentCity }),
            },
          });
          return;
        }
      }

      setMarkerPos({ lat: newLat, lng: newLng });
      onLocationChange(newLat, newLng);

      if (onAddressChange) {
        try {
          const result = await reverseGeocode(newLat, newLng);
          if (result) onAddressChange(result.display_name);
        } catch { /* silent */ }
      }
    },
    [dispatch, onLocationChange, onAddressChange, t],
  );

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      validateAndMove(e.latLng.lat(), e.latLng.lng());
    },
    [validateAndMove],
  );

  const handleMapTypeToggle = useCallback(
    (type: 'roadmap' | 'satellite') => {
      setMapType(type);
      mapRef.current?.setMapTypeId(type);
    },
    [],
  );

  const handleGetCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError(t('search:map.geolocationNotSupported'));
      return;
    }
    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await validateAndMove(latitude, longitude);
        mapRef.current?.panTo({ lat: latitude, lng: longitude });
        mapRef.current?.setZoom(16);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(t('search:map.locationPermissionDenied'));
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(t('search:map.locationUnavailable'));
            break;
          case error.TIMEOUT:
            setLocationError(t('search:map.locationTimeout'));
            break;
          default:
            setLocationError(t('search:map.locationError'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [t, validateAndMove]);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    const newLat = place.geometry.location.lat();
    const newLng = place.geometry.location.lng();
    validateAndMove(newLat, newLng);
    mapRef.current?.panTo({ lat: newLat, lng: newLng });
    mapRef.current?.setZoom(16);
  }, [validateAndMove]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ac;
  }, []);

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        {t('common:errors.errorLoadingGoogleMaps', 'Failed to load Google Maps. Please refresh the page.')}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-96 rounded-lg border-2 border-neutral-300 flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-neutral-500 mt-3">{t('search:map.loading', 'Loading map...')}</p>
        </div>
      </div>
    );
  }

  const autocompleteOptions: google.maps.places.AutocompleteOptions = {
    types: ['geocode', 'establishment'],
    ...(country && COUNTRY_CODE_MAP[country]
      ? { componentRestrictions: { country: COUNTRY_CODE_MAP[country] } }
      : {}),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">{t('search:map.propertyLocation')}</p>
        <p className="text-xs text-neutral-500">{t('search:map.searchNavigatePin')}</p>
      </div>

      {/* Search box + geolocation button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={handlePlaceChanged}
            options={autocompleteOptions}
          >
            <input
              type="text"
              defaultValue={address}
              placeholder={t('search:map.searchPlaceholder')}
              className="w-full px-4 py-2.5 pr-10 text-sm border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              autoComplete="off"
            />
          </Autocomplete>
        </div>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          title={t('search:map.useMyLocation')}
        >
          {isGettingLocation ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          <span className="hidden sm:inline">{t('search:map.useMyLocation')}</span>
        </button>
      </div>

      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">{locationError}</p>
        </div>
      )}

      {/* Map */}
      <div className="relative">
        <div className="w-full h-96 rounded-lg border-2 border-neutral-300 shadow-sm overflow-hidden">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={markerPos}
            zoom={zoom}
            mapTypeId={mapType}
            onLoad={onMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              minZoom: 6,
              maxZoom: 20,
              gestureHandling: 'greedy',
            }}
          >
            <Marker
              position={markerPos}
              draggable
              onDragEnd={handleMarkerDragEnd}
              title={t('search:map.dragToAdjust', 'Drag me to adjust location')}
            />
          </GoogleMap>
        </div>

        {/* Street / Satellite toggle */}
        <div className="absolute top-3 right-3 z-[999] bg-white rounded-lg shadow-md border border-neutral-200 flex p-1 gap-1">
          <button
            type="button"
            onClick={() => handleMapTypeToggle('roadmap')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              mapType === 'roadmap'
                ? 'bg-primary text-white shadow'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {t('search:map.street')}
          </button>
          <button
            type="button"
            onClick={() => handleMapTypeToggle('satellite')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              mapType === 'satellite'
                ? 'bg-primary text-white shadow'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {t('search:map.satellite')}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">{t('search:map.tips')}</p>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
          <span className="text-neutral-500">{t('search:map.latitude')}</span>{' '}
          <span className="font-mono font-semibold text-neutral-800">{lat.toFixed(6)}</span>
        </div>
        <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
          <span className="text-neutral-500">{t('search:map.longitude')}</span>{' '}
          <span className="font-mono font-semibold text-neutral-800">{lng.toFixed(6)}</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapLocationPicker;
