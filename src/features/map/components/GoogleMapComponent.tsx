/**
 * GoogleMapComponent - High-performance Google Maps with Marker Clustering
 *
 * Uses official Google Maps JavaScript API (@react-google-maps/api) for:
 * - Smooth pan/zoom with native GPU acceleration
 * - Marker clustering for performance with many listings
 * - AdvancedMarkerElement for custom styled markers
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GoogleMap,
  useJsApiLoader,
  OverlayView,
  OverlayViewF,
  Rectangle,
} from '@react-google-maps/api';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import {
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
} from '@/constants';
import { HighlightedPropertiesProvider } from '@/src/context/HighlightedPropertiesContext';
import { formatPrice } from '@/utils/currency';
import L from 'leaflet';

// Google Maps API key - falls back to empty string for development
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

// Libraries to load
const GOOGLE_MAPS_LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization' | 'marker')[] = ['places', 'geometry', 'marker'];

// Map container styles
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Balkan region bounds
const BALKAN_BOUNDS = {
  north: 49,
  south: 34,
  east: 31,
  west: 13,
};

// Default center (Balkans)
const DEFAULT_CENTER = { lat: 41.5, lng: 22 };
const DEFAULT_ZOOM = 7;

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
  standard: '#9ca3af',
};

// Map styles for clean look (properties stand out)
const mapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

/**
 * Format price for marker display (short format)
 */
const formatMarkerPrice = (price: number): string => {
  if (price >= 1000000) {
    const millions = price / 1000000;
    if (millions >= 10) {
      return `€${Math.round(millions)}M`;
    }
    return `€${millions.toFixed(1).replace('.0', '')}M`;
  }
  if (price >= 1000) {
    return `€${Math.round(price / 1000)}K`;
  }
  return `€${price}`;
};

// Props interface matching the Leaflet-based MapComponent for seamless switching
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

/**
 * Property Marker Component - Custom styled marker with price
 */
const PropertyMarker: React.FC<{
  property: Property;
  isHovered: boolean;
  onClick: () => void;
  zoom: number;
}> = ({ property, isHovered, onClick, zoom }) => {
  const price = formatMarkerPrice(property.price);
  const color = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;

  // Check if actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Get border color based on promotion tier
  let borderColor = 'white';
  if (isActivelyPromoted && property.promotionTier) {
    borderColor = PROMOTION_TIER_COLORS[property.promotionTier] || PROMOTION_TIER_COLORS.standard;
  }

  // Scale based on zoom
  const scale = zoom >= 14 ? 1 : zoom >= 12 ? 0.9 : zoom >= 10 ? 0.85 : 0.8;
  const hoverScale = isHovered ? 1.15 : 1;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all duration-200"
      style={{
        transform: `scale(${scale * hoverScale})`,
        transformOrigin: 'center bottom',
        zIndex: isHovered ? 1000 : isActivelyPromoted ? 100 : 1,
      }}
    >
      {/* Simple marker for zoomed out, detailed for zoomed in */}
      {zoom < 12 ? (
        // Simple pill marker
        <div
          className="px-2 py-1 rounded-full font-bold text-white text-xs shadow-lg"
          style={{
            backgroundColor: color,
            border: `2px solid ${borderColor}`,
            filter: isHovered ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
          }}
        >
          {price}
        </div>
      ) : (
        // Detailed house marker
        <div className="relative">
          <svg
            width="52"
            height="42"
            viewBox="0 0 70 56"
            fill="none"
            style={{
              filter: isHovered
                ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))'
                : 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
            }}
          >
            <path d="M35 56L25 44H45L35 56Z" fill="#003A96" />
            <path
              d="M65 24.5V44H5V24.5L35 5L65 24.5Z"
              fill={color}
              stroke={borderColor}
              strokeWidth={isActivelyPromoted ? 3 : 2}
            />
            <text
              x="35"
              y="30"
              fontFamily="Inter, sans-serif"
              fontSize="14"
              fontWeight="bold"
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {price}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
};

/**
 * Cluster Marker Component - Shows count of properties in cluster
 */
const ClusterMarker: React.FC<{
  count: number;
  onClick: () => void;
}> = ({ count, onClick }) => {
  // Size based on count
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer flex items-center justify-center rounded-full font-bold text-white shadow-lg transition-transform hover:scale-110"
      style={{
        width: size,
        height: size,
        backgroundColor: '#0252CD',
        border: '3px solid white',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
      }}
    >
      {count}
    </div>
  );
};

/**
 * Property Popup Component
 */
const PropertyPopup: React.FC<{
  property: Property;
  onClose: () => void;
  onViewDetails: () => void;
}> = ({ property, onClose, onViewDetails }) => {
  const { t } = useTranslation(['property']);
  const imageUrl = property.images?.[0]
    ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0].url)
    : property.imageUrl;

  // Check if actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  return (
    <div
      className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100"
      style={{ width: 220, maxWidth: '90vw' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Image */}
      <div className="relative h-32 bg-gray-100">
        {imageUrl ? (
          <img src={imageUrl} alt={property.title || property.address} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-3xl">🏠</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
        >
          <XCircleIcon className="w-4 h-4 text-gray-600" />
        </button>
        {/* Promotion badge */}
        {isActivelyPromoted && property.promotionTier && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow"
            style={{ backgroundColor: PROMOTION_TIER_COLORS[property.promotionTier] }}
          >
            {property.promotionTier === 'premium' ? '👑 Premium' :
             property.promotionTier === 'highlight' ? '💎 Highlight' :
             property.promotionTier === 'featured' ? '⭐ Featured' : 'Promoted'}
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <span className="font-bold text-lg text-white drop-shadow-lg">
            {formatPrice(property.price, property.country)}
          </span>
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="bg-white/90 px-2 py-0.5 rounded text-[10px] font-semibold text-gray-700 capitalize">
            {property.propertyType}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-bold text-sm text-gray-900 line-clamp-1">
          {property.title || property.address}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 flex items-center gap-1">
          <span>📍</span>
          {property.city}, {property.country}
        </p>

        {/* Stats */}
        {property.propertyType === 'land' ? (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span>📐</span>
              <b>{property.sqft?.toLocaleString()}</b> m²
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span>🛏️</span>
              <b>{property.beds}</b>
            </span>
            <span className="flex items-center gap-1">
              <span>🚿</span>
              <b>{property.baths}</b>
            </span>
            <span className="flex items-center gap-1">
              <span>📐</span>
              <b>{property.sqft}</b> m²
            </span>
          </div>
        )}

        <button
          onClick={onViewDetails}
          className="w-full mt-3 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <span>{t('map.popup.viewDetails', 'View Details')}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};

/**
 * Legend Component
 */
const Legend: React.FC = () => {
  const { t } = useTranslation(['property']);

  return (
    <div
      className="px-4 py-3 rounded-2xl shadow-xl border border-white/30"
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      <div className="flex flex-col gap-2">
        {Object.entries(PROPERTY_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs font-medium text-neutral-700">
              {t(`map.propertyTypes.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main GoogleMapComponent
 */
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
  const { t } = useTranslation(['search', 'property']);
  const { dispatch } = useAppContext();

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  // Refs
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const markerDivsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const isInitialLoadRef = useRef(true);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Filter valid properties
  const validProperties = useMemo(() => {
    return properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );
  }, [properties]);

  // Initial center from user location
  const initialCenter = useMemo(() => {
    if (userLocation) {
      return { lat: userLocation[0], lng: userLocation[1] };
    }
    return DEFAULT_CENTER;
  }, [userLocation]);

  // Handle map load
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);

    // Initialize clusterer with SuperCluster algorithm for performance
    const clusterer = new MarkerClusterer({
      map: mapInstance,
      algorithm: new SuperClusterAlgorithm({
        radius: 100, // Larger radius for better clustering
        maxZoom: 15, // Stop clustering at zoom 15+
      }),
      renderer: {
        render: ({ count, position }) => {
          // Create custom cluster marker
          const div = document.createElement('div');
          div.className = 'cluster-marker';
          const size = count < 10 ? 40 : count < 50 ? 48 : count < 100 ? 56 : 64;
          div.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #0252CD 0%, #0066FF 100%);
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${count < 100 ? 14 : 12}px;
            font-family: Inter, system-ui, sans-serif;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(2, 82, 205, 0.4), 0 2px 4px rgba(0,0,0,0.2);
            transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
          `;
          div.textContent = String(count);
          div.addEventListener('mouseenter', () => {
            div.style.transform = 'scale(1.15)';
            div.style.boxShadow = '0 6px 24px rgba(2, 82, 205, 0.5), 0 4px 8px rgba(0,0,0,0.3)';
          });
          div.addEventListener('mouseleave', () => {
            div.style.transform = 'scale(1)';
            div.style.boxShadow = '0 4px 16px rgba(2, 82, 205, 0.4), 0 2px 4px rgba(0,0,0,0.2)';
          });

          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: div,
          });
        },
      },
    });

    clustererRef.current = clusterer;
  }, []);

  // Handle map unmount
  const onUnmount = useCallback(() => {
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.clear();
    markerDivsRef.current.clear();
    setMap(null);
  }, []);

  // Handle map idle (after pan/zoom)
  const onIdle = useCallback(() => {
    if (!map) return;

    const bounds = map.getBounds();
    const mapCenter = map.getCenter();
    const currentZoom = map.getZoom();

    if (bounds && mapCenter && currentZoom !== undefined) {
      setZoom(currentZoom);
      setCenter({ lat: mapCenter.lat(), lng: mapCenter.lng() });

      // Convert Google bounds to Leaflet bounds for compatibility
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const leafletBounds = L.latLngBounds(
        [sw.lat(), sw.lng()],
        [ne.lat(), ne.lng()]
      );
      const leafletCenter = L.latLng(mapCenter.lat(), mapCenter.lng());

      onMapMove(leafletBounds, leafletCenter);
    }
  }, [map, onMapMove]);

  // Update markers when properties change
  useEffect(() => {
    if (!map || !clustererRef.current || !isLoaded) return;

    // Clear existing markers
    clustererRef.current.clearMarkers();
    markersRef.current.clear();
    markerDivsRef.current.clear();

    // Create new markers
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    validProperties.forEach((property) => {
      // Create marker content div
      const markerDiv = document.createElement('div');
      markerDiv.className = 'property-marker';

      const price = formatMarkerPrice(property.price);
      const color = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;
      const isActivelyPromoted = property.isPromoted && property.promotionEndDate && property.promotionEndDate > Date.now();
      let borderColor = 'white';
      let borderWidth = 2;
      if (isActivelyPromoted && property.promotionTier) {
        borderColor = PROMOTION_TIER_COLORS[property.promotionTier] || PROMOTION_TIER_COLORS.standard;
        borderWidth = 3;
      }

      // Simple pill marker style with smooth transitions
      markerDiv.style.cssText = `
        padding: 5px 10px;
        background: ${color};
        border: ${borderWidth}px solid ${borderColor};
        border-radius: 999px;
        color: white;
        font-weight: 700;
        font-size: 12px;
        font-family: Inter, system-ui, sans-serif;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
        white-space: nowrap;
        user-select: none;
        -webkit-user-select: none;
      `;
      markerDiv.textContent = price;

      // Hover effects
      markerDiv.addEventListener('mouseenter', () => {
        markerDiv.style.transform = 'scale(1.2) translateY(-2px)';
        markerDiv.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
        markerDiv.style.zIndex = '1000';
      });
      markerDiv.addEventListener('mouseleave', () => {
        markerDiv.style.transform = 'scale(1)';
        markerDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
        markerDiv.style.zIndex = isActivelyPromoted ? '100' : '1';
      });

      // Click to show popup
      markerDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedProperty(property);
        // Pan map to center on property
        if (map) {
          map.panTo({ lat: property.lat, lng: property.lng });
        }
      });

      // Create advanced marker
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: property.lat, lng: property.lng },
        content: markerDiv,
        zIndex: isActivelyPromoted ? 100 : 1,
      });

      markers.push(marker);
      markersRef.current.set(property.id, marker);
      markerDivsRef.current.set(property.id, markerDiv);
    });

    // Add markers to clusterer
    clustererRef.current.addMarkers(markers);
  }, [validProperties, map, isLoaded]);

  // Handle hover state changes from property list
  useEffect(() => {
    markerDivsRef.current.forEach((div, id) => {
      if (id === hoveredPropertyId) {
        div.style.transform = 'scale(1.2) translateY(-2px)';
        div.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
        div.style.zIndex = '1000';
      } else {
        div.style.transform = 'scale(1)';
        div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
        const prop = validProperties.find(p => p.id === id);
        const isPromoted = prop?.isPromoted && prop?.promotionEndDate && prop.promotionEndDate > Date.now();
        div.style.zIndex = isPromoted ? '100' : '1';
      }
    });
  }, [hoveredPropertyId, validProperties]);

  // Handle flyTo target
  useEffect(() => {
    if (!map || !flyToTarget) return;

    // Use smooth animation
    map.panTo({ lat: flyToTarget.center[0], lng: flyToTarget.center[1] });
    setTimeout(() => {
      if (map) {
        map.setZoom(flyToTarget.zoom);
      }
    }, 300);

    // Call complete after animation
    setTimeout(onFlyComplete, 800);
  }, [flyToTarget, map, onFlyComplete]);

  // Handle view details click
  const handleViewDetails = useCallback((propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    window.history.pushState({ propertyId }, '', `/property/${propertyId}`);
    setSelectedProperty(null);
  }, [dispatch]);

  // Handle recenter
  const handleRecenter = useCallback(() => {
    if (!map) return;

    if (userLocation) {
      map.panTo({ lat: userLocation[0], lng: userLocation[1] });
      map.setZoom(13);
    } else {
      map.panTo(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }
    onRecenter();
  }, [map, userLocation, onRecenter]);

  // Loading state
  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-4">
          <p className="text-red-500 font-semibold">Error loading Google Maps</p>
          <p className="text-gray-500 text-sm mt-2">Please check your API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-3">{t('search:map.loading', 'Loading map...')}</p>
        </div>
      </div>
    );
  }

  // Convert Leaflet bounds to Google bounds for drawn rectangle
  const getGoogleBounds = (leafletBounds: L.LatLngBounds | null) => {
    if (!leafletBounds) return null;
    const sw = leafletBounds.getSouthWest();
    const ne = leafletBounds.getNorthEast();
    return {
      north: ne.lat,
      south: sw.lat,
      east: ne.lng,
      west: sw.lng,
    };
  };

  const googleDrawnBounds = getGoogleBounds(drawnBounds);

  return (
    <HighlightedPropertiesProvider properties={validProperties}>
      <div className="w-full h-full relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={initialCenter}
          zoom={userLocation ? 13 : DEFAULT_ZOOM}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onIdle={onIdle}
          options={{
            restriction: {
              latLngBounds: BALKAN_BOUNDS,
              strictBounds: false,
            },
            mapTypeId: mapType,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: false,
            gestureHandling: 'greedy',
            styles: mapStyles,
            minZoom: 6,
            maxZoom: 21,
            mapId: 'balkan-estate-map', // Required for AdvancedMarkerElement
          }}
        >
          {/* Property popup */}
          {selectedProperty && (
            <OverlayViewF
              position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
              mapPaneName={OverlayView.FLOAT_PANE}
            >
              <div style={{ transform: 'translate(-50%, -110%)' }}>
                <PropertyPopup
                  property={selectedProperty}
                  onClose={() => setSelectedProperty(null)}
                  onViewDetails={() => handleViewDetails(selectedProperty.id)}
                />
              </div>
            </OverlayViewF>
          )}

          {/* Drawn bounds rectangle */}
          {googleDrawnBounds && !isDrawing && (
            <Rectangle
              bounds={googleDrawnBounds}
              options={{
                strokeColor: '#0252CD',
                strokeOpacity: 1,
                strokeWeight: 3,
                fillColor: '#0252CD',
                fillOpacity: 0.2,
                clickable: false,
              }}
            />
          )}
        </GoogleMap>

        {/* Debug info */}
        <div className="absolute top-4 left-4 z-[1001] bg-black/80 text-white text-[10px] font-mono px-2 py-1 rounded-md backdrop-blur-sm shadow-md">
          <span>🔍{zoom.toFixed(1)}/21 📍{center.lat.toFixed(3)},{center.lng.toFixed(3)} 📌{validProperties.length}</span>
        </div>

        {/* Controls - Desktop */}
        {!isMobile && (
          <div className="absolute bottom-12 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
            {/* Main control bar */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10 flex items-center gap-1.5 transition-all duration-300">
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
                    mapType === 'roadmap' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  {t('search:map.street', 'Street')}
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'satellite' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  {t('search:map.satellite', 'Satellite')}
                </button>
                <button
                  onClick={() => setMapType('hybrid')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'hybrid' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
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
                  isLegendOpen ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title={t('search:map.legend', 'Legend')}
              >
                <MapLegendIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('search:map.legend', 'Legend')}</span>
              </button>
            </div>

            {/* Drawn bounds actions */}
            {drawnBounds && !isDrawing && (
              <div
                className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40 animate-fade-in"
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px) saturate(200%)',
                }}
              >
                {isAuthenticated && (
                  <button
                    onClick={onSaveSearch}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <SearchPlusIcon className="w-4 h-4" />
                    <span>{isSaving ? t('search:map.saving') : t('search:map.saveArea')}</span>
                  </button>
                )}
                <button
                  onClick={() => onDrawComplete(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <XCircleIcon className="w-4 h-4" />
                  <span>{t('search:map.clearArea')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        {isLegendOpen && !isMobile && (
          <div className="absolute bottom-12 left-4 z-[1000] animate-fade-in">
            <Legend />
          </div>
        )}

        {/* Mobile controls */}
        {isMobile && (
          <div className="absolute top-16 right-2 z-[999]">
            <div className="flex flex-col gap-1.5 items-end">
              <div
                className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                }}
              >
                <button
                  onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-xl text-gray-700 hover:bg-white/50"
                >
                  {mapType === 'roadmap' ? '🛰️' : '🗺️'}
                </button>
                <button
                  onClick={handleRecenter}
                  className="p-2 rounded-xl hover:bg-white/50 text-neutral-600"
                >
                  <CrosshairsIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={onDrawStart}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                    isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'
                  }`}
                >
                  {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                </button>
              </div>

              {drawnBounds && !isDrawing && (
                <div
                  className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px) saturate(200%)',
                  }}
                >
                  {isAuthenticated && (
                    <button
                      onClick={onSaveSearch}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl disabled:opacity-50"
                    >
                      <SearchPlusIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl"
                  >
                    <XCircleIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </HighlightedPropertiesProvider>
  );
};

export default GoogleMapComponent;
