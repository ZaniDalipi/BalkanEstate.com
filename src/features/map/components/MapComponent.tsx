import React, { useEffect, useRef, Component, ErrorInfo } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Import GoogleMapComponent directly for immediate display (not lazy loaded)
import GoogleMapComponent from './GoogleMapComponent';

import {
  FlyToController,
  MapEvents,
  ZoomBasedTileSwitch,
  MapDrawEvents,
} from '@/src/components/map/MapHelpers';
import { HighlightedPropertiesProvider } from '@/src/context/HighlightedPropertiesContext';
import { useMapComponent, USE_GOOGLE_MAPS, TILE_LAYERS, type MapComponentProps } from './useMapComponent';
import MapPropertyMarkers from './MapPropertyMarkers';
import MapFilterControls from './MapFilterControls';

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

// Bounding box for the Balkan region
const BALKAN_BOUNDS = L.latLngBounds(
  [34, 13], // Southwest corner (Southern Greece, Western Croatia)
  [49, 31] // Northeast corner (Northern Romania, Eastern Bulgaria)
);

/**
 * Error Boundary for Google Maps
 * Catches errors and provides retry or fallback options
 */
interface MapErrorBoundaryProps {
  children: React.ReactNode;
  onFallbackToLeaflet: () => void;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<MapErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error boundary caught map loading error
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1
    }));
  };

  handleFallback = () => {
    this.props.onFallbackToLeaflet();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center p-6 max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Loading Error</h3>
            <p className="text-gray-500 text-sm mb-4">
              {this.state.error?.message || 'Unable to load the map. This might be a temporary issue.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {this.state.retryCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                  Try Again ({3 - this.state.retryCount} left)
                </button>
              )}
              <button
                onClick={this.handleFallback}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Use Alternative Map
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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
const ZoomAdjuster: React.FC<{ mapType: keyof typeof TILE_LAYERS; currentZoom: number }> = ({ mapType, currentZoom }) => {
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
    } catch {
      // Silently handle bounds fitting error
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
const MapComponent: React.FC<MapComponentProps> = (props) => {
  const {
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
  } = props;

  const hook = useMapComponent(props);

  // Use Google Maps if API key is available and not forced to Leaflet
  if (USE_GOOGLE_MAPS && !hook.forceLeaflet) {
    // Show timeout message if loading took too long
    if (hook.loadingTimedOut) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center p-6 max-w-md">
            <div className="w-12 h-12 mx-auto mb-4 text-amber-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{hook.t('search:map.loadingTimeout', 'Map Taking Too Long')}</h3>
            <p className="text-gray-500 text-sm mb-4">
              {hook.t('search:map.loadingTimeoutDesc', 'The map is taking longer than expected. This might be due to a slow connection.')}
            </p>
            <button
              onClick={hook.handleFallbackToLeaflet}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              {hook.t('search:map.useAlternative', 'Use Alternative Map')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <MapErrorBoundary onFallbackToLeaflet={hook.handleFallbackToLeaflet}>
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
      </MapErrorBoundary>
    );
  }

  // Fallback to Leaflet-based map
  return (
    <HighlightedPropertiesProvider properties={hook.propertiesInView}>
      <div className={`w-full h-full relative overflow-hidden ${hook.show3DBuildings ? 'map-3d-perspective-container' : ''}`}>
        <MapContainer
          center={hook.center}
          zoom={hook.zoom}
          scrollWheelZoom={true}
          className={`w-full h-full ${hook.show3DBuildings ? 'map-3d-active' : 'map-3d-inactive'}`}
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
          <MapEvents onMove={hook.handleMapMoveWithCenter} mapBounds={mapBounds} searchMode={searchMode} />
          <ZoomTracker onZoomChange={hook.setCurrentZoom} />
          {/* <ZoomAdjuster mapType={hook.mapType} currentZoom={hook.currentZoom} /> */}
          <ZoomSnapAdjuster currentZoom={hook.currentZoom} />
          <FitBoundsHandler drawnBounds={drawnBounds} />
          <MapDrawEvents isDrawing={isDrawing} onDrawComplete={onDrawComplete} />
          <ZoomBasedTileSwitch mapType={hook.mapType} setMapType={hook.setMapType} />
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
            key={hook.mapType}
            attribution={TILE_LAYERS[hook.mapType].attribution}
            url={TILE_LAYERS[hook.mapType].url}
            maxZoom={TILE_LAYERS[hook.mapType].maxZoom}
            maxNativeZoom={TILE_LAYERS[hook.mapType].maxNativeZoom}
            // Preload LOTS of tiles - always keep map visible
            keepBuffer={12}
            updateWhenIdle={false}
            updateWhenZooming={true}
            updateInterval={150}
            className="map-tiles"
          />
          <MapPropertyMarkers
            propertiesInView={hook.propertiesInView}
            onPopupClick={hook.handlePopupClick}
            hoveredPropertyId={hoveredPropertyId}
            showHeatMap={hook.showHeatMap}
            show3DBuildings={hook.show3DBuildings}
            shadowDateTime={hook.shadowDateTime}
            showLandmarks={hook.showLandmarks}
            showCadastre={hook.showCadastre}
            mapType={hook.mapType}
            selectedClimateRisk={hook.selectedClimateRisk}
            showMeasurement={hook.showMeasurement}
            onMeasurementClose={() => hook.setShowMeasurement(false)}
          />
        </MapContainer>

        <MapFilterControls
          isMobile={isMobile}
          hideControls={hideControls}
          mapType={hook.mapType}
          setMapType={hook.setMapType}
          isLegendOpen={hook.isLegendOpen}
          setIsLegendOpen={hook.setIsLegendOpen}
          showCadastre={hook.showCadastre}
          setShowCadastre={hook.setShowCadastre}
          showLandmarks={hook.showLandmarks}
          setShowLandmarks={hook.setShowLandmarks}
          show3DBuildings={hook.show3DBuildings}
          setShow3DBuildings={hook.setShow3DBuildings}
          showMeasurement={hook.showMeasurement}
          setShowMeasurement={hook.setShowMeasurement}
          isLayerMenuOpen={hook.isLayerMenuOpen}
          setIsLayerMenuOpen={hook.setIsLayerMenuOpen}
          isMapOptionsOpen={hook.isMapOptionsOpen}
          setIsMapOptionsOpen={hook.setIsMapOptionsOpen}
          selectedMapOption={hook.selectedMapOption}
          selectedClimateRisk={hook.selectedClimateRisk}
          handleMapOptionChange={hook.handleMapOptionChange}
          handleClimateRiskChange={hook.handleClimateRiskChange}
          isDrawing={isDrawing}
          onDrawStart={onDrawStart}
          drawnBounds={drawnBounds}
          onDrawComplete={onDrawComplete}
          isAuthenticated={isAuthenticated}
          onSaveSearch={onSaveSearch}
          isSaving={isSaving}
          onRecenter={onRecenter}
          currentZoom={hook.currentZoom}
          mapCenterLat={hook.mapCenterLat}
          mapCenterLng={hook.mapCenterLng}
          shadowDateTime={hook.shadowDateTime}
          handleShadowTimeChange={hook.handleShadowTimeChange}
          handleSeasonChange={hook.handleSeasonChange}
          selectedSeason={hook.selectedSeason}
          isManualTimeControl={hook.isManualTimeControl}
        />
      </div>
    </HighlightedPropertiesProvider>
  );
};

export default MapComponent;
