import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  Rectangle,
} from '@react-google-maps/api';
import { Property } from '@/types';
import L from 'leaflet';
import { useAppContext } from '@/context/AppContext';
import {
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
} from '@/constants';

// Balkan region bounds
const BALKAN_BOUNDS = {
  north: 49,
  south: 34,
  west: 13,
  east: 31,
};

// Map container style
const containerStyle = {
  width: '100%',
  height: '100%',
};

// Default center (Balkans)
const defaultCenter = {
  lat: 41.5,
  lng: 22,
};

// Google Maps libraries to load - empty since we're not using DrawingManager
const libraries: ('places' | 'geometry')[] = [];

// Price formatter
const formatPrice = (price: number): string => {
  if (price >= 1000000) {
    return `€${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `€${Math.round(price / 1000)}K`;
  }
  return `€${price}`;
};

// Custom marker icons as SVG data URLs
const createMarkerIcon = (price: number, isPromoted: boolean, isHovered: boolean): string => {
  const bgColor = isPromoted ? '#7c3aed' : isHovered ? '#0252CD' : '#1a1a1a';
  const text = formatPrice(price);
  const width = Math.max(50, text.length * 8 + 16);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="32" viewBox="0 0 ${width} 32">
      <rect x="0" y="0" width="${width}" height="26" rx="4" fill="${bgColor}" />
      <polygon points="${width/2 - 6},26 ${width/2},32 ${width/2 + 6},26" fill="${bgColor}" />
      <text x="${width/2}" y="18" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${text}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Simple Legend component
const Legend: React.FC = () => (
  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100 min-w-[180px]">
    <h4 className="text-sm font-semibold text-gray-800 mb-3">Property Types</h4>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-5 bg-[#1a1a1a] rounded text-[10px] text-white flex items-center justify-center font-bold">€50K</div>
        <span className="text-xs text-gray-600">Standard Listing</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-5 bg-[#7c3aed] rounded text-[10px] text-white flex items-center justify-center font-bold">€50K</div>
        <span className="text-xs text-gray-600">Promoted</span>
      </div>
    </div>
  </div>
);

// Helper to convert Google Maps bounds to Leaflet bounds
const googleBoundsToLeaflet = (gBounds: google.maps.LatLngBounds): L.LatLngBounds => {
  const sw = gBounds.getSouthWest();
  const ne = gBounds.getNorthEast();
  return L.latLngBounds([sw.lat(), sw.lng()], [ne.lat(), ne.lng()]);
};

// Helper to convert Leaflet bounds to Google Maps bounds
const leafletBoundsToGoogle = (lBounds: L.LatLngBounds): google.maps.LatLngBounds => {
  const sw = lBounds.getSouthWest();
  const ne = lBounds.getNorthEast();
  return new google.maps.LatLngBounds(
    { lat: sw.lat, lng: sw.lng },
    { lat: ne.lat, lng: ne.lng }
  );
};

// Helper to convert Google Maps LatLng to Leaflet LatLng
const googleLatLngToLeaflet = (gLatLng: google.maps.LatLng): L.LatLng => {
  return L.latLng(gLatLng.lat(), gLatLng.lng());
};

// Props interface - uses Leaflet types for compatibility with SearchPage
interface GoogleMapComponentProps {
  properties: Property[];
  onMapMove: (bounds: L.LatLngBounds, center: L.LatLng) => void;
  userLocation: [number, number] | null;
  onSaveSearch: () => void;
  isSaving: boolean;
  isAuthenticated: boolean;
  mapBounds: L.LatLngBounds | null;
  drawnBounds: L.LatLngBounds | null;
  onDrawComplete: (bounds: L.LatLngBounds | null) => void;
  isDrawing: boolean;
  onDrawStart: () => void;
  flyToTarget: { center: [number, number]; zoom: number } | null;
  onFlyComplete: () => void;
  onRecenter: () => void;
  isMobile: boolean;
  searchMode: 'manual' | 'ai';
  hoveredPropertyId?: string | null;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  properties,
  onMapMove,
  userLocation,
  onSaveSearch,
  isSaving,
  isAuthenticated,
  mapBounds,
  drawnBounds,
  onDrawComplete,
  isDrawing,
  onDrawStart,
  flyToTarget,
  onFlyComplete,
  onRecenter,
  isMobile,
  searchMode,
  hoveredPropertyId,
}) => {
  const { t } = useTranslation(['search']);
  const { dispatch } = useAppContext();

  // State
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState<google.maps.LatLng | null>(null);
  const [tempDrawRect, setTempDrawRect] = useState<google.maps.LatLngBounds | null>(null);

  // Refs
  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.GOOGLE_MAPS_KEY || '',
    libraries,
  });

  // Calculate initial center and zoom
  const { center, zoom } = useMemo(() => {
    if (userLocation) {
      return {
        center: { lat: userLocation[0], lng: userLocation[1] },
        zoom: 13,
      };
    }
    return { center: defaultCenter, zoom: 7 };
  }, [userLocation]);

  // Filter valid properties
  const validProperties = useMemo(() => {
    return properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    ).slice(0, 500); // Limit for performance
  }, [properties]);

  // Map options with smooth zoom enabled by default
  const mapOptions: google.maps.MapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: !isMobile,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false,
    restriction: {
      latLngBounds: BALKAN_BOUNDS,
      strictBounds: false,
    },
    minZoom: 6,
    maxZoom: 21,
    mapTypeId: mapType,
    gestureHandling: 'greedy', // Allow single-finger pan on mobile
    // These enable smooth zoom by default in Google Maps
    scrollwheel: true,
    // Smooth zoom animation
    draggable: !isDrawing,
  }), [mapType, isMobile, isDrawing]);

  // Handle map load
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);

    // Initial bounds callback - convert to Leaflet format
    setTimeout(() => {
      const bounds = mapInstance.getBounds();
      const center = mapInstance.getCenter();
      if (bounds && center) {
        const leafletBounds = googleBoundsToLeaflet(bounds);
        const leafletCenter = googleLatLngToLeaflet(center);
        onMapMove(leafletBounds, leafletCenter);
      }
    }, 100);
  }, [onMapMove]);

  // Handle map unmount
  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle map idle (after pan/zoom ends)
  const handleIdle = useCallback(() => {
    if (!map) return;

    // Debounce to prevent spam during zoom
    if (moveDebounceRef.current) {
      clearTimeout(moveDebounceRef.current);
    }

    moveDebounceRef.current = setTimeout(() => {
      const bounds = map.getBounds();
      const center = map.getCenter();
      if (bounds && center) {
        // Convert to Leaflet format for SearchPage compatibility
        const leafletBounds = googleBoundsToLeaflet(bounds);
        const leafletCenter = googleLatLngToLeaflet(center);
        onMapMove(leafletBounds, leafletCenter);
      }
    }, 150);
  }, [map, onMapMove]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (moveDebounceRef.current) {
        clearTimeout(moveDebounceRef.current);
      }
    };
  }, []);

  // Handle fly to target
  useEffect(() => {
    if (map && flyToTarget) {
      map.panTo({ lat: flyToTarget.center[0], lng: flyToTarget.center[1] });
      map.setZoom(flyToTarget.zoom);

      // Call onFlyComplete after animation
      const listener = map.addListener('idle', () => {
        onFlyComplete();
        google.maps.event.removeListener(listener);
      });
    }
  }, [map, flyToTarget, onFlyComplete]);

  // Handle recenter
  useEffect(() => {
    if (map && userLocation) {
      // Recenter will be triggered by parent via flyToTarget
    }
  }, [map, userLocation]);

  // Handle marker click
  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedProperty(property);
  }, []);

  // Handle info window close
  const handleInfoWindowClose = useCallback(() => {
    setSelectedProperty(null);
  }, []);

  // Handle property click (navigate to property page)
  const handlePropertyClick = useCallback((propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    window.history.pushState({ propertyId }, '', `/property/${propertyId}`);
  }, [dispatch]);

  // Custom drawing handlers (no DrawingManager needed)
  const handleMapMouseDown = useCallback((e: google.maps.MapMouseEvent) => {
    if (!isDrawing || !e.latLng) return;
    setDrawStartPos(e.latLng);
    setTempDrawRect(null);
  }, [isDrawing]);

  const handleMapMouseMove = useCallback((e: google.maps.MapMouseEvent) => {
    if (!isDrawing || !drawStartPos || !e.latLng) return;

    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(
        Math.min(drawStartPos.lat(), e.latLng.lat()),
        Math.min(drawStartPos.lng(), e.latLng.lng())
      ),
      new google.maps.LatLng(
        Math.max(drawStartPos.lat(), e.latLng.lat()),
        Math.max(drawStartPos.lng(), e.latLng.lng())
      )
    );
    setTempDrawRect(bounds);
  }, [isDrawing, drawStartPos]);

  const handleMapMouseUp = useCallback(() => {
    if (!isDrawing || !tempDrawRect) {
      setDrawStartPos(null);
      return;
    }

    // Convert Google Maps bounds to Leaflet bounds for SearchPage
    const leafletBounds = googleBoundsToLeaflet(tempDrawRect);
    onDrawComplete(leafletBounds);
    setDrawStartPos(null);
    setTempDrawRect(null);
  }, [isDrawing, tempDrawRect, onDrawComplete]);

  // Update cursor when drawing mode changes
  useEffect(() => {
    if (map) {
      map.setOptions({
        draggableCursor: isDrawing ? 'crosshair' : null,
        draggingCursor: isDrawing ? 'crosshair' : null,
      });
    }
  }, [map, isDrawing]);

  // Render loading state
  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <p className="text-red-600 font-medium mb-2">Failed to load Google Maps</p>
          <p className="text-gray-500 text-sm">Please check your API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={handleIdle}
        onMouseDown={handleMapMouseDown}
        onMouseMove={handleMapMouseMove}
        onMouseUp={handleMapMouseUp}
      >
        {/* Temporary drawing rectangle */}
        {tempDrawRect && (
          <Rectangle
            bounds={tempDrawRect}
            options={{
              fillColor: '#0252CD',
              fillOpacity: 0.1,
              strokeWeight: 2,
              strokeColor: '#0252CD',
              strokeDashArray: '5,5',
              clickable: false,
            }}
          />
        )}

        {/* Property Markers */}
        {validProperties.map((property) => (
          <Marker
            key={property.id}
            position={{ lat: property.lat!, lng: property.lng! }}
            icon={{
              url: createMarkerIcon(
                property.price,
                property.isPromoted || false,
                hoveredPropertyId === property.id
              ),
              scaledSize: new google.maps.Size(
                Math.max(50, formatPrice(property.price).length * 8 + 16),
                32
              ),
              anchor: new google.maps.Point(
                Math.max(50, formatPrice(property.price).length * 8 + 16) / 2,
                32
              ),
            }}
            onClick={() => handleMarkerClick(property)}
            zIndex={
              hoveredPropertyId === property.id ? 1000 :
              property.isPromoted ? 100 : 1
            }
          />
        ))}

        {/* Info Window for selected property */}
        {selectedProperty && (
          <InfoWindow
            position={{ lat: selectedProperty.lat!, lng: selectedProperty.lng! }}
            onCloseClick={handleInfoWindowClose}
            options={{
              pixelOffset: new google.maps.Size(0, -32),
            }}
          >
            <div
              className="max-w-[280px] cursor-pointer"
              onClick={() => handlePropertyClick(selectedProperty.id)}
            >
              {selectedProperty.images && selectedProperty.images[0] && (
                <img
                  src={selectedProperty.images[0]}
                  alt={selectedProperty.title || selectedProperty.address}
                  className="w-full h-32 object-cover rounded-t-lg"
                />
              )}
              <div className="p-3">
                <p className="font-bold text-lg text-primary">
                  €{selectedProperty.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-700 font-medium truncate">
                  {selectedProperty.title || selectedProperty.address}
                </p>
                {selectedProperty.bedrooms !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedProperty.bedrooms} bed • {selectedProperty.bathrooms} bath
                    {selectedProperty.area && ` • ${selectedProperty.area}m²`}
                  </p>
                )}
                <p className="text-xs text-primary mt-2 font-medium">
                  Click to view details →
                </p>
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Drawn bounds rectangle - convert Leaflet bounds to Google Maps */}
        {drawnBounds && !isDrawing && (
          <Rectangle
            bounds={leafletBoundsToGoogle(drawnBounds)}
            options={{
              fillColor: '#0252CD',
              fillOpacity: 0.2,
              strokeWeight: 3,
              strokeColor: '#0252CD',
              clickable: false,
            }}
          />
        )}
      </GoogleMap>

      {/* Desktop Controls */}
      {!isMobile && (
        <>
          <div className="absolute bottom-12 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
            {/* Main control bar */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10 flex items-center gap-1.5 transition-all duration-300">
              <button
                onClick={onRecenter}
                className="p-1.5 rounded-full transition-colors hover:bg-black/10"
                title={t('search:map.centerOnLocation')}
              >
                <CrosshairsIcon className="w-5 h-5 text-neutral-700" />
              </button>

              <div className="flex items-center bg-neutral-200/50 p-0.5 rounded-full">
                <button
                  onClick={() => setMapType('roadmap')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'roadmap'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  {t('search:map.street')}
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'satellite'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  {t('search:map.satellite')}
                </button>
                <button
                  onClick={() => setMapType('hybrid')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'hybrid'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  Hybrid
                </button>
              </div>

              <button
                onClick={onDrawStart}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full shadow-md transition-colors ${
                  isDrawing
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-neutral-800 text-white hover:bg-neutral-900'
                }`}
              >
                {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                <span className="hidden sm:inline">{isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}</span>
              </button>
            </div>

            {/* Layer toggles */}
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10">
              <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className={`flex items-center gap-1 px-2.5 py-2.5 text-xs font-semibold rounded-full transition-all ${
                  isLegendOpen
                    ? 'bg-amber-500 text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title={t('search:map.legend', 'Legend')}
              >
                <MapLegendIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('search:map.legend', 'Legend')}</span>
              </button>
            </div>

            {/* Drawn bounds actions */}
            {drawnBounds && !isDrawing && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                {isAuthenticated && (
                  <button
                    onClick={onSaveSearch}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-full shadow-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    <SearchPlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{isSaving ? t('search:map.saving') : t('search:map.saveArea')}</span>
                  </button>
                )}
                <button
                  onClick={() => onDrawComplete(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-neutral-900"
                >
                  <XCircleIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('search:map.clearArea')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Legend */}
          {isLegendOpen && (
            <div className="absolute bottom-12 left-4 z-[1000] animate-fade-in">
              <Legend />
            </div>
          )}
        </>
      )}

      {/* Mobile Controls */}
      {isMobile && (
        <>
          {/* Mobile: Layers FAB */}
          <div className="absolute bottom-20 left-3 z-[1003] pointer-events-none md:hidden">
            {isLayerMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 pointer-events-auto">
                <div
                  className="flex flex-col gap-1.5 p-3 rounded-2xl shadow-2xl border border-white/30"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  }}
                >
                  <button
                    onClick={() => {
                      setIsLegendOpen((p) => !p);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${
                      isLegendOpen ? 'bg-amber-500 text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'
                    }`}
                  >
                    <MapLegendIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Legend</span>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className={`pointer-events-auto w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-95 border ${
                isLayerMenuOpen ? 'bg-neutral-800 text-white border-neutral-700' : 'text-neutral-700 border-white/40'
              }`}
              style={{
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                ...(isLayerMenuOpen ? {} : {
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                }),
              }}
            >
              <svg
                className="w-7 h-7"
                style={{
                  transform: isLayerMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease-out',
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>

            {isLegendOpen && !isLayerMenuOpen && (
              <div className="absolute bottom-14 left-0 pointer-events-auto">
                <Legend />
              </div>
            )}
          </div>

          {/* Mobile: Top right controls */}
          <div className="absolute top-16 right-2 z-[999] md:hidden">
            <div className="flex flex-col gap-1.5 items-end">
              <div
                className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                }}
              >
                {/* Map type buttons */}
                <button
                  onClick={() => setMapType('roadmap')}
                  className={`px-2.5 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                    mapType === 'roadmap'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-2.5 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                    mapType === 'satellite' || mapType === 'hybrid'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                >
                  Satellite
                </button>

                {/* Recenter */}
                <button
                  onClick={onRecenter}
                  className="p-2 rounded-xl hover:bg-white/50 text-neutral-600 active:scale-95"
                  title={t('search:map.centerOnLocation')}
                >
                  <CrosshairsIcon className="w-5 h-5" />
                </button>

                {/* Draw */}
                <button
                  onClick={onDrawStart}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 ${
                    isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'
                  }`}
                >
                  {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                  <span className="text-xs font-semibold">{isDrawing ? t('search:map.cancel') : t('search:map.draw', 'Draw')}</span>
                </button>
              </div>

              {/* Drawn bounds actions */}
              {drawnBounds && !isDrawing && (
                <div
                  className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30 animate-fade-in"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  }}
                >
                  {isAuthenticated && (
                    <button
                      onClick={onSaveSearch}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2 py-1 bg-primary text-white rounded-lg disabled:opacity-50 transition-all"
                    >
                      <SearchPlusIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold">{t('search:map.save', 'Save')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-lg transition-all"
                  >
                    <XCircleIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">{t('search:map.clear', 'Clear')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GoogleMapComponent;
