import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  DrawingManager,
  Rectangle,
} from '@react-google-maps/api';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import {
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
} from '@/constants';
import { formatPrice } from '@/utils/currency';
import { HighlightedPropertiesProvider } from '@/src/context/HighlightedPropertiesContext';

// Google Maps API key - must use VITE_ prefix for Vite to expose to client
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

// Map libraries to load
const libraries: ("drawing" | "geometry" | "places" | "visualization")[] = ['drawing', 'places'];

// Map styles for clean look (hide some POIs)
const mapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  }
];

// Map container style
const containerStyle = {
  width: '100%',
  height: '100%'
};

// Balkan region bounds
const BALKAN_BOUNDS = {
  north: 49,
  south: 34,
  west: 13,
  east: 31
};

// Property type colors
const PROPERTY_TYPE_COLORS: Record<string, string> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  land: '#8B4513',
  other: '#6c757d',
};

// Promotion tier colors
const PROMOTION_TIER_COLORS: Record<string, string> = {
  premium: '#FFB800',
  highlight: '#0EA5E9',
  featured: '#7C3AED',
};

interface MapComponentProps {
  properties: Property[];
  onMapMove: (bounds: any, center: any) => void;
  userLocation: [number, number] | null;
  onSaveSearch: () => void;
  isSaving: boolean;
  isAuthenticated: boolean;
  mapBounds: any | null;
  drawnBounds: any | null;
  onDrawComplete: (bounds: any | null) => void;
  isDrawing: boolean;
  onDrawStart: () => void;
  flyToTarget: { center: [number, number]; zoom: number } | null;
  onFlyComplete: () => void;
  onRecenter: () => void;
  isMobile: boolean;
  searchMode: 'manual' | 'ai';
  hoveredPropertyId?: string | null;
}

/**
 * Format price for marker display
 */
const formatMarkerPrice = (price: number): string => {
  if (price >= 1000000) {
    return `€${(price / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (price >= 1000) {
    return `€${Math.round(price / 1000)}K`;
  }
  return `€${price}`;
};

/**
 * PropertyInfoWindow Component
 */
const PropertyInfoWindow: React.FC<{
  property: Property;
  onClose: () => void;
  onPropertyClick: (id: string) => void;
}> = ({ property, onClose, onPropertyClick }) => {
  const { t } = useTranslation(['property']);

  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  return (
    <div
      className="p-3 min-w-[220px] max-w-[280px] cursor-pointer"
      onClick={() => onPropertyClick(property.id)}
    >
      {/* Image */}
      <div className="relative mb-2 rounded-lg overflow-hidden">
        <img
          src={property.imageUrl}
          alt={property.title || property.address}
          className="w-full h-28 object-cover"
        />
        {isActivelyPromoted && (
          <div className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded-lg shadow ${
            property.promotionTier === 'premium' ? 'bg-amber-500' :
            property.promotionTier === 'highlight' ? 'bg-sky-500' : 'bg-violet-500'
          }`}>
            {property.promotionTier === 'premium' ? '👑 PREMIUM' :
             property.promotionTier === 'highlight' ? '💎 HIGHLIGHT' : '⭐ FEATURED'}
          </div>
        )}
      </div>

      {/* Price & Type */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-lg text-primary">
          {formatPrice(property.price, property.country)}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 capitalize">
          {property.propertyType}
        </span>
      </div>

      {/* Title */}
      {property.title && (
        <p className="font-semibold text-sm text-neutral-900 mb-1 line-clamp-1">
          {property.title}
        </p>
      )}

      {/* Address */}
      <p className="text-xs text-neutral-500 mb-2">
        📍 {property.address}, {property.city}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <div className="text-center bg-neutral-50 rounded py-1">
          <div className="font-bold text-sm text-neutral-800">{property.beds}</div>
          <div className="text-[9px] text-neutral-500">{t('map.beds', 'Beds')}</div>
        </div>
        <div className="text-center bg-neutral-50 rounded py-1">
          <div className="font-bold text-sm text-neutral-800">{property.baths}</div>
          <div className="text-[9px] text-neutral-500">{t('map.baths', 'Baths')}</div>
        </div>
        <div className="text-center bg-neutral-50 rounded py-1">
          <div className="font-bold text-sm text-neutral-800">{property.livingRooms}</div>
          <div className="text-[9px] text-neutral-500">{t('map.living', 'Living')}</div>
        </div>
        <div className="text-center bg-neutral-100 rounded py-1">
          <div className="font-bold text-sm text-neutral-800">{property.sqft}</div>
          <div className="text-[9px] text-neutral-500">m²</div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-1 border-t border-neutral-200">
        <p className="text-xs font-semibold text-primary">{t('map.clickForDetails', 'Click for details')}</p>
      </div>
    </div>
  );
};

/**
 * Legend Component
 */
const Legend: React.FC<{ isNightMode?: boolean }> = ({ isNightMode = false }) => {
  const { t } = useTranslation(['property']);

  return (
    <div className={`${
      isNightMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-neutral-200'
    } backdrop-blur-sm p-3 rounded-lg shadow-lg border`}>
      <h4 className={`font-bold text-sm mb-2 ${isNightMode ? 'text-white' : 'text-neutral-800'}`}>
        {t('map.legend', 'Legend')}
      </h4>

      {/* Property Types */}
      <div className="space-y-1.5 mb-3">
        {Object.entries(PROPERTY_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm ${
                isNightMode ? 'border-slate-700' : 'border-white'
              }`}
              style={{ backgroundColor: color }}
            />
            <span className={`text-xs font-semibold capitalize ${isNightMode ? 'text-slate-300' : 'text-neutral-700'}`}>
              {t(`map.propertyTypes.${type}`, type)}
            </span>
          </div>
        ))}
      </div>

      {/* Promotion Tiers */}
      <div className={`border-t ${isNightMode ? 'border-slate-700' : 'border-neutral-200'} pt-2 mt-2`}>
        <h5 className={`text-xs font-bold mb-1.5 ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
          {t('map.promotedListings', 'Promoted')}
        </h5>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm ${isNightMode ? 'bg-slate-800' : 'bg-white'}`}
              style={{ borderColor: PROMOTION_TIER_COLORS.premium }} />
            <span className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
              👑 Premium
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm ${isNightMode ? 'bg-slate-800' : 'bg-white'}`}
              style={{ borderColor: PROMOTION_TIER_COLORS.highlight }} />
            <span className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
              💎 Highlight
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm ${isNightMode ? 'bg-slate-800' : 'bg-white'}`}
              style={{ borderColor: PROMOTION_TIER_COLORS.featured }} />
            <span className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
              ⭐ Featured
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * MapComponent with Google Maps
 */
const MapComponent: React.FC<MapComponentProps> = ({
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
  const mapRef = useRef<google.maps.Map | null>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [currentZoom, setCurrentZoom] = useState(7);

  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Debug: Log API key status and properties count
  useEffect(() => {
    console.log('[MapComponent] API Key loaded:', GOOGLE_MAPS_API_KEY ? 'Yes' : 'No (MISSING!)');
    console.log('[MapComponent] Properties received:', properties.length);
  }, [properties.length]);

  // Initial center
  const center = useMemo(() => {
    if (userLocation) {
      return { lat: userLocation[0], lng: userLocation[1] };
    }
    return { lat: 41.5, lng: 22 }; // Balkan center
  }, [userLocation]);

  // Filter valid properties
  const validProperties = useMemo(() => {
    const valid = properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );
    console.log('[MapComponent] Valid properties:', valid.length);
    return valid;
  }, [properties]);

  // Limit properties for performance
  const propertiesInView = useMemo(() => {
    return validProperties.slice(0, 500);
  }, [validProperties]);

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Handle map unmount
  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Handle bounds change
  const onBoundsChanged = useCallback(() => {
    if (!mapRef.current) return;

    const bounds = mapRef.current.getBounds();
    const center = mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom();

    if (bounds && center && zoom !== undefined) {
      setCurrentZoom(zoom);

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      // Convert to Leaflet-compatible format
      const leafletBounds = {
        _southWest: { lat: sw.lat(), lng: sw.lng() },
        _northEast: { lat: ne.lat(), lng: ne.lng() },
        getSouthWest: () => ({ lat: sw.lat(), lng: sw.lng() }),
        getNorthEast: () => ({ lat: ne.lat(), lng: ne.lng() }),
        getSouth: () => sw.lat(),
        getWest: () => sw.lng(),
        getNorth: () => ne.lat(),
        getEast: () => ne.lng(),
      };

      onMapMove(leafletBounds, { lat: center.lat(), lng: center.lng() });
    }
  }, [onMapMove]);

  // Fly to target
  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.panTo({
        lat: flyToTarget.center[0],
        lng: flyToTarget.center[1]
      });
      mapRef.current.setZoom(flyToTarget.zoom);

      const timer = setTimeout(onFlyComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [flyToTarget, onFlyComplete]);

  // Toggle 3D buildings (tilt the map)
  useEffect(() => {
    if (!mapRef.current) return;

    if (show3DBuildings) {
      mapRef.current.setTilt(45);
      mapRef.current.setHeading(0);
    } else {
      mapRef.current.setTilt(0);
    }
  }, [show3DBuildings]);

  // Handle property click
  const handlePropertyClick = useCallback((propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    setSelectedProperty(null);
  }, [dispatch]);

  // Handle marker click
  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedProperty(property);
  }, []);

  // Handle recenter
  const handleRecenter = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo({ lat: userLocation[0], lng: userLocation[1] });
      mapRef.current.setZoom(13);
    }
    onRecenter();
  }, [userLocation, onRecenter]);

  // Handle rectangle complete
  const onRectangleComplete = useCallback((rectangle: google.maps.Rectangle) => {
    const bounds = rectangle.getBounds();
    if (bounds) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const leafletBounds = {
        _southWest: { lat: sw.lat(), lng: sw.lng() },
        _northEast: { lat: ne.lat(), lng: ne.lng() },
        getSouthWest: () => ({ lat: sw.lat(), lng: sw.lng() }),
        getNorthEast: () => ({ lat: ne.lat(), lng: ne.lng() }),
        getSouth: () => sw.lat(),
        getWest: () => sw.lng(),
        getNorth: () => ne.lat(),
        getEast: () => ne.lng(),
      };

      onDrawComplete(leafletBounds);
    }

    // Remove the drawing
    rectangle.setMap(null);
  }, [onDrawComplete]);

  // Zoom threshold for switching marker styles
  const ZOOM_THRESHOLD = 12;

  // Create simple circular marker for zoomed out view (matching Leaflet: 30x30)
  const createSimpleMarkerIcon = useCallback((property: Property, isHovered: boolean): google.maps.Icon => {
    const color = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;
    const isPromoted = property.isPromoted && property.promotionEndDate && property.promotionEndDate > Date.now();
    const promotionColor = isPromoted ? PROMOTION_TIER_COLORS[property.promotionTier || 'featured'] : null;
    const price = formatMarkerPrice(property.price);

    const size = isHovered ? 36 : 30;
    const radius = isHovered ? 16 : 13;
    const strokeWidth = isPromoted ? 3 : 2;

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="15" r="${radius}" fill="${color}" stroke="${promotionColor || '#FFFFFF'}" stroke-width="${strokeWidth}"/>
        <text x="15" y="16" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${price}</text>
      </svg>
    `;

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
    };
  }, []);

  // Create detailed house-shaped marker for zoomed in view (matching Leaflet: 45x36)
  const createDetailedMarkerIcon = useCallback((property: Property, isHovered: boolean): google.maps.Icon => {
    const color = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;
    const isPromoted = property.isPromoted && property.promotionEndDate && property.promotionEndDate > Date.now();
    const promotionColor = isPromoted ? PROMOTION_TIER_COLORS[property.promotionTier || 'featured'] : null;
    const price = formatMarkerPrice(property.price);

    const scale = isHovered ? 1.15 : 1;
    const width = 45 * scale;
    const height = 36 * scale;
    const strokeWidth = isPromoted ? 3 : 2;

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 70 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M35 56L25 44H45L35 56Z" fill="#003A96"/>
        <path d="M65 24.5V44H5V24.5L35 5L65 24.5Z" fill="${color}" stroke="${promotionColor || '#FFFFFF'}" stroke-width="${strokeWidth}"/>
        <text x="35" y="30" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${price}</text>
      </svg>
    `;

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(width, height),
      anchor: new google.maps.Point(width / 2, height),
    };
  }, []);

  // Create marker icon based on zoom level
  const createMarkerIcon = useCallback((property: Property, isHovered: boolean): google.maps.Icon => {
    if (currentZoom < ZOOM_THRESHOLD) {
      return createSimpleMarkerIcon(property, isHovered);
    }
    return createDetailedMarkerIcon(property, isHovered);
  }, [currentZoom, createSimpleMarkerIcon, createDetailedMarkerIcon]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100">
        <div className="text-center p-4">
          <p className="text-red-500 font-semibold mb-2">Failed to load Google Maps</p>
          <p className="text-neutral-600 text-sm">Please check your API key configuration.</p>
          <p className="text-neutral-500 text-xs mt-2">Add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <HighlightedPropertiesProvider properties={propertiesInView}>
      <div className="w-full h-full relative overflow-hidden">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={7}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          onBoundsChanged={onBoundsChanged}
          options={{
            restriction: {
              latLngBounds: BALKAN_BOUNDS,
              strictBounds: false,
            },
            minZoom: 5,
            maxZoom: 21,
            mapTypeId: mapType,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: !isMobile,
            styles: mapType === 'roadmap' ? mapStyles : undefined,
            gestureHandling: 'greedy',
          }}
        >
          {/* Test marker to verify markers work */}
          <Marker
            position={{ lat: 41.5, lng: 21.5 }}
            title="Test Marker - If you see this, markers work!"
          />

          {/* Property Markers */}
          {propertiesInView.length > 0 ? (
            propertiesInView.map((property) => (
              <Marker
                key={property.id}
                position={{ lat: property.lat, lng: property.lng }}
                icon={createMarkerIcon(property, property.id === hoveredPropertyId)}
                onClick={() => handleMarkerClick(property)}
                title={`€${property.price}`}
              />
            ))
          ) : (
            // Debug: Show message if no properties
            console.log('[MapComponent] No properties to display on map') as unknown as null
          )}

          {/* Selected Property InfoWindow */}
          {selectedProperty && (
            <InfoWindow
              position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
              onCloseClick={() => setSelectedProperty(null)}
              options={{
                pixelOffset: new google.maps.Size(0, -48),
                maxWidth: 300,
              }}
            >
              <PropertyInfoWindow
                property={selectedProperty}
                onClose={() => setSelectedProperty(null)}
                onPropertyClick={handlePropertyClick}
              />
            </InfoWindow>
          )}

          {/* Drawn Area Rectangle */}
          {drawnBounds && !isDrawing && (
            <Rectangle
              bounds={{
                north: drawnBounds.getNorth(),
                south: drawnBounds.getSouth(),
                east: drawnBounds.getEast(),
                west: drawnBounds.getWest(),
              }}
              options={{
                fillColor: '#0252CD',
                fillOpacity: 0.2,
                strokeColor: '#0252CD',
                strokeWeight: 3,
                clickable: false,
              }}
            />
          )}

          {/* Drawing Manager */}
          {isDrawing && (
            <DrawingManager
              onRectangleComplete={onRectangleComplete}
              options={{
                drawingMode: google.maps.drawing.OverlayType.RECTANGLE,
                drawingControl: false,
                rectangleOptions: {
                  fillColor: '#0252CD',
                  fillOpacity: 0.2,
                  strokeColor: '#0252CD',
                  strokeWeight: 3,
                  editable: false,
                  draggable: false,
                },
              }}
            />
          )}
        </GoogleMap>

        {/* Desktop Controls */}
        {!isMobile && (
          <>
            <div className="absolute bottom-12 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
              {/* Main control bar */}
              <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <button
                  onClick={handleRecenter}
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
                  <span>{isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}</span>
                </button>
              </div>

              {/* Layer toggles */}
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                {/* 3D Buildings Toggle */}
                <button
                  onClick={() => setShow3DBuildings(!show3DBuildings)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    show3DBuildings
                      ? 'bg-slate-700 text-white'
                      : 'text-neutral-600 hover:bg-neutral-200'
                  }`}
                  title="3D Buildings (tilt view)"
                >
                  <span className="text-sm">🏢</span>
                  <span>3D</span>
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
                      <span>{isSaving ? t('search:map.saving') : t('search:map.saveArea')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-neutral-900"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    <span>{t('search:map.clearArea')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-[1000]">
              <Legend />
            </div>
          </>
        )}

        {/* Mobile Controls */}
        {isMobile && (
          <>
            {/* Mobile: Bottom controls */}
            <div className="absolute bottom-24 left-2 right-2 z-[1000] flex justify-center pointer-events-none md:hidden">
              <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg backdrop-blur-md bg-white/85">
                {/* 3D Buildings Toggle */}
                <button
                  onClick={() => setShow3DBuildings(!show3DBuildings)}
                  className={`p-2.5 rounded-xl transition-all ${
                    show3DBuildings
                      ? 'bg-slate-700 text-white shadow-md'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-lg">🏢</span>
                </button>

                {/* Divider */}
                <div className="w-px h-6 mx-0.5 bg-neutral-200" />

                {/* Legend Toggle */}
                <button
                  onClick={() => setIsLegendOpen((p) => !p)}
                  className={`p-2.5 rounded-xl transition-all ${
                    isLegendOpen
                      ? 'bg-neutral-200 text-neutral-700'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  <MapLegendIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Legend popup */}
              {isLegendOpen && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-auto">
                  <Legend />
                </div>
              )}
            </div>

            {/* Mobile: Top right controls */}
            <div className="absolute top-20 right-2 z-[999] md:hidden">
              <div className="flex flex-col gap-2 items-end">
                {/* Control bar */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg backdrop-blur-md bg-white/95">
                  {/* Map type toggle */}
                  <div className="flex items-center bg-neutral-100 rounded-xl p-0.5">
                    <button
                      onClick={() => setMapType('roadmap')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        mapType === 'roadmap'
                          ? 'bg-white shadow-sm text-primary'
                          : 'text-neutral-500'
                      }`}
                    >
                      {t('search:map.street')}
                    </button>
                    <button
                      onClick={() => setMapType('satellite')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        mapType === 'satellite'
                          ? 'bg-white shadow-sm text-primary'
                          : 'text-neutral-500'
                      }`}
                    >
                      {t('search:map.satellite')}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-6 bg-neutral-200" />

                  {/* Recenter */}
                  <button
                    onClick={handleRecenter}
                    className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-600"
                  >
                    <CrosshairsIcon className="w-4 h-4" />
                  </button>

                  {/* Draw */}
                  <button
                    onClick={onDrawStart}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl ${
                      isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'
                    }`}
                  >
                    {isDrawing ? <XCircleIcon className="w-3.5 h-3.5" /> : <PencilIcon className="w-3.5 h-3.5" />}
                    <span className="text-[11px] font-semibold">{isDrawing ? t('search:map.cancel') : 'Draw'}</span>
                  </button>
                </div>

                {/* Drawn bounds actions */}
                {drawnBounds && !isDrawing && (
                  <div className="flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg backdrop-blur-md bg-white/95">
                    {isAuthenticated && (
                      <button
                        onClick={onSaveSearch}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-white rounded-xl disabled:opacity-50"
                      >
                        <SearchPlusIcon className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Save</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDrawComplete(null)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-xl"
                    >
                      <XCircleIcon className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">Clear</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </HighlightedPropertiesProvider>
  );
};

export default MapComponent;
