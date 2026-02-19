/**
 * GoogleMapComponent - Thin wrapper that composes extracted sub-components
 *
 * This file orchestrates:
 * - useGoogleMap hook (all state, refs, effects, handlers)
 * - GoogleMapPropertyPopup (marker click popup)
 * - GoogleMapControls (desktop + mobile map controls, legend, layer toggles)
 * - GoogleMapMeasurement (measurement tool panel + save modal)
 * - googleMapConstants (types, colors, styles)
 *
 * The core map rendering (GoogleMap, markers via AdvancedMarkerElement,
 * drawing rectangles, measurement shapes) lives here as it ties everything together.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  GoogleMap,
  OverlayView,
  OverlayViewF,
  Rectangle,
  Polyline,
  Polygon,
} from '@react-google-maps/api';
import { HighlightedPropertiesProvider } from '@/src/context/HighlightedPropertiesContext';

// Extracted hook, sub-components, and constants
import { useGoogleMap, type GoogleMapComponentProps } from './useGoogleMap';
import GoogleMapPropertyPopup from './GoogleMapPropertyPopup';
import GoogleMapControls from './GoogleMapControls';
import GoogleMapMeasurement from './GoogleMapMeasurement';
import { mapContainerStyle } from './googleMapConstants';

/**
 * Main GoogleMapComponent - composes hook + sub-components
 */
const GoogleMapComponent: React.FC<GoogleMapComponentProps> = (props) => {
  const {
    onSaveSearch,
    isSaving,
    isAuthenticated,
    drawnBounds,
    onDrawComplete,
    isDrawing,
    onDrawStart,
    isMobile,
    onResetView,
    hideControls = false,
  } = props;

  const { t } = useTranslation(['search', 'common']);

  // All state, refs, effects, and handlers from the custom hook
  const hook = useGoogleMap(props);

  // Loading states - early returns MUST come after all hooks
  if (hook.loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-4">
          <p className="text-red-500 font-semibold">{t('common:errors.errorLoadingGoogleMaps')}</p>
          <p className="text-gray-500 text-sm mt-2">{t('common:errors.checkApiKeyConfiguration')}</p>
        </div>
      </div>
    );
  }

  if (!hook.isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-3">{t('search:map.loading', 'Loading map...')}</p>
        </div>
      </div>
    );
  }

  return (
    <HighlightedPropertiesProvider properties={hook.validProperties}>
      <div className="w-full h-full relative overflow-hidden">
        {/* Core Google Map */}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={hook.initialCenter}
          zoom={hook.initialZoom}
          onLoad={hook.onLoad}
          onUnmount={hook.onUnmount}
          onIdle={hook.onIdle}
          options={hook.mapOptions}
        >
          {/* Property popup overlay */}
          {hook.selectedProperty && (
            <OverlayViewF
              position={{ lat: hook.selectedProperty.lat, lng: hook.selectedProperty.lng }}
              mapPaneName={OverlayView.FLOAT_PANE}
            >
              <div style={{ transform: 'translate(-50%, -110%)' }}>
                <GoogleMapPropertyPopup
                  property={hook.selectedProperty}
                  onClose={() => hook.setSelectedProperty(null)}
                  onViewDetails={() => hook.handleViewDetails(hook.selectedProperty!.id)}
                />
              </div>
            </OverlayViewF>
          )}

          {/* Drawn bounds rectangle (saved area) */}
          {hook.googleDrawnBounds && !isDrawing && (
            <Rectangle
              bounds={hook.googleDrawnBounds}
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

          {/* Temporary drawing rectangle (while user is drawing) */}
          {hook.drawingRect && isDrawing && (
            <Rectangle
              bounds={hook.drawingRect}
              options={{
                strokeColor: '#0252CD',
                strokeOpacity: 1,
                strokeWeight: 2,
                strokeDashArray: [5, 5],
                fillColor: '#0252CD',
                fillOpacity: 0.1,
                clickable: false,
              }}
            />
          )}

          {/* Measurement visualization (polygon or polyline) */}
          {hook.showMeasurement && hook.measurementPoints.length >= 2 && (
            <>
              {hook.measurementMode === 'area' && hook.measurementPoints.length >= 3 ? (
                <Polygon
                  paths={hook.measurementPoints}
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
                  path={hook.measurementPoints}
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

        {/* Debug info overlay */}
        <div className="absolute top-4 left-4 z-[1001] bg-black/80 text-white text-[10px] font-mono px-2 py-1 rounded-md backdrop-blur-sm shadow-md">
          <span>🔍{hook.zoom.toFixed(1)}/21 📍{hook.center.lat.toFixed(3)},{hook.center.lng.toFixed(3)} 📌{hook.validProperties.length}</span>
        </div>

        {/* Measurement Tool Panel + Save Modal */}
        <GoogleMapMeasurement
          showMeasurement={hook.showMeasurement}
          setShowMeasurement={hook.setShowMeasurement}
          measurementMode={hook.measurementMode}
          setMeasurementMode={hook.setMeasurementMode}
          measurementPoints={hook.measurementPoints}
          setMeasurementPoints={hook.setMeasurementPoints}
          measurementDistance={hook.measurementDistance}
          measurementArea={hook.measurementArea}
          measurementPerimeter={hook.measurementPerimeter}
          handleOpenSaveModal={hook.handleOpenSaveModal}
          handleQuickSave={hook.handleQuickSave}
          handleSaveMeasurementToBackend={hook.handleSaveMeasurementToBackend}
          isAuthenticated={isAuthenticated}
          showSaveModal={hook.showSaveModal}
          setShowSaveModal={hook.setShowSaveModal}
          pendingMeasurement={hook.pendingMeasurement}
          setPendingMeasurement={hook.setPendingMeasurement}
          savingMeasurement={hook.savingMeasurement}
          measurementName={hook.measurementName}
          setMeasurementName={hook.setMeasurementName}
          measurementAddress={hook.measurementAddress}
          setMeasurementAddress={hook.setMeasurementAddress}
          measurementNotes={hook.measurementNotes}
          setMeasurementNotes={hook.setMeasurementNotes}
          measurementSaveError={hook.measurementSaveError}
          setMeasurementSaveError={hook.setMeasurementSaveError}
          measurementCount={hook.measurementCount}
          measurementMaxAllowed={hook.measurementMaxAllowed}
          measurementIsPro={hook.measurementIsPro}
          isAtMeasurementLimit={hook.isAtMeasurementLimit}
        />

        {/* Map Controls (desktop + mobile, legend, layers, climate, drawing actions) */}
        <GoogleMapControls
          isMobile={isMobile}
          hideControls={hideControls}
          handleRecenter={hook.handleRecenter}
          handleResetView={onResetView}
          mapStyle={hook.mapStyle}
          setMapStyle={hook.setMapStyle}
          isDrawing={isDrawing}
          onDrawStart={onDrawStart}
          drawnBounds={drawnBounds}
          onDrawComplete={onDrawComplete}
          onSaveSearch={onSaveSearch}
          isSaving={isSaving}
          isAuthenticated={isAuthenticated}
          selectedClimateRisk={hook.selectedClimateRisk}
          setSelectedClimateRisk={hook.setSelectedClimateRisk}
          isClimateMenuOpen={hook.isClimateMenuOpen}
          setIsClimateMenuOpen={hook.setIsClimateMenuOpen}
          showOnlyPromoted={hook.showOnlyPromoted}
          setShowOnlyPromoted={hook.setShowOnlyPromoted}
          promotedCount={hook.promotedCount}
          show3DBuildings={hook.show3DBuildings}
          setShow3DBuildings={hook.setShow3DBuildings}
          showLandmarks={hook.showLandmarks}
          setShowLandmarks={hook.setShowLandmarks}
          showMeasurement={hook.showMeasurement}
          setShowMeasurement={hook.setShowMeasurement}
          showCadastre={hook.showCadastre}
          setShowCadastre={hook.setShowCadastre}
          isLegendOpen={hook.isLegendOpen}
          setIsLegendOpen={hook.setIsLegendOpen}
          isLayerMenuOpen={hook.isLayerMenuOpen}
          setIsLayerMenuOpen={hook.setIsLayerMenuOpen}
        />
      </div>
    </HighlightedPropertiesProvider>
  );
};

export default GoogleMapComponent;
