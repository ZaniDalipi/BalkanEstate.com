import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Rectangle, useMapEvents, useMap } from 'react-leaflet';
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
import { CadastreLayer } from './CadastreLayer';
import HeatMapLayer from './HeatMapLayer';
import Buildings3DLayer from './Buildings3DLayer';
import SunPositionControl from './SunPositionControl';
import SunArcAnimation, { type Season } from './SunArcAnimation';
import LandmarksLayer from './LandmarksLayer';
import PropertyAddressLabels from './PropertyAddressLabels';
import MeasurementTool from './MeasurementTool';
import {
  FlyToController,
  MapEvents,
  ZoomBasedTileSwitch,
  MapDrawEvents,
} from '@/src/components/map/MapHelpers';
import { Markers, Legend, HighlightedPropertyMarkers } from '@/src/components/map/MapPropertyMarker';
import MapAgentAvatar, { MapAgentAvatarInner } from '@/src/components/map/MapAgentAvatar';
import { HighlightedPropertiesProvider } from '@/src/context/HighlightedPropertiesContext';

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

const TILE_LAYERS = {
  street: {
    // Google Maps Street - clean labels and roads, max zoom 21, English labels
    url: 'https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 21,
    maxNativeZoom: 21,
  },
  satellite: {
    // Google Maps Satellite - high quality aerial imagery, max zoom 21
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 21,
    maxNativeZoom: 21,
  },
};

type TileLayerType = keyof typeof TILE_LAYERS | 'night';

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
    /* 3D perspective container - creates isometric-like view */
    .map-3d-perspective-container {
      perspective: 1500px;
      perspective-origin: 50% 25%;
    }

    /* Map transforms for 3D mode - subtle tilt for better building view */
    .map-3d-active {
      transform: rotateX(25deg) scale(1.08);
      transform-origin: center 70%;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Normal 2D mode */
    .map-3d-inactive {
      transform: rotateX(0deg) scale(1);
      transform-origin: center center;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Ensure controls stay upright in 3D mode */
    .map-3d-active .leaflet-control-container {
      transform: rotateX(-25deg);
      transform-origin: center 30%;
    }

    /* Keep markers/popups properly oriented */
    .map-3d-active .leaflet-marker-pane,
    .map-3d-active .leaflet-popup-pane {
      transform: rotateX(-25deg);
      transform-origin: center 30%;
    }

    /* Smooth shadow for 3D depth effect */
    .map-3d-active::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 5%;
      right: 5%;
      height: 40px;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, transparent 70%);
      pointer-events: none;
      z-index: -1;
    }
  `;
  document.head.appendChild(style);
};

// Initialize 3D perspective styles
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
        map.setZoom(maxZoom);
      }

      prevMapTypeRef.current = mapType;
    }
  }, [mapType, map]);

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
}) => {
  const { t } = useTranslation(['search']);
  const { dispatch } = useAppContext();
  const [mapType, setMapType] = useState<TileLayerType>('street');
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

  // Use ref for onMapMove to prevent infinite loops when callback changes
  const onMapMoveRef = useRef(onMapMove);
  useEffect(() => {
    onMapMoveRef.current = onMapMove;
  });

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

  // Update map center coordinates when map moves
  const handleMapMoveWithCenter = useCallback((bounds: L.LatLngBounds, center: L.LatLng) => {
    setMapCenterLng(center.lng);
    setMapCenterLat(center.lat);
    onMapMoveRef.current(bounds, center);
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

  // Always show all valid properties on the map (up to 500 for performance)
  // This ensures the map never appears empty and users can navigate to any property
  const propertiesInView = useMemo(() => {
    return validProperties.slice(0, 500);
  }, [validProperties]);

  const { center, zoom } = useMemo(() => {
    if (userLocation) return { center: userLocation, zoom: 13 };
    return { center: [41.5, 22] as [number, number], zoom: 7 };
  }, [userLocation]);

  const handlePopupClick = (propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    window.history.pushState({ propertyId }, '', `/property/${propertyId}`);
  };

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
        >
          <FlyToController target={flyToTarget} onComplete={onFlyComplete} />
          <MapEvents onMove={handleMapMoveWithCenter} mapBounds={mapBounds} searchMode={searchMode} />
          <ZoomTracker onZoomChange={setCurrentZoom} />
          <ZoomAdjuster mapType={mapType} currentZoom={currentZoom} />
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
            keepBuffer={2}
            updateWhenIdle={true}
            updateWhenZooming={false}
            updateInterval={150}
          />
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
          <CadastreLayer enabled={showCadastre && mapType === 'satellite'} opacity={0.7} />
          <HeatMapLayer properties={propertiesInView} enabled={showHeatMap} intensity="medium" />
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

      {/* Desktop Controls - positioned above the newsletter bar (bottom-12 = ~112px) */}
      {!isMobile && (
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
                  onClick={() => setMapType('street')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'street'
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
                <span className="hidden sm:inline">{isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}</span>
                <span className="sm:hidden">{isDrawing ? '✕' : '✎'}</span>
              </button>
            </div>

            {/* Layer toggles - compact row with glass effect */}
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10">
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
                <span className="hidden sm:inline">3D</span>
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
                <span className="hidden sm:inline">POI</span>
              </button>

              {/* Cadastre Toggle - only in satellite */}
              {mapType === 'satellite' && (
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
                  <span className="hidden sm:inline">Parcels</span>
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
                title="Measure land"
              >
                <span className="text-sm">📏</span>
                <span className="hidden sm:inline">Measure</span>
              </button>

              {/* Legend Toggle */}
              <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
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
              <div className="flex items-center gap-1.5 animate-fade-in">
                {isAuthenticated && (
                  <button
                    onClick={onSaveSearch}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-full shadow-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    <SearchPlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{isSaving ? t('search:map.saving') : t('search:map.saveArea')}</span>
                    <span className="sm:hidden">Save</span>
                  </button>
                )}
                <button
                  onClick={() => onDrawComplete(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-neutral-900"
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
      {isMobile && (
        <>
          {/* Mobile: Layers FAB with dropdown - positioned at bottom left */}
          <div className={`absolute bottom-20 left-3 z-[1003] pointer-events-none md:hidden transition-opacity duration-200 ${showMeasurement ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Dropdown menu - appears above the FAB */}
            {isLayerMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 pointer-events-auto animate-fade-in">
                <div
                  className="flex flex-col gap-1 p-2 rounded-xl shadow-lg bg-white/95 backdrop-blur-md"
                >
                  {/* Legend Toggle */}
                  <button
                    onClick={() => {
                      setIsLegendOpen((p) => !p);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isLegendOpen ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <MapLegendIcon className="w-4 h-4" />
                    <span className="text-xs font-medium">Legend</span>
                  </button>

                  {/* Landmarks Toggle */}
                  <button
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      showLandmarks ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="text-sm">🏛️</span>
                    <span className="text-xs font-medium">POI</span>
                  </button>

                  {/* Measurement Tool Toggle */}
                  <button
                    onClick={() => {
                      setShowMeasurement(!showMeasurement);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      showMeasurement ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="text-sm">📏</span>
                    <span className="text-xs font-medium">Measure</span>
                  </button>

                  {/* Cadastre Toggle - only in satellite */}
                  {mapType === 'satellite' && (
                    <button
                      onClick={() => setShowCadastre(!showCadastre)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        showCadastre ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="text-sm">📐</span>
                      <span className="text-xs font-medium">Parcels</span>
                    </button>
                  )}

                  {/* 3D Buildings Toggle */}
                  <button
                    onClick={() => setShow3DBuildings(!show3DBuildings)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      show3DBuildings ? 'bg-slate-700 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="text-sm">🏢</span>
                    <span className="text-xs font-medium">3D</span>
                  </button>
                </div>
              </div>
            )}

            {/* FAB Button */}
            <button
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className={`pointer-events-auto w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
                isLayerMenuOpen ? 'bg-primary text-white rotate-45' : 'bg-white text-neutral-700'
              }`}
            >
              {isLayerMenuOpen ? (
                <XCircleIcon className="w-5 h-5" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              )}
            </button>

            {/* Legend popup */}
            {isLegendOpen && !isLayerMenuOpen && (
              <div className="absolute bottom-0 left-full ml-2 pointer-events-auto animate-fade-in">
                <Legend isNightMode={false} />
              </div>
            )}
          </div>

          {/* Mobile: Top right compact controls */}
          <div className="absolute top-16 right-2 z-[999] md:hidden">
            <div className="flex flex-col gap-1.5 items-end">
              {/* Main control bar */}
              <div className="flex items-center gap-1 p-1 rounded-xl shadow-md bg-white/95 backdrop-blur-sm">
                {/* Map type toggle */}
                <div className="flex bg-neutral-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setMapType('street')}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      mapType === 'street' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500'
                    }`}
                  >
                    {t('search:map.street')}
                  </button>
                  <button
                    onClick={() => setMapType('satellite')}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      mapType === 'satellite' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500'
                    }`}
                  >
                    {t('search:map.satellite')}
                  </button>
                </div>

                {/* Recenter */}
                <button
                  onClick={onRecenter}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600"
                  title={t('search:map.centerOnLocation')}
                >
                  <CrosshairsIcon className="w-4 h-4" />
                </button>

                {/* Draw */}
                <button
                  onClick={onDrawStart}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                    isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'
                  }`}
                  title={isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}
                >
                  {isDrawing ? <XCircleIcon className="w-3.5 h-3.5" /> : <PencilIcon className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-semibold">{isDrawing ? t('search:map.cancel') : t('search:map.draw', 'Draw')}</span>
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

              {/* Drawn bounds actions */}
              {drawnBounds && !isDrawing && (
                <div className="flex items-center gap-1 p-1 rounded-xl shadow-md bg-white/95 backdrop-blur-sm animate-fade-in">
                  {isAuthenticated && (
                    <button
                      onClick={onSaveSearch}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2 py-1 bg-primary text-white rounded-lg disabled:opacity-50 transition-all"
                      title={isSaving ? t('search:map.saving') : t('search:map.saveArea')}
                    >
                      <SearchPlusIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold">{t('search:map.save', 'Save')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-lg transition-all"
                    title={t('search:map.clearArea')}
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
    </HighlightedPropertiesProvider>
  );
};

export default MapComponent;
