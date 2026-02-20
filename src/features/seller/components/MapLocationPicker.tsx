import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { searchLocation, reverseGeocode } from '@/services/osmService';
import { NominatimResult } from '@/types';
import { useAppContext } from '@/context/AppContext';

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
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({ lat, lng, address, zoom = 15, country, city, cityLat, cityLng, onLocationChange, onAddressChange }) => {
  const { t } = useTranslation(['search']);
  const { dispatch } = useAppContext();
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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
    }).setView([lat, lng], zoom);

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

    marker.bindPopup(`<b>${t('search:map.dragToAdjust')}</b><br>${address}`).openPopup();

    // Handle marker drag
    marker.on('dragstart', () => {
      setIsDragging(true);
    });

    marker.on('dragend', async (e) => {
      const position = e.target.getLatLng();
      setIsDragging(false);

      // If city is selected, validate that the dragged location is within the city area
      if (city && cityLat && cityLng) {
        const distance = calculateDistance(cityLat, cityLng, position.lat, position.lng);
        if (distance > 30) {
          // Snap marker back to previous position
          marker.setLatLng([lat, lng]);
          marker.setPopupContent(`<b>${t('search:map.locationTooFarTitle', 'Location Too Far')}</b><br>${t('search:map.locationTooFar', { distance: distance.toFixed(1), city })}`);
          marker.openPopup();
          dispatch({
            type: 'SHOW_ALERT',
            payload: {
              type: 'warning',
              title: t('search:map.locationTooFarTitle', 'Location Too Far'),
              message: t('search:map.locationTooFar', { distance: distance.toFixed(1), city }),
            },
          });
          return;
        }
      }

      onLocationChange(position.lat, position.lng);
      marker.setPopupContent(`<b>${t('search:map.locationSet')}</b><br>Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}`);
      marker.openPopup();

      // Reverse geocode to get address for the new pin location
      if (onAddressChange) {
        try {
          const result = await reverseGeocode(position.lat, position.lng);
          if (result) {
            // Use the full display_name to preserve complete location information
            const locationName = result.display_name;
            onAddressChange(locationName);
          }
        } catch (error) {
          // Error removed
        }
      }
    });

    marker.on('drag', (e) => {
      const position = e.target.getLatLng();
      marker.setPopupContent(`<b>${t('search:map.dragging')}</b><br>Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}`);
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

      markerRef.current.setPopupContent(`<b>${t('search:map.dragToAdjust')}</b><br>${address}`);

      // Open popup after animation (no resize needed)
      const popupDelay = distance > 500 ? 900 : (distance > 100 ? 550 : 0);
      setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.openPopup();
        }
      }, popupDelay);
    }
  }, [lat, lng, address, zoom, isDragging]);

  // Handle location search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Get country code from country name if available
        const countryCodeMap: { [key: string]: string } = {
          'Serbia': 'RS',
          'Kosovo': 'XK',
          'Albania': 'AL',
          'North Macedonia': 'MK',
          'Bosnia and Herzegovina': 'BA',
          'Montenegro': 'ME',
          'Croatia': 'HR',
          'Slovenia': 'SI',
          'Bulgaria': 'BG',
          'Romania': 'RO',
          'Greece': 'GR',
        };
        const countryCode = country ? countryCodeMap[country] : undefined;
        let results = await searchLocation(query, countryCode);

        // If city is selected, filter results to only show locations within ~30km of the city center
        if (city && cityLat && cityLng) {
          results = results.filter(result => {
            const resultLat = parseFloat(result.lat);
            const resultLng = parseFloat(result.lon);
            const distance = calculateDistance(cityLat, cityLng, resultLat, resultLng);
            return distance <= 30; // Only show results within 30km of city center
          });
        }

        setSearchResults(results.slice(0, 8)); // Show top 8 results
      } catch (error) {
        // Error removed
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Handle result selection
  const handleResultSelect = (result: NominatimResult) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);

    // If city is selected, validate that the location is within the city area
    if (city && cityLat && cityLng) {
      const distance = calculateDistance(cityLat, cityLng, newLat, newLng);
      if (distance > 30) {
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'warning',
            title: t('search:map.locationTooFarTitle', 'Location Too Far'),
            message: t('search:map.locationTooFar', { distance: distance.toFixed(1), city }),
          },
        });
        return;
      }
    }

    // Directly move marker and map (don't rely solely on prop re-render)
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      markerRef.current.setPopupContent(`<b>${t('search:map.locationSet')}</b><br>Lat: ${newLat.toFixed(6)}, Lng: ${newLng.toFixed(6)}`);
      markerRef.current.openPopup();
    }

    // Update parent state
    onLocationChange(newLat, newLng);

    // Use the full display_name as the address to preserve complete location information
    // For example: "20, Nazmi Mustafa, Qyteza Pejton, Prishtinë, Komuna e Prishtinës / Opština Priština, Rajoni i Prishtinës / Prištinski okrug, 10000, Kosova / Kosovo"
    const locationName = result.display_name;

    // Update address if callback is provided
    if (onAddressChange) {
      onAddressChange(locationName);
    }

    // Fly to the location with optimized animation
    if (mapRef.current) {
      mapRef.current.flyTo([newLat, newLng], 16, {
        duration: 1.0, // Reduced from 1.5
        easeLinearity: 0.4 // Faster ease
      });
    }

    setSearchQuery(result.display_name);
    setShowResults(false);
    setSearchResults([]);
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

        // If city is selected, validate that the current location is within the city area
        if (city && cityLat && cityLng) {
          const distance = calculateDistance(cityLat, cityLng, latitude, longitude);
          if (distance > 30) {
            setIsGettingLocation(false);
            dispatch({
              type: 'SHOW_ALERT',
              payload: {
                type: 'warning',
                title: t('search:map.locationTooFarTitle', 'Location Too Far'),
                message: t('search:map.locationTooFar', { distance: distance.toFixed(1), city }),
              },
            });
            return;
          }
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
        <p className="text-sm font-medium text-neutral-700">{t('search:map.propertyLocation')}</p>
        <p className="text-xs text-neutral-500">{t('search:map.searchNavigatePin')}</p>
      </div>

      {/* Search box with geolocation button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (searchResults.length > 0) {
                  handleResultSelect(searchResults[0]);
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
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleResultSelect(result)}
                className="w-full text-left px-4 py-3 hover:bg-neutral-100 border-b border-neutral-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
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
