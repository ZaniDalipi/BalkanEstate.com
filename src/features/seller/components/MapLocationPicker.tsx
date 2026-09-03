import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { reverseGeocode } from '@/services/osmService';
import { useAppContext } from '@/context/AppContext';
import { checkCityArea, findCityCentre, formatDistanceKm, getCityAreaRadiusKm } from '@/shared/geo';
import { MIN_QUERY_LENGTH, useLocationSearch, type LocationSuggestion } from '../hooks/useLocationSearch';

// Fix for default markers in Leaflet with Vite/webpack bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapLocationPickerProps {
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
  /**
   * Reports the map's zoom whenever the user settles on a new one. Set by
   * callers that store a zoom level alongside the pin (the villa-destination
   * admin), so "how close the map was" is captured from the map itself rather
   * than typed in as a number.
   */
  onZoomChange?: (zoom: number) => void;
  /** Overrides the heading for callers that are not pinning a property. */
  title?: string;
  autoDetectLocation?: boolean;
  /**
   * Skip the "must be near the selected city" check. Set by admin tools, which
   * correct listings whose city and pin legitimately disagree.
   */
  allowOutsideCityArea?: boolean;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({ lat, lng, address, zoom = 15, country, city, cityLat, cityLng, onLocationChange, onAddressChange, onZoomChange, title, autoDetectLocation, allowOutsideCityArea = false }) => {
  const { t } = useTranslation(['search']);
  const { dispatch } = useAppContext();
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Callers that know the city centre pass it in; the rest (e.g. the business
  // directory forms) only know the names, so fall back to the canonical list.
  const cityCentre = useMemo(() => {
    if (Number.isFinite(cityLat) && Number.isFinite(cityLng)) {
      return { lat: cityLat as number, lng: cityLng as number };
    }
    const known = findCityCentre(country, city);
    return known ? { lat: known.lat, lng: known.lng } : null;
  }, [cityLat, cityLng, country, city]);

  const cityRadiusKm = useMemo(() => getCityAreaRadiusKm(country, city), [country, city]);

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    suggestions,
    isSearching,
    resolveSuggestion,
    reset: resetSearch,
  } = useLocationSearch({ country, city, cityCentre, radiusKm: cityRadiusKm, allowOutsideCityArea });

  // Use refs to hold current prop values so event handlers always access latest values
  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const addressRef = useRef(address);

  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);
  useEffect(() => { addressRef.current = address; }, [address]);

  /**
   * Reject pins that fall outside the selected city's area, showing the seller
   * how far off they are. Returns true when the pin is acceptable.
   */
  const acceptPin = useCallback((newLat: number, newLng: number): boolean => {
    if (allowOutsideCityArea || !city) return true;

    const { isWithinArea, distanceKm } = checkCityArea(
      { lat: newLat, lng: newLng },
      cityCentre,
      { country, city }
    );
    if (isWithinArea) return true;

    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'warning',
        title: t('search:map.locationTooFarTitle', 'Location Too Far'),
        message: t('search:map.locationTooFar', {
          distance: formatDistanceKm(distanceKm),
          city,
          radius: Math.round(cityRadiusKm),
        }),
      },
    });
    return false;
  }, [allowOutsideCityArea, city, country, cityCentre, cityRadiusKm, dispatch, t]);

  // Leaflet handlers are bound once on mount, so they call through this ref to
  // reach the current check rather than the one from the first render.
  const acceptPinRef = useRef(acceptPin);
  useEffect(() => { acceptPinRef.current = acceptPin; }, [acceptPin]);

  // Same reason: the zoom handler is bound with the map and would otherwise
  // hold the callback identity from the first render forever.
  const onZoomChangeRef = useRef(onZoomChange);
  useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map with performance optimizations
    const map = L.map(mapContainerRef.current, {
      minZoom: 6,  // Allow zooming out to see entire region
      maxZoom: 19,
      zoomControl: true, // Enable zoom controls
      preferCanvas: true, // Use canvas renderer for better performance
      updateWhenIdle: true, // Only update map after user stops interacting
      updateWhenZooming: false, // Don't update during zoom animation
      keepBuffer: 2, // Keep 2 screens worth of tiles in buffer for smoother panning
    } as any).setView([lat, lng], zoom);

    // Create street view layer with performance optimizations
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 6,
      keepBuffer: 2, // Keep extra tiles loaded for smoother experience
      updateWhenIdle: true, // Only load tiles when idle
      updateWhenZooming: false, // Don't load tiles during zoom
      updateInterval: 150, // Throttle tile loading
    });

    // Create satellite view layer with performance optimizations
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, Maxar',
      maxZoom: 19,
      minZoom: 6,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
      updateInterval: 150,
    });

    // Start with street layer
    streetLayer.addTo(map);
    streetLayerRef.current = streetLayer;
    satelliteLayerRef.current = satelliteLayer;

    // Add draggable marker
    const marker = L.marker([lat, lng], {
      draggable: true,
      autoPan: true,
    }).addTo(map);

    marker.bindPopup(`<b>${t('search:map.dragToAdjust')}</b><br>${address.length > 60 ? address.slice(0, 60) + '…' : address}`, { maxWidth: 220 }).openPopup();

    // Shared logic for moving the marker to a new position, used by both
    // marker drag-end and map click (tap-to-pin, like Google Maps).
    const moveMarkerTo = async (newLat: number, newLng: number) => {
      if (!acceptPinRef.current(newLat, newLng)) {
        // Snap the marker back to the last accepted position.
        marker.setLatLng([latRef.current, lngRef.current]);
        marker.setPopupContent(`<b>${t('search:map.locationTooFarTitle', 'Location Too Far')}</b>`);
        marker.openPopup();
        return;
      }

      marker.setLatLng([newLat, newLng]);
      onLocationChange(newLat, newLng);
      marker.setPopupContent(`<b>${t('search:map.locationSet')}</b><br>Lat: ${newLat.toFixed(6)}, Lng: ${newLng.toFixed(6)}`);
      marker.openPopup();

      // Reverse geocode to get address for the new pin location
      if (onAddressChange) {
        try {
          const result = await reverseGeocode(newLat, newLng);
          if (result) {
            // Use the full display_name to preserve complete location information
            const locationName = result.display_name;
            onAddressChange(locationName);
          }
        } catch (error) {
          // Error removed
        }
      }
    };

    // Handle marker drag
    marker.on('dragstart', () => {
      setIsDragging(true);
    });

    marker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      setIsDragging(false);
      moveMarkerTo(position.lat, position.lng);
    });

    marker.on('drag', (e) => {
      const position = e.target.getLatLng();
      marker.setPopupContent(`<b>${t('search:map.dragging')}</b><br>Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}`);
    });

    // Tap/click anywhere on the map to move the marker there, like pinning in Google Maps
    map.on('click', (e: L.LeafletMouseEvent) => {
      moveMarkerTo(e.latlng.lat, e.latlng.lng);
    });

    // `zoomend`, not `zoom`: the level is reported once the user has settled on
    // it, not for every intermediate frame of a pinch or a wheel spin.
    map.on('zoomend', () => {
      onZoomChangeRef.current?.(map.getZoom());
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Debounced resize function to prevent performance issues
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        if (map && map.getContainer()) {
          map.invalidateSize({ pan: false }); // Don't pan, just resize
        }
      }, 150); // Debounce by 150ms
    };

    // Set up ResizeObserver with debouncing to handle container size changes
    const resizeObserver = new ResizeObserver(debouncedResize);

    const mapContainer = map.getContainer();
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    // Single initial resize after mount
    const initialResizeTimer = setTimeout(() => {
      if (map && map.getContainer()) {
        map.invalidateSize({ pan: false });
      }
    }, 100);

    // Cleanup
    return () => {
      if (initialResizeTimer) {
        clearTimeout(initialResizeTimer);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (mapContainer) {
        resizeObserver.unobserve(mapContainer);
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Auto-detect user's current location on mount when no saved location exists
  useEffect(() => {
    if (!autoDetectLocation || !navigator.geolocation) return;

    // Small delay to ensure map is fully initialized
    const timer = setTimeout(() => {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          onLocationChange(latitude, longitude);

          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 16, {
              duration: 1.0,
              easeLinearity: 0.4,
            });
          }

          if (onAddressChange) {
            try {
              const result = await reverseGeocode(latitude, longitude);
              if (result) {
                onAddressChange(result.display_name);
                setSearchQuery(result.display_name);
              }
            } catch {
              // Reverse geocode failed silently
            }
          }

          setIsGettingLocation(false);
        },
        () => {
          // Geolocation failed silently — user can manually pick location
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [autoDetectLocation]); // Only run when autoDetectLocation changes

  // Update marker position when lat/lng changes externally with optimized animation
  useEffect(() => {
    if (markerRef.current && mapRef.current && !isDragging) {
      const newLatLng = L.latLng(lat, lng);
      const currentLatLng = markerRef.current.getLatLng();

      // Calculate distance between current and new position (in meters)
      const distance = currentLatLng.distanceTo(newLatLng);

      // Update marker position
      markerRef.current.setLatLng(newLatLng);

      // Use faster, simpler animations to reduce lag
      if (distance > 500) {
        // For large distances, use flyTo with shorter duration
        mapRef.current.flyTo(newLatLng, Math.max(zoom, 15), {
          duration: 0.8, // Reduced from 1.0
          easeLinearity: 0.4 // Faster ease
        });
      } else if (distance > 100) {
        // For medium distances, use simple panTo
        mapRef.current.panTo(newLatLng, { duration: 0.5 });
      } else {
        // For small distances, instant move
        mapRef.current.setView(newLatLng, mapRef.current.getZoom(), { animate: false });
      }

      markerRef.current.setPopupContent(`<b>${t('search:map.dragToAdjust')}</b><br>${address.length > 60 ? address.slice(0, 60) + '…' : address}`);

      // Open popup after animation (no resize needed)
      const popupDelay = distance > 500 ? 900 : (distance > 100 ? 550 : 0);
      setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.openPopup();
        }
      }, popupDelay);
    }
  }, [lat, lng, address, zoom, isDragging]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowResults(true);
  };

  /**
   * Move the pin to a chosen suggestion.
   *
   * Google predictions carry no coordinates, so they are resolved first; the
   * city-area check then runs against the real position rather than the
   * prediction's reported distance.
   */
  const handleResultSelect = async (suggestion: LocationSuggestion) => {
    const resolved = await resolveSuggestion(suggestion);
    if (!resolved) {
      setLocationError(t('search:map.locationLookupFailed', 'Could not look up that place. Please try another result or drop the pin on the map.'));
      return;
    }

    const { lat: newLat, lng: newLng, address: locationName } = resolved;
    if (!acceptPin(newLat, newLng)) return;

    setLocationError(null);

    // Move marker and map directly rather than waiting on the prop round trip.
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      markerRef.current.setPopupContent(`<b>${t('search:map.locationSet')}</b><br>Lat: ${newLat.toFixed(6)}, Lng: ${newLng.toFixed(6)}`);
      markerRef.current.openPopup();
    }

    onLocationChange(newLat, newLng);
    onAddressChange?.(locationName);

    if (mapRef.current) {
      mapRef.current.flyTo([newLat, newLng], 16, {
        duration: 1.0,
        easeLinearity: 0.4,
      });
    }

    setSearchQuery(locationName);
    setShowResults(false);
    resetSearch();
  };

  // Handle map type toggle (street/satellite)
  const handleMapTypeToggle = (newMapType: 'street' | 'satellite') => {
    setMapType(newMapType);

    if (mapRef.current && streetLayerRef.current && satelliteLayerRef.current) {
      if (newMapType === 'satellite') {
        if (mapRef.current.hasLayer(streetLayerRef.current)) {
          mapRef.current.removeLayer(streetLayerRef.current);
        }
        mapRef.current.addLayer(satelliteLayerRef.current);
      } else {
        if (mapRef.current.hasLayer(satelliteLayerRef.current)) {
          mapRef.current.removeLayer(satelliteLayerRef.current);
        }
        mapRef.current.addLayer(streetLayerRef.current);
      }
    }
  };

  // Get user's current location using browser geolocation
  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError(t('search:map.geolocationNotSupported'));
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        if (!acceptPin(latitude, longitude)) {
          setIsGettingLocation(false);
          return;
        }

        // Update location
        onLocationChange(latitude, longitude);

        // Fly to the location
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 16, {
            duration: 1.0,
            easeLinearity: 0.4
          });
        }

        // Reverse geocode to get address
        if (onAddressChange) {
          try {
            const result = await reverseGeocode(latitude, longitude);
            if (result) {
              const locationName = result.display_name;
              onAddressChange(locationName);
              setSearchQuery(locationName);
            }
          } catch (error) {
            // Error removed
          }
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
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">{title ?? t('search:map.propertyLocation')}</p>
        <p className="text-xs text-neutral-500">{t('search:map.searchNavigatePin')}</p>
      </div>

      {/* Make the allowed area explicit, so a rejected pin is never a surprise */}
      {city && !allowOutsideCityArea && (
        <p className="text-xs text-neutral-500">
          {t('search:map.searchAreaHint', { radius: Math.round(cityRadiusKm), city })}
        </p>
      )}

      {/* Search box with geolocation button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => suggestions.length > 0 && setShowResults(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions.length > 0) {
                  void handleResultSelect(suggestions[0]);
                }
              }
            }}
            placeholder={t('search:map.searchPlaceholder')}
            className="w-full px-4 py-2.5 pr-10 text-sm border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            autoComplete="off"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

        {/* Search results dropdown */}
        {showResults && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-64 overflow-y-auto" role="listbox">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  onClick={() => void handleResultSelect(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-100 border-b border-neutral-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{suggestion.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">
                        {suggestion.subtitle || t('search:map.location')}
                        {suggestion.distanceKm !== undefined && Number.isFinite(suggestion.distanceKm) && (
                          <span className="text-neutral-400"> · {formatDistanceKm(suggestion.distanceKm)}km</span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state — only once a search has actually run and come back */}
        {showResults && !isSearching && suggestions.length === 0 && searchQuery.trim().length >= MIN_QUERY_LENGTH && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg px-4 py-3">
            <p className="text-sm text-neutral-500">{t('search:map.noSearchResults')}</p>
          </div>
        )}
        </div>

        {/* Get current location button */}
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          title={t('search:map.useMyLocation')}
        >
          {isGettingLocation ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          )}
          <span className="hidden sm:inline">{t('search:map.useMyLocation')}</span>
        </button>
      </div>

      {/* Location error message */}
      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">{locationError}</p>
        </div>
      )}

      {/* Map */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="w-full h-96 rounded-lg border-2 border-neutral-300 shadow-sm"
          style={{ zIndex: 0 }}
        />

        {/* Map type toggle buttons */}
        <div className="absolute top-3 right-3 z-[999] bg-white rounded-lg shadow-md border border-neutral-200 flex p-1 gap-1">
          <button
            type="button"
            onClick={() => handleMapTypeToggle('street')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              mapType === 'street'
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
        <p className="text-xs text-blue-800">
          {t('search:map.tips')}
        </p>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
          <span className="text-neutral-500">{t('search:map.latitude')}</span> <span className="font-mono font-semibold text-neutral-800">{lat.toFixed(6)}</span>
        </div>
        <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
          <span className="text-neutral-500">{t('search:map.longitude')}</span> <span className="font-mono font-semibold text-neutral-800">{lng.toFixed(6)}</span>
        </div>
      </div>
    </div>
  );
};

export default MapLocationPicker;
