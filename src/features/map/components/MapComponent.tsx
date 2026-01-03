import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Map, {
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
  Marker,
  Popup,
  useMap,
} from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { MapMouseEvent, LngLatBoundsLike } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import {
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
} from '@/constants';
import { CadastreLayerMapbox } from './CadastreLayerMapbox';
import HeatMapLayerMapbox from './HeatMapLayerMapbox';
import SunPositionControl from './SunPositionControl';
import { type Season } from './SunArcAnimation';
import LandmarksLayerMapbox from './LandmarksLayerMapbox';
import { MarkersMapbox, Legend } from '@/src/components/map/MapPropertyMarkerMapbox';
import MapAgentAvatar, { MapAgentAvatarInnerMapbox } from '@/src/components/map/MapAgentAvatarMapbox';
import { HighlightedPropertiesProvider } from '@/src/context/HighlightedPropertiesContext';

// Mapbox public token - for production, use environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiYmFsa2FuZXN0YXRlIiwiYSI6ImNtNWpxZGY4YjBhZ2cyaXF4bTVxaWV2eHQifQ.D8fMUFy9xfcmJQ6EPkXFRg';

// Map styles
const MAP_STYLES = {
  street: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

type MapStyleType = keyof typeof MAP_STYLES;

// Bounding box for the Balkan region
const BALKAN_BOUNDS: LngLatBoundsLike = [
  [13, 34], // Southwest corner (Western Croatia, Southern Greece)
  [31, 49]  // Northeast corner (Eastern Bulgaria, Northern Romania)
];

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
 * MapComponent
 *
 * Main map component for property search using Mapbox GL JS with:
 * - Native 3D building extrusions
 * - Interactive property markers with popups
 * - Area drawing for custom search
 * - Street/Satellite view toggle
 * - Cadastral layer overlay
 * - Heat map visualization
 * - Landmarks/POI layer
 * - Sun position control for shadow simulation
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
  const mapRef = useRef<MapRef>(null);

  const [mapStyle, setMapStyle] = useState<MapStyleType>('street');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [showCadastre, setShowCadastre] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [shadowDateTime, setShadowDateTime] = useState<Date>(new Date());
  const [isManualTimeControl, setIsManualTimeControl] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season>('current');
  const [currentZoom, setCurrentZoom] = useState(7);

  // Drawing state
  const [drawStart, setDrawStart] = useState<[number, number] | null>(null);
  const [drawEnd, setDrawEnd] = useState<[number, number] | null>(null);

  // Initial viewport
  const initialViewState = useMemo(() => {
    if (userLocation) {
      return {
        longitude: userLocation[1],
        latitude: userLocation[0],
        zoom: 13,
        pitch: 0,
        bearing: 0
      };
    }
    return {
      longitude: 22,
      latitude: 41.5,
      zoom: 7,
      pitch: 0,
      bearing: 0
    };
  }, [userLocation]);

  const [viewState, setViewState] = useState(initialViewState);

  // Handle shadow time change
  const handleShadowTimeChange = useCallback((dateTime: Date) => {
    setShadowDateTime(dateTime);
    setIsManualTimeControl(true);
  }, []);

  // Handle season change
  const handleSeasonChange = useCallback((season: Season) => {
    setSelectedSeason(season);
  }, []);

  // Reset to real time when 3D buildings is toggled off
  useEffect(() => {
    if (!show3DBuildings) {
      setIsManualTimeControl(false);
    }
  }, [show3DBuildings]);

  // Filter valid properties
  const validProperties = useMemo(() => {
    return properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );
  }, [properties]);

  // Limit properties for performance
  const propertiesInView = useMemo(() => {
    return validProperties.slice(0, 500);
  }, [validProperties]);

  // Handle popup click
  const handlePopupClick = (propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
  };

  // Fly to target when provided
  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToTarget.center[1], flyToTarget.center[0]],
        zoom: flyToTarget.zoom,
        duration: 2500
      });
      const timer = setTimeout(onFlyComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [flyToTarget, onFlyComplete]);

  // Handle map move
  const onMove = useCallback((evt: any) => {
    setViewState(evt.viewState);
    setCurrentZoom(evt.viewState.zoom);
  }, []);

  // Handle map move end - report bounds
  const onMoveEnd = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const bounds = map.getBounds();
    const center = map.getCenter();

    // Convert to Leaflet-compatible format for parent component
    const leafletBounds = {
      _southWest: { lat: bounds.getSouth(), lng: bounds.getWest() },
      _northEast: { lat: bounds.getNorth(), lng: bounds.getEast() },
      getSouthWest: () => ({ lat: bounds.getSouth(), lng: bounds.getWest() }),
      getNorthEast: () => ({ lat: bounds.getNorth(), lng: bounds.getEast() }),
      getSouth: () => bounds.getSouth(),
      getWest: () => bounds.getWest(),
      getNorth: () => bounds.getNorth(),
      getEast: () => bounds.getEast(),
    };
    const leafletCenter = { lat: center.lat, lng: center.lng };

    onMapMove(leafletBounds, leafletCenter);

    // Auto-switch to satellite at high zoom
    if (currentZoom >= 18 && mapStyle === 'street') {
      setMapStyle('satellite');
    } else if (currentZoom < 18 && mapStyle === 'satellite') {
      setMapStyle('street');
    }

    // Auto-enable 3D buildings at very high zoom
    if (currentZoom >= 16 && !show3DBuildings) {
      setShow3DBuildings(true);
    } else if (currentZoom < 15 && show3DBuildings) {
      setShow3DBuildings(false);
    }
  }, [onMapMove, currentZoom, mapStyle, show3DBuildings]);

  // Drawing handlers
  const onMapClick = useCallback((evt: MapMouseEvent) => {
    if (!isDrawing) return;

    const coords: [number, number] = [evt.lngLat.lng, evt.lngLat.lat];

    if (!drawStart) {
      setDrawStart(coords);
    } else {
      setDrawEnd(coords);
      // Calculate bounds and complete draw
      const minLng = Math.min(drawStart[0], coords[0]);
      const maxLng = Math.max(drawStart[0], coords[0]);
      const minLat = Math.min(drawStart[1], coords[1]);
      const maxLat = Math.max(drawStart[1], coords[1]);

      const bounds = {
        _southWest: { lat: minLat, lng: minLng },
        _northEast: { lat: maxLat, lng: maxLng },
        getSouthWest: () => ({ lat: minLat, lng: minLng }),
        getNorthEast: () => ({ lat: maxLat, lng: maxLng }),
        getSouth: () => minLat,
        getWest: () => minLng,
        getNorth: () => maxLat,
        getEast: () => maxLng,
      };

      onDrawComplete(bounds);
      setDrawStart(null);
      setDrawEnd(null);
    }
  }, [isDrawing, drawStart, onDrawComplete]);

  // Clear drawing state when drawing mode ends
  useEffect(() => {
    if (!isDrawing) {
      setDrawStart(null);
      setDrawEnd(null);
    }
  }, [isDrawing]);

  // Recenter to user location
  const handleRecenter = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation[1], userLocation[0]],
        zoom: 13,
        duration: 1500
      });
    }
    onRecenter();
  }, [userLocation, onRecenter]);

  // 3D building layer configuration - get time-based fill color
  const buildingFillColor = useMemo(() => {
    const hour = shadowDateTime.getHours();

    if (hour >= 0 && hour < 5) {
      return 'rgba(30, 40, 65, 0.92)'; // night
    } else if (hour >= 5 && hour < 7) {
      return 'rgba(180, 140, 130, 0.9)'; // dawn
    } else if (hour >= 7 && hour < 11) {
      return 'rgba(200, 195, 180, 0.9)'; // morning
    } else if (hour >= 11 && hour < 14) {
      return 'rgba(220, 220, 215, 0.9)'; // noon
    } else if (hour >= 14 && hour < 17) {
      return 'rgba(210, 200, 180, 0.9)'; // afternoon
    } else if (hour >= 17 && hour < 20) {
      return 'rgba(200, 150, 100, 0.9)'; // sunset
    } else if (hour >= 20 && hour < 22) {
      return 'rgba(100, 90, 120, 0.9)'; // dusk
    }
    return 'rgba(200, 200, 200, 0.9)';
  }, [shadowDateTime]);

  // Set map pitch when 3D buildings enabled
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (show3DBuildings) {
        map.easeTo({ pitch: 45, duration: 500 });
      } else {
        map.easeTo({ pitch: 0, duration: 500 });
      }
    }
  }, [show3DBuildings]);

  // Sun position based lighting
  useEffect(() => {
    if (!mapRef.current || !show3DBuildings) return;

    const map = mapRef.current.getMap();
    if (!map.isStyleLoaded()) return;

    const hour = shadowDateTime.getHours();
    const minute = shadowDateTime.getMinutes();
    const timeDecimal = hour + minute / 60;

    // Calculate sun position (simplified)
    // Sun rises from east (90°), sets in west (270°)
    // Altitude varies by time of day
    let azimuth = 90 + (timeDecimal - 6) * 15; // 15 degrees per hour
    let altitude = 0;

    if (timeDecimal >= 6 && timeDecimal <= 18) {
      // Daytime - sun is up
      altitude = Math.sin((timeDecimal - 6) / 12 * Math.PI) * 70;
    } else {
      // Nighttime - sun is below horizon
      altitude = -10;
    }

    try {
      map.setLight({
        anchor: 'viewport',
        color: hour >= 17 && hour < 20 ? '#ffcc88' : '#ffffff',
        intensity: altitude > 0 ? 0.5 : 0.2,
        position: [1.5, azimuth, altitude]
      });
    } catch (e) {
      // Light setting may fail if style not loaded
    }
  }, [shadowDateTime, show3DBuildings]);

  // Drawn area rectangle
  const drawnAreaGeoJSON = useMemo(() => {
    if (!drawnBounds) return null;

    const sw = drawnBounds.getSouthWest();
    const ne = drawnBounds.getNorthEast();

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [sw.lng, sw.lat],
          [ne.lng, sw.lat],
          [ne.lng, ne.lat],
          [sw.lng, ne.lat],
          [sw.lng, sw.lat]
        ]]
      },
      properties: {}
    };
  }, [drawnBounds]);

  return (
    <HighlightedPropertiesProvider properties={propertiesInView}>
      <div className="w-full h-full relative overflow-hidden">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={onMove}
          onMoveEnd={onMoveEnd}
          onClick={onMapClick}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={MAP_STYLES[mapStyle]}
          style={{ width: '100%', height: '100%' }}
          maxBounds={BALKAN_BOUNDS}
          minZoom={5}
          maxZoom={22}
          cursor={isDrawing ? 'crosshair' : 'grab'}
          attributionControl={false}
        >
          {/* Navigation controls */}
          <NavigationControl position="bottom-right" showCompass={true} />
          <GeolocateControl position="bottom-right" trackUserLocation={true} />

          {/* 3D Buildings Layer */}
          {show3DBuildings && (
            <Layer
              id="3d-buildings"
              source="composite"
              source-layer="building"
              filter={['==', 'extrude', 'true'] as any}
              type="fill-extrusion"
              minzoom={14}
              paint={{
                'fill-extrusion-color': buildingFillColor,
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14, 0,
                  14.5, ['get', 'height']
                ] as any,
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14, 0,
                  14.5, ['get', 'min_height']
                ] as any,
                'fill-extrusion-opacity': 0.85
              }}
            />
          )}

          {/* Heat Map Layer */}
          <HeatMapLayerMapbox
            properties={propertiesInView}
            enabled={showHeatMap}
            intensity="medium"
          />

          {/* Landmarks Layer */}
          <LandmarksLayerMapbox
            enabled={showLandmarks}
            isNightMode={mapStyle === 'dark'}
          />

          {/* Cadastre Layer */}
          <CadastreLayerMapbox
            enabled={showCadastre && mapStyle === 'satellite'}
            opacity={0.7}
          />

          {/* Property Markers */}
          <MarkersMapbox
            properties={propertiesInView}
            onPopupClick={handlePopupClick}
            hoveredPropertyId={hoveredPropertyId}
            isNightMode={mapStyle === 'dark'}
            zoom={currentZoom}
          />

          {/* Drawn Area Rectangle */}
          {drawnAreaGeoJSON && !isDrawing && (
            <Source id="drawn-area" type="geojson" data={drawnAreaGeoJSON}>
              <Layer
                id="drawn-area-fill"
                type="fill"
                paint={{
                  'fill-color': '#0252CD',
                  'fill-opacity': 0.2
                }}
              />
              <Layer
                id="drawn-area-line"
                type="line"
                paint={{
                  'line-color': '#0252CD',
                  'line-width': 3
                }}
              />
            </Source>
          )}

          {/* Drawing preview rectangle */}
          {isDrawing && drawStart && (
            <Marker
              longitude={drawStart[0]}
              latitude={drawStart[1]}
              anchor="center"
            >
              <div className="w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse" />
            </Marker>
          )}

          {/* Map Agent Avatar */}
          <MapAgentAvatarInnerMapbox onPropertySelect={handlePopupClick} />
        </Map>

        {/* Desktop Controls */}
        {!isMobile && (
          <>
            <div className="absolute bottom-12 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
              {/* Main control bar */}
              <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-colors duration-300">
                <button
                  onClick={handleRecenter}
                  className="p-1.5 rounded-full transition-colors hover:bg-black/10"
                  title={t('search:map.centerOnLocation')}
                >
                  <CrosshairsIcon className="w-5 h-5 text-neutral-700" />
                </button>
                <div className="flex items-center bg-neutral-200/50 p-0.5 rounded-full">
                  <button
                    onClick={() => setMapStyle('street')}
                    className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                      mapStyle === 'street'
                        ? 'bg-white shadow text-primary'
                        : 'text-neutral-600 hover:bg-white/50'
                    }`}
                  >
                    {t('search:map.street')}
                  </button>
                  <button
                    onClick={() => setMapStyle('satellite')}
                    className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                      mapStyle === 'satellite'
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
                {mapStyle === 'satellite' && (
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

                {/* Heat Map Toggle */}
                <button
                  onClick={() => setShowHeatMap(!showHeatMap)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    showHeatMap
                      ? 'bg-orange-500 text-white'
                      : 'text-neutral-600 hover:bg-neutral-200'
                  }`}
                  title="Heat Map"
                >
                  <span className="text-sm">🔥</span>
                  <span className="hidden sm:inline">Heat</span>
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
            <div className="absolute bottom-4 left-4 z-[1000]">
              <Legend isNightMode={mapStyle === 'dark'} />
            </div>

            {/* Sun Position Control */}
            {show3DBuildings && (
              <div className="absolute top-4 left-4 z-[1000]">
                <SunPositionControl
                  onDateTimeChange={handleShadowTimeChange}
                  onSeasonChange={handleSeasonChange}
                  isNightMode={mapStyle === 'dark'}
                  enabled={show3DBuildings}
                />
              </div>
            )}
          </>
        )}

        {/* Mobile Controls */}
        {isMobile && (
          <>
            {/* Mobile: Bottom-left - Layer toggles */}
            <div className="absolute bottom-24 left-2 right-2 z-[1000] flex justify-center pointer-events-none md:hidden">
              <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg backdrop-blur-md bg-white/85 transition-all duration-300 ease-out">
                {/* 3D Buildings Toggle */}
                <button
                  onClick={() => setShow3DBuildings(!show3DBuildings)}
                  className={`
                    p-2.5 rounded-xl transition-all duration-200 ease-out active:scale-95
                    ${show3DBuildings
                      ? 'bg-slate-700 text-white shadow-md'
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
                      ? 'bg-primary text-white shadow-md'
                      : 'text-neutral-500 hover:bg-neutral-100'
                    }
                  `}
                  title={t('search:map.landmarks', 'Landmarks')}
                >
                  <span className="text-lg">🏛️</span>
                </button>

                {/* Cadastre Toggle - only in satellite */}
                {mapStyle === 'satellite' && (
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
                <div className="w-px h-6 mx-0.5 bg-neutral-200" />

                {/* Legend Toggle */}
                <button
                  onClick={() => setIsLegendOpen((p) => !p)}
                  className={`
                    p-2.5 rounded-xl transition-all duration-200 ease-out active:scale-95
                    ${isLegendOpen
                      ? 'bg-neutral-200 text-neutral-700'
                      : 'text-neutral-500 hover:bg-neutral-100'
                    }
                  `}
                  title={t('search:map.mapLegend')}
                >
                  <MapLegendIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Legend popup */}
              {isLegendOpen && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-auto animate-slide-up">
                  <Legend isNightMode={mapStyle === 'dark'} />
                </div>
              )}
            </div>

            {/* Mobile: Top right controls */}
            <div className="absolute top-20 right-2 z-[999] md:hidden">
              <div className="flex flex-col gap-2 items-end">
                {/* Unified control bar */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg backdrop-blur-md bg-white/95">
                  {/* Map type toggle */}
                  <div className="flex items-center bg-neutral-100 rounded-xl p-0.5">
                    <button
                      onClick={() => setMapStyle('street')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                        mapStyle === 'street'
                          ? 'bg-white shadow-sm text-primary'
                          : 'text-neutral-500'
                      }`}
                    >
                      {t('search:map.street')}
                    </button>
                    <button
                      onClick={() => setMapStyle('satellite')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                        mapStyle === 'satellite'
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
                    isNightMode={mapStyle === 'dark'}
                    enabled={show3DBuildings}
                    compact={true}
                  />
                )}

                {/* Drawn bounds actions */}
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
