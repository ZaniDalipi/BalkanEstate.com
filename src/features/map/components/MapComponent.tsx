import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';
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
import {
  FlyToController,
  MapEvents,
  ZoomBasedTileSwitch,
  ZoomBased3DBuildings,
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
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
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
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [showCadastre, setShowCadastre] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true); // Show landmarks by default
  const [show3DBuildings, setShow3DBuildings] = useState(false); // Toggle for 3D buildings
  const [shadowDateTime, setShadowDateTime] = useState<Date>(new Date());
  const [mapCenterLng, setMapCenterLng] = useState<number>(22); // Default Balkans longitude
  const [mapCenterLat, setMapCenterLat] = useState<number>(41); // Default Balkans latitude
  const [isManualTimeControl, setIsManualTimeControl] = useState(false); // Track if user is controlling time
  const [selectedSeason, setSelectedSeason] = useState<Season>('current'); // Season for sun position

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
          maxZoom={22}
          minZoom={6}
          zoomControl={false}
          maxBounds={BALKAN_BOUNDS}
          maxBoundsViscosity={0.8}
          preferCanvas={true}
        >
          <FlyToController target={flyToTarget} onComplete={onFlyComplete} />
          <MapEvents onMove={handleMapMoveWithCenter} mapBounds={mapBounds} searchMode={searchMode} />
          <MapDrawEvents isDrawing={isDrawing} onDrawComplete={onDrawComplete} />
          <ZoomBasedTileSwitch mapType={mapType} setMapType={setMapType} />
          <ZoomBased3DBuildings show3DBuildings={show3DBuildings} setShow3DBuildings={setShow3DBuildings} />
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

      {/* Desktop Controls - positioned above the newsletter bar (bottom-28 = ~112px) */}
      {!isMobile && (
        <>
          <div className="absolute bottom-28 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
            {/* Main control bar - compact */}
            <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-colors duration-300">
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

            {/* Layer toggles - compact row */}
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
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
          {/* Legend - positioned above the newsletter on desktop (bottom-28 = ~112px to clear the ~80px newsletter) */}
          <div className="absolute bottom-28 left-4 z-[1000]">
            <Legend isNightMode={false} />
          </div>

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
          {/* Mobile: Layer toggles - positioned above List/Map toggle with proper spacing */}
          <div className="absolute bottom-[100px] left-0 right-0 z-[1003] flex justify-center pointer-events-none md:hidden pb-2">
            <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-full shadow-md backdrop-blur-md bg-white/90">
              {/* 3D Buildings Toggle */}
              <button
                onClick={() => setShow3DBuildings(!show3DBuildings)}
                className={`
                  p-1.5 rounded-full transition-all duration-200 ease-out active:scale-95
                  ${show3DBuildings
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-neutral-500 hover:bg-neutral-100'
                  }
                `}
                title={t('search:map.buildings3D', '3D Buildings')}
              >
                <span className="text-sm">🏢</span>
              </button>

              {/* Landmarks Toggle */}
              <button
                onClick={() => setShowLandmarks(!showLandmarks)}
                className={`
                  p-1.5 rounded-full transition-all duration-200 ease-out active:scale-95
                  ${showLandmarks
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-neutral-500 hover:bg-neutral-100'
                  }
                `}
                title={t('search:map.landmarks', 'Landmarks')}
              >
                <span className="text-sm">🏛️</span>
              </button>

              {/* Cadastre Toggle - only in satellite */}
              {mapType === 'satellite' && (
                <button
                  onClick={() => setShowCadastre(!showCadastre)}
                  className={`
                    p-1.5 rounded-full transition-all duration-200 ease-out active:scale-95
                    ${showCadastre
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-neutral-500 hover:bg-neutral-100'
                    }
                  `}
                  title={t('search:map.cadastralParcels')}
                >
                  <span className="text-sm">📐</span>
                </button>
              )}

              {/* Divider */}
              <div className="w-px h-4 bg-neutral-300" />

              {/* Legend Toggle */}
              <button
                onClick={() => setIsLegendOpen((p) => !p)}
                className={`
                  p-1.5 rounded-full transition-all duration-200 ease-out active:scale-95
                  ${isLegendOpen
                    ? 'bg-neutral-200 text-neutral-700'
                    : 'text-neutral-500 hover:bg-neutral-100'
                  }
                `}
                title={t('search:map.mapLegend')}
              >
                <MapLegendIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Legend popup - positioned above the bar */}
            {isLegendOpen && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-auto animate-slide-up">
                <Legend isNightMode={false} />
              </div>
            )}
          </div>

          {/* Mobile: Top right controls - unified compact panel */}
          <div className="absolute top-20 right-2 z-[999] md:hidden">
            <div className="flex flex-col gap-2 items-end">
              {/* Unified control bar */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg backdrop-blur-md bg-white/95">
                {/* Map type toggle */}
                <div className="flex items-center bg-neutral-100 rounded-xl p-0.5">
                  <button
                    onClick={() => setMapType('street')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                      mapType === 'street'
                        ? 'bg-white shadow-sm text-primary'
                        : 'text-neutral-500'
                    }`}
                  >
                    {t('search:map.street')}
                  </button>
                  <button
                    onClick={() => setMapType('satellite')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
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
                  onClick={onRecenter}
                  className="p-2 rounded-xl transition-all duration-200 active:scale-95 hover:bg-neutral-100 text-neutral-600"
                  title={t('search:map.centerOnLocation')}
                >
                  <CrosshairsIcon className="w-4 h-4" />
                </button>

                {/* Draw */}
                <button
                  onClick={onDrawStart}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-200 active:scale-95 ${
                    isDrawing
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-800 text-white'
                  }`}
                  title={isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}
                >
                  {isDrawing ? <XCircleIcon className="w-3.5 h-3.5" /> : <PencilIcon className="w-3.5 h-3.5" />}
                  <span className="text-[11px] font-semibold">{isDrawing ? t('search:map.cancel') : t('search:map.draw', 'Draw')}</span>
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

              {/* Drawn bounds actions - only when bounds exist */}
              {drawnBounds && !isDrawing && (
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg backdrop-blur-md bg-white/95 animate-fade-in">
                  {isAuthenticated && (
                    <button
                      onClick={onSaveSearch}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-white rounded-xl disabled:opacity-50 transition-all duration-200 active:scale-95"
                      title={isSaving ? t('search:map.saving') : t('search:map.saveArea')}
                    >
                      <SearchPlusIcon className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">{t('search:map.save', 'Save')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-xl transition-all duration-200 active:scale-95"
                    title={t('search:map.clearArea')}
                  >
                    <XCircleIcon className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">{t('search:map.clear', 'Clear')}</span>
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
