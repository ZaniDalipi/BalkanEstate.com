import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMapLoader } from '@/src/features/map/hooks/useGoogleMapLoader';
import { searchLocation, reverseGeocode } from '@/services/osmService';
import { NominatimResult } from '@/types';
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

const COUNTRY_CODE_MAP: Record<string, string> = {
  Serbia: 'RS',
  Kosovo: 'XK',
  Albania: 'AL',
  'North Macedonia': 'MK',
  'Bosnia and Herzegovina': 'BA',
  Montenegro: 'ME',
  Croatia: 'HR',
  Slovenia: 'SI',
  Bulgaria: 'BG',
  Romania: 'RO',
  Greece: 'GR',
};

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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>({ lat, lng });

  // Search state
  const [searchQuery, setSearchQuery] = useState(address);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Track whether user is actively typing (don't override while typing)
  const isUserTypingRef = useRef(false);

  // Keep refs for validation callbacks
  const cityRef = useRef(city);
  const cityLatRef = useRef(cityLat);
  const cityLngRef = useRef(cityLng);
  const markerPosRef = useRef(markerPos);
  const latRef = useRef(lat);
  const lngRef = useRef(lng);

  useEffect(() => { cityRef.current = city; }, [city]);
  useEffect(() => { cityLatRef.current = cityLat; }, [cityLat]);
  useEffect(() => { cityLngRef.current = cityLng; }, [cityLng]);
  useEffect(() => { markerPosRef.current = markerPos; }, [markerPos]);
  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);

  // Sync marker when parent updates lat/lng externally
  useEffect(() => {
    setMarkerPos({ lat, lng });
  }, [lat, lng]);

  // Keep search box in sync with the address shown on the map
  // (updated after drag → reverse geocode, or after selecting a result)
  useEffect(() => {
    if (!isUserTypingRef.current && address) {
      setSearchQuery(address);
    }
  }, [address]);

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
              if (result) {
                onAddressChange(result.display_name);
                setSearchQuery(result.display_name);
              }
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
    async (newLat: number, newLng: number): Promise<boolean> => {
      const currentCity = cityRef.current;
      const cLat = cityLatRef.current;
      const cLng = cityLngRef.current;

      if (currentCity && cLat && cLng) {
        const dist = calculateDistance(cLat, cLng, newLat, newLng);
        if (dist > 30) {
          setMarkerPos({ lat: latRef.current, lng: lngRef.current });
          dispatch({
            type: 'SHOW_ALERT',
            payload: {
              type: 'warning',
              title: t('search:map.locationTooFarTitle', 'Location Too Far'),
              message: t('search:map.locationTooFar', { distance: dist.toFixed(1), city: currentCity }),
            },
          });
          return false;
        }
      }

      setMarkerPos({ lat: newLat, lng: newLng });
      onLocationChange(newLat, newLng);

      if (onAddressChange) {
        try {
          const result = await reverseGeocode(newLat, newLng);
          if (result) {
            onAddressChange(result.display_name);
            setSearchQuery(result.display_name);
          }
        } catch { /* silent */ }
      }
      return true;
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

  // Search input handler with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);
    isUserTypingRef.current = true;

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const countryCode = country ? COUNTRY_CODE_MAP[country] : undefined;
        let results = await searchLocation(query, countryCode);

        // Filter to within 30 km of city if one is selected
        const cLat = cityLatRef.current;
        const cLng = cityLngRef.current;
        if (cityRef.current && cLat && cLng) {
          results = results.filter((r) => {
            const dist = calculateDistance(cLat, cLng, parseFloat(r.lat), parseFloat(r.lon));
            return dist <= 30;
          });
        }

        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleResultSelect = (result: NominatimResult) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);

    const currentCity = cityRef.current;
    const cLat = cityLatRef.current;
    const cLng = cityLngRef.current;
    if (currentCity && cLat && cLng) {
      const dist = calculateDistance(cLat, cLng, newLat, newLng);
      if (dist > 30) {
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
    if (onAddressChange) onAddressChange(result.display_name);

    setSearchQuery(result.display_name);
    setShowResults(false);
    setSearchResults([]);
    isUserTypingRef.current = false;

    mapRef.current?.panTo({ lat: newLat, lng: newLng });
    mapRef.current?.setZoom(16);
  };

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
        const ok = await validateAndMove(latitude, longitude);
        if (ok) {
          mapRef.current?.panTo({ lat: latitude, lng: longitude });
          mapRef.current?.setZoom(16);
        }
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

  const handleMapTypeToggle = useCallback((type: 'roadmap' | 'satellite') => {
    setMapType(type);
    mapRef.current?.setMapTypeId(type);
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">{t('search:map.propertyLocation')}</p>
        <p className="text-xs text-neutral-500">{t('search:map.searchNavigatePin')}</p>
      </div>

      {/* Search box + geolocation button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (searchResults.length > 0) handleResultSelect(searchResults[0]);
              }
              if (e.key === 'Escape') {
                setShowResults(false);
                isUserTypingRef.current = false;
              }
            }}
            placeholder={t('search:map.searchPlaceholder')}
            className="w-full px-4 py-2.5 pr-10 text-sm border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            autoComplete="off"
          />

          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => handleResultSelect(result)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-100 border-b border-neutral-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{result.display_name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{result.type || t('search:map.location')}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
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
