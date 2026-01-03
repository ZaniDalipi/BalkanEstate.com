import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';
import { Property } from '@/types';
import L from 'leaflet';
import { useAppContext } from '@/context/AppContext';
import {
  BellIcon,
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
  MoonIcon,
  SunIcon,
  FireHeatIcon,
} from '@/constants';
import { CadastreLayer } from './CadastreLayer';
import HeatMapLayer from './HeatMapLayer';
import SnapchatMapOverlay from './SnapchatMapOverlay';
import Buildings3DLayer from './Buildings3DLayer';
import SunPositionControl from './SunPositionControl';
import SunArcAnimation, { type Season } from './SunArcAnimation';
import LandmarksLayer from './LandmarksLayer';
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
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  night: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

type TileLayerType = keyof typeof TILE_LAYERS;

// Bounding box for the Balkan region
const BALKAN_BOUNDS = L.latLngBounds(
  [34, 13], // Southwest corner (Southern Greece, Western Croatia)
  [49, 31] // Northeast corner (Northern Romania, Eastern Bulgaria)
);

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

  // Check if we're in night mode
  const isNightMode = mapType === 'night';

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
    if (!show3DBuildings && !isNightMode) {
      setIsManualTimeControl(false);
    }
  }, [show3DBuildings, isNightMode]);

  // Update map center coordinates when map moves
  const handleMapMoveWithCenter = useCallback((bounds: L.LatLngBounds, center: L.LatLng) => {
    setMapCenterLng(center.lng);
    setMapCenterLat(center.lat);
    onMapMove(bounds, center);
  }, [onMapMove]);

  const validProperties = useMemo(() => {
    return properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );
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
  };

  // Get current hour from shadowDateTime for sun animation
  const currentHour = shadowDateTime.getHours() + shadowDateTime.getMinutes() / 60;

  return (
    <HighlightedPropertiesProvider properties={propertiesInView}>
      <div className={`w-full h-full relative ${isNightMode ? 'night-mode' : ''} overflow-hidden`}>
        {/* Snapchat-style sparkle overlay */}
        <SnapchatMapOverlay enabled={isNightMode} />

        {/* Animated sun/moon arc across the map - uses real local solar time */}
        <SunArcAnimation
          hour={currentHour}
          enabled={isNightMode || show3DBuildings}
          isNightMode={isNightMode}
          longitude={mapCenterLng}
          latitude={mapCenterLat}
          useRealTime={!isManualTimeControl}
          season={selectedSeason}
        />

        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          className={`w-full h-full ${isNightMode ? 'night-mode' : ''}`}
          maxZoom={18}
          minZoom={7}
          zoomControl={false}
          maxBounds={BALKAN_BOUNDS}
          maxBoundsViscosity={1.0}
          preferCanvas={true}
          updateWhenIdle={true}
          updateWhenZooming={false}
          keepBuffer={2}
        >
          <FlyToController target={flyToTarget} onComplete={onFlyComplete} />
          <MapEvents onMove={handleMapMoveWithCenter} mapBounds={mapBounds} searchMode={searchMode} />
          <MapDrawEvents isDrawing={isDrawing} onDrawComplete={onDrawComplete} />
          <ZoomBasedTileSwitch mapType={mapType} setMapType={setMapType} />
          {drawnBounds && !isDrawing && (
            <Rectangle
              bounds={drawnBounds}
              pathOptions={{
                color: isNightMode ? '#00ffff' : '#0252CD',
                weight: isNightMode ? 2 : 3,
                fillOpacity: isNightMode ? 0.15 : 0.2,
                fillColor: isNightMode ? '#00ffff' : '#0252CD',
                className: isNightMode ? 'night-mode-rectangle' : '',
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
          {/* 3D Buildings with time-based shadows - enabled in night mode or manually */}
          <Buildings3DLayer
            enabled={isNightMode || show3DBuildings}
            dateTime={shadowDateTime}
          />
          {/* Famous landmarks and POIs */}
          <LandmarksLayer
            enabled={showLandmarks}
            isNightMode={isNightMode}
          />
          <CadastreLayer enabled={showCadastre && mapType === 'satellite'} opacity={0.7} />
          <HeatMapLayer properties={propertiesInView} enabled={showHeatMap} intensity="medium" />
          <Markers properties={propertiesInView} onPopupClick={handlePopupClick} hoveredPropertyId={hoveredPropertyId} isNightMode={isNightMode} />
          <HighlightedPropertyMarkers onPopupClick={handlePopupClick} />
          <MapAgentAvatarInner onPropertySelect={handlePopupClick} />
        </MapContainer>

      {/* Desktop Controls - hidden on mobile via CSS as fallback */}
      {!isMobile && (
        <>
          <div className="absolute bottom-12 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
            {/* Main control bar - compact */}
            <div className={`${isNightMode ? 'bg-slate-900/90' : 'bg-white/90'} backdrop-blur-sm p-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-colors duration-300`}>
              <button
                onClick={onRecenter}
                className={`p-1.5 rounded-full transition-colors ${isNightMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                title={t('search:map.centerOnLocation')}
              >
                <CrosshairsIcon className={`w-5 h-5 ${isNightMode ? 'text-white' : 'text-neutral-700'}`} />
              </button>
              <div className={`flex items-center ${isNightMode ? 'bg-slate-800/50' : 'bg-neutral-200/50'} p-0.5 rounded-full`}>
                <button
                  onClick={() => setMapType('street')}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    mapType === 'street'
                      ? 'bg-white shadow text-primary'
                      : isNightMode
                        ? 'text-slate-300 hover:bg-white/10'
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
                      : isNightMode
                        ? 'text-slate-300 hover:bg-white/10'
                        : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  {t('search:map.satellite')}
                </button>
              </div>
              {/* Night Mode Toggle */}
              <button
                onClick={() => setMapType(isNightMode ? 'street' : 'night')}
                className={`p-1.5 rounded-full transition-all ${
                  isNightMode
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'hover:bg-black/10 text-neutral-600'
                }`}
                title={t('search:map.nightMode', 'Night Mode')}
              >
                {isNightMode ? (
                  <SunIcon className="w-4 h-4" />
                ) : (
                  <MoonIcon className="w-4 h-4" />
                )}
              </button>
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

            {/* Heat Map Toggle - appears when in night mode */}
            {isNightMode && (
              <button
                onClick={() => setShowHeatMap(!showHeatMap)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full shadow-lg transition-all animate-fade-in ${
                  showHeatMap
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/30'
                    : 'bg-slate-800/90 text-white hover:bg-slate-700/90'
                }`}
                title={t('search:map.heatMap', 'Heat Map')}
              >
                <FireHeatIcon className={`w-4 h-4 ${showHeatMap ? 'animate-pulse' : ''}`} />
                <span className="hidden lg:inline">{showHeatMap ? t('search:map.hideHeatMap', 'Hide Heat Map') : t('search:map.showHeatMap', 'Show Heat Map')}</span>
                <span className="lg:hidden">Heat</span>
              </button>
            )}

            {/* Layer toggles - compact row */}
            <div className={`flex items-center gap-1.5 ${isNightMode ? 'bg-slate-900/90' : 'bg-white/90'} backdrop-blur-sm p-1.5 rounded-full shadow-lg`}>
              {/* 3D Buildings Toggle */}
              <button
                onClick={() => setShow3DBuildings(!show3DBuildings)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  show3DBuildings || isNightMode
                    ? isNightMode
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-white'
                    : isNightMode
                      ? 'text-slate-300 hover:bg-white/10'
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
                    ? isNightMode
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-primary text-white'
                    : isNightMode
                      ? 'text-slate-300 hover:bg-white/10'
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
          <div className="absolute bottom-4 left-4 z-[1000]">
            <Legend isNightMode={isNightMode} />
          </div>

          {/* Sun Position Control - for shadow simulation when 3D buildings are enabled */}
          {(isNightMode || show3DBuildings) && (
            <div className="absolute top-4 left-4 z-[1000]">
              <SunPositionControl
                onDateTimeChange={handleShadowTimeChange}
                onSeasonChange={handleSeasonChange}
                isNightMode={isNightMode}
                enabled={isNightMode || show3DBuildings}
              />
            </div>
          )}
        </>
      )}

      {/* Mobile Controls - hidden on desktop via CSS as fallback */}
      {isMobile && (
        <>
          {/* Mobile: Bottom-left - Layer toggles in horizontal bar */}
          <div className="absolute bottom-24 left-2 right-2 z-[1000] flex justify-center pointer-events-none md:hidden">
            <div className={`
              pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg backdrop-blur-md
              ${isNightMode ? 'bg-slate-900/85' : 'bg-white/85'}
              transition-all duration-300 ease-out
            `}>
              {/* 3D Buildings Toggle */}
              <button
                onClick={() => setShow3DBuildings(!show3DBuildings)}
                className={`
                  p-2.5 rounded-xl transition-all duration-200 ease-out active:scale-95
                  ${show3DBuildings || isNightMode
                    ? isNightMode
                      ? 'bg-cyan-500/90 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-slate-700 text-white shadow-md'
                    : isNightMode
                      ? 'text-slate-400 hover:bg-white/10'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }
                `}
                title={t('search:map.buildings3D', '3D Buildings')}
              >
                <span className="text-lg">🏢</span>
              </button>

              {/* Landmarks Toggle */}
              <button
                onClick={() => setShowLandmarks(!showLandmarks)}
                className={`
                  p-2.5 rounded-xl transition-all duration-200 ease-out active:scale-95
                  ${showLandmarks
                    ? isNightMode
                      ? 'bg-amber-500/90 text-slate-900 shadow-md shadow-amber-500/30'
                      : 'bg-primary text-white shadow-md'
                    : isNightMode
                      ? 'text-slate-400 hover:bg-white/10'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }
                `}
                title={t('search:map.landmarks', 'Landmarks')}
              >
                <span className="text-lg">🏛️</span>
              </button>

              {/* Heat Map Toggle - only in night mode */}
              {isNightMode && (
                <button
                  onClick={() => setShowHeatMap(!showHeatMap)}
                  className={`
                    p-2.5 rounded-xl transition-all duration-200 ease-out active:scale-95
                    ${showHeatMap
                      ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/30'
                      : 'text-slate-400 hover:bg-white/10'
                    }
                  `}
                  title={t('search:map.heatMap', 'Heat Map')}
                >
                  <FireHeatIcon className={`w-5 h-5 ${showHeatMap ? 'animate-pulse' : ''}`} />
                </button>
              )}

              {/* Cadastre Toggle - only in satellite */}
              {mapType === 'satellite' && (
                <button
                  onClick={() => setShowCadastre(!showCadastre)}
                  className={`
                    p-2.5 rounded-xl transition-all duration-200 ease-out active:scale-95
                    ${showCadastre
                      ? 'bg-primary text-white shadow-md'
                      : 'text-neutral-500 hover:bg-neutral-100'
                    }
                  `}
                  title={t('search:map.cadastralParcels')}
                >
                  <span className="text-lg">📐</span>
                </button>
              )}

              {/* Divider */}
              <div className={`w-px h-6 mx-0.5 ${isNightMode ? 'bg-slate-700' : 'bg-neutral-200'}`} />

              {/* Night Mode Toggle */}
              <button
                onClick={() => setMapType(isNightMode ? 'street' : 'night')}
                className={`
                  p-2.5 rounded-xl transition-all duration-200 ease-out active:scale-95
                  ${isNightMode
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-neutral-500 hover:bg-neutral-100'
                  }
                `}
                title={t('search:map.nightMode', 'Night Mode')}
              >
                {isNightMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>

              {/* Legend Toggle */}
              <button
                onClick={() => setIsLegendOpen((p) => !p)}
                className={`
                  p-2.5 rounded-xl transition-all duration-200 ease-out active:scale-95
                  ${isLegendOpen
                    ? isNightMode
                      ? 'bg-slate-700 text-white'
                      : 'bg-neutral-200 text-neutral-700'
                    : isNightMode
                      ? 'text-slate-400 hover:bg-white/10'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }
                `}
                title={t('search:map.mapLegend')}
              >
                <MapLegendIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Legend popup - positioned above the bar */}
            {isLegendOpen && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-auto animate-slide-up">
                <Legend isNightMode={isNightMode} />
              </div>
            )}
          </div>

          {/* Mobile: Sun Position Control - top left when 3D buildings enabled */}
          {(isNightMode || show3DBuildings) && (
            <div className="absolute top-20 left-2 z-[999] animate-slide-down md:hidden">
              <SunPositionControl
                onDateTimeChange={handleShadowTimeChange}
                onSeasonChange={handleSeasonChange}
                isNightMode={isNightMode}
                enabled={isNightMode || show3DBuildings}
              />
            </div>
          )}

          {/* Mobile: Top right controls - stacked vertically with proper spacing */}
          <div className="absolute top-20 right-2 z-[999] flex flex-col gap-3 items-end md:hidden">
            {/* Row 1: Map type toggle */}
            <div className={`
              flex items-center p-1 rounded-xl shadow-lg backdrop-blur-md
              ${isNightMode ? 'bg-slate-900/90' : 'bg-white/90'}
            `}>
              <button
                onClick={() => setMapType('street')}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                  ${mapType === 'street'
                    ? 'bg-white shadow-sm text-primary'
                    : isNightMode ? 'text-slate-400' : 'text-neutral-500'
                  }
                `}
              >
                {t('search:map.street')}
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                  ${mapType === 'satellite'
                    ? 'bg-white shadow-sm text-primary'
                    : isNightMode ? 'text-slate-400' : 'text-neutral-500'
                  }
                `}
              >
                {t('search:map.satellite')}
              </button>
            </div>

            {/* Row 2: Action buttons */}
            <div className="flex items-center gap-2">
              {/* Recenter */}
              <button
                onClick={onRecenter}
                className={`
                  p-2.5 rounded-xl shadow-lg backdrop-blur-md transition-all duration-200 active:scale-95
                  ${isNightMode ? 'bg-slate-900/90 text-white' : 'bg-white/90 text-neutral-700'}
                `}
                title={t('search:map.centerOnLocation')}
              >
                <CrosshairsIcon className="w-5 h-5" />
              </button>

              {/* Draw with text label */}
              <button
                onClick={onDrawStart}
                className={`
                  flex items-center gap-1.5 px-3 py-2.5 rounded-xl shadow-lg transition-all duration-200 active:scale-95
                  ${isDrawing
                    ? 'bg-red-500 text-white'
                    : 'bg-neutral-800 text-white'
                  }
                `}
                title={isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}
              >
                {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                <span className="text-xs font-semibold">{isDrawing ? t('search:map.cancel') : t('search:map.draw', 'Draw')}</span>
              </button>
            </div>

            {/* Row 3: Drawn bounds actions - only when bounds exist */}
            {drawnBounds && !isDrawing && (
              <div className="flex items-center gap-2 animate-slide-left">
                {isAuthenticated && (
                  <button
                    onClick={onSaveSearch}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl shadow-lg disabled:opacity-50 transition-all duration-200 active:scale-95"
                    title={isSaving ? t('search:map.saving') : t('search:map.saveArea')}
                  >
                    <SearchPlusIcon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{t('search:map.save', 'Save')}</span>
                  </button>
                )}
                <button
                  onClick={() => onDrawComplete(null)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-xl shadow-lg transition-all duration-200 active:scale-95"
                  title={t('search:map.clearArea')}
                >
                  <XCircleIcon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{t('search:map.clear', 'Clear')}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </HighlightedPropertiesProvider>
  );
};

export default MapComponent;
