import React, { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import { Property } from '@/types';
import L from 'leaflet';

// Lazy load Google Maps component for better initial load
const GoogleMapComponent = lazy(() => import('./GoogleMapComponent'));

// Check if Google Maps API key is available
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const USE_GOOGLE_MAPS = !!GOOGLE_MAPS_API_KEY;

// Zillow-style: Zoom-based marker limits for performance
// More markers when zoomed in, fewer when zoomed out
const getMaxMarkersForZoom = (zoom: number): number => {
  if (zoom >= 15) return 500;  // Street level - show many
  if (zoom >= 13) return 300;  // Neighborhood level
  if (zoom >= 11) return 150;  // City level
  if (zoom >= 9) return 80;    // Region level
  return 40;                    // Country level - show few
};
import { useAppContext } from '@/context/AppContext';
import {
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
} from '@/constants';
import { CadastreLayer } from './CadastreLayer';
import HeatMapLayer from './HeatMapLayer';
import Buildings3DLayer from './Buildings3DLayer';
import SunPositionControl from './SunPositionControl';
import SunArcAnimation, { type Season } from './SunArcAnimation';
import LandmarksLayer from './LandmarksLayer';
import PropertyAddressLabels from './PropertyAddressLabels';
import MeasurementTool from './MeasurementTool';
import MapOptionsPanel, { MapOptionType, ClimateRiskType } from './MapOptionsPanel';
import ClimateRiskLayer, { ClimateRiskLegend } from './ClimateRiskLayer';
import {
  FlyToController,
  MapEvents,
  ZoomBasedTileSwitch,
  MapDrawEvents,
} from '@/src/components/map/MapHelpers';
import { Markers, Legend, HighlightedPropertyMarkers } from '@/src/components/map/MapPropertyMarker';
import MapAgentAvatar, { MapAgentAvatarInner } from '@/src/components/map/MapAgentAvatar';
import { HighlightedPropertiesProvider } from '@/src/context/HighlightedPropertiesContext';
import { MAP_TILE_LAYERS, DEFAULT_MAP_STYLE, getTileLayer } from '@/config/mapStyles';

// Fix for default icon issue with bundlers
let DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Use the centralized map styles config
const TILE_LAYERS = MAP_TILE_LAYERS;

// Available tile layer types from config
type TileLayerType = keyof typeof MAP_TILE_LAYERS;

// Bounding box for the Balkan region
const BALKAN_BOUNDS = L.latLngBounds(
  [34, 13], // Southwest corner (Southern Greece, Western Croatia)
  [49, 31] // Northeast corner (Northern Romania, Eastern Bulgaria)
);

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

interface MapComponentProps {
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
  /** Hide all map controls (for saved searches view) */
  hideControls?: boolean;
}

/**
 * ZoomTracker Component - tracks zoom level changes
 */
const ZoomTracker: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
    load: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
};

/**
 * ZoomSnapAdjuster Component - enables fractional zoom only when zoomed in very close
 * Far away: whole zoom levels (zoomSnap=1)
 * Very close (18+): fractional zoom (zoomSnap=0.5)
 */
const ZoomSnapAdjuster: React.FC<{ currentZoom: number }> = ({ currentZoom }) => {
  const map = useMap();

  useEffect(() => {
    const newZoomSnap = currentZoom >= 18 ? 0.5 : 1;
    const newZoomDelta = currentZoom >= 18 ? 0.5 : 1;

    if (map.options.zoomSnap !== newZoomSnap) {
      map.options.zoomSnap = newZoomSnap;
      map.options.zoomDelta = newZoomDelta;
    }
  }, [currentZoom, map]);

  return null;
};

/**
 * ZoomAdjuster Component - adjusts zoom when switching map types
 * Ensures zoom level doesn't exceed the new layer's max zoom
 */
const ZoomAdjuster: React.FC<{ mapType: TileLayerType; currentZoom: number }> = ({ mapType, currentZoom }) => {
  const map = useMap();
  const prevMapTypeRef = useRef(mapType);

  useEffect(() => {
    // Only act when mapType actually changes
    if (prevMapTypeRef.current !== mapType) {
      const maxZoom = TILE_LAYERS[mapType]?.maxZoom || 21;
      const currentMapZoom = map.getZoom();

      // If current zoom exceeds new layer's max, adjust it
      if (currentMapZoom > maxZoom) {
        map.setZoom(maxZoom, { animate: true, duration: 0.6 });
      }

      prevMapTypeRef.current = mapType;
    }
  }, [mapType, map]);

  return null;
};

/**
 * FitBoundsHandler Component - fits the map to drawnBounds when they exist
 * Used in saved searches to show the saved search area
 */
const FitBoundsHandler: React.FC<{ drawnBounds: L.LatLngBounds | null }> = ({ drawnBounds }) => {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!drawnBounds || hasFittedRef.current) return;

    try {
      // Fit the map to the drawn bounds with padding
      map.fitBounds(drawnBounds, { padding: [50, 50], animate: true, duration: 0.5 });
      hasFittedRef.current = true;
    } catch (e) {
      console.error('[MapComponent] Error fitting to drawnBounds:', e);
    }
  }, [map, drawnBounds]);

  return null;
};

/**
 * MapComponent
 *
 * Main map component for property search with:
 * - Interactive Leaflet map
 * - Property markers with popups
 * - Area drawing for custom search
 * - Street/Satellite view toggle
 * - Cadastral layer overlay
 * - User location centering
 * - Legend display
 *
 * Decomposed from 705 lines to ~150 lines by extracting:
 * - MapHelpers: FlyToController, MapEvents, ZoomBasedTileSwitch, MapDrawEvents
 * - MapPropertyMarker: Markers, PropertyPopup, Legend, marker icons
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
  hideControls = false,
}) => {
  const { t } = useTranslation(['search']);
  const { dispatch } = useAppContext();
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

    // Debug: Log properties with missing or invalid coordinates, especially promoted ones
    const invalidProperties = properties.filter(
      (p) => p.lat == null || isNaN(p.lat) || p.lng == null || isNaN(p.lng)
    );
    if (invalidProperties.length > 0) {
      console.warn(`🗺️ [MapComponent] ${invalidProperties.length} properties filtered out due to invalid coordinates:`);
      invalidProperties.forEach((p) => {
        console.warn(`  - ${p.id}: "${p.title || p.address}" (lat: ${p.lat}, lng: ${p.lng})${p.isPromoted ? ' [PROMOTED]' : ''}`);
      });
    }

    // Debug: Log properties outside Balkan bounds
    const outsideBounds = valid.filter(
      (p) => p.lat < 34 || p.lat > 49 || p.lng < 13 || p.lng > 31
    );
    if (outsideBounds.length > 0) {
      console.warn(`🗺️ [MapComponent] ${outsideBounds.length} properties outside Balkan bounds (34-49 lat, 13-31 lng):`);
      outsideBounds.forEach((p) => {
        console.warn(`  - ${p.id}: "${p.title || p.address}" (lat: ${p.lat}, lng: ${p.lng})${p.isPromoted ? ' [PROMOTED]' : ''}`);
      });
    }

    return valid;
  }, [properties]);

  // Zillow-style: Smart property selection based on zoom level
  // Prioritizes promoted listings, limits total for performance
  const propertiesInView = useMemo(() => {
    const maxMarkers = getMaxMarkersForZoom(currentZoom);

    // Separate promoted and regular properties
    const promoted = validProperties.filter(p => p.isPromoted);
    const regular = validProperties.filter(p => !p.isPromoted);

    // Always show all promoted, fill rest with regular up to limit
    const promotedCount = Math.min(promoted.length, maxMarkers);
    const regularCount = Math.max(0, maxMarkers - promotedCount);

    return [...promoted.slice(0, promotedCount), ...regular.slice(0, regularCount)];
  }, [validProperties, currentZoom]);

  const { center, zoom } = useMemo(() => {
    if (userLocation) return { center: userLocation, zoom: 13 };
    return { center: [41.5, 22] as [number, number], zoom: 7 };
  }, [userLocation]);

  const handlePopupClick = (propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    window.history.pushState({ propertyId }, '', `/property/${propertyId}`);
  };

  // Use Google Maps if API key is available for better performance
  if (USE_GOOGLE_MAPS) {
    return (
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-3">{t('search:map.loading', 'Loading map...')}</p>
          </div>
        </div>
      }>
        <GoogleMapComponent
          properties={properties}
          onMapMove={onMapMove}
          userLocation={userLocation}
          onSaveSearch={onSaveSearch}
          isSaving={isSaving}
          isAuthenticated={isAuthenticated}
          mapBounds={mapBounds}
          drawnBounds={drawnBounds}
          onDrawComplete={onDrawComplete}
          isDrawing={isDrawing}
          onDrawStart={onDrawStart}
          flyToTarget={flyToTarget}
          onFlyComplete={onFlyComplete}
          onRecenter={onRecenter}
          isMobile={isMobile}
          searchMode={searchMode}
          hoveredPropertyId={hoveredPropertyId}
          hideControls={hideControls}
        />
      </Suspense>
    );
  }

  // Fallback to Leaflet-based map
  return (
    <HighlightedPropertiesProvider properties={propertiesInView}>
      <div className={`w-full h-full relative overflow-hidden ${show3DBuildings ? 'map-3d-perspective-container' : ''}`}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          className={`w-full h-full ${show3DBuildings ? 'map-3d-active' : 'map-3d-inactive'}`}
          maxZoom={21}
          minZoom={6}
          zoomControl={false}
          maxBounds={BALKAN_BOUNDS}
          maxBoundsViscosity={0.5}
          preferCanvas={true}
          // Ultra-smooth continuous zoom
          zoomSnap={0.1}
          zoomDelta={0.1}
          wheelPxPerZoomLevel={80}
          wheelDebounceTime={40}
          zoomAnimation={true}
          fadeAnimation={true}
          markerZoomAnimation={true}
          touchZoom={isMobile ? 'center' : true}
          bounceAtZoomLimits={false}
        >
          <FlyToController target={flyToTarget} onComplete={onFlyComplete} />
          <MapEvents onMove={handleMapMoveWithCenter} mapBounds={mapBounds} searchMode={searchMode} />
          <ZoomTracker onZoomChange={setCurrentZoom} />
          {/* <ZoomAdjuster mapType={mapType} currentZoom={currentZoom} /> */}
          <ZoomSnapAdjuster currentZoom={currentZoom} />
          <FitBoundsHandler drawnBounds={drawnBounds} />
          <MapDrawEvents isDrawing={isDrawing} onDrawComplete={onDrawComplete} />
          <ZoomBasedTileSwitch mapType={mapType} setMapType={setMapType} />
          {/* ZoomBased3DBuildings removed - user has manual control via toggle button */}
          {drawnBounds && !isDrawing && (
            <Rectangle
              bounds={drawnBounds}
              pathOptions={{
                color: '#0252CD',
                weight: 3,
                fillOpacity: 0.2,
                fillColor: '#0252CD',
              }}
            />
          )}
          <TileLayer
            key={mapType}
            attribution={TILE_LAYERS[mapType].attribution}
            url={TILE_LAYERS[mapType].url}
            maxZoom={TILE_LAYERS[mapType].maxZoom}
            maxNativeZoom={TILE_LAYERS[mapType].maxNativeZoom}
            // Preload LOTS of tiles - always keep map visible
            keepBuffer={12}
            updateWhenIdle={false}
            updateWhenZooming={true}
            updateInterval={150}
            className="map-tiles"
          />
          {/* Climate Risk Overlay Layer (Zillow-style) */}
          <ClimateRiskLayer key={selectedClimateRisk} riskType={selectedClimateRisk} opacity={0.6} />
          {/* 3D Buildings with time-based shadows */}
          <Buildings3DLayer
            enabled={show3DBuildings}
            dateTime={shadowDateTime}
          />
          {/* Property address/house number labels - visible at high zoom when tiles aren't detailed */}
          <PropertyAddressLabels
            properties={propertiesInView}
            enabled={show3DBuildings}
            minZoom={19}
          />
          {/* Famous landmarks and POIs */}
          <LandmarksLayer
            enabled={showLandmarks}
            isNightMode={false}
          />
          <CadastreLayer enabled={showCadastre && (mapType === 'satellite' || mapType === 'hybrid')} opacity={0.7} />
          <HeatMapLayer properties={propertiesInView} enabled={showHeatMap} intensity="medium" />
          {/* Render markers - zoom-based limit applied in propertiesInView */}
          <Markers properties={propertiesInView} onPopupClick={handlePopupClick} hoveredPropertyId={hoveredPropertyId} isNightMode={false} />
          <HighlightedPropertyMarkers onPopupClick={handlePopupClick} />
          <MapAgentAvatarInner onPropertySelect={handlePopupClick} />
          {/* Land Measurement Tool */}
          <MeasurementTool
            enabled={showMeasurement}
            onClose={() => setShowMeasurement(false)}
          />
        </MapContainer>

        {/* Sun/Moon arc animation - shows celestial body position when 3D buildings enabled */}
        {show3DBuildings && (
          <SunArcAnimation
            hour={shadowDateTime.getHours() + shadowDateTime.getMinutes() / 60}
            enabled={show3DBuildings}
            isNightMode={false}
            longitude={mapCenterLng}
            latitude={mapCenterLat}
            useRealTime={!isManualTimeControl}
            season={selectedSeason}
          />
        )}

        {/* Debug Info Display - shows zoom level and coordinates */}
        <div className={`absolute ${show3DBuildings ? 'top-4 right-4' : 'top-4 left-4'} z-[1001] bg-black/80 text-white text-[10px] font-mono px-2 py-1 rounded-md backdrop-blur-sm shadow-md`}>
          <span>🔍{currentZoom}/{TILE_LAYERS[mapType]?.maxZoom || 21} 📍{mapCenterLat.toFixed(3)},{mapCenterLng.toFixed(3)}</span>
        </div>

        {/* Climate Risk Legend - TOP LEFT, under zoom display (both mobile and desktop) */}
        {selectedClimateRisk !== 'none' && !isMapOptionsOpen && (
          <div className={`absolute ${show3DBuildings ? 'top-14 right-4' : 'top-14 left-4'} z-[1000]`}>
            <ClimateRiskLegend riskType={selectedClimateRisk} />
          </div>
        )}

      {/* Desktop Controls - positioned above the newsletter bar (bottom-12 = ~112px) */}
      {!isMobile && !hideControls && (
        <>
          <div className="absolute bottom-12 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
            {/* Main control bar - compact with glass effect */}
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
                  onClick={() => setMapType('positron')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'positron'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  title="Clean, minimal - properties stand out"
                >
                  {t('search:map.clean', 'Clean')}
                </button>
                <button
                  onClick={() => setMapType('voyager')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'voyager'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  title="Shows neighborhoods, parks, amenities"
                >
                  {t('search:map.color', 'Color')}
                </button>
                <button
                  onClick={() => setMapType('street')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'street'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  title="Google Maps street view"
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
                  title="Aerial/satellite imagery"
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
                <span className="hidden sm:inline">{isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}</span>
                <span className="sm:hidden">{isDrawing ? '✕' : '✎'}</span>
              </button>
            </div>

            {/* Layer toggles - compact row with glass effect */}
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10">
              {/* Climate Risks Button - FIRST on desktop */}
              <div className="relative">
                <button
                  onClick={() => setIsMapOptionsOpen(!isMapOptionsOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    isMapOptionsOpen || selectedClimateRisk !== 'none'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  <span>{t('search:map.climateRisks.title', 'Climate Risks')}</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isMapOptionsOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Climate Risks Panel - appears above the button */}
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

              {/* Separator */}
              <div className="w-px h-5 bg-gray-300/50" />

              {/* 3D Buildings Toggle */}
              <button
                onClick={() => setShow3DBuildings(!show3DBuildings)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  show3DBuildings
                    ? 'bg-slate-700 text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title={t('search:map.buildings3D', '3D Buildings')}
              >
                <span className="text-sm">🏢</span>
                <span className="hidden sm:inline">{t('search:map.buildings3D', '3D')}</span>
              </button>

              {/* Landmarks Toggle */}
              <button
                onClick={() => setShowLandmarks(!showLandmarks)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  showLandmarks
                    ? 'bg-primary text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title={t('search:map.landmarks', 'Landmarks')}
              >
                <span className="text-sm">🏛️</span>
                <span className="hidden sm:inline">{t('search:map.poi', 'POI')}</span>
              </button>

              {/* Cadastre Toggle - only in satellite/hybrid views */}
              {(mapType === 'satellite' || mapType === 'hybrid') && (
                <button
                  onClick={() => setShowCadastre(!showCadastre)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    showCadastre
                      ? 'bg-primary text-white'
                      : 'text-neutral-600 hover:bg-neutral-200'
                  }`}
                  title={t('search:map.cadastralParcels')}
                >
                  <span className="text-sm">📐</span>
                  <span className="hidden sm:inline">{t('search:map.parcels', 'Parcels')}</span>
                </button>
              )}

              {/* Measurement Tool Toggle */}
              <button
                onClick={() => setShowMeasurement(!showMeasurement)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  showMeasurement
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title={t('search:map.measure', 'Measure land')}
              >
                <span className="text-sm">📏</span>
                <span className="hidden sm:inline">{t('search:map.measure', 'Measure')}</span>
              </button>

              {/* Legend Toggle */}
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


            {drawnBounds && !isDrawing && (
              <div
                className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40 animate-fade-in"
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                }}
              >
                {isAuthenticated && (
                  <button
                    onClick={onSaveSearch}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <SearchPlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{isSaving ? t('search:map.saving') : t('search:map.saveArea')}</span>
                    <span className="sm:hidden">Save</span>
                  </button>
                )}
                <button
                  onClick={() => onDrawComplete(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <XCircleIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('search:map.clearArea')}</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              </div>
            )}
          </div>
          {/* Legend - positioned above the newsletter on desktop, hidden when measurement tool is open */}
          {isLegendOpen && !showMeasurement && (
            <div className="absolute bottom-12 left-4 z-[1000] animate-fade-in">
              <Legend isNightMode={false} />
            </div>
          )}

          {/* Sun Position Control - for shadow simulation when 3D buildings are enabled */}
          {show3DBuildings && (
            <div className="absolute top-4 left-4 z-[1000]">
              <SunPositionControl
                onDateTimeChange={handleShadowTimeChange}
                onSeasonChange={handleSeasonChange}
                isNightMode={false}
                enabled={show3DBuildings}
              />
            </div>
          )}
        </>
      )}

      {/* Mobile Controls - hidden on desktop via CSS as fallback */}
      {isMobile && !hideControls && (
        <>
          {/* Mobile: Layers FAB with liquid glass dropdown */}
          <div className={`absolute bottom-20 left-3 z-[1003] pointer-events-none md:hidden ${showMeasurement ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Glass pill dropdown - matching List button style */}
            {isLayerMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 pointer-events-auto animate-fade-in">
                <div
                  className="flex flex-col gap-0.5 p-2 rounded-3xl shadow-2xl border border-white/40"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {/* Legend Toggle */}
                  <button
                    onClick={() => {
                      setIsLegendOpen((p) => !p);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      isLegendOpen
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <MapLegendIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-[15px] font-semibold">{t('search:map.legend', 'Legend')}</span>
                  </button>

                  {/* Landmarks Toggle */}
                  <button
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      showLandmarks
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">🏛️</span>
                    <span className="text-[15px] font-semibold">{t('search:map.pointsOfInterest', 'Points of Interest')}</span>
                  </button>

                  {/* Measurement Tool Toggle */}
                  <button
                    onClick={() => {
                      setShowMeasurement(!showMeasurement);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      showMeasurement
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">📏</span>
                    <span className="text-[15px] font-semibold">{t('search:map.measureDistance', 'Measure Distance')}</span>
                  </button>

                  {/* 3D Buildings Toggle */}
                  <button
                    onClick={() => setShow3DBuildings(!show3DBuildings)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      show3DBuildings
                        ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">🏢</span>
                    <span className="text-[15px] font-semibold">{t('search:map.buildings3D', '3D Buildings')}</span>
                  </button>

                  {/* Cadastre Toggle - only in satellite/hybrid views */}
                  {(mapType === 'satellite' || mapType === 'hybrid') && (
                    <button
                      onClick={() => setShowCadastre(!showCadastre)}
                      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                        showCadastre
                          ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg'
                          : 'text-neutral-700 hover:bg-neutral-100/80'
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">📐</span>
                      <span className="text-[15px] font-semibold">{t('search:map.landParcels', 'Land Parcels')}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* FAB Button - liquid glass effect */}
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
              {/* Active layers badge */}
              {!isLayerMenuOpen && (showLandmarks || show3DBuildings || showCadastre || showMeasurement) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                  {[showLandmarks, show3DBuildings, showCadastre, showMeasurement].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Legend popup - positioned closer to FAB */}
            {isLegendOpen && !isLayerMenuOpen && (
              <div className="absolute bottom-14 left-0 pointer-events-auto">
                <Legend isNightMode={false} />
              </div>
            )}

          </div>

          {/* Mobile: Top right compact controls */}
          <div className="absolute top-16 right-2 z-[999] md:hidden">
            <div className="flex flex-col gap-1.5 items-end">
              {/* Main control bar - liquid glass effect */}
              <div
                className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                }}
              >
                {/* Map Options Button */}
                <div className="relative">
                  <button
                    onClick={() => setIsMapOptionsOpen(!isMapOptionsOpen)}
                    className={`flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                      isMapOptionsOpen || selectedClimateRisk !== 'none'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-white/50'
                    }`}
                  >
                    <span>{t('search:map.options.mapButton', 'Map')}</span>
                    <svg
                      className={`w-3 h-3 transition-transform ${isMapOptionsOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Map Options Panel dropdown */}
                  {isMapOptionsOpen && (
                    <div className="absolute top-full right-0 mt-2 z-[1010]">
                      <MapOptionsPanel
                        selectedMapOption={selectedMapOption}
                        selectedClimateRisk={selectedClimateRisk}
                        onMapOptionChange={handleMapOptionChange}
                        onClimateRiskChange={handleClimateRiskChange}
                        isOpen={isMapOptionsOpen}
                        onClose={() => setIsMapOptionsOpen(false)}
                        isMobile={true}
                      />
                    </div>
                  )}
                </div>

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
                  title={isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}
                >
                  {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                  <span className="text-xs font-semibold">{isDrawing ? t('search:map.cancel') : t('search:map.draw', 'Draw')}</span>
                </button>
              </div>

              {/* Sun Position Control - compact version for mobile */}
              {show3DBuildings && (
                <SunPositionControl
                  onDateTimeChange={handleShadowTimeChange}
                  onSeasonChange={handleSeasonChange}
                  isNightMode={false}
                  enabled={show3DBuildings}
                  compact={true}
                />
              )}

              {/* Drawn bounds actions - glass pill style */}
              {drawnBounds && !isDrawing && (
                <div
                  className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40 animate-fade-in"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {isAuthenticated && (
                    <button
                      onClick={onSaveSearch}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl disabled:opacity-50 transition-all active:scale-[0.98] shadow-md"
                      title={isSaving ? t('search:map.saving') : t('search:map.saveArea')}
                    >
                      <SearchPlusIcon className="w-4 h-4" />
                      <span className="text-[13px] font-semibold">{t('search:map.save', 'Save')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl transition-all active:scale-[0.98] shadow-md"
                    title={t('search:map.clearArea')}
                  >
                    <XCircleIcon className="w-4 h-4" />
                    <span className="text-[13px] font-semibold">{t('search:map.clear', 'Clear')}</span>
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