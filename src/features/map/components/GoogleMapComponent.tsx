import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GoogleMap,
  useJsApiLoader,
  Rectangle,
  Polyline,
  Polygon,
  OverlayView,
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
import MapOptionsPanel, { MapOptionType, ClimateRiskType } from './MapOptionsPanel';
import SunPositionControl from './SunPositionControl';
import SunArcAnimation, { type Season, type SunriseSunsetInfo } from './SunArcAnimation';
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM, type CadastreLayerConfig } from '@/config/cadastreLayers';
import GoogleMeasurementTool, { useMeasurementTool, type MeasurementPoint } from './GoogleMeasurementTool';
import Google3DBuildingsLayer from './Google3DBuildingsLayer';

// Balkan region bounds
const BALKAN_BOUNDS = {
  north: 49,
  south: 34,
  west: 13,
  east: 31,
};

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 41.5, lng: 22 };

// Google Maps libraries
const libraries: ('places' | 'geometry')[] = [];

// Property type colors (matching Leaflet version)
const PROPERTY_TYPE_COLORS: Record<string, string> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  land: '#8B4513',
  other: '#6c757d',
};

// Promotion tier colors
const PROMOTION_COLORS: Record<string, string> = {
  premium: '#FFB800',    // Gold
  highlight: '#0EA5E9',  // Light Blue
  featured: '#7C3AED',   // Purple
};

// Climate risk tile URLs - using OpenWeatherMap public layers
// These are free public layers that don't require API keys
const CLIMATE_RISK_TILES: Record<string, string> = {
  flood: 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
  fire: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
  wind: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
  air: 'https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png',
  heat: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
};

// Fallback tile URLs in case primary fails
const CLIMATE_RISK_FALLBACK: Record<string, string> = {
  flood: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
  fire: 'https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
  wind: 'https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
  air: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
  heat: 'https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
};

// Climate risk legend data
const CLIMATE_RISK_LEGENDS: Record<string, { title: string; colors: { color: string; label: string }[] }> = {
  flood: {
    title: 'Precipitation',
    colors: [
      { color: '#a0f0a0', label: 'Light' },
      { color: '#00ff00', label: 'Med' },
      { color: '#ffff00', label: 'Heavy' },
      { color: '#ff0000', label: 'Severe' },
    ],
  },
  fire: {
    title: 'Temperature',
    colors: [
      { color: '#313695', label: 'Cool' },
      { color: '#fee090', label: 'Warm' },
      { color: '#f46d43', label: 'Hot' },
      { color: '#a50026', label: 'Extreme' },
    ],
  },
  wind: {
    title: 'Wind Speed',
    colors: [
      { color: '#e8f4f8', label: 'Calm' },
      { color: '#a6d9e8', label: 'Light' },
      { color: '#5ab4cf', label: 'Mod' },
      { color: '#1a8ab7', label: 'Strong' },
    ],
  },
  air: {
    title: 'Air Quality',
    colors: [
      { color: '#00e400', label: 'Good' },
      { color: '#ffff00', label: 'OK' },
      { color: '#ff7e00', label: 'Poor' },
      { color: '#ff0000', label: 'Bad' },
    ],
  },
  heat: {
    title: 'Temperature',
    colors: [
      { color: '#313695', label: 'Cold' },
      { color: '#74add1', label: 'Cool' },
      { color: '#fee090', label: 'Warm' },
      { color: '#f46d43', label: 'Hot' },
      { color: '#a50026', label: 'Extreme' },
    ],
  },
};

// Format price for markers
const formatMarkerPrice = (price: number): string => {
  if (price >= 1000000) {
    const millions = price / 1000000;
    return millions >= 10 ? `€${Math.round(millions)}M` : `€${millions.toFixed(1).replace('.0', '')}M`;
  }
  if (price >= 1000) return `€${Math.round(price / 1000)}K`;
  return `€${price}`;
};

// Climate Risk Legend Component
const ClimateRiskLegend: React.FC<{ riskType: ClimateRiskType }> = ({ riskType }) => {
  if (riskType === 'none') return null;
  const config = CLIMATE_RISK_LEGENDS[riskType];
  if (!config) return null;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-md border border-white/20 inline-flex flex-col">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-medium text-gray-600 whitespace-nowrap">{config.title}</span>
        <div className="flex items-center">
          {config.colors.map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className="w-4 h-1.5"
                style={{
                  backgroundColor: item.color,
                  borderRadius: index === 0 ? '2px 0 0 2px' : index === config.colors.length - 1 ? '0 2px 2px 0' : '0',
                }}
              />
              <span className="text-[6px] text-gray-500 leading-tight mt-0.5">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Inject styles for marker animations
const injectMarkerStyles = () => {
  const styleId = 'google-map-marker-styles';
  if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes marker-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes marker-pulse-gold {
        0%, 100% { box-shadow: 0 0 8px 2px rgba(255, 184, 0, 0.6), 0 2px 8px rgba(0,0,0,0.3); transform: translateY(0); }
        50% { box-shadow: 0 0 20px 8px rgba(255, 184, 0, 0.9), 0 4px 12px rgba(0,0,0,0.3); transform: translateY(-6px); }
      }
      @keyframes marker-pulse-blue {
        0%, 100% { box-shadow: 0 0 8px 2px rgba(14, 165, 233, 0.6), 0 2px 8px rgba(0,0,0,0.3); transform: translateY(0); }
        50% { box-shadow: 0 0 20px 8px rgba(14, 165, 233, 0.9), 0 4px 12px rgba(0,0,0,0.3); transform: translateY(-6px); }
      }
      @keyframes marker-pulse-purple {
        0%, 100% { box-shadow: 0 0 8px 2px rgba(124, 58, 237, 0.6), 0 2px 8px rgba(0,0,0,0.3); transform: translateY(0); }
        50% { box-shadow: 0 0 20px 8px rgba(124, 58, 237, 0.9), 0 4px 12px rgba(0,0,0,0.3); transform: translateY(-6px); }
      }
      .marker-pulse-premium { animation: marker-pulse-gold 1.5s ease-in-out infinite; }
      .marker-pulse-highlight { animation: marker-pulse-blue 1.5s ease-in-out infinite; }
      .marker-pulse-featured { animation: marker-pulse-purple 1.5s ease-in-out infinite; }
      .marker-bounce { animation: marker-bounce 1s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }
};

// Initialize marker styles
if (typeof window !== 'undefined') {
  injectMarkerStyles();
}

// Custom Property Marker using OverlayView for reliable rendering
interface PropertyMarkerProps {
  property: Property;
  isHovered: boolean;
  onClick: () => void;
  zoom: number;
}

const PropertyMarkerOverlay: React.FC<PropertyMarkerProps> = ({ property, isHovered, onClick, zoom }) => {
  const price = formatMarkerPrice(property.price);
  const baseColor = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;

  // Check promotion status
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  const promotionTier = isActivelyPromoted ? property.promotionTier : null;
  const promotionColor = promotionTier ? PROMOTION_COLORS[promotionTier] : null;

  // Determine animation class for promoted listings
  const pulseClass = promotionTier ? `marker-pulse-${promotionTier}` : '';

  const position = { lat: property.lat!, lng: property.lng! };

  // Calculate scale factor based on zoom level
  // Full size at zoom >= 14, scales down to 0.5 at zoom <= 8
  const zoomScale = Math.max(0.5, Math.min(1, (zoom - 8) / 6));

  // Calculate dynamic width based on price length and zoom
  const priceLen = price.length;
  const baseMinWidth = Math.max(42, priceLen * 8 + 16);
  const minWidth = baseMinWidth * zoomScale;
  const height = 28 * zoomScale;
  const fontSize = 11 * zoomScale;
  const padding = 10 * zoomScale;
  const borderRadius = 14 * zoomScale;

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -(height / 2),
      })}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="cursor-pointer"
        style={{
          transform: isHovered ? 'scale(1.15)' : 'scale(1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: isHovered ? 1000 : isActivelyPromoted ? 100 : 1,
          position: 'relative',
        }}
      >
        {/* Main marker - circular pill shape */}
        <div
          className={`flex items-center justify-center text-white font-bold whitespace-nowrap ${pulseClass}`}
          style={{
            minWidth: `${minWidth}px`,
            height: `${height}px`,
            padding: `0 ${padding}px`,
            borderRadius: `${borderRadius}px`,
            backgroundColor: baseColor,
            border: `${(isHovered ? 3 : promotionColor ? 3 : 2) * zoomScale}px solid ${isHovered ? '#fff' : promotionColor || '#fff'}`,
            fontSize: `${fontSize}px`,
            boxShadow: !pulseClass ? (isHovered
              ? `0 0 16px 4px ${baseColor}70, 0 6px 16px rgba(0,0,0,0.35)`
              : '0 3px 8px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2)') : undefined,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {price}
        </div>
        {/* Promotion badge - only show at reasonable zoom */}
        {promotionTier && zoomScale >= 0.7 && (
          <div
            className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-bold"
            style={{
              width: `${20 * zoomScale}px`,
              height: `${20 * zoomScale}px`,
              fontSize: `${9 * zoomScale}px`,
              backgroundColor: promotionColor,
              border: `${2 * zoomScale}px solid white`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              color: 'white',
            }}
            title={promotionTier.charAt(0).toUpperCase() + promotionTier.slice(1)}
          >
            {promotionTier === 'premium' ? '★' : promotionTier === 'highlight' ? '✦' : '◆'}
          </div>
        )}
        {/* Pointer triangle at bottom */}
        <div
          className="absolute left-1/2"
          style={{
            bottom: `${-6 * zoomScale}px`,
            width: 0,
            height: 0,
            borderLeft: `${6 * zoomScale}px solid transparent`,
            borderRight: `${6 * zoomScale}px solid transparent`,
            borderTop: `${6 * zoomScale}px solid ${baseColor}`,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))',
          }}
        />
      </div>
    </OverlayView>
  );
};

// Property Legend Component
const Legend: React.FC = () => (
  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100 min-w-[200px]">
    <h4 className="text-sm font-semibold text-gray-800 mb-3">Property Types</h4>
    <div className="space-y-2">
      {Object.entries(PROPERTY_TYPE_COLORS).filter(([key]) => key !== 'other').map(([type, color]) => (
        <div key={type} className="flex items-center gap-3">
          <div className="w-10 h-5 rounded-full text-[9px] text-white flex items-center justify-center font-bold shadow-sm" style={{ backgroundColor: color }}>
            €50K
          </div>
          <span className="text-xs text-gray-600 capitalize">{type}</span>
        </div>
      ))}
    </div>
    <div className="border-t border-gray-200 pt-3 mt-3">
      <h4 className="text-xs font-semibold text-gray-700 mb-2">Promoted Listings</h4>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROMOTION_COLORS.premium, boxShadow: `0 0 8px ${PROMOTION_COLORS.premium}` }} />
          <span className="text-[10px] text-gray-600">Premium (Gold glow)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROMOTION_COLORS.highlight, boxShadow: `0 0 8px ${PROMOTION_COLORS.highlight}` }} />
          <span className="text-[10px] text-gray-600">Highlight (Blue glow)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROMOTION_COLORS.featured, boxShadow: `0 0 8px ${PROMOTION_COLORS.featured}` }} />
          <span className="text-[10px] text-gray-600">Featured (Purple glow)</span>
        </div>
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
  return new google.maps.LatLngBounds({ lat: sw.lat, lng: sw.lng }, { lat: ne.lat, lng: ne.lng });
};

// Helper to convert Google Maps LatLng to Leaflet LatLng
const googleLatLngToLeaflet = (gLatLng: google.maps.LatLng): L.LatLng => {
  return L.latLng(gLatLng.lat(), gLatLng.lng());
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Props interface
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

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(7);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('roadmap');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // UI state
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isMapOptionsOpen, setIsMapOptionsOpen] = useState(false);

  // Layer toggles
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [showCadastre, setShowCadastre] = useState(false);
  const [currentCadastreLayer, setCurrentCadastreLayer] = useState<CadastreLayerConfig | undefined>(undefined);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [measurementSessionKey, setMeasurementSessionKey] = useState(0); // Forces remount of measurement components
  const [showPromotedOnly, setShowPromotedOnly] = useState(false);
  const [selectedMapOption, setSelectedMapOption] = useState<MapOptionType>('streetview');
  const [selectedClimateRisk, setSelectedClimateRisk] = useState<ClimateRiskType>('none');

  // Sun simulation state for 3D buildings
  const [sunDateTime, setSunDateTime] = useState<Date>(new Date());
  const [sunSeason, setSunSeason] = useState<Season>('current');
  const [isNightMode, setIsNightMode] = useState(false);


  // Promoted listings agent state
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [currentPromotedIndex, setCurrentPromotedIndex] = useState(0);

  // Drawing state
  const [drawStartPos, setDrawStartPos] = useState<google.maps.LatLng | null>(null);
  const [tempDrawRect, setTempDrawRect] = useState<google.maps.LatLngBounds | null>(null);

  // Measurement tool state (using hook for shared state)
  const measurementTool = useMeasurementTool(map, showMeasurement);

  // Increment session key when measurement is disabled or cleared to force cleanup
  const prevShowMeasurement = useRef(showMeasurement);
  const prevPointsLength = useRef(measurementTool.points.length);
  useEffect(() => {
    // If measurement was enabled and is now disabled, increment key
    if (prevShowMeasurement.current && !showMeasurement) {
      setMeasurementSessionKey(k => k + 1);
    }
    // If points were > 0 and are now 0 (cleared), increment key
    if (prevPointsLength.current > 0 && measurementTool.points.length === 0) {
      setMeasurementSessionKey(k => k + 1);
    }
    prevShowMeasurement.current = showMeasurement;
    prevPointsLength.current = measurementTool.points.length;
  }, [showMeasurement, measurementTool.points.length]);

  // Climate overlay ref
  const climateOverlayRef = useRef<google.maps.ImageMapType | null>(null);
  // Cadastre overlay ref
  const cadastreOverlayRef = useRef<google.maps.ImageMapType | null>(null);

  // Refs
  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialCenterSetRef = useRef(false);
  const initialCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
    libraries,
  });

  // Initial center and zoom - only set ONCE, don't re-center when userLocation changes
  const { center, initialZoom } = useMemo(() => {
    // If we already set initial center, keep using it (don't recenter)
    if (initialCenterSetRef.current && initialCenterRef.current) {
      return { center: initialCenterRef.current, initialZoom: 7 };
    }

    // First time setup
    if (userLocation) {
      const newCenter = { lat: userLocation[0], lng: userLocation[1] };
      initialCenterRef.current = newCenter;
      initialCenterSetRef.current = true;
      return { center: newCenter, initialZoom: 13 };
    }

    initialCenterRef.current = defaultCenter;
    initialCenterSetRef.current = true;
    return { center: defaultCenter, initialZoom: 7 };
  }, [userLocation]);

  // Filter valid properties
  const validProperties = useMemo(() => {
    let filtered = properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );
    // Filter for promoted only if enabled
    if (showPromotedOnly) {
      filtered = filtered.filter(p => p.isPromoted && p.promotionEndDate && p.promotionEndDate > Date.now());
    }
    return filtered.slice(0, 500);
  }, [properties, showPromotedOnly]);


  // Handle day/night change from sun animation
  const handleDayNightChange = useCallback((isDay: boolean, sunInfo: SunriseSunsetInfo) => {
    setIsNightMode(!isDay);
  }, []);

  // Apply tilt when 3D buildings is toggled
  useEffect(() => {
    if (map && show3DBuildings) {
      // Set tilt for 3D view
      map.setTilt(60);
    } else if (map) {
      map.setTilt(0);
    }
  }, [map, show3DBuildings]);

  // Get current sun hour from dateTime
  const sunHour = useMemo(() => {
    return sunDateTime.getHours() + sunDateTime.getMinutes() / 60;
  }, [sunDateTime]);

  // Map styles for POI visibility
  const mapStyles: google.maps.MapTypeStyle[] = useMemo(() => {
    if (mapType === 'satellite' || mapType === 'hybrid') return [];
    return [
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: showLandmarks ? 'on' : 'off' }] },
      { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    ];
  }, [mapType, showLandmarks]);

  // Map options
  const mapOptions: google.maps.MapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: !isMobile,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: show3DBuildings, // Enable rotate control for 3D navigation
    fullscreenControl: false,
    clickableIcons: false, // Disable default POI info windows (ugly gray X popup)
    restriction: { latLngBounds: BALKAN_BOUNDS, strictBounds: false },
    minZoom: 6,
    maxZoom: 21, // No limit on zoom
    mapTypeId: mapType,
    gestureHandling: isDrawing ? 'none' : 'greedy', // Disable gesture handling when drawing to allow touch events
    scrollwheel: !isDrawing, // Disable scroll zoom when drawing
    draggable: !isDrawing, // Allow dragging in measurement mode, only disable during rectangle drawing
    styles: mapStyles,
    tilt: show3DBuildings ? 60 : 0, // Higher tilt for better 3D view
    heading: 0,
  }), [mapType, isMobile, isDrawing, mapStyles, show3DBuildings]);

  // Handle map option change
  const handleMapOptionChange = useCallback((option: MapOptionType) => {
    setSelectedMapOption(option);
    const mapOptionToType: Record<MapOptionType, 'roadmap' | 'satellite' | 'terrain' | 'hybrid'> = {
      automatic: 'roadmap',
      satellite: 'satellite',
      streetview: 'roadmap',
    };
    setMapType(mapOptionToType[option]);
    if (isMobile) setIsMapOptionsOpen(false);
  }, [isMobile]);

  // Handle climate risk change
  const handleClimateRiskChange = useCallback((risk: ClimateRiskType) => {
    setSelectedClimateRisk(risk);
  }, []);

  // Apply climate risk overlay
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Remove existing overlay
    if (climateOverlayRef.current) {
      map.overlayMapTypes.removeAt(0);
      climateOverlayRef.current = null;
    }

    // Add new overlay if not 'none'
    if (selectedClimateRisk !== 'none') {
      const tileUrl = CLIMATE_RISK_TILES[selectedClimateRisk];
      if (tileUrl) {
        const overlay = new google.maps.ImageMapType({
          getTileUrl: (coord, zoom) => {
            return tileUrl.replace('{z}', String(zoom)).replace('{x}', String(coord.x)).replace('{y}', String(coord.y));
          },
          tileSize: new google.maps.Size(256, 256),
          opacity: 0.6,
          name: selectedClimateRisk,
        });
        map.overlayMapTypes.insertAt(0, overlay);
        climateOverlayRef.current = overlay;
      }
    }
  }, [map, selectedClimateRisk, isLoaded]);

  // Update cadastre layer based on map center
  useEffect(() => {
    if (!map || !isLoaded || !showCadastre) {
      setCurrentCadastreLayer(undefined);
      return;
    }

    const updateCadastreLayer = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (!center || !zoom) return;

      // Only show cadastre at high zoom levels
      if (zoom < CADASTRE_MIN_ZOOM) {
        setCurrentCadastreLayer(undefined);
        return;
      }

      // Find the appropriate cadastre layer for the current location
      const layer = getCadastreLayerForLocation(center.lat(), center.lng());
      setCurrentCadastreLayer(layer);
    };

    updateCadastreLayer();
    const listener = map.addListener('idle', updateCadastreLayer);
    return () => google.maps.event.removeListener(listener);
  }, [map, isLoaded, showCadastre]);

  // Apply cadastre overlay
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Remove existing cadastre overlay
    if (cadastreOverlayRef.current) {
      const index = map.overlayMapTypes.getArray().indexOf(cadastreOverlayRef.current);
      if (index > -1) map.overlayMapTypes.removeAt(index);
      cadastreOverlayRef.current = null;
    }

    // Add cadastre overlay if enabled and layer is available
    if (showCadastre && currentCadastreLayer && (mapType === 'satellite' || mapType === 'hybrid')) {
      const { wmsUrl, layers, format, version, transparent, additionalParams } = currentCadastreLayer;
      const crs = additionalParams?.CRS || 'EPSG:4326';

      // Helper function to convert lat/lng to Web Mercator (EPSG:3857)
      const toWebMercator = (lat: number, lng: number): [number, number] => {
        const x = lng * 20037508.34 / 180;
        let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
        y = y * 20037508.34 / 180;
        return [x, y];
      };

      const cadastreOverlay = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          const scale = Math.pow(2, zoom);

          // Calculate tile bounds in EPSG:4326 (lat/lng)
          const nwLng = (coord.x / scale) * 360 - 180;
          const seLng = ((coord.x + 1) / scale) * 360 - 180;
          const n = Math.PI - 2 * Math.PI * coord.y / scale;
          const nwLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
          const n2 = Math.PI - 2 * Math.PI * (coord.y + 1) / scale;
          const seLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n2) - Math.exp(-n2)));

          let bbox: string;
          let bboxCrs = crs;

          if (crs === 'EPSG:3857') {
            // Convert to Web Mercator coordinates
            const [nwX, nwY] = toWebMercator(nwLat, nwLng);
            const [seX, seY] = toWebMercator(seLat, seLng);
            bbox = `${nwX},${seY},${seX},${nwY}`;
          } else {
            // EPSG:4326 - use lat/lng directly
            // WMS 1.3.0 with EPSG:4326 expects lat,lng order
            bbox = `${seLat},${nwLng},${nwLat},${seLng}`;
          }

          return `${wmsUrl}?SERVICE=WMS&VERSION=${version || '1.3.0'}&REQUEST=GetMap&LAYERS=${encodeURIComponent(layers)}&STYLES=&FORMAT=${format || 'image/png'}&TRANSPARENT=${transparent !== false}&WIDTH=256&HEIGHT=256&CRS=${bboxCrs}&BBOX=${bbox}`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.75,
        name: 'cadastre',
      });
      map.overlayMapTypes.push(cadastreOverlay);
      cadastreOverlayRef.current = cadastreOverlay;
    }
  }, [map, showCadastre, currentCadastreLayer, mapType, isLoaded]);

  // Handle map load
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    setTimeout(() => {
      const bounds = mapInstance.getBounds();
      const center = mapInstance.getCenter();
      if (bounds && center) {
        onMapMove(googleBoundsToLeaflet(bounds), googleLatLngToLeaflet(center));
      }
    }, 100);
  }, [onMapMove]);

  // Handle map unmount
  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle map idle
  const handleIdle = useCallback(() => {
    if (!map) return;
    if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
    moveDebounceRef.current = setTimeout(() => {
      const bounds = map.getBounds();
      const center = map.getCenter();
      const currentZoom = map.getZoom();
      if (bounds && center) {
        onMapMove(googleBoundsToLeaflet(bounds), googleLatLngToLeaflet(center));
      }
      if (currentZoom) setZoom(currentZoom);
    }, 150);
  }, [map, onMapMove]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
    };
  }, []);

  // Handle fly to target - smooth animation like Leaflet
  useEffect(() => {
    if (!map || !flyToTarget) return;

    const targetLat = flyToTarget.center[0];
    const targetLng = flyToTarget.center[1];
    const targetZoom = flyToTarget.zoom;
    const currentZoom = map.getZoom() || 10;
    const currentCenter = map.getCenter();

    if (!currentCenter) {
      map.panTo({ lat: targetLat, lng: targetLng });
      map.setZoom(targetZoom);
      onFlyComplete();
      return;
    }

    const startLat = currentCenter.lat();
    const startLng = currentCenter.lng();
    const startZoom = currentZoom;

    // Calculate distance to determine animation behavior
    const latDiff = Math.abs(targetLat - startLat);
    const lngDiff = Math.abs(targetLng - startLng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // Duration: 2.5s like Leaflet default
    const duration = 2500;

    // Calculate zoom dip - zoom out during flight, more for longer distances
    const zoomDip = Math.min(4, Math.max(0.5, Math.log2(distance + 1) * 1.2));
    const minZoom = Math.max(4, Math.min(startZoom, targetZoom) - zoomDip);

    let animationFrame: number;
    let startTime: number | null = null;

    // Smooth easing function (same as Leaflet)
    const easeInOutQuad = (t: number): number => {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeInOutQuad(progress);

      // Interpolate position
      const lat = startLat + (targetLat - startLat) * easedProgress;
      const lng = startLng + (targetLng - startLng) * easedProgress;

      // Zoom follows a curve: start -> dip down -> end
      // Parabola peaks at progress=0.5
      const zoomCurve = 1 - 4 * Math.pow(progress - 0.5, 2);
      const zoomDipAmount = zoomDip * zoomCurve;
      const linearZoom = startZoom + (targetZoom - startZoom) * easedProgress;
      const zoom = linearZoom - zoomDipAmount;

      map.moveCamera({
        center: { lat, lng },
        zoom: Math.max(minZoom, zoom),
      });

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at target
        map.moveCamera({
          center: { lat: targetLat, lng: targetLng },
          zoom: targetZoom,
        });
        onFlyComplete();
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [map, flyToTarget, onFlyComplete]);

  // Handle marker click
  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedProperty(property);
  }, []);

  // Handle property navigation
  const handlePropertyClick = useCallback((propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    window.history.pushState({ propertyId }, '', `/property/${propertyId}`);
  }, [dispatch]);

  // Drawing handlers - for rectangle drawing
  const handleMapMouseDown = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !isDrawing) return;
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
    onDrawComplete(googleBoundsToLeaflet(tempDrawRect));
    setDrawStartPos(null);
    setTempDrawRect(null);
  }, [isDrawing, tempDrawRect, onDrawComplete]);

  // Map click handler - close popup
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    // Close property popup when clicking on map (not in measurement mode)
    if (selectedProperty && !showMeasurement) {
      setSelectedProperty(null);
    }
  }, [selectedProperty, showMeasurement]);

  // Update cursor for drawing/measurement mode (allow zoom/pan in measurement mode)
  useEffect(() => {
    if (map) {
      const cursor = isDrawing ? 'crosshair' : showMeasurement ? 'crosshair' : null;
      map.setOptions({
        draggableCursor: cursor,
        draggingCursor: cursor,
        draggable: !isDrawing, // Only disable dragging during rectangle drawing, allow in measurement mode
      });
    }
  }, [map, isDrawing, showMeasurement]);

  // Mobile touch event handlers for drawing
  useEffect(() => {
    if (!map || !isDrawing || !isMobile) return;

    const mapDiv = map.getDiv();
    let touchStartLatLng: google.maps.LatLng | null = null;

    const getLatLngFromTouch = (touch: Touch): google.maps.LatLng | null => {
      const rect = mapDiv.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const projection = map.getProjection();
      if (!projection) return null;

      const bounds = map.getBounds();
      if (!bounds) return null;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const topRight = projection.fromLatLngToPoint(ne);
      const bottomLeft = projection.fromLatLngToPoint(sw);
      if (!topRight || !bottomLeft) return null;

      const scale = Math.pow(2, map.getZoom() || 0);
      const worldPoint = new google.maps.Point(
        bottomLeft.x + (x / rect.width) * (topRight.x - bottomLeft.x),
        topRight.y + (y / rect.height) * (bottomLeft.y - topRight.y)
      );
      return projection.fromPointToLatLng(worldPoint);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const latLng = getLatLngFromTouch(e.touches[0]);
      if (latLng) {
        touchStartLatLng = latLng;
        setDrawStartPos(latLng);
        setTempDrawRect(null);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartLatLng || e.touches.length !== 1) return;
      e.preventDefault();
      const currentLatLng = getLatLngFromTouch(e.touches[0]);
      if (currentLatLng) {
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(
            Math.min(touchStartLatLng.lat(), currentLatLng.lat()),
            Math.min(touchStartLatLng.lng(), currentLatLng.lng())
          ),
          new google.maps.LatLng(
            Math.max(touchStartLatLng.lat(), currentLatLng.lat()),
            Math.max(touchStartLatLng.lng(), currentLatLng.lng())
          )
        );
        setTempDrawRect(bounds);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (touchStartLatLng && tempDrawRect) {
        onDrawComplete(googleBoundsToLeaflet(tempDrawRect));
      }
      touchStartLatLng = null;
      setDrawStartPos(null);
      setTempDrawRect(null);
    };

    mapDiv.addEventListener('touchstart', handleTouchStart, { passive: false });
    mapDiv.addEventListener('touchmove', handleTouchMove, { passive: false });
    mapDiv.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      mapDiv.removeEventListener('touchstart', handleTouchStart);
      mapDiv.removeEventListener('touchmove', handleTouchMove);
      mapDiv.removeEventListener('touchend', handleTouchEnd);
    };
  }, [map, isDrawing, isMobile, onDrawComplete, tempDrawRect]);

  // Loading/error states
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
        zoom={initialZoom}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={handleIdle}
        onClick={handleMapClick}
        onMouseDown={handleMapMouseDown}
        onMouseMove={handleMapMouseMove}
        onMouseUp={handleMapMouseUp}
      >
        {/* Temporary drawing rectangle */}
        {tempDrawRect && (
          <Rectangle
            bounds={tempDrawRect}
            options={{ fillColor: '#0252CD', fillOpacity: 0.15, strokeWeight: 2, strokeColor: '#0252CD', clickable: false }}
          />
        )}

        {/* Property Markers - using OverlayView for reliable rendering */}
        {validProperties.map((property) => (
          <PropertyMarkerOverlay
            key={property.id}
            property={property}
            isHovered={hoveredPropertyId === property.id}
            onClick={() => handleMarkerClick(property)}
            zoom={zoom}
          />
        ))}

        {/* Property Info Card - Enhanced popup matching Leaflet quality */}
        {selectedProperty && (
          <OverlayView
            position={{ lat: selectedProperty.lat!, lng: selectedProperty.lng! }}
            mapPaneName={OverlayView.FLOAT_PANE}
            getPixelPositionOffset={() => ({ x: -110, y: -200 })}
          >
            <div
              className="cursor-pointer bg-white rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              style={{
                width: '220px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.1)',
                border: selectedProperty.isPromoted && selectedProperty.promotionTier
                  ? `2px solid ${PROMOTION_COLORS[selectedProperty.promotionTier]}`
                  : '1px solid rgba(0,0,0,0.05)',
                zIndex: 9999,
                position: 'relative',
              }}
              onClick={(e) => { e.stopPropagation(); handlePropertyClick(selectedProperty.id); setSelectedProperty(null); }}
            >
              {/* Image container - larger with gradient overlay */}
              <div className="relative w-full h-28 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                {selectedProperty.images && selectedProperty.images[0] ? (
                  <img
                    src={selectedProperty.images[0].url}
                    alt={selectedProperty.title || selectedProperty.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
                    <svg className="w-14 h-14 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3L4 9v12h16V9l-8-6zm6 16h-3v-5H9v5H6v-9.5l6-4.5 6 4.5V19z"/>
                      <path d="M10 14h4v5h-4z" opacity="0.5"/>
                    </svg>
                  </div>
                )}
                {/* Gradient overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

                {/* Promotion badge - top left with icon */}
                {selectedProperty.isPromoted && selectedProperty.promotionTier && (
                  <div
                    className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wide flex items-center gap-1"
                    style={{
                      background: selectedProperty.promotionTier === 'premium'
                        ? 'linear-gradient(135deg, #FFB800 0%, #FF8C00 100%)'
                        : selectedProperty.promotionTier === 'highlight'
                        ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
                        : 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    <span>{selectedProperty.promotionTier === 'premium' ? '👑' : selectedProperty.promotionTier === 'highlight' ? '💎' : '⭐'}</span>
                    {selectedProperty.promotionTier}
                  </div>
                )}

                {/* Close button - more visible */}
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedProperty(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white transition-all shadow-md hover:scale-110"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Price badge overlaid on image */}
                <div className="absolute bottom-2 left-2">
                  <span
                    className="inline-block px-2.5 py-1 rounded-lg font-bold text-white text-sm"
                    style={{
                      background: 'linear-gradient(135deg, #0252CD 0%, #0141A8 100%)',
                      boxShadow: '0 2px 8px rgba(2, 82, 205, 0.4)'
                    }}
                  >
                    €{selectedProperty.price.toLocaleString()}
                  </span>
                </div>

                {/* Property type badge */}
                <div className="absolute bottom-2 right-2">
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/90 backdrop-blur-sm text-gray-700 capitalize shadow-sm">
                    {selectedProperty.propertyType}
                  </span>
                </div>
              </div>

              {/* Content section */}
              <div className="p-3">
                {/* Title */}
                <h3 className="font-bold text-sm text-gray-900 line-clamp-1 mb-1">
                  {selectedProperty.title || selectedProperty.address}
                </h3>

                {/* Location */}
                <p className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="line-clamp-1">{selectedProperty.city}, {selectedProperty.country}</span>
                </p>

                {/* Property specs */}
                <div className="flex items-center gap-3 text-[11px] text-gray-600 py-2 px-2 bg-gray-50 rounded-lg mb-2">
                  {selectedProperty.beds && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="font-semibold">{selectedProperty.beds}</span>
                    </span>
                  )}
                  {selectedProperty.baths && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      <span className="font-semibold">{selectedProperty.baths}</span>
                    </span>
                  )}
                  {selectedProperty.sqft && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span className="font-semibold">{selectedProperty.sqft}</span>
                      <span className="text-gray-400">m²</span>
                    </span>
                  )}
                </div>

                {/* CTA Button */}
                <button className="w-full py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 hover:shadow-md active:scale-[0.98]">
                  <span>View Details</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>

              {/* Arrow pointer at bottom */}
              <div
                className="absolute left-1/2 -bottom-2"
                style={{
                  width: 0,
                  height: 0,
                  marginLeft: '-10px',
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: selectedProperty.isPromoted && selectedProperty.promotionTier
                    ? `10px solid ${PROMOTION_COLORS[selectedProperty.promotionTier]}`
                    : '10px solid white',
                  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))'
                }}
              />
            </div>
          </OverlayView>
        )}

        {/* Drawn bounds rectangle */}
        {drawnBounds && !isDrawing && (
          <Rectangle
            bounds={leafletBoundsToGoogle(drawnBounds)}
            options={{ fillColor: '#0252CD', fillOpacity: 0.2, strokeWeight: 3, strokeColor: '#0252CD', clickable: false }}
          />
        )}

        {/* Measurement tool elements - rendered inside GoogleMap */}
        {showMeasurement && measurementTool.points.length > 0 && (
          <>
            {/* Measurement polygon (when closed) */}
            {measurementTool.isPolygonClosed ? (
              <Polygon
                key={`measure-polygon-s${measurementSessionKey}-p${measurementTool.points.length}`}
                paths={measurementTool.points.map(p => ({ lat: p.lat, lng: p.lng }))}
                options={{
                  fillColor: '#0252CD',
                  fillOpacity: 0.2,
                  strokeColor: '#0252CD',
                  strokeWeight: 3,
                  clickable: false,
                }}
              />
            ) : (
              <>
                {/* Measurement polyline */}
                {measurementTool.points.length > 1 && (
                  <Polyline
                    key={`measure-line-s${measurementSessionKey}-p${measurementTool.points.length}`}
                    path={measurementTool.points.map(p => ({ lat: p.lat, lng: p.lng }))}
                    options={{
                      strokeColor: '#0252CD',
                      strokeWeight: 3,
                      clickable: false,
                    }}
                  />
                )}
                {/* Preview closing line when 3+ points */}
                {measurementTool.points.length >= 3 && (
                  <Polyline
                    key={`measure-preview-s${measurementSessionKey}-p${measurementTool.points.length}`}
                    path={[
                      { lat: measurementTool.points[measurementTool.points.length - 1].lat, lng: measurementTool.points[measurementTool.points.length - 1].lng },
                      { lat: measurementTool.points[0].lat, lng: measurementTool.points[0].lng }
                    ]}
                    options={{
                      strokeColor: '#10B981',
                      strokeWeight: 2,
                      strokeOpacity: 0.5,
                      clickable: false,
                    }}
                  />
                )}
              </>
            )}

            {/* Measurement point markers - using OverlayView instead of deprecated Marker */}
            {measurementTool.points.map((point, index) => {
              const isFirstPoint = index === 0;
              const canClose = measurementTool.points.length >= 3 && !measurementTool.isPolygonClosed;
              const isClosePoint = isFirstPoint && canClose;
              const size = isClosePoint ? 20 : 14;
              const color = isClosePoint ? '#10B981' : '#0252CD';

              return (
                <OverlayView
                  key={`measure-point-s${measurementSessionKey}-${index}`}
                  position={{ lat: point.lat, lng: point.lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  getPixelPositionOffset={() => ({ x: -size / 2, y: -size / 2 })}
                >
                  <div
                    onClick={isClosePoint ? measurementTool.closePolygon : undefined}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: '2px solid white',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      cursor: isClosePoint ? 'pointer' : 'default',
                      zIndex: isFirstPoint ? 2000 : 1000,
                    }}
                    title={isClosePoint ? 'Click to close polygon' : undefined}
                  />
                </OverlayView>
              );
            })}
          </>
        )}
      </GoogleMap>

      {/* Climate Risk Legend */}
      {selectedClimateRisk !== 'none' && !isMapOptionsOpen && (
        <div className={`absolute ${show3DBuildings ? 'top-4 right-4' : 'top-4 left-4'} z-[1000]`}>
          <ClimateRiskLegend riskType={selectedClimateRisk} />
        </div>
      )}

      {/* 3D Buildings Layer with deck.gl */}
      <Google3DBuildingsLayer
        map={map}
        enabled={show3DBuildings}
        dateTime={sunDateTime}
      />

      {/* Measurement Tool UI Panel */}
      <GoogleMeasurementTool
        enabled={showMeasurement}
        measurementState={measurementTool}
        onClose={() => setShowMeasurement(false)}
      />

      {/* Sun Arc Animation - shows sun/moon moving across the map */}
      {show3DBuildings && (
        <SunArcAnimation
          hour={sunHour}
          enabled={show3DBuildings}
          isNightMode={isNightMode}
          longitude={center.lng}
          latitude={center.lat}
          useRealTime={false}
          season={sunSeason}
          onDayNightChange={handleDayNightChange}
        />
      )}

      {/* Sun Position Control for 3D Buildings */}
      {show3DBuildings && (
        <div className="absolute top-20 left-4 z-[1000]">
          <SunPositionControl
            onDateTimeChange={setSunDateTime}
            onSeasonChange={setSunSeason}
            isNightMode={isNightMode}
            enabled={show3DBuildings}
            latitude={center.lat}
            compact={isMobile}
          />
        </div>
      )}

      {/* Desktop Controls */}
      {!isMobile && (
        <>
          <div className="absolute bottom-12 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
            {/* Main control bar */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10 flex items-center gap-1.5">
              <button onClick={onRecenter} className="p-1.5 rounded-full transition-colors hover:bg-black/10" title="Center on location">
                <CrosshairsIcon className="w-5 h-5 text-neutral-700" />
              </button>
              <div className="flex items-center bg-neutral-200/50 p-0.5 rounded-full">
                <button onClick={() => setMapType('roadmap')} className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${mapType === 'roadmap' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'}`}>
                  Clean
                </button>
                <button onClick={() => setMapType('terrain')} className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${mapType === 'terrain' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'}`}>
                  Color
                </button>
                <button onClick={() => setMapType('hybrid')} className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${mapType === 'hybrid' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'}`}>
                  Street
                </button>
                <button onClick={() => setMapType('satellite')} className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${mapType === 'satellite' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'}`}>
                  Satellite
                </button>
              </div>
              <button
                onClick={onDrawStart}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full shadow-md transition-colors ${isDrawing ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-neutral-800 text-white hover:bg-neutral-900'}`}
              >
                {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                <span>{isDrawing ? 'Cancel' : 'Draw Area'}</span>
              </button>
            </div>

            {/* Layer toggles */}
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10">
              {/* Climate Risks */}
              <div className="relative">
                <button
                  onClick={() => setIsMapOptionsOpen(!isMapOptionsOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${isMapOptionsOpen || selectedClimateRisk !== 'none' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                >
                  <span>Climate Risks</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${isMapOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isMapOptionsOpen && (
                  <div className="absolute bottom-full left-0 mb-2 z-[1010]">
                    <MapOptionsPanel
                      selectedMapOption={selectedMapOption}
                      selectedClimateRisk={selectedClimateRisk}
                      onMapOptionChange={handleMapOptionChange}
                      onClimateRiskChange={handleClimateRiskChange}
                      isOpen={isMapOptionsOpen}
                      onClose={() => setIsMapOptionsOpen(false)}
                      showMapOptions={false}
                      isMobile={false}
                    />
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-gray-300/50" />

              {/* Promoted Listings */}
              <button
                onClick={() => setShowPromotedOnly(!showPromotedOnly)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${showPromotedOnly ? 'bg-gradient-to-r from-amber-500 to-purple-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'}`}
                title="Show Promoted Listings Only"
              >
                <span className="text-sm">⭐</span>
                <span>Promoted</span>
              </button>

              {/* 3D Buildings */}
              <button
                onClick={() => setShow3DBuildings(!show3DBuildings)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${show3DBuildings ? 'bg-slate-700 text-white' : 'text-neutral-600 hover:bg-neutral-200'}`}
                title="3D Buildings"
              >
                <span className="text-sm">🏢</span>
                <span>3D</span>
              </button>

              {/* POI */}
              <button
                onClick={() => setShowLandmarks(!showLandmarks)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${showLandmarks ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-200'}`}
                title="Points of Interest"
              >
                <span className="text-sm">🏛️</span>
                <span>POI</span>
              </button>

              {/* Parcels (only in satellite view) */}
              {(mapType === 'satellite' || mapType === 'hybrid') && (
                <button
                  onClick={() => setShowCadastre(!showCadastre)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${showCadastre ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-200'}`}
                  title="Land Parcels"
                >
                  <span className="text-sm">📐</span>
                  <span>Parcels</span>
                </button>
              )}

              {/* Measure */}
              <button
                onClick={() => setShowMeasurement(!showMeasurement)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${showMeasurement ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:bg-neutral-200'}`}
                title="Measure Distance"
              >
                <span className="text-sm">📏</span>
                <span>Measure</span>
              </button>

              {/* Legend */}
              <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className={`flex items-center gap-1 px-2.5 py-2.5 text-xs font-semibold rounded-full transition-all ${isLegendOpen ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'}`}
                title="Legend"
              >
                <MapLegendIcon className="w-4 h-4" />
                <span>Legend</span>
              </button>
            </div>

            {/* Drawn bounds actions */}
            {drawnBounds && !isDrawing && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                {isAuthenticated && (
                  <button onClick={onSaveSearch} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-full shadow-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                    <SearchPlusIcon className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Area'}</span>
                  </button>
                )}
                <button onClick={() => onDrawComplete(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-neutral-900">
                  <XCircleIcon className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Legend */}
          {isLegendOpen && !showMeasurement && (
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
          <div className={`absolute bottom-20 left-3 z-[1003] pointer-events-none md:hidden ${showMeasurement ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {isLayerMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 pointer-events-auto">
                <div className="flex flex-col gap-1.5 p-3 rounded-2xl shadow-2xl border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' }}>
                  <button onClick={() => { setIsLegendOpen(p => !p); setIsLayerMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${isLegendOpen ? 'bg-amber-500 text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'}`}>
                    <MapLegendIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Legend</span>
                  </button>
                  <button onClick={() => setShowLandmarks(!showLandmarks)} className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${showLandmarks ? 'bg-primary text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'}`}>
                    <span className="text-lg">🏛️</span>
                    <span className="text-sm font-medium">Points of Interest</span>
                  </button>
                  <button onClick={() => { setShowMeasurement(!showMeasurement); setIsLayerMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${showMeasurement ? 'bg-emerald-600 text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'}`}>
                    <span className="text-lg">📏</span>
                    <span className="text-sm font-medium">Measure Distance</span>
                  </button>
                  {(mapType === 'satellite' || mapType === 'hybrid') && (
                    <button onClick={() => setShowCadastre(!showCadastre)} className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${showCadastre ? 'bg-primary text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'}`}>
                      <span className="text-lg">📐</span>
                      <span className="text-sm font-medium">Land Parcels</span>
                    </button>
                  )}
                  <button onClick={() => setShow3DBuildings(!show3DBuildings)} className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${show3DBuildings ? 'bg-slate-700 text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'}`}>
                    <span className="text-lg">🏢</span>
                    <span className="text-sm font-medium">3D Buildings</span>
                  </button>
                  <button onClick={() => setShowPromotedOnly(!showPromotedOnly)} className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 ${showPromotedOnly ? 'bg-gradient-to-r from-amber-500 to-purple-500 text-white shadow-md' : 'text-neutral-700 hover:bg-white/60'}`}>
                    <span className="text-lg">⭐</span>
                    <span className="text-sm font-medium">Promoted Only</span>
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)} className={`pointer-events-auto w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-95 border ${isLayerMenuOpen ? 'bg-neutral-800 text-white border-neutral-700' : 'text-neutral-700 border-white/40'}`} style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)', ...(isLayerMenuOpen ? {} : { background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }) }}>
              <svg className="w-7 h-7" style={{ transform: isLayerMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease-out' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {!isLayerMenuOpen && (showLandmarks || show3DBuildings || showCadastre || showMeasurement || showPromotedOnly) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                  {[showLandmarks, show3DBuildings, showCadastre, showMeasurement, showPromotedOnly].filter(Boolean).length}
                </span>
              )}
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
              <div className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
                <div className="relative">
                  <button onClick={() => setIsMapOptionsOpen(!isMapOptionsOpen)} className={`flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${isMapOptionsOpen || selectedClimateRisk !== 'none' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-white/50'}`}>
                    <span>Map</span>
                    <svg className={`w-3 h-3 transition-transform ${isMapOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isMapOptionsOpen && (
                    <div className="absolute top-full right-0 mt-2 z-[1010]">
                      <MapOptionsPanel selectedMapOption={selectedMapOption} selectedClimateRisk={selectedClimateRisk} onMapOptionChange={handleMapOptionChange} onClimateRiskChange={handleClimateRiskChange} isOpen={isMapOptionsOpen} onClose={() => setIsMapOptionsOpen(false)} isMobile={true} />
                    </div>
                  )}
                </div>
                <button onClick={onRecenter} className="p-2 rounded-xl hover:bg-white/50 text-neutral-600 active:scale-95" title="Center on location">
                  <CrosshairsIcon className="w-5 h-5" />
                </button>
                <button onClick={onDrawStart} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 ${isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'}`}>
                  {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                  <span className="text-xs font-semibold">{isDrawing ? 'Cancel' : 'Draw'}</span>
                </button>
              </div>
              {drawnBounds && !isDrawing && (
                <div className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30 animate-fade-in" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
                  {isAuthenticated && (
                    <button onClick={onSaveSearch} disabled={isSaving} className="flex items-center gap-1 px-2 py-1 bg-primary text-white rounded-lg disabled:opacity-50 transition-all">
                      <SearchPlusIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold">Save</span>
                    </button>
                  )}
                  <button onClick={() => onDrawComplete(null)} className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-lg transition-all">
                    <XCircleIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">Clear</span>
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
