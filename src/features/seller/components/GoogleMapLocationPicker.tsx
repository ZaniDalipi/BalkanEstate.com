import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap } from '@react-google-maps/api';
import { useGoogleMapLoader } from '@/src/features/map/hooks/useGoogleMapLoader';
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

  // Map + marker
  const mapRef = useRef<google.maps.Map | null>(null);
  const advancedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [markerPos, setMarkerPos] = useState({ lat, lng });

  // Search
  const [searchQuery, setSearchQuery] = useState(address);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const isUserTypingRef = useRef(false);

  // Stable refs so async callbacks always see fresh values
  const cityRef = useRef(city);
  const cityLatRef = useRef(cityLat);
  const cityLngRef = useRef(cityLng);
  const latRef = useRef(lat);
  const lngRef = useRef(lng);

  useEffect(() => { cityRef.current = city; }, [city]);
  useEffect(() => { cityLatRef.current = cityLat; }, [cityLat]);
  useEffect(() => { cityLngRef.current = cityLng; }, [cityLng]);
  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);

  // Sync marker element when coords change from parent
  useEffect(() => {
    setMarkerPos({ lat, lng });
    if (advancedMarkerRef.current) advancedMarkerRef.current.position = { lat, lng };
  }, [lat, lng]);

  // Keep search box text in sync with map address (but not while user is typing)
  useEffect(() => {
    if (!isUserTypingRef.current && address) setSearchQuery(address);
  }, [address]);

  // --- Google reverse-geocode helper ---
  const reverseGeocodeGoogle = useCallback(async (newLat: number, newLng: number): Promise<string | null> => {
    if (!geocoderRef.current) return null;
    return new Promise((resolve) => {
      geocoderRef.current!.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          resolve(results[0].formatted_address);
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  // --- Move marker + notify parent ---
  const validateAndMove = useCallback(
    async (newLat: number, newLng: number): Promise<boolean> => {
      const currentCity = cityRef.current;
      const cLat = cityLatRef.current;
      const cLng = cityLngRef.current;

      if (currentCity && cLat && cLng) {
        const dist = calculateDistance(cLat, cLng, newLat, newLng);
        if (dist > 30) {
          const snapPos = { lat: latRef.current, lng: lngRef.current };
          setMarkerPos(snapPos);
          if (advancedMarkerRef.current) advancedMarkerRef.current.position = snapPos;
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
      if (advancedMarkerRef.current) advancedMarkerRef.current.position = { lat: newLat, lng: newLng };
      onLocationChange(newLat, newLng);

      if (onAddressChange) {
        const formattedAddress = await reverseGeocodeGoogle(newLat, newLng);
        if (formattedAddress) {
          onAddressChange(formattedAddress);
          setSearchQuery(formattedAddress);
        }
      }
      return true;
    },
    [dispatch, onLocationChange, onAddressChange, t, reverseGeocodeGoogle],
  );

  // --- Auto-detect on mount ---
  useEffect(() => {
    if (!autoDetectLocation || !navigator.geolocation) return;
    const timer = setTimeout(() => {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          await validateAndMove(latitude, longitude);
          mapRef.current?.panTo({ lat: latitude, lng: longitude });
          mapRef.current?.setZoom(16);
          setIsGettingLocation(false);
        },
        () => setIsGettingLocation(false),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [autoDetectLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Map load: create marker + services ---
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: latRef.current, lng: lngRef.current },
      gmpDraggable: true,
      title: 'Drag to adjust location',
    });

    marker.addListener('dragend', async () => {
      const pos = marker.position as google.maps.LatLngLiteral | null;
      if (!pos) return;
      // position may be a LatLng object or a plain literal
      const newLat = typeof (pos as any).lat === 'function' ? (pos as any).lat() : (pos as any).lat;
      const newLng = typeof (pos as any).lng === 'function' ? (pos as any).lng() : (pos as any).lng;
      await validateAndMove(newLat, newLng);
    });

    advancedMarkerRef.current = marker;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Search input ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);
    isUserTypingRef.current = true;

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 2) {
      setPredictions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current) return;
      setIsSearching(true);

      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        ...(country && COUNTRY_CODE_MAP[country]
          ? { componentRestrictions: { country: COUNTRY_CODE_MAP[country] } }
          : {}),
      };

      // Bias predictions toward the current city if available
      if (cityLatRef.current && cityLngRef.current && mapRef.current) {
        request.locationBias = new google.maps.Circle({
          center: { lat: cityLatRef.current, lng: cityLngRef.current },
          radius: 30000, // 30 km
        });
      }

      autocompleteServiceRef.current.getPlacePredictions(request, (preds, status) => {
        setIsSearching(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
          setPredictions(preds.slice(0, 6));
        } else {
          setPredictions([]);
        }
      });
    }, 200);
  };

  // --- Select a prediction ---
  const handlePredictionSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!geocoderRef.current) return;

    setSearchQuery(prediction.description);
    setShowResults(false);
    setPredictions([]);
    isUserTypingRef.current = false;

    geocoderRef.current.geocode({ placeId: prediction.place_id }, async (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) return;

      const loc = results[0].geometry.location;
      const newLat = loc.lat();
      const newLng = loc.lng();

      const ok = await validateAndMove(newLat, newLng);
      if (ok) {
        // Use the Google-formatted address directly (already have it from geocode)
        const formattedAddress = results[0].formatted_address;
        if (onAddressChange && formattedAddress) {
          onAddressChange(formattedAddress);
          setSearchQuery(formattedAddress);
        }
        mapRef.current?.panTo({ lat: newLat, lng: newLng });
        mapRef.current?.setZoom(16);
      }
    });
  };

  // --- Use My Location ---
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
          case error.PERMISSION_DENIED: setLocationError(t('search:map.locationPermissionDenied')); break;
          case error.POSITION_UNAVAILABLE: setLocationError(t('search:map.locationUnavailable')); break;
          case error.TIMEOUT: setLocationError(t('search:map.locationTimeout')); break;
          default: setLocationError(t('search:map.locationError'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [t, validateAndMove]);

  // --- Street / Satellite ---
  const handleMapTypeToggle = useCallback((type: 'roadmap' | 'satellite') => {
    setMapType(type);
    mapRef.current?.setMapTypeId(type);
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

      {/* Search + geolocation */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => predictions.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (predictions.length > 0) handlePredictionSelect(predictions[0]);
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

          {/* Predictions dropdown */}
          {showResults && predictions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {predictions.map((pred) => (
                <button
                  key={pred.place_id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePredictionSelect(pred)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {pred.structured_formatting.main_text}
                      </p>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {pred.structured_formatting.secondary_text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {/* Google attribution required */}
              <div className="px-4 py-2 flex justify-end">
                <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" className="h-4" />
              </div>
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
          />
        </div>

        {/* Street / Satellite toggle */}
        <div className="absolute top-3 right-3 z-[999] bg-white rounded-lg shadow-md border border-neutral-200 flex p-1 gap-1">
          <button
            type="button"
            onClick={() => handleMapTypeToggle('roadmap')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${mapType === 'roadmap' ? 'bg-primary text-white shadow' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            {t('search:map.street')}
          </button>
          <button
            type="button"
            onClick={() => handleMapTypeToggle('satellite')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${mapType === 'satellite' ? 'bg-primary text-white shadow' : 'text-neutral-600 hover:bg-neutral-100'}`}
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
