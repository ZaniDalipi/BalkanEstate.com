/**
 * GoogleMapComponent - High-performance Google Maps with Marker Clustering
 *
 * Uses official Google Maps JavaScript API (@react-google-maps/api) for:
 * - Smooth pan/zoom with native GPU acceleration
 * - Marker clustering for performance with many listings
 * - AdvancedMarkerElement for custom styled markers
 * - All layer options from Leaflet implementation
 *
 * Optimized with custom hooks for better performance:
 * - useGoogleMapLoader: Centralized API loading
 * - useMapMarkers: Batched marker creation and clustering
 * - useMapLayers: Cadastre and climate layer management
 * - useMeasurement: Land measurement tools
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  GoogleMap,
  OverlayView,
  OverlayViewF,
  Rectangle,
  Polyline,
  Polygon,
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
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM } from '@/config/cadastreLayers';
import { SaveMeasurementUseCase, GetMeasurementsUseCase } from '@/src/domain/usecases/measurement';
import { measurementRepository } from '@/src/data/repositories/MeasurementRepository';
import { MeasurementLimitExceededError, InvalidMeasurementError } from '@/src/domain/repositories/IMeasurementRepository';
import { MEASUREMENT_LIMITS } from '@/src/domain/entities/Measurement';

// Import custom hooks for optimized performance
import {
  useGoogleMapLoader,
  GOOGLE_MAPS_MAP_ID,
  formatMeasureDistance,
  formatMeasureArea,
  calculateDistance,
  calculateTotalDistance,
  calculatePolygonArea,
  type MeasurementPoint,
  type LocalMeasurement,
} from '../hooks';

// Convert lat/lng to Web Mercator (EPSG:3857) for WMS requests
const latLngToWebMercator = (lat: number, lng: number): { x: number; y: number } => {
  const earthRadius = 6378137; // Earth's radius in meters
  const x = lng * (Math.PI / 180) * earthRadius;
  const y = Math.log(Math.tan((90 + lat) * (Math.PI / 360))) * earthRadius;
  return { x, y };
};

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

// Map style options
type MapStyleType = 'clean' | 'color' | 'street' | 'satellite' | 'hybrid';

// Climate risk types
type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

// Map styles for clean look (properties stand out)
const cleanMapStyles: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d7e8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
];

// Color/Voyager style (shows neighborhoods)
const colorMapStyles: google.maps.MapTypeStyle[] = [
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b3d9ff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffeb99' }] },
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
 * Property Popup Component - Compact mini card design
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

  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Format property type display
  const propertyTypeDisplay = property.propertyType
    ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)
    : 'Property';

  return (
    <div
      className="bg-white rounded-xl shadow-xl border border-gray-100/50 relative"
      style={{ width: 200, maxWidth: '85vw' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors z-50"
        aria-label="Close popup"
      >
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image container */}
      <div className="relative h-24 rounded-t-xl overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={property.title || property.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <span className="text-2xl opacity-50">🏠</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Promotion badge */}
        {isActivelyPromoted && property.promotionTier && (
          <div
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow backdrop-blur-sm"
            style={{ backgroundColor: `${PROMOTION_TIER_COLORS[property.promotionTier]}ee` }}
          >
            {property.promotionTier === 'premium' ? '👑' :
             property.promotionTier === 'highlight' ? '💎' :
             property.promotionTier === 'featured' ? '⭐' : '✨'}
          </div>
        )}

        {/* Property type badge */}
        <div className="absolute bottom-1.5 right-1.5">
          <span className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-medium text-white">
            {propertyTypeDisplay}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-2.5">
        {/* Price */}
        <div className="font-bold text-base text-gray-900 mb-0.5">
          {formatPrice(property.price, property.country)}
        </div>

        {/* Location */}
        <p className="text-[10px] text-gray-500 mb-2 truncate">
          📍 {property.city}, {property.country}
        </p>

        {/* Property details - inline */}
        <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-600">
          {property.propertyType === 'land' ? (
            <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-1 rounded">
              📐 <b>{property.sqft?.toLocaleString()}</b> m²
            </span>
          ) : (
            <>
              <span className="bg-gray-100 px-1.5 py-1 rounded">🛏 {property.beds || 0}</span>
              <span className="bg-gray-100 px-1.5 py-1 rounded">🚿 {property.baths || 0}</span>
              <span className="bg-gray-100 px-1.5 py-1 rounded">📐 {property.sqft || 0}</span>
            </>
          )}
        </div>

        {/* View details button */}
        <button
          onClick={onViewDetails}
          className="w-full py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {t('map.popup.viewDetails', 'View')} →
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
 * Climate Risk Legend Component
 */
const ClimateRiskLegend: React.FC<{ riskType: ClimateRiskType }> = ({ riskType }) => {
  const { t } = useTranslation(['search']);

  if (riskType === 'none') return null;

  const riskConfig: Record<ClimateRiskType, { label: string; colors: string[]; labels: string[] }> = {
    none: { label: '', colors: [], labels: [] },
    flood: { label: t('search:map.climateRisks.flood', 'Flood Risk'), colors: ['#e3f2fd', '#64b5f6', '#1976d2', '#0d47a1'], labels: ['Low', 'Moderate', 'High', 'Severe'] },
    fire: { label: t('search:map.climateRisks.fire', 'Fire Risk'), colors: ['#fff3e0', '#ffb74d', '#f57c00', '#bf360c'], labels: ['Low', 'Moderate', 'High', 'Severe'] },
    wind: { label: t('search:map.climateRisks.wind', 'Wind Risk'), colors: ['#e8f5e9', '#81c784', '#388e3c', '#1b5e20'], labels: ['Calm', 'Breezy', 'Windy', 'Strong'] },
    air: { label: t('search:map.climateRisks.air', 'Air Quality'), colors: ['#e8f5e9', '#fff59d', '#ff8a65', '#b71c1c'], labels: ['Good', 'Moderate', 'Poor', 'Hazardous'] },
    heat: { label: t('search:map.climateRisks.heat', 'Heat Risk'), colors: ['#e3f2fd', '#fff59d', '#ff8a65', '#d32f2f'], labels: ['Cool', 'Warm', 'Hot', 'Extreme'] },
  };

  const config = riskConfig[riskType];

  return (
    <div
      className="px-3 py-2 rounded-xl shadow-lg border border-white/30"
      style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)' }}
    >
      <p className="text-xs font-semibold text-gray-700 mb-2">{config.label}</p>
      <div className="flex gap-1">
        {config.colors.map((color, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-[8px] text-gray-500 mt-0.5">{config.labels[i]}</span>
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
  const { t } = useTranslation(['search', 'property']);
  const { dispatch } = useAppContext();

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // UI state - matching Leaflet options
  const [mapStyle, setMapStyle] = useState<MapStyleType>('street');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([]);
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'area'>('area');
  const [localMeasurements, setLocalMeasurements] = useState<LocalMeasurement[]>([]);
  const [selectedClimateRisk, setSelectedClimateRisk] = useState<ClimateRiskType>('none');
  const [isClimateMenuOpen, setIsClimateMenuOpen] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // Save measurement modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [measurementName, setMeasurementName] = useState('');
  const [measurementAddress, setMeasurementAddress] = useState('');
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [pendingMeasurement, setPendingMeasurement] = useState<LocalMeasurement | null>(null);

  // Measurement limit state
  const [measurementCount, setMeasurementCount] = useState<number>(0);
  const [measurementMaxAllowed, setMeasurementMaxAllowed] = useState<number>(MEASUREMENT_LIMITS.FREE_MAX);
  const [measurementIsPro, setMeasurementIsPro] = useState(false);
  const [measurementSaveError, setMeasurementSaveError] = useState<string | null>(null);
  const [isAtMeasurementLimit, setIsAtMeasurementLimit] = useState(false);

  // Cadastre layer state
  const [showCadastre, setShowCadastre] = useState(false);
  const cadastreLayerRef = useRef<google.maps.ImageMapType | null>(null);

  // Promoted listings filter
  const [showOnlyPromoted, setShowOnlyPromoted] = useState(false);

  // Refs - ALL useRef hooks must be at the top to maintain consistent hook order
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const markerDivsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastCadastreZoomRef = useRef<number | null>(null);
  const lastMapTypeRef = useRef<string | null>(null);
  const climateLayerRef = useRef<google.maps.ImageMapType | null>(null);

  // Load Google Maps API using centralized hook (enables preloading benefits)
  const { isLoaded, loadError } = useGoogleMapLoader();

  // Filter valid properties (optionally only promoted)
  const validProperties = useMemo(() => {
    let filtered = properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );

    // Filter to only show promoted listings if enabled
    if (showOnlyPromoted) {
      filtered = filtered.filter(
        (p) => p.isPromoted && p.promotionEndDate && p.promotionEndDate > Date.now()
      );
    }

    return filtered;
  }, [properties, showOnlyPromoted]);

  // Count of promoted properties for badge
  const promotedCount = useMemo(() => {
    return properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng) &&
             p.isPromoted && p.promotionEndDate && p.promotionEndDate > Date.now()
    ).length;
  }, [properties]);


  // Initial center from user location
  const initialCenter = useMemo(() => {
    if (userLocation) {
      return { lat: userLocation[0], lng: userLocation[1] };
    }
    return DEFAULT_CENTER;
  }, [userLocation]);

  // Fetch measurement count on mount and when authentication changes
  useEffect(() => {
    const fetchMeasurementLimits = async () => {
      if (!isAuthenticated) {
        // Reset to defaults for non-authenticated users
        setMeasurementCount(0);
        setMeasurementMaxAllowed(MEASUREMENT_LIMITS.FREE_MAX);
        setMeasurementIsPro(false);
        setIsAtMeasurementLimit(false);
        return;
      }

      try {
        const getMeasurementsUseCase = new GetMeasurementsUseCase(measurementRepository);
        const result = await getMeasurementsUseCase.execute();
        setMeasurementCount(result.count);
        setMeasurementMaxAllowed(result.maxAllowed);
        setMeasurementIsPro(result.isPro);
        setIsAtMeasurementLimit(result.isAtLimit);
      } catch (error) {
        console.error('[Map] Failed to fetch measurement limits:', error);
      }
    };

    fetchMeasurementLimits();
  }, [isAuthenticated]);

  // Get map type ID based on style
  const getMapTypeId = useCallback((): google.maps.MapTypeId => {
    switch (mapStyle) {
      case 'satellite':
        return google.maps.MapTypeId.SATELLITE;
      case 'hybrid':
        return google.maps.MapTypeId.HYBRID;
      default:
        return google.maps.MapTypeId.ROADMAP;
    }
  }, [mapStyle]);

  // Get map styles based on style type
  const getMapStyles = useCallback((): google.maps.MapTypeStyle[] => {
    switch (mapStyle) {
      case 'clean':
        return cleanMapStyles;
      case 'color':
        return colorMapStyles;
      default:
        return showLandmarks ? [] : [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ];
    }
  }, [mapStyle, showLandmarks]);

  // Inject CSS keyframes for promoted marker glow animation
  useEffect(() => {
    const styleId = 'promoted-marker-glow-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes promotedFloat {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-6px);
        }
      }
      @keyframes promotedGlow {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.85;
        }
      }
      .promoted-marker-premium {
        animation: promotedFloat 2s ease-in-out infinite, promotedGlow 2s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(255, 184, 0, 0.7), 0 0 20px 6px rgba(255, 184, 0, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-highlight {
        animation: promotedFloat 2.2s ease-in-out infinite, promotedGlow 2.2s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(14, 165, 233, 0.7), 0 0 20px 6px rgba(14, 165, 233, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-featured {
        animation: promotedFloat 2.4s ease-in-out infinite, promotedGlow 2.4s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(124, 58, 237, 0.7), 0 0 20px 6px rgba(124, 58, 237, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-standard {
        animation: promotedFloat 2.6s ease-in-out infinite, promotedGlow 2.6s ease-in-out infinite;
        box-shadow: 0 0 8px 2px rgba(156, 163, 175, 0.6), 0 0 14px 4px rgba(156, 163, 175, 0.3), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-premium.marker-highlighted,
      .promoted-marker-highlight.marker-highlighted,
      .promoted-marker-featured.marker-highlighted,
      .promoted-marker-standard.marker-highlighted {
        animation: none !important;
        transform: scale(1.3) translateY(-4px) !important;
        z-index: 2000 !important;
      }
      .marker-highlighted {
        transform: scale(1.3) translateY(-4px) !important;
        box-shadow: 0 8px 20px rgba(0,0,0,0.4) !important;
        z-index: 2000 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Handle map load
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);

    // Initialize clusterer with SuperCluster algorithm for performance
    const clusterer = new MarkerClusterer({
      map: mapInstance,
      algorithm: new SuperClusterAlgorithm({
        radius: 100,
        maxZoom: 15,
      }),
      renderer: {
        render: ({ count, position }) => {
          const div = document.createElement('div');
          div.className = 'cluster-marker';
          // Smaller cluster sizes for cleaner look
          const size = count < 10 ? 28 : count < 50 ? 32 : count < 100 ? 36 : 40;
          div.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #0252CD 0%, #0066FF 100%);
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${count < 100 ? 11 : 10}px;
            font-family: Inter, system-ui, sans-serif;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(2, 82, 205, 0.4), 0 1px 3px rgba(0,0,0,0.2);
            transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
          `;
          div.textContent = String(count);
          div.addEventListener('mouseenter', () => {
            div.style.transform = 'scale(1.15)';
            div.style.boxShadow = '0 4px 12px rgba(2, 82, 205, 0.5), 0 2px 4px rgba(0,0,0,0.3)';
          });
          div.addEventListener('mouseleave', () => {
            div.style.transform = 'scale(1)';
            div.style.boxShadow = '0 2px 8px rgba(2, 82, 205, 0.4), 0 1px 3px rgba(0,0,0,0.2)';
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

  // Update map type when it changes (styles are controlled via mapId in Cloud Console)
  useEffect(() => {
    if (!map || !isLoaded) return;
    const newMapType = getMapTypeId();
    // Only update if map type actually changed to avoid repeated warnings
    if (lastMapTypeRef.current !== newMapType) {
      lastMapTypeRef.current = newMapType;
      map.setMapTypeId(newMapType);
    }
  }, [map, mapStyle, isLoaded, getMapTypeId]);

  // Handle 3D buildings toggle - tilt the map for 3D view
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (show3DBuildings) {
      // Enable 3D view with tilt
      map.setTilt(45);
      // Zoom in if needed for buildings to show
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom < 15) {
        map.setZoom(15);
      }
    } else {
      // Reset to flat view
      map.setTilt(0);
    }
  }, [show3DBuildings, map, isLoaded]);

  // Handle measurement mode - add click listener for drawing
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (showMeasurement) {
      // Switch to satellite for better visibility
      setMapStyle('satellite');

      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          setMeasurementPoints(prev => [...prev, { lat: e.latLng!.lat(), lng: e.latLng!.lng() }]);
        }
      });

      return () => {
        google.maps.event.removeListener(clickListener);
      };
    }
    // Note: We don't clear measurement points when disabled so saved measurements remain visible
  }, [showMeasurement, map, isLoaded]);

  // Calculate measurement values (must be before handlers that use them)
  const measurementDistance = useMemo(() => {
    if (measurementPoints.length < 2) return 0;
    return calculateTotalDistance(measurementPoints);
  }, [measurementPoints]);

  const measurementArea = useMemo(() => {
    if (measurementPoints.length < 3) return 0;
    return calculatePolygonArea(measurementPoints);
  }, [measurementPoints]);

  const measurementPerimeter = useMemo(() => {
    if (measurementPoints.length < 3) return 0;
    const perim = calculateTotalDistance(measurementPoints);
    // Add closing segment
    return perim + calculateDistance(measurementPoints[measurementPoints.length - 1], measurementPoints[0]);
  }, [measurementPoints]);

  // Open save modal for current measurement
  const handleOpenSaveModal = useCallback(() => {
    if (measurementPoints.length < 2) return;
    if (measurementMode === 'area' && measurementPoints.length < 3) return;

    const newMeasurement: LocalMeasurement = {
      id: `measurement-${Date.now()}`,
      points: [...measurementPoints],
      mode: measurementMode,
      distance: measurementDistance,
      area: measurementArea,
      perimeter: measurementPerimeter,
      createdAt: Date.now(),
    };

    setPendingMeasurement(newMeasurement);
    setMeasurementName('');
    setMeasurementAddress('');
    setMeasurementNotes('');
    setMeasurementSaveError(null); // Clear any previous error
    setShowSaveModal(true);
  }, [measurementPoints, measurementMode, measurementDistance, measurementArea, measurementPerimeter]);

  // Save measurement to backend with proper validation
  const handleSaveMeasurementToBackend = useCallback(async () => {
    if (!pendingMeasurement || !measurementName.trim()) return;

    // Clear any previous error
    setMeasurementSaveError(null);
    setSavingMeasurement(true);

    try {
      if (isAuthenticated) {
        // Check if at limit before attempting to save
        if (isAtMeasurementLimit) {
          throw new MeasurementLimitExceededError(measurementCount, measurementMaxAllowed, measurementIsPro);
        }

        // Use the domain use case for proper validation
        const saveMeasurementUseCase = new SaveMeasurementUseCase(measurementRepository);
        const result = await saveMeasurementUseCase.execute({
          name: measurementName.trim(),
          points: pendingMeasurement.points,
          type: pendingMeasurement.mode,
          distance: pendingMeasurement.distance,
          area: pendingMeasurement.area,
          perimeter: pendingMeasurement.perimeter,
          address: measurementAddress.trim() || undefined,
          notes: measurementNotes.trim() || undefined,
        });

        // Update the limit state after successful save
        setMeasurementCount(result.count);
        setIsAtMeasurementLimit(result.count >= result.maxAllowed);
      }

      // Clear all measurement lines from map after saving
      setLocalMeasurements([]);
      setMeasurementPoints([]);
      setShowSaveModal(false);
      setPendingMeasurement(null);
    } catch (error: any) {
      console.error('Failed to save measurement:', error);

      // Handle specific error types
      if (error instanceof MeasurementLimitExceededError) {
        setMeasurementSaveError(
          error.isPro
            ? `You've reached the maximum limit of ${error.maxAllowed} measurements.`
            : `Free users can save up to ${error.maxAllowed} measurements. Upgrade to Pro for more!`
        );
        setIsAtMeasurementLimit(true);
        // Don't close modal - show the error
        return;
      } else if (error instanceof InvalidMeasurementError) {
        setMeasurementSaveError(error.message);
        return;
      } else {
        // Generic error - clear measurements and show error
        setMeasurementSaveError('Failed to save to your profile. Please try again.');
        setLocalMeasurements([]);
        setMeasurementPoints([]);
        // Close after a delay to show the message
        setTimeout(() => {
          setShowSaveModal(false);
          setPendingMeasurement(null);
          setMeasurementSaveError(null);
        }, 2000);
      }
    } finally {
      setSavingMeasurement(false);
    }
  }, [pendingMeasurement, measurementName, measurementAddress, measurementNotes, isAuthenticated, isAtMeasurementLimit, measurementCount, measurementMaxAllowed, measurementIsPro]);

  // Quick save/keep - just clears the current drawing (for non-authenticated users)
  const handleQuickSave = useCallback(() => {
    if (measurementPoints.length < 2) return;
    if (measurementMode === 'area' && measurementPoints.length < 3) return;

    // Clear all measurement lines from map
    setLocalMeasurements([]);
    setMeasurementPoints([]);
  }, [measurementPoints, measurementMode]);

  // Ref to store promoted markers separately (not clustered)
  const promotedMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Update markers when properties change - optimized with batching
  useEffect(() => {
    if (!map || !clustererRef.current || !isLoaded) return;

    // Clear existing markers
    clustererRef.current.clearMarkers();
    markersRef.current.clear();
    markerDivsRef.current.clear();

    // Remove promoted markers from map
    promotedMarkersRef.current.forEach(marker => {
      marker.map = null;
    });
    promotedMarkersRef.current = [];

    const regularMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    const promotedMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    const BATCH_SIZE = 100;
    let currentIndex = 0;

    const createMarkerBatch = () => {
      const endIndex = Math.min(currentIndex + BATCH_SIZE, validProperties.length);

      for (let i = currentIndex; i < endIndex; i++) {
        const property = validProperties[i];
        const markerDiv = document.createElement('div');
        markerDiv.className = 'property-marker';
        markerDiv.dataset.propertyId = property.id;

        const price = formatMarkerPrice(property.price);
        const color = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;
        const isActivelyPromoted = property.isPromoted && property.promotionEndDate && property.promotionEndDate > Date.now();
        let borderColor = 'white';
        let borderWidth = 2;
        if (isActivelyPromoted && property.promotionTier) {
          borderColor = PROMOTION_TIER_COLORS[property.promotionTier] || PROMOTION_TIER_COLORS.standard;
          borderWidth = 3;
        }

        // Add animation class for promoted markers
        if (isActivelyPromoted && property.promotionTier) {
          markerDiv.classList.add(`promoted-marker-${property.promotionTier}`);
        }

        markerDiv.style.cssText = `
          padding: 2px 6px;
          background: ${color};
          border: ${borderWidth}px solid ${borderColor};
          border-radius: 999px;
          color: white;
          font-weight: 700;
          font-size: 10px;
          font-family: Inter, system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          white-space: nowrap;
          user-select: none;
          transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
        `;
        markerDiv.textContent = price;

        // Hover handlers - don't override if highlighted from list
        markerDiv.onmouseenter = () => {
          if (!markerDiv.classList.contains('marker-highlighted')) {
            markerDiv.style.transform = 'scale(1.25) translateY(-2px)';
            markerDiv.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)';
            markerDiv.style.zIndex = '1000';
          }
        };
        markerDiv.onmouseleave = () => {
          if (!markerDiv.classList.contains('marker-highlighted')) {
            markerDiv.style.transform = '';
            markerDiv.style.boxShadow = '';
            markerDiv.style.zIndex = isActivelyPromoted ? '100' : '1';
          }
        };

        markerDiv.onclick = (e) => {
          e.stopPropagation();
          setSelectedProperty(property);
          map?.panTo({ lat: property.lat, lng: property.lng });
        };

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: property.lat, lng: property.lng },
          content: markerDiv,
          zIndex: isActivelyPromoted ? 100 : 1,
        });

        // Separate promoted markers from regular ones
        if (isActivelyPromoted) {
          // Add promoted markers directly to map (not clustered)
          marker.map = map;
          promotedMarkers.push(marker);
        } else {
          regularMarkers.push(marker);
        }

        markersRef.current.set(property.id, marker);
        markerDivsRef.current.set(property.id, markerDiv);
      }

      currentIndex = endIndex;

      if (currentIndex < validProperties.length) {
        requestAnimationFrame(createMarkerBatch);
      } else {
        // Add only regular markers to clusterer (promoted stay individual)
        clustererRef.current?.addMarkers(regularMarkers);
        promotedMarkersRef.current = promotedMarkers;
      }
    };

    if (validProperties.length > 0) {
      createMarkerBatch();
    }

    // Cleanup function
    return () => {
      promotedMarkersRef.current.forEach(marker => {
        marker.map = null;
      });
    };
  }, [validProperties, map, isLoaded]);

  // Handle hover state changes from property list - use CSS classes for better performance
  useEffect(() => {
    markerDivsRef.current.forEach((div, id) => {
      const isHovered = id === hoveredPropertyId;
      const prop = validProperties.find(p => p.id === id);
      const isPromoted = prop?.isPromoted && prop?.promotionEndDate && prop.promotionEndDate > Date.now();

      if (isHovered) {
        div.classList.add('marker-highlighted');
        // Force styles for highlighted state
        div.style.transform = 'scale(1.3) translateY(-4px)';
        div.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
        div.style.zIndex = '2000';
      } else {
        div.classList.remove('marker-highlighted');
        // Reset to default styles
        div.style.transform = '';
        div.style.boxShadow = '';
        div.style.zIndex = isPromoted ? '100' : '1';
      }
    });
  }, [hoveredPropertyId, validProperties]);

  // Handle flyTo target - smooth cinematic animation
  useEffect(() => {
    if (!map || !flyToTarget) return;

    const targetLat = flyToTarget.center[0];
    const targetLng = flyToTarget.center[1];
    const targetZoom = flyToTarget.zoom;
    const currentZoom = map.getZoom() || 10;
    const currentCenter = map.getCenter();

    // Calculate distance to target (rough approximation)
    const distance = currentCenter
      ? Math.sqrt(
          Math.pow(currentCenter.lat() - targetLat, 2) +
          Math.pow(currentCenter.lng() - targetLng, 2)
        )
      : 1;

    // For short distances, just do a simple smooth pan
    if (distance < 0.1 && Math.abs(currentZoom - targetZoom) < 3) {
      map.panTo({ lat: targetLat, lng: targetLng });
      setTimeout(() => {
        if (map) map.setZoom(targetZoom);
        onFlyComplete();
      }, 500);
      return;
    }

    // Cinematic fly animation for longer distances:
    // 1. Zoom out to show context
    // 2. Pan to target
    // 3. Zoom in to target level

    // Calculate intermediate zoom (zoomed out view)
    const intermediateZoom = Math.max(8, Math.min(currentZoom, targetZoom) - 4);

    // Step 1: Zoom out
    map.setZoom(intermediateZoom);

    // Step 2: After zoom out, pan to target location
    setTimeout(() => {
      if (!map) return;
      map.panTo({ lat: targetLat, lng: targetLng });

      // Step 3: After pan, zoom in to target
      setTimeout(() => {
        if (!map) return;

        // Gradually zoom in for smooth effect
        const zoomSteps = 3;
        const zoomDiff = targetZoom - intermediateZoom;
        const stepDelay = 200;

        for (let i = 1; i <= zoomSteps; i++) {
          setTimeout(() => {
            if (map) {
              const stepZoom = intermediateZoom + (zoomDiff * (i / zoomSteps));
              map.setZoom(Math.round(stepZoom));
            }
          }, stepDelay * i);
        }

        // Complete after all animations
        setTimeout(onFlyComplete, stepDelay * zoomSteps + 200);
      }, 600);
    }, 400);
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

  // Cadastre layer overlay effect
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Helper to remove existing cadastre overlay
    const removeCadastreLayer = () => {
      if (cadastreLayerRef.current) {
        // Find and remove from overlayMapTypes array
        const overlays = map.overlayMapTypes;
        for (let i = overlays.getLength() - 1; i >= 0; i--) {
          if (overlays.getAt(i) === cadastreLayerRef.current) {
            overlays.removeAt(i);
          }
        }
        cadastreLayerRef.current = null;
      }
    };

    // Remove existing cadastre overlay
    removeCadastreLayer();

    if (!showCadastre) {
      lastCadastreZoomRef.current = null;
      return;
    }

    // Get current map center to determine which country's cadastre to show
    const mapCenter = map.getCenter();
    if (!mapCenter) return;

    const cadastreConfig = getCadastreLayerForLocation(mapCenter.lat(), mapCenter.lng());
    if (!cadastreConfig) {
      return;
    }

    // Store current zoom level
    lastCadastreZoomRef.current = map.getZoom() || null;

    // Helper function to convert lat/lng to Web Mercator (EPSG:3857) meters
    const latLngToMercator = (lat: number, lng: number): { x: number; y: number } => {
      const x = lng * 20037508.34 / 180;
      let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
      y = y * 20037508.34 / 180;
      return { x, y };
    };

    // Create WMS tile overlay - optimized for cleaner appearance
    // Use 256px tiles but request at 2x resolution for sharper, thinner lines
    const TILE_SIZE = 256;
    const REQUEST_SIZE = 512; // Request larger image, display smaller = thinner lines

    // Create a unique cache buster based on zoom to prevent stale tiles
    const createWmsLayer = () => {
      return new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          // Only show cadastre at zoom levels >= minZoom
          const minZoom = Math.max(cadastreConfig.minZoom || CADASTRE_MIN_ZOOM, 17);
          if (zoom < minZoom) {
            return '';
          }

          // Calculate tile bounds
          const proj = map.getProjection();
          if (!proj) return '';

          const zfactor = Math.pow(2, zoom);

          // Calculate world coordinates for tile corners
          const topLeft = new google.maps.Point(
            (coord.x * TILE_SIZE) / zfactor,
            (coord.y * TILE_SIZE) / zfactor
          );
          const bottomRight = new google.maps.Point(
            ((coord.x + 1) * TILE_SIZE) / zfactor,
            ((coord.y + 1) * TILE_SIZE) / zfactor
          );

          // Convert to lat/lng
          const sw = proj.fromPointToLatLng(new google.maps.Point(topLeft.x, bottomRight.y));
          const ne = proj.fromPointToLatLng(new google.maps.Point(bottomRight.x, topLeft.y));

          if (!sw || !ne) return '';

          // Build WMS GetMap URL with correct BBOX format
          let bbox: string;
          const crs = cadastreConfig.additionalParams?.CRS || 'EPSG:4326';

          if (crs === 'EPSG:3857') {
            // Convert to Web Mercator meters for EPSG:3857
            const swMerc = latLngToMercator(sw.lat(), sw.lng());
            const neMerc = latLngToMercator(ne.lat(), ne.lng());
            bbox = `${swMerc.x},${swMerc.y},${neMerc.x},${neMerc.y}`;
          } else {
            // EPSG:4326 - WMS 1.3.0 uses lat,lng order (y,x)
            bbox = `${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()}`;
          }

          const params = new URLSearchParams({
            SERVICE: 'WMS',
            VERSION: cadastreConfig.version || '1.3.0',
            REQUEST: 'GetMap',
            LAYERS: cadastreConfig.layers,
            STYLES: '',
            FORMAT: cadastreConfig.format || 'image/png',
            TRANSPARENT: 'true',
            WIDTH: String(REQUEST_SIZE),
            HEIGHT: String(REQUEST_SIZE),
            CRS: crs,
            BBOX: bbox,
          });

          return `${cadastreConfig.wmsUrl}?${params.toString()}`;
        },
        tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
        opacity: 0.55, // Lower opacity for cleaner overlay
        name: 'Cadastre',
      });
    };

    const wmsLayer = createWmsLayer();

    // Add to map
    map.overlayMapTypes.push(wmsLayer);
    cadastreLayerRef.current = wmsLayer;

    // Refresh cadastre layer on zoom changes to clear stale tiles
    const handleZoomChange = () => {
      const newZoom = map.getZoom();
      if (newZoom !== undefined && lastCadastreZoomRef.current !== newZoom) {
        lastCadastreZoomRef.current = newZoom;

        // Remove old layer and create new one to force tile refresh
        removeCadastreLayer();

        // Small delay to ensure clean transition
        requestAnimationFrame(() => {
          if (showCadastre) {
            const newLayer = createWmsLayer();
            map.overlayMapTypes.push(newLayer);
            cadastreLayerRef.current = newLayer;
          }
        });
      }
    };

    // Update cadastre layer when map moves (for country changes)
    const handleIdle = () => {
      const newCenter = map.getCenter();
      if (!newCenter) return;

      const newConfig = getCadastreLayerForLocation(newCenter.lat(), newCenter.lng());
      if (newConfig?.countryCode !== cadastreConfig.countryCode) {
        // Trigger re-render to switch cadastre source
        setShowCadastre(false);
        setTimeout(() => setShowCadastre(true), 100);
      }
    };

    const zoomListener = map.addListener('zoom_changed', handleZoomChange);
    const idleListener = map.addListener('idle', handleIdle);

    return () => {
      google.maps.event.removeListener(zoomListener);
      google.maps.event.removeListener(idleListener);
      removeCadastreLayer();
    };
  }, [map, isLoaded, showCadastre]);

  // Climate risk layer overlay effect
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Remove existing climate overlay
    if (climateLayerRef.current) {
      map.overlayMapTypes.forEach((overlay, index) => {
        if (overlay === climateLayerRef.current) {
          map.overlayMapTypes.removeAt(index);
        }
      });
      climateLayerRef.current = null;
    }

    if (selectedClimateRisk === 'none') return;

    // Climate risk tile layer configurations using real APIs
    const climateLayerConfigs: Record<string, { url: string; opacity: number; name: string }> = {
      // OpenWeatherMap layers (free tier available)
      flood: {
        url: 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=demo',
        opacity: 0.6,
        name: 'Precipitation/Flood Risk'
      },
      // NASA FIRMS active fire data (free)
      fire: {
        url: 'https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/51e65c3412f9d1b15eddb27ab9c3b28c/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=fires_viirs_24&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&BBOX={bbox}&WIDTH=256&HEIGHT=256',
        opacity: 0.7,
        name: 'Active Fires (NASA FIRMS)'
      },
      // Wind speed layer
      wind: {
        url: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=demo',
        opacity: 0.5,
        name: 'Wind Speed'
      },
      // Air quality - OpenWeatherMap
      air: {
        url: 'https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png',
        opacity: 0.6,
        name: 'Air Quality Index (WAQI)'
      },
      // Temperature/Heat
      heat: {
        url: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=demo',
        opacity: 0.5,
        name: 'Temperature/Heat'
      }
    };

    const config = climateLayerConfigs[selectedClimateRisk];
    if (!config) return;

    // Create tile overlay based on risk type
    let climateLayer: google.maps.ImageMapType;

    if (selectedClimateRisk === 'fire') {
      // NASA FIRMS uses WMS format
      climateLayer = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          const proj = map.getProjection();
          if (!proj) return '';

          const tileSize = 256;
          const scale = Math.pow(2, zoom);

          // Calculate bounds for this tile in Web Mercator
          const worldCoordinate = (coord.x * tileSize) / scale;
          const worldCoordinate2 = ((coord.x + 1) * tileSize) / scale;
          const worldCoordinateY = (coord.y * tileSize) / scale;
          const worldCoordinateY2 = ((coord.y + 1) * tileSize) / scale;

          const sw = proj.fromPointToLatLng(new google.maps.Point(worldCoordinate, worldCoordinateY2));
          const ne = proj.fromPointToLatLng(new google.maps.Point(worldCoordinate2, worldCoordinateY));

          if (!sw || !ne) return '';

          // Convert to Web Mercator coordinates for bbox
          const swMerc = latLngToWebMercator(sw.lat(), sw.lng());
          const neMerc = latLngToWebMercator(ne.lat(), ne.lng());

          const bbox = `${swMerc.x},${swMerc.y},${neMerc.x},${neMerc.y}`;

          return `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/51e65c3412f9d1b15eddb27ab9c3b28c/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=fires_viirs_24&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&BBOX=${bbox}&WIDTH=256&HEIGHT=256`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: config.opacity,
        name: config.name,
      });
    } else {
      // Standard XYZ tile layers
      climateLayer = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          return config.url
            .replace('{z}', zoom.toString())
            .replace('{x}', coord.x.toString())
            .replace('{y}', coord.y.toString());
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: config.opacity,
        name: config.name,
      });
    }

    map.overlayMapTypes.push(climateLayer);
    climateLayerRef.current = climateLayer;

    return () => {
      if (climateLayerRef.current) {
        map.overlayMapTypes.forEach((overlay, index) => {
          if (overlay === climateLayerRef.current) {
            map.overlayMapTypes.removeAt(index);
          }
        });
        climateLayerRef.current = null;
      }
    };
  }, [map, isLoaded, selectedClimateRisk]);

  // Memoize map options - MUST be before any early returns to maintain hooks order
  // Check if google is defined before accessing google.maps
  const mapOptions = useMemo<google.maps.MapOptions | undefined>(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;

    return {
      restriction: {
        latLngBounds: BALKAN_BOUNDS,
        strictBounds: false,
      },
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      rotateControl: false,
      scaleControl: false,
      panControl: false,
      keyboardShortcuts: false,
      gestureHandling: 'greedy',
      minZoom: 6,
      maxZoom: 21,
      tilt: 0,
      heading: 0,
      mapId: GOOGLE_MAPS_MAP_ID,
    };
  }, [isLoaded]);

  // Loading state - early returns MUST come after all hooks
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
      <div className="w-full h-full relative overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={initialCenter}
          zoom={userLocation ? 13 : DEFAULT_ZOOM}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onIdle={onIdle}
          options={mapOptions}
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

          {/* Current measurement visualization (being drawn) */}
          {showMeasurement && measurementPoints.length >= 2 && (
            <>
              {measurementMode === 'area' && measurementPoints.length >= 3 ? (
                <Polygon
                  paths={measurementPoints}
                  options={{
                    strokeColor: '#10b981',
                    strokeOpacity: 1,
                    strokeWeight: 3,
                    fillColor: '#10b981',
                    fillOpacity: 0.3,
                    clickable: false,
                  }}
                />
              ) : (
                <Polyline
                  path={measurementPoints}
                  options={{
                    strokeColor: '#10b981',
                    strokeOpacity: 1,
                    strokeWeight: 3,
                    clickable: false,
                  }}
                />
              )}
            </>
          )}
        </GoogleMap>

        {/* Debug info */}
        <div className="absolute top-4 left-4 z-[1001] bg-black/80 text-white text-[10px] font-mono px-2 py-1 rounded-md backdrop-blur-sm shadow-md">
          <span>🔍{zoom.toFixed(1)}/21 📍{center.lat.toFixed(3)},{center.lng.toFixed(3)} 📌{validProperties.length}</span>
        </div>

        {/* Measurement Tool Panel */}
        {showMeasurement && (
          <div
            className="absolute top-16 left-4 z-[1002] p-4 rounded-2xl shadow-2xl border border-white/30 max-w-xs"
            style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <span>📏</span>
                {t('search:map.measure', 'Measure Land')}
              </h3>
              <button
                onClick={() => setShowMeasurement(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 mb-3 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => { setMeasurementMode('area'); setMeasurementPoints([]); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  measurementMode === 'area' ? 'bg-white shadow text-emerald-600' : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                📐 Area
              </button>
              <button
                onClick={() => { setMeasurementMode('distance'); setMeasurementPoints([]); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  measurementMode === 'distance' ? 'bg-white shadow text-emerald-600' : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                📍 Distance
              </button>
            </div>

            {/* Instructions */}
            <p className="text-xs text-gray-500 mb-3">
              {measurementMode === 'area'
                ? 'Click on the map to draw a polygon. Add at least 3 points.'
                : 'Click on the map to add points and measure distance.'}
            </p>

            {/* Current measurement results */}
            {measurementPoints.length >= 2 && (
              <div className="space-y-2 mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                {measurementMode === 'area' && measurementPoints.length >= 3 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Area:</span>
                      <span className="font-bold text-emerald-600">{formatMeasureArea(measurementArea)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Perimeter:</span>
                      <span className="font-semibold text-gray-700">{formatMeasureDistance(measurementPerimeter)}</span>
                    </div>
                  </>
                )}
                {measurementMode === 'distance' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Distance:</span>
                    <span className="font-bold text-emerald-600">{formatMeasureDistance(measurementDistance)}</span>
                  </div>
                )}
                <div className="text-[10px] text-gray-400">
                  {measurementPoints.length} point{measurementPoints.length !== 1 ? 's' : ''} placed
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMeasurementPoints(prev => prev.slice(0, -1))}
                disabled={measurementPoints.length === 0}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ↩️ Undo
              </button>
              {isAuthenticated ? (
                <button
                  onClick={handleOpenSaveModal}
                  disabled={measurementPoints.length < 2 || (measurementMode === 'area' && measurementPoints.length < 3)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  💾 Save
                </button>
              ) : (
                <button
                  onClick={handleQuickSave}
                  disabled={measurementPoints.length < 2 || (measurementMode === 'area' && measurementPoints.length < 3)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  💾 Keep
                </button>
              )}
              <button
                onClick={() => setMeasurementPoints([])}
                disabled={measurementPoints.length === 0}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                🗑️ New
              </button>
            </div>

          </div>
        )}

        {/* Climate Risk Legend */}
        {selectedClimateRisk !== 'none' && (
          <div className="absolute top-14 left-4 z-[1000]">
            <ClimateRiskLegend riskType={selectedClimateRisk} />
          </div>
        )}

        {/* Desktop Controls */}
        {!isMobile && (
          <div className="absolute bottom-20 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
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
                  onClick={() => setMapStyle('clean')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapStyle === 'clean' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  title="Clean, minimal - properties stand out"
                >
                  {t('search:map.clean', 'Clean')}
                </button>
                <button
                  onClick={() => setMapStyle('color')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapStyle === 'color' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  title="Shows neighborhoods, parks, amenities"
                >
                  {t('search:map.color', 'Color')}
                </button>
                <button
                  onClick={() => setMapStyle('street')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapStyle === 'street' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  title="Google Maps street view"
                >
                  {t('search:map.street', 'Street')}
                </button>
                <button
                  onClick={() => setMapStyle('satellite')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapStyle === 'satellite' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  title="Aerial/satellite imagery"
                >
                  {t('search:map.satellite', 'Satellite')}
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
              {/* Climate Risks Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsClimateMenuOpen(!isClimateMenuOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    isClimateMenuOpen || selectedClimateRisk !== 'none'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  <span>🌡️</span>
                  <span>{t('search:map.climateRisks.title', 'Climate')}</span>
                  <svg className={`w-3 h-3 transition-transform ${isClimateMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isClimateMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 min-w-[160px]">
                    {(['none', 'flood', 'fire', 'wind', 'air', 'heat'] as ClimateRiskType[]).map((risk) => (
                      <button
                        key={risk}
                        onClick={() => { setSelectedClimateRisk(risk); setIsClimateMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedClimateRisk === risk ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {risk === 'none' ? '✕ None' : risk === 'flood' ? '💧 Flood' : risk === 'fire' ? '🔥 Fire' : risk === 'wind' ? '💨 Wind' : risk === 'air' ? '🌬️ Air Quality' : '☀️ Heat'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Promoted/Premium Filter */}
              <button
                onClick={() => setShowOnlyPromoted(!showOnlyPromoted)}
                className={`relative flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  showOnlyPromoted ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title={showOnlyPromoted ? 'Show all listings' : 'Show only premium & promoted'}
              >
                <span>👑</span>
                <span className="hidden sm:inline">{t('search:map.promoted', 'Premium')}</span>
                {promotedCount > 0 && !showOnlyPromoted && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full px-1">
                    {promotedCount}
                  </span>
                )}
              </button>

              <div className="w-px h-5 bg-gray-300/50" />

              {/* 3D Buildings Toggle */}
              <button
                onClick={() => setShow3DBuildings(!show3DBuildings)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  show3DBuildings ? 'bg-slate-700 text-white' : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title="3D Buildings"
              >
                <span>🏢</span>
                <span className="hidden sm:inline">3D</span>
              </button>

              {/* Landmarks Toggle */}
              <button
                onClick={() => setShowLandmarks(!showLandmarks)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  showLandmarks ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title="Show POI"
              >
                <span>🏛️</span>
                <span className="hidden sm:inline">POI</span>
              </button>

              {/* Measurement Tool Toggle */}
              <button
                onClick={() => setShowMeasurement(!showMeasurement)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  showMeasurement ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title="Measure land"
              >
                <span>📏</span>
                <span className="hidden sm:inline">Measure</span>
              </button>

              {/* Cadastre Layer Toggle */}
              <button
                onClick={() => setShowCadastre(!showCadastre)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  showCadastre ? 'bg-orange-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title="Show cadastre parcels (zoom in for details)"
              >
                <span>📐</span>
                <span className="hidden sm:inline">Cadastre</span>
              </button>

              {/* Legend Toggle */}
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

        {/* Legend - bottom left */}
        {isLegendOpen && !isMobile && (
          <div className="absolute bottom-20 left-4 z-[1000] animate-fade-in">
            <Legend />
          </div>
        )}

        {/* Mobile Controls */}
        {isMobile && (
          <>
            {/* Mobile layer menu FAB */}
            <div className="absolute bottom-28 left-3 z-[1003]">
              {isLayerMenuOpen && (
                <div className="absolute bottom-full left-0 mb-3 animate-fade-in">
                  <div
                    className="flex flex-col gap-1 p-2 rounded-2xl shadow-2xl border border-white/40"
                    style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)' }}
                  >
                    <button
                      onClick={() => { setShow3DBuildings(!show3DBuildings); setIsLayerMenuOpen(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        show3DBuildings ? 'bg-slate-100 text-slate-700' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>🏢</span>
                      <span>3D Buildings</span>
                    </button>
                    <button
                      onClick={() => { setShowMeasurement(!showMeasurement); setIsLayerMenuOpen(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        showMeasurement ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>📏</span>
                      <span>Measure</span>
                    </button>
                    <button
                      onClick={() => { setIsLegendOpen(!isLegendOpen); setIsLayerMenuOpen(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isLegendOpen ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <MapLegendIcon className="w-4 h-4" />
                      <span>Legend</span>
                    </button>
                    <button
                      onClick={() => { setShowLandmarks(!showLandmarks); setIsLayerMenuOpen(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        showLandmarks ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>🏛️</span>
                      <span>POI</span>
                    </button>
                    <button
                      onClick={() => { setShowCadastre(!showCadastre); setIsLayerMenuOpen(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        showCadastre ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>📐</span>
                      <span>Cadastre</span>
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
                className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
                  isLayerMenuOpen ? 'bg-primary text-white' : 'bg-white text-gray-700'
                }`}
              >
                <span className="text-lg">📊</span>
              </button>
            </div>

            {/* Mobile controls - top right */}
            <div className="absolute top-16 right-2 z-[999]">
              <div className="flex flex-col gap-1.5 items-end">
                <div
                  className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30"
                  style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)' }}
                >
                  <button
                    onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
                    className="px-2.5 py-2 text-xs font-semibold rounded-xl text-gray-700 hover:bg-white/50"
                  >
                    {mapStyle === 'satellite' || mapStyle === 'hybrid' ? '🗺️' : '🛰️'}
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
                    style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(20px)' }}
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

            {/* Mobile Legend */}
            {isLegendOpen && (
              <div className="absolute bottom-44 left-3 z-[1002] animate-fade-in">
                <Legend />
              </div>
            )}
          </>
        )}

        {/* Save Measurement Modal - Portal to body for proper z-index */}
        {showSaveModal && pendingMeasurement && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📏</span>
                    <div>
                      <h3 className="font-bold text-lg">{t('search:map.saveMeasurement', 'Save Measurement')}</h3>
                      <p className="text-xs text-white/80">
                        {pendingMeasurement.mode === 'area'
                          ? formatMeasureArea(pendingMeasurement.area)
                          : formatMeasureDistance(pendingMeasurement.distance)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowSaveModal(false); setPendingMeasurement(null); }}
                    className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-5 space-y-4">
                {/* Name field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('search:map.measurementName', 'Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={measurementName}
                    onChange={(e) => setMeasurementName(e.target.value)}
                    placeholder={t('search:map.measurementNamePlaceholder', 'e.g., Garden plot, Building lot...')}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>

                {/* Address/Location field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('search:map.measurementLocation', 'Location / Address')}
                  </label>
                  <input
                    type="text"
                    value={measurementAddress}
                    onChange={(e) => setMeasurementAddress(e.target.value)}
                    placeholder={t('search:map.measurementLocationPlaceholder', 'e.g., Near Lake Ohrid, Albania...')}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Notes field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('search:map.measurementNotes', 'Notes')}
                  </label>
                  <textarea
                    value={measurementNotes}
                    onChange={(e) => setMeasurementNotes(e.target.value)}
                    placeholder={t('search:map.measurementNotesPlaceholder', 'Any additional details...')}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Measurement details */}
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-indigo-600 font-semibold">{pendingMeasurement.mode === 'area' ? '📐 Area' : '📍 Distance'}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-700">{pendingMeasurement.points.length} points</span>
                    {pendingMeasurement.mode === 'area' && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-700">Perimeter: {formatMeasureDistance(pendingMeasurement.perimeter)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Measurement limit indicator */}
                {isAuthenticated && (
                  <div className={`p-3 rounded-xl ${isAtMeasurementLimit ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {t('search:map.measurementUsage', 'Saved measurements')}
                      </span>
                      <span className={`text-sm font-bold ${isAtMeasurementLimit ? 'text-red-600' : 'text-gray-700'}`}>
                        {measurementCount} / {measurementMaxAllowed}
                      </span>
                    </div>
                    {!measurementIsPro && measurementCount >= measurementMaxAllowed - 1 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {isAtMeasurementLimit
                          ? '⚠️ You\'ve reached the free limit. Upgrade to Pro for more!'
                          : '⚠️ 1 slot remaining. Upgrade to Pro for more measurements.'
                        }
                      </p>
                    )}
                  </div>
                )}

                {/* Error message */}
                {measurementSaveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 text-lg">❌</span>
                      <div>
                        <p className="text-sm font-semibold text-red-700">
                          {t('search:map.saveFailed', 'Could not save')}
                        </p>
                        <p className="text-xs text-red-600 mt-0.5">{measurementSaveError}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 py-4 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setPendingMeasurement(null);
                    setMeasurementSaveError(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('common:cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleSaveMeasurementToBackend}
                  disabled={!measurementName.trim() || savingMeasurement || (isAuthenticated && isAtMeasurementLimit)}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {savingMeasurement ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('common:saving', 'Saving...')}</span>
                    </>
                  ) : isAtMeasurementLimit && isAuthenticated ? (
                    <>
                      <span>🔒</span>
                      <span>{t('search:map.limitReached', 'Limit Reached')}</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>{t('search:map.saveToProfile', 'Save to Profile')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </HighlightedPropertiesProvider>
  );
};

export default GoogleMapComponent;
