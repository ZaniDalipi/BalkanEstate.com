import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import L from 'leaflet';
import { useAppContext } from '@/context/AppContext';
import { type Season } from './SunArcAnimation';
import { MapOptionType, ClimateRiskType } from './MapOptionsPanel';
import { MAP_TILE_LAYERS } from '@/config/mapStyles';

// CSS for 3D perspective camera effect
const inject3DPerspectiveStyles = () => {
  const styleId = 'map-3d-perspective-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* 3D perspective container - OneGeo-style isometric view */
    .map-3d-perspective-container {
      perspective: 1200px;
      perspective-origin: 50% 30%;
      overflow: hidden;
    }

    /* Map transforms for 3D mode - dramatic tilt like OneGeo */
    .map-3d-active {
      transform: rotateX(50deg) scale(1.15);
      transform-origin: center 85%;
      transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Normal 2D mode */
    .map-3d-inactive {
      transform: rotateX(0deg) scale(1);
      transform-origin: center center;
      transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Ensure controls stay upright in 3D mode */
    .map-3d-active .leaflet-control-container {
      transform: rotateX(-50deg) translateY(-15%);
      transform-origin: center 20%;
    }

    /* Keep markers/popups properly oriented */
    .map-3d-active .leaflet-marker-pane,
    .map-3d-active .leaflet-popup-pane {
      transform: rotateX(-50deg);
      transform-origin: center 20%;
    }

    /* Horizon fade effect at the top */
    .map-3d-active::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 25%;
      background: linear-gradient(to bottom, rgba(135, 206, 235, 0.4) 0%, rgba(135, 206, 235, 0.1) 50%, transparent 100%);
      pointer-events: none;
      z-index: 1000;
    }

    /* Smooth shadow for 3D depth effect */
    .map-3d-active::after {
      content: '';
      position: absolute;
      bottom: -30px;
      left: 5%;
      right: 5%;
      height: 60px;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, transparent 70%);
      pointer-events: none;
      z-index: -1;
    }

    /* Smooth zoom - same timing as UI button transitions (0.3s ease-out) */
    .leaflet-container {
      -webkit-tap-highlight-color: transparent;
      touch-action: pan-x pan-y;
    }

    /* Smooth zoom transition - same as button animations (0.3s ease-out) */
    .leaflet-zoom-animated {
      transition: transform 0.3s ease-out !important;
    }

    .leaflet-zoom-anim .leaflet-zoom-animated {
      transition: transform 0.3s ease-out !important;
    }

    /* Smooth tile fade - matches button animations */
    .leaflet-fade-anim .leaflet-tile {
      transition: opacity 0.3s ease-out !important;
    }

    .leaflet-tile-container {
      will-change: transform;
    }

    .leaflet-tile {
      will-change: opacity;
    }

    /* GPU acceleration */
    .leaflet-tile-pane,
    .leaflet-tile,
    .leaflet-marker-icon,
    .leaflet-popup {
      transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }

    /* Cleaner tile rendering */
    .map-tiles img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  `;
  document.head.appendChild(style);
};

// Initialize styles
if (typeof window !== 'undefined') {
  inject3DPerspectiveStyles();
}

// Use the centralized map styles config
export const TILE_LAYERS = MAP_TILE_LAYERS;

// Available tile layer types from config
export type TileLayerType = keyof typeof MAP_TILE_LAYERS;

// Check if Google Maps API key is available
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
export const USE_GOOGLE_MAPS = !!GOOGLE_MAPS_API_KEY;

// Map provider is determined by VITE_GOOGLE_MAPS_KEY environment variable


export interface MapComponentProps {
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
  onResetView?: () => void;
  isMobile: boolean;
  searchMode: 'manual' | 'ai';
  hoveredPropertyId?: string | null;
  /** Hide all map controls (for saved searches view) */
  hideControls?: boolean;
}

export function useMapComponent(props: MapComponentProps) {
  const {
    properties,
    onMapMove,
    userLocation,
    isMobile,
  } = props;

  const { t } = useTranslation(['search']);
  const { dispatch } = useAppContext();

  // State to force fallback to Leaflet if Google Maps fails
  const [forceLeaflet, setForceLeaflet] = useState(false);
  // State to track loading timeout
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup loading timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Handle fallback to Leaflet
  const handleFallbackToLeaflet = useCallback(() => {
    setForceLeaflet(true);
  }, []);

  // Default to 'street' - Google Maps street view as per Zillow-style implementation
  const [mapType, setMapType] = useState<TileLayerType>('street' as TileLayerType);
  const [isLegendOpen, setIsLegendOpen] = useState(false); // Legend closed by default, user can open it
  const [showCadastre, setShowCadastre] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false); // Landmarks off by default
  const [show3DBuildings, setShow3DBuildings] = useState(false); // Toggle for 3D buildings
  const [shadowDateTime, setShadowDateTime] = useState<Date>(new Date());
  const [mapCenterLng, setMapCenterLng] = useState<number>(22); // Default Balkans longitude
  const [mapCenterLat, setMapCenterLat] = useState<number>(41); // Default Balkans latitude
  const [currentZoom, setCurrentZoom] = useState<number>(7); // Current zoom level for display
  const [isManualTimeControl, setIsManualTimeControl] = useState(false); // Track if user is controlling time
  const [selectedSeason, setSelectedSeason] = useState<Season>('current'); // Season for sun position
  const [showMeasurement, setShowMeasurement] = useState(false); // Toggle for measurement tool
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false); // Mobile FAB layer menu

  // Zillow-style Map Options state
  const [isMapOptionsOpen, setIsMapOptionsOpen] = useState(false); // Map options panel visibility
  const [selectedMapOption, setSelectedMapOption] = useState<MapOptionType>('streetview'); // Default to Street view
  const [selectedClimateRisk, setSelectedClimateRisk] = useState<ClimateRiskType>('none'); // No climate risk by default

  // Check URL params for measurementId to auto-enable measurement tool
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const measurementId = searchParams.get('measurementId');
    if (measurementId) {
      // Enable measurement tool - it will fetch the data from backend
      setShowMeasurement(true);
      // Switch to satellite view for better measurement visibility
      setMapType('satellite');
    }
  }, []);

  // Auto-switch to satellite view when measurement tool is enabled
  useEffect(() => {
    if (showMeasurement) {
      setMapType('satellite');
    }
  }, [showMeasurement]);

  // Sync map option selection with actual tile layer type
  useEffect(() => {
    // Map the Zillow-style options to actual tile layer types
    const mapOptionToTileLayer: Record<MapOptionType, TileLayerType> = {
      automatic: 'voyager', // Automatic uses the colorful neighborhood view
      satellite: 'satellite',
      streetview: 'street', // Street view uses Google Maps street layer
    };
    setMapType(mapOptionToTileLayer[selectedMapOption]);
  }, [selectedMapOption]);

  // Handle map option change (from MapOptionsPanel)
  const handleMapOptionChange = useCallback((option: MapOptionType) => {
    setSelectedMapOption(option);
    // Close the panel after selection on mobile
    if (isMobile) {
      setIsMapOptionsOpen(false);
    }
  }, [isMobile]);

  // Handle climate risk change (from MapOptionsPanel)
  const handleClimateRiskChange = useCallback((risk: ClimateRiskType) => {
    setSelectedClimateRisk(risk);
  }, []);

  // Use ref for onMapMove to prevent infinite loops when callback changes
  const onMapMoveRef = useRef(onMapMove);
  useEffect(() => {
    onMapMoveRef.current = onMapMove;
  });

  // Debounce ref for map center updates to prevent infinite loops with popup autoPan
  const mapCenterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (mapCenterDebounceRef.current) {
        clearTimeout(mapCenterDebounceRef.current);
      }
    };
  }, []);

  // Handle shadow time change from SunPositionControl
  const handleShadowTimeChange = useCallback((dateTime: Date) => {
    setShadowDateTime(dateTime);
    setIsManualTimeControl(true); // User is now manually controlling time
  }, []);

  // Handle season change from SunPositionControl
  const handleSeasonChange = useCallback((season: Season) => {
    setSelectedSeason(season);
  }, []);

  // Reset to real time when 3D buildings is toggled off
  useEffect(() => {
    if (!show3DBuildings) {
      setIsManualTimeControl(false);
    }
  }, [show3DBuildings]);

  // Update map center coordinates when map moves (debounced to prevent popup autoPan loops)
  const handleMapMoveWithCenter = useCallback((bounds: L.LatLngBounds, center: L.LatLng) => {
    // Always call the parent callback immediately for search updates
    onMapMoveRef.current(bounds, center);

    // Debounce the internal state updates to prevent infinite loops
    // when popup autoPan triggers moveend events
    if (mapCenterDebounceRef.current) {
      clearTimeout(mapCenterDebounceRef.current);
    }
    mapCenterDebounceRef.current = setTimeout(() => {
      setMapCenterLng(center.lng);
      setMapCenterLat(center.lat);
    }, 100);
  }, []);

  const validProperties = useMemo(() => {
    const valid = properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );

    return valid;
  }, [properties]);

  // Show all valid properties on the map — no artificial marker limit.
  // Properties are already filtered by filterProperties() before reaching the map,
  // so the count is manageable. Promoted listings get priority styling via the marker component.
  const propertiesInView = validProperties;

  const { center, zoom } = useMemo(() => {
    if (userLocation) return { center: userLocation, zoom: 13 };
    return { center: [41.5, 22] as [number, number], zoom: 7 };
  }, [userLocation]);

  const handlePopupClick = (propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'property-details' });
    window.history.pushState({ propertyId }, '', `/property/${propertyId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Set a timeout to detect if loading takes too long (30 seconds)
  useEffect(() => {
    if (USE_GOOGLE_MAPS && !forceLeaflet) {
      // Check if Google Maps is already loaded
      if (window.google?.maps) {
        setLoadingTimedOut(false);
        return;
      }

      loadingTimeoutRef.current = setTimeout(() => {
        // Double-check if it loaded in the meantime
        if (!window.google?.maps) {
          setLoadingTimedOut(true);
        }
      }, 30000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [forceLeaflet]);

  return {
    t,

    // Google Maps fallback
    forceLeaflet,
    loadingTimedOut,
    handleFallbackToLeaflet,

    // Map state
    mapType,
    setMapType,
    isLegendOpen,
    setIsLegendOpen,
    showCadastre,
    setShowCadastre,
    showHeatMap,
    showLandmarks,
    setShowLandmarks,
    show3DBuildings,
    setShow3DBuildings,
    shadowDateTime,
    mapCenterLng,
    mapCenterLat,
    currentZoom,
    setCurrentZoom,
    isManualTimeControl,
    selectedSeason,
    showMeasurement,
    setShowMeasurement,
    isLayerMenuOpen,
    setIsLayerMenuOpen,

    // Map options
    isMapOptionsOpen,
    setIsMapOptionsOpen,
    selectedMapOption,
    selectedClimateRisk,
    handleMapOptionChange,
    handleClimateRiskChange,

    // Computed
    propertiesInView,
    center,
    zoom,

    // Handlers
    handlePopupClick,
    handleMapMoveWithCenter,
    handleShadowTimeChange,
    handleSeasonChange,
  };
}

export type UseMapComponentReturn = ReturnType<typeof useMapComponent>;
