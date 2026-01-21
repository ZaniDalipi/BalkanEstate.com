import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  Rectangle,
  HeatmapLayer,
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

// Google Maps libraries to load
const libraries: ('visualization' | 'places' | 'geometry')[] = ['visualization'];

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
const createMarkerIcon = (
  price: number,
  isPromoted: boolean,
  isHovered: boolean,
  propertyType?: string
): string => {
  // Colors based on state
  let bgColor = '#1a1a1a'; // Default dark
  if (isPromoted) bgColor = '#7c3aed'; // Purple for promoted
  if (isHovered) bgColor = '#0252CD'; // Blue for hovered

  const text = formatPrice(price);
  const width = Math.max(55, text.length * 8 + 20);
  const height = 36;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="${width - 4}" height="${height - 10}" rx="6" fill="${bgColor}" filter="url(#shadow)" />
      <polygon points="${width/2 - 6},${height - 8} ${width/2},${height} ${width/2 + 6},${height - 8}" fill="${bgColor}" />
      <text x="${width/2}" y="${height/2 - 2}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="white" text-anchor="middle">${text}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Legend component with property type colors
const Legend: React.FC<{ showHeatMap?: boolean }> = ({ showHeatMap }) => (
  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100 min-w-[200px]">
    <h4 className="text-sm font-semibold text-gray-800 mb-3">Map Legend</h4>
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-6 bg-[#1a1a1a] rounded-md text-[10px] text-white flex items-center justify-center font-bold shadow-sm">€50K</div>
        <span className="text-xs text-gray-600">Standard Listing</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-12 h-6 bg-[#7c3aed] rounded-md text-[10px] text-white flex items-center justify-center font-bold shadow-sm">€50K</div>
        <span className="text-xs text-gray-600">Promoted</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-12 h-6 bg-[#0252CD] rounded-md text-[10px] text-white flex items-center justify-center font-bold shadow-sm">€50K</div>
        <span className="text-xs text-gray-600">Selected/Hovered</span>
      </div>
      {showHeatMap && (
        <>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <span className="text-xs font-medium text-gray-700">Heat Map</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full h-3 rounded bg-gradient-to-r from-green-400 via-yellow-400 to-red-500" />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Low density</span>
            <span>High density</span>
          </div>
        </>
      )}
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
  drawnBounds,
  onDrawComplete,
  isDrawing,
  onDrawStart,
  flyToTarget,
  onFlyComplete,
  onRecenter,
  isMobile,
  hoveredPropertyId,
}) => {
  const { t } = useTranslation(['search']);
  const { dispatch } = useAppContext();

  // State
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState<google.maps.LatLng | null>(null);
  const [tempDrawRect, setTempDrawRect] = useState<google.maps.LatLngBounds | null>(null);

  // Layer toggles
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true);

  // Refs
  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
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

  // Heat map data
  const heatMapData = useMemo(() => {
    if (!isLoaded || !showHeatMap) return [];
    return validProperties.map((p) => ({
      location: new google.maps.LatLng(p.lat!, p.lng!),
      weight: 1,
    }));
  }, [validProperties, isLoaded, showHeatMap]);

  // Map styles for cleaner look
  const mapStyles: google.maps.MapTypeStyle[] = useMemo(() => {
    if (mapType === 'satellite' || mapType === 'hybrid') return [];
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: showLandmarks ? 'on' : 'off' }],
      },
      {
        featureType: 'poi.business',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
      },
    ];
  }, [mapType, showLandmarks]);

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
    gestureHandling: 'greedy',
    scrollwheel: true,
    draggable: !isDrawing,
    styles: mapStyles,
  }), [mapType, isMobile, isDrawing, mapStyles]);

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

      const listener = map.addListener('idle', () => {
        onFlyComplete();
        google.maps.event.removeListener(listener);
      });
    }
  }, [map, flyToTarget, onFlyComplete]);

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

  // Custom drawing handlers
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
        {/* Heat Map Layer */}
        {showHeatMap && heatMapData.length > 0 && (
          <HeatmapLayer
            data={heatMapData}
            options={{
              radius: 30,
              opacity: 0.6,
              gradient: [
                'rgba(0, 255, 0, 0)',
                'rgba(0, 255, 0, 1)',
                'rgba(255, 255, 0, 1)',
                'rgba(255, 128, 0, 1)',
                'rgba(255, 0, 0, 1)',
              ],
            }}
          />
        )}

        {/* Temporary drawing rectangle */}
        {tempDrawRect && (
          <Rectangle
            bounds={tempDrawRect}
            options={{
              fillColor: '#0252CD',
              fillOpacity: 0.15,
              strokeWeight: 2,
              strokeColor: '#0252CD',
              clickable: false,
            }}
          />
        )}

        {/* Property Markers */}
        {!showHeatMap && validProperties.map((property) => (
          <Marker
            key={property.id}
            position={{ lat: property.lat!, lng: property.lng! }}
            icon={{
              url: createMarkerIcon(
                property.price,
                property.isPromoted || false,
                hoveredPropertyId === property.id,
                property.propertyType
              ),
              scaledSize: new google.maps.Size(
                Math.max(55, formatPrice(property.price).length * 8 + 20),
                36
              ),
              anchor: new google.maps.Point(
                Math.max(55, formatPrice(property.price).length * 8 + 20) / 2,
                36
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
              pixelOffset: new google.maps.Size(0, -36),
              maxWidth: 320,
            }}
          >
            <div
              className="cursor-pointer"
              onClick={() => handlePropertyClick(selectedProperty.id)}
            >
              {selectedProperty.images && selectedProperty.images[0] && (
                <img
                  src={selectedProperty.images[0].url}
                  alt={selectedProperty.title || selectedProperty.address}
                  className="w-full h-36 object-cover rounded-t-lg -mt-3 -mx-3 mb-3"
                  style={{ width: 'calc(100% + 24px)' }}
                />
              )}
              <div className="px-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-xl text-primary">
                    €{selectedProperty.price.toLocaleString()}
                  </p>
                  {selectedProperty.isPromoted && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-full">
                      PROMOTED
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 font-medium mt-1 line-clamp-2">
                  {selectedProperty.title || selectedProperty.address}
                </p>
                {(selectedProperty.beds || selectedProperty.baths || selectedProperty.sqft) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    {selectedProperty.beds && (
                      <span className="flex items-center gap-1">
                        <span>🛏️</span> {selectedProperty.beds} beds
                      </span>
                    )}
                    {selectedProperty.baths && (
                      <span className="flex items-center gap-1">
                        <span>🚿</span> {selectedProperty.baths} baths
                      </span>
                    )}
                    {selectedProperty.sqft && (
                      <span className="flex items-center gap-1">
                        <span>📐</span> {selectedProperty.sqft}m²
                      </span>
                    )}
                  </div>
                )}
                <button className="w-full mt-3 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                  View Details →
                </button>
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Drawn bounds rectangle */}
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
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10 flex items-center gap-1.5">
              <button
                onClick={onRecenter}
                className="p-2 rounded-full transition-colors hover:bg-black/10"
                title={t('search:map.centerOnLocation')}
              >
                <CrosshairsIcon className="w-5 h-5 text-neutral-700" />
              </button>

              <div className="w-px h-6 bg-neutral-300" />

              <div className="flex items-center bg-neutral-100 p-0.5 rounded-full">
                <button
                  onClick={() => setMapType('roadmap')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mapType === 'roadmap'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mapType === 'satellite'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  Satellite
                </button>
                <button
                  onClick={() => setMapType('terrain')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mapType === 'terrain'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  Terrain
                </button>
              </div>

              <div className="w-px h-6 bg-neutral-300" />

              <button
                onClick={onDrawStart}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
                  isDrawing
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-neutral-800 text-white hover:bg-neutral-900'
                }`}
              >
                {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                <span>{isDrawing ? 'Cancel' : 'Draw Area'}</span>
              </button>
            </div>

            {/* Layer toggles */}
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10">
              <button
                onClick={() => setShowHeatMap(!showHeatMap)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full transition-all ${
                  showHeatMap
                    ? 'bg-orange-500 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
                title="Toggle heat map"
              >
                <span>🔥</span>
                <span>Heat Map</span>
              </button>

              <button
                onClick={() => setShowLandmarks(!showLandmarks)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full transition-all ${
                  showLandmarks
                    ? 'bg-blue-500 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
                title="Toggle landmarks"
              >
                <span>🏛️</span>
                <span>POI</span>
              </button>

              <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full transition-all ${
                  isLegendOpen
                    ? 'bg-amber-500 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
                title="Toggle legend"
              >
                <MapLegendIcon className="w-4 h-4" />
                <span>Legend</span>
              </button>
            </div>

            {/* Drawn bounds actions */}
            {drawnBounds && !isDrawing && (
              <div className="flex items-center gap-2 animate-fade-in">
                {isAuthenticated && (
                  <button
                    onClick={onSaveSearch}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-full shadow-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    <SearchPlusIcon className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Search'}</span>
                  </button>
                )}
                <button
                  onClick={() => onDrawComplete(null)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-neutral-900"
                >
                  <XCircleIcon className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Legend */}
          {isLegendOpen && (
            <div className="absolute bottom-12 left-4 z-[1000] animate-fade-in">
              <Legend showHeatMap={showHeatMap} />
            </div>
          )}

          {/* Property count badge */}
          <div className="absolute top-4 left-4 z-[1000]">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-white/50">
              <span className="text-sm font-semibold text-neutral-800">
                {validProperties.length} {validProperties.length === 1 ? 'property' : 'properties'}
              </span>
            </div>
          </div>
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
                  className="flex flex-col gap-1.5 p-3 rounded-2xl shadow-2xl border border-white/30 min-w-[180px]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  }}
                >
                  <button
                    onClick={() => setShowHeatMap(!showHeatMap)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${
                      showHeatMap ? 'bg-orange-500 text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'
                    }`}
                  >
                    <span className="text-lg">🔥</span>
                    <span className="text-sm font-medium">Heat Map</span>
                  </button>

                  <button
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${
                      showLandmarks ? 'bg-blue-500 text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'
                    }`}
                  >
                    <span className="text-lg">🏛️</span>
                    <span className="text-sm font-medium">Points of Interest</span>
                  </button>

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
                  background: 'rgba(255, 255, 255, 0.9)',
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
              {(showHeatMap || !showLandmarks) && !isLayerMenuOpen && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                  {[showHeatMap, !showLandmarks].filter(Boolean).length}
                </span>
              )}
            </button>

            {isLegendOpen && !isLayerMenuOpen && (
              <div className="absolute bottom-16 left-0 pointer-events-auto">
                <Legend showHeatMap={showHeatMap} />
              </div>
            )}
          </div>

          {/* Mobile: Top right controls */}
          <div className="absolute top-16 right-2 z-[999] md:hidden">
            <div className="flex flex-col gap-1.5 items-end">
              <div
                className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                }}
              >
                <button
                  onClick={() => setMapType('roadmap')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                    mapType === 'roadmap'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                    mapType === 'satellite' || mapType === 'hybrid'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                >
                  Satellite
                </button>

                <div className="w-px h-6 bg-neutral-300" />

                <button
                  onClick={onRecenter}
                  className="p-2 rounded-xl hover:bg-white/50 text-neutral-600 active:scale-95"
                  title={t('search:map.centerOnLocation')}
                >
                  <CrosshairsIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={onDrawStart}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 ${
                    isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'
                  }`}
                >
                  {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                  <span className="text-xs font-semibold">{isDrawing ? 'Cancel' : 'Draw'}</span>
                </button>
              </div>

              {/* Drawn bounds actions */}
              {drawnBounds && !isDrawing && (
                <div
                  className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30 animate-fade-in"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  }}
                >
                  {isAuthenticated && (
                    <button
                      onClick={onSaveSearch}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg disabled:opacity-50 transition-all text-xs font-semibold"
                    >
                      <SearchPlusIcon className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg transition-all text-xs font-semibold"
                  >
                    <XCircleIcon className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Property count */}
          <div className="absolute top-16 left-2 z-[999] md:hidden">
            <div
              className="px-3 py-1.5 rounded-xl shadow-lg border border-white/30"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <span className="text-xs font-semibold text-neutral-800">
                {validProperties.length} listings
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GoogleMapComponent;
