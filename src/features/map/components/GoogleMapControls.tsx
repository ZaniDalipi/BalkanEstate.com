/**
 * GoogleMapControls - picks the desktop or phone map controls and shows the
 * legends. The controls themselves live in `desktop-controls/`,
 * `layer-dock/` and `mobile-controls/`.
 */

import React from 'react';
import L from 'leaflet';
import { type MapStyleType, type ClimateRiskType } from './googleMapConstants';
import { Legend, ClimateRiskLegend } from './GoogleMapLegend';
import DesktopMapControls from './desktop-controls/DesktopMapControls';
import MobileMapControls from './mobile-controls/MobileMapControls';

export interface GoogleMapControlsProps {
  isMobile: boolean;
  hideControls: boolean;

  // Recenter
  handleRecenter: () => void;
  handleResetView?: () => void;

  // Map style
  mapStyle: MapStyleType;
  setMapStyle: (style: MapStyleType) => void;

  // Drawing
  isDrawing: boolean;
  onDrawStart: () => void;
  drawnBounds: L.LatLngBounds | null;
  onDrawComplete: (bounds: L.LatLngBounds | null) => void;
  onSaveSearch: () => void;
  isSaving: boolean;
  isAuthenticated: boolean;

  // Climate
  selectedClimateRisk: ClimateRiskType;
  setSelectedClimateRisk: (risk: ClimateRiskType) => void;
  isClimateMenuOpen: boolean;
  setIsClimateMenuOpen: (open: boolean) => void;

  // Promoted
  showOnlyPromoted: boolean;
  setShowOnlyPromoted: (show: boolean) => void;
  promotedCount: number;

  // 3D Buildings
  show3DBuildings: boolean;
  setShow3DBuildings: (show: boolean) => void;

  // Landmarks
  showLandmarks: boolean;
  setShowLandmarks: (show: boolean) => void;

  // Measurement
  showMeasurement: boolean;
  setShowMeasurement: (show: boolean) => void;

  // Terrain (slope) tool
  showTerrain: boolean;
  setShowTerrain: (show: boolean) => void;

  // Cadastre
  showCadastre: boolean;
  setShowCadastre: (show: boolean) => void;

  // Legend
  isLegendOpen: boolean;
  setIsLegendOpen: (open: boolean) => void;

  // Layer menu (mobile)
  isLayerMenuOpen: boolean;
  setIsLayerMenuOpen: (open: boolean) => void;
}

const GoogleMapControls: React.FC<GoogleMapControlsProps> = (props) => {
  const { isMobile, hideControls, selectedClimateRisk, isLegendOpen, drawnBounds, onDrawComplete } = props;

  return (
    <>
      {/* Climate Risk Legend. Moves below the search dock when there is one (`--map-dock-h`). */}
      {selectedClimateRisk !== 'none' && (
        <div className="absolute top-[calc(var(--map-dock-h,0px)+3.5rem)] left-4 z-[1000] transition-[top] duration-300 motion-reduce:transition-none">
          <ClimateRiskLegend riskType={selectedClimateRisk} />
        </div>
      )}

      {!isMobile && !hideControls && (
        <DesktopMapControls
          {...props}
          hasDrawnArea={drawnBounds !== null}
          clearDrawnArea={() => onDrawComplete(null)}
        />
      )}

      {isLegendOpen && !isMobile && (
        <div className="absolute bottom-20 left-4 z-[1000] animate-fade-in">
          <Legend />
        </div>
      )}

      {isMobile && !hideControls && <MobileMapControls {...props} />}
    </>
  );
};

export default GoogleMapControls;
