// Map3DBuildings Component
// 3D map with extruded buildings using MapLibre GL JS
// OneGeo-inspired 3D visualization with proper building extrusion
//
// Decomposed into:
//   - Map3DConstants.ts   — types, constants, utility functions
//   - use3DMap.ts         — custom hook (state, refs, callbacks, effects)
//   - Map3DControls.tsx   — control panel UI
//   - Map3DTourViewer.tsx — 360 virtual tour overlay

import React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslation } from 'react-i18next';
import type { Map3DBuildingsProps } from './Map3DConstants';
import { TIME_LIGHTING } from './Map3DConstants';
import { use3DMap } from './use3DMap';
import Map3DControls from './Map3DControls';
import Map3DTourViewer from './Map3DTourViewer';

/**
 * Map3DBuildings Component - OneGeo-style 3D map
 */
const Map3DBuildings: React.FC<Map3DBuildingsProps> = (props) => {
  const {
    address,
    title,
    height = '500px',
    enableShadowTimelapse = true,
    onNavigateToMap,
    floorNumber,
    totalFloors,
    virtualTour360Url,
  } = props;

  const { t } = useTranslation(['property']);

  const {
    // Refs
    mapContainer,
    // State
    mapLoaded,
    showTimelapse,
    setShowTimelapse,
    is3DMode,
    showFloorIndicator,
    setShowFloorIndicator,
    showFloorLabels,
    setShowFloorLabels,
    showShadows,
    setShowShadows,
    show360Tour,
    isEnteringBuilding,
    // Computed
    hasFloorInfo,
    has360Tour,
    currentBearing,
    // Timelapse
    timelapse,
    showPOI,
    setShowPOI,
    // Handlers
    handleEnterBuilding,
    handleClose360Tour,
    toggle3DMode,
    flyToProperty,
  } = use3DMap(props);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-xl" style={{ height }}>
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Time-based lighting overlay */}
      {showTimelapse && (
        <>
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
              background: `linear-gradient(180deg,
                ${TIME_LIGHTING[timelapse.timePeriod].skyColor}40 0%,
                transparent 35%,
                transparent 65%,
                ${TIME_LIGHTING[timelapse.timePeriod].fogColor}30 100%
              )`,
            }}
          />
          {/* Sun indicator */}
          {TIME_LIGHTING[timelapse.timePeriod].sunAltitude > 0 && (
            <div
              className="absolute w-12 h-12 pointer-events-none transition-all duration-700"
              style={{
                left: `${50 + Math.cos((TIME_LIGHTING[timelapse.timePeriod].sunAzimuth - 90) * Math.PI / 180) * 35}%`,
                top: `${8 + (90 - TIME_LIGHTING[timelapse.timePeriod].sunAltitude) * 0.25}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: `radial-gradient(circle, #fff8e0 0%, ${TIME_LIGHTING[timelapse.timePeriod].skyColor}00 70%)`,
                  boxShadow: `0 0 40px 20px rgba(255,248,200,0.3)`,
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Property info card - top left */}
      {(title || address) && !show360Tour && (
        <div className="absolute top-3 sm:top-4 left-2 sm:left-4 z-10">
          <div className="bg-slate-900/90 backdrop-blur-sm px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg max-w-[160px] sm:max-w-[240px] border border-slate-700/50">
            {title && <p className="font-semibold text-white text-xs sm:text-sm truncate">{title}</p>}
            {address && <p className="text-[10px] sm:text-sm text-slate-300 truncate">{address}</p>}
          </div>
        </div>
      )}

      {/* Compass overlay - rotates with map bearing */}
      {mapLoaded && !show360Tour && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-4 z-20">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-900/85 backdrop-blur-sm border border-slate-600/50 shadow-lg flex items-center justify-center transition-transform"
            style={{ transform: `rotate(${-currentBearing}deg)` }}
          >
            {/* North indicator - red */}
            <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className="text-[9px] sm:text-[10px] font-bold text-red-400 leading-none">N</span>
              <div className="w-0.5 h-2 sm:h-2.5 bg-red-400 rounded-full mt-px" />
            </div>
            {/* South indicator */}
            <div className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-0.5 h-2 sm:h-2.5 bg-slate-400 rounded-full mb-px" />
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 leading-none">S</span>
            </div>
            {/* East indicator */}
            <div className="absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 flex items-center">
              <div className="w-2 sm:w-2.5 h-0.5 bg-slate-400 rounded-full mr-px" />
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 leading-none">E</span>
            </div>
            {/* West indicator */}
            <div className="absolute left-1 sm:left-1.5 top-1/2 -translate-y-1/2 flex items-center">
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 leading-none">W</span>
              <div className="w-2 sm:w-2.5 h-0.5 bg-slate-400 rounded-full ml-px" />
            </div>
            {/* Center dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
          </div>
        </div>
      )}

      {/* Controls: floor indicator, 3D toggle, shadows, floor labels, timelapse, bottom buttons */}
      <Map3DControls
        is3DMode={is3DMode}
        showShadows={showShadows}
        showFloorLabels={showFloorLabels}
        showTimelapse={showTimelapse}
        show360Tour={show360Tour}
        showFloorIndicator={showFloorIndicator}
        isEnteringBuilding={isEnteringBuilding}
        enableShadowTimelapse={enableShadowTimelapse}
        hasFloorInfo={hasFloorInfo}
        has360Tour={has360Tour}
        floorNumber={floorNumber}
        totalFloors={totalFloors}
        virtualTour360Url={virtualTour360Url}
        showPOI={showPOI}
        toggle3DMode={toggle3DMode}
        setShowShadows={setShowShadows}
        setShowFloorLabels={setShowFloorLabels}
        setShowTimelapse={setShowTimelapse}
        setShowFloorIndicator={setShowFloorIndicator}
        setShowPOI={setShowPOI}
        flyToProperty={flyToProperty}
        handleEnterBuilding={handleEnterBuilding}
        onNavigateToMap={onNavigateToMap}
        timelapse={timelapse}
      />

      {/* 360 Virtual Tour overlay and entering animation */}
      <Map3DTourViewer
        show360Tour={show360Tour}
        virtualTour360Url={virtualTour360Url}
        handleClose360Tour={handleClose360Tour}
        floorNumber={floorNumber}
        isEnteringBuilding={isEnteringBuilding}
      />

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading 3D Map...</p>
          </div>
        </div>
      )}

      {/* Marker pulse animation */}
      <style>{`
        @keyframes pulse3d {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes floorPulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(59,130,246,0.6); }
          50% { box-shadow: 0 2px 16px rgba(59,130,246,0.9), 0 0 20px rgba(139,92,246,0.5); }
        }
        @keyframes doorPulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 15px rgba(34,197,94,0.6);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 25px rgba(34,197,94,0.8);
            transform: scale(1.1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .apartment-door-marker {
          z-index: 100;
        }
      `}</style>
    </div>
  );
};

export default Map3DBuildings;
