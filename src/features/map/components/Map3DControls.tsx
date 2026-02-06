// Map3DControls Component
// Extracted from Map3DBuildings.tsx
// Contains all control UI: 3D toggle, shadows, floor labels, timelapse panel,
// floor level indicator, and bottom action buttons

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { UseShadowTimelapseReturn } from '../hooks/useShadowTimelapse';
import { TIME_LIGHTING, PERIOD_ICONS } from './Map3DConstants';

export interface Map3DControlsProps {
  // State
  is3DMode: boolean;
  showShadows: boolean;
  showFloorLabels: boolean;
  showTimelapse: boolean;
  show360Tour: boolean;
  showFloorIndicator: boolean;
  isEnteringBuilding: boolean;
  enableShadowTimelapse: boolean;

  // Property info
  hasFloorInfo: boolean;
  floorNumber?: number;
  totalFloors?: number;
  virtualTour360Url?: string;

  // Handlers
  toggle3DMode: () => void;
  setShowShadows: (value: boolean) => void;
  setShowFloorLabels: (value: boolean) => void;
  setShowTimelapse: (value: boolean) => void;
  setShowFloorIndicator: (value: boolean) => void;
  flyToProperty: () => void;
  handleEnterBuilding: () => void;
  onNavigateToMap?: () => void;

  // Timelapse
  timelapse: UseShadowTimelapseReturn;
}

const Map3DControls: React.FC<Map3DControlsProps> = ({
  is3DMode,
  showShadows,
  showFloorLabels,
  showTimelapse,
  show360Tour,
  showFloorIndicator,
  isEnteringBuilding,
  enableShadowTimelapse,
  hasFloorInfo,
  floorNumber,
  totalFloors,
  virtualTour360Url,
  toggle3DMode,
  setShowShadows,
  setShowFloorLabels,
  setShowTimelapse,
  setShowFloorIndicator,
  flyToProperty,
  handleEnterBuilding,
  onNavigateToMap,
  timelapse,
}) => {
  const { t } = useTranslation(['property']);

  return (
    <>
      {/* Floor Level Indicator - for apartments */}
      {hasFloorInfo && showFloorIndicator && is3DMode && !show360Tour && (
        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20">
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden w-16 sm:w-20">
            {/* Header */}
            <div className="px-2 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-center">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {t('property:floorIndicator.title', 'Floor')}
              </span>
            </div>

            {/* Building visualization */}
            <div className="relative px-2 sm:px-3 py-3 sm:py-4">
              {/* Building outline */}
              <div className="relative mx-auto w-8 sm:w-10 rounded-t-sm overflow-hidden border-2 border-slate-600 bg-slate-800/80" style={{ height: '100px' }}>
                {/* Floor segments */}
                {Array.from({ length: totalFloors! }).map((_, i) => {
                  const floor = totalFloors! - i;
                  const isCurrentFloor = floor === floorNumber;
                  return (
                    <div
                      key={floor}
                      className={`absolute left-0 right-0 border-b border-slate-600/50 transition-all duration-500 ${
                        isCurrentFloor ? 'z-10' : ''
                      }`}
                      style={{
                        height: `${100 / totalFloors!}%`,
                        top: `${(i / totalFloors!) * 100}%`,
                        background: isCurrentFloor
                          ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9))'
                          : 'transparent',
                      }}
                    >
                      {isCurrentFloor && (
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-400/30 to-purple-400/30" />
                      )}
                    </div>
                  );
                })}

                {/* Floor number labels on the side */}
                {totalFloors! <= 10 && Array.from({ length: totalFloors! }).map((_, i) => {
                  const floor = totalFloors! - i;
                  const isCurrentFloor = floor === floorNumber;
                  return (
                    <div
                      key={`label-${floor}`}
                      className={`absolute -right-5 text-[9px] font-medium transition-all ${
                        isCurrentFloor ? 'text-blue-400 font-bold' : 'text-slate-500'
                      }`}
                      style={{
                        top: `${((i + 0.5) / totalFloors!) * 100}%`,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {floor}
                    </div>
                  );
                })}
              </div>

              {/* Ground indicator */}
              <div className="w-10 sm:w-14 h-1 mx-auto bg-slate-600 rounded-b" />
            </div>

            {/* Floor info */}
            <div className="px-1 sm:px-2 py-1.5 sm:py-2 border-t border-slate-700/50 text-center">
              <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {floorNumber}
              </div>
              <div className="text-[8px] sm:text-[10px] text-slate-400">
                {t('property:floorIndicator.ofFloors', 'of {{total}} floors', { total: totalFloors })}
              </div>
            </div>

            {/* Enter Building button - only show if 360 tour available */}
            {virtualTour360Url && (
              <button
                onClick={handleEnterBuilding}
                disabled={isEnteringBuilding}
                className="w-full py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-[10px] sm:text-xs font-bold transition-all border-t border-slate-700/50 flex items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-70"
              >
                {isEnteringBuilding ? (
                  <>
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Entering...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm sm:text-base">{'\u{1F6AA}'}</span>
                    <span>{t('property:floorIndicator.enterBuilding', 'Enter')}</span>
                  </>
                )}
              </button>
            )}

            {/* Toggle button */}
            <button
              onClick={() => setShowFloorIndicator(false)}
              className="w-full py-1.5 text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all border-t border-slate-700/50"
            >
              {t('property:floorIndicator.hide', 'Hide')}
            </button>
          </div>
        </div>
      )}

      {/* Collapsed floor indicator button */}
      {hasFloorInfo && !showFloorIndicator && is3DMode && !show360Tour && (
        <button
          onClick={() => setShowFloorIndicator(true)}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg shadow-lg border border-slate-700/50 transition-all"
        >
          <span className="text-sm sm:text-lg">{'\u{1F3E2}'}</span>
          <span className="text-xs sm:text-sm font-medium">{floorNumber}/{totalFloors}</span>
        </button>
      )}

      {/* 2D/3D Toggle, Floor Labels Toggle, and Shadow Toggle - top right, OneGeo style */}
      {!show360Tour && (
        <div className="absolute top-3 sm:top-4 right-2 sm:right-4 z-10 flex flex-col gap-2">
          <button
            onClick={toggle3DMode}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm shadow-lg transition-all ${
              is3DMode
                ? 'bg-slate-900/90 text-white border border-slate-600'
                : 'bg-white/90 text-slate-800'
            }`}
          >
            {is3DMode ? '2D' : '3D'}
          </button>
          <button
            onClick={() => setShowShadows(!showShadows)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-1 ${
              showShadows
                ? 'bg-amber-500 text-white border border-amber-400'
                : 'bg-slate-900/90 text-white border border-slate-600'
            }`}
            title={t('property:map3d.shadows', 'Show Building Shadows')}
          >
            <span className="text-sm">{'\u2600\uFE0F'}</span>
            <span className="hidden sm:inline text-xs">
              {showShadows ? t('property:map3d.shadowsOn', 'Shadows') : t('property:map3d.shadowsOff', 'Shadows')}
            </span>
          </button>
          <button
            onClick={() => setShowFloorLabels(!showFloorLabels)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-1 ${
              showFloorLabels
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-slate-900/90 text-white border border-slate-600'
            }`}
            title={t('property:map3d.floorLabels', 'Show Floor Levels')}
          >
            <span className="text-sm">{'\u{1F3E2}'}</span>
            <span className="hidden sm:inline text-xs">
              {showFloorLabels ? t('property:map3d.hideFloors', 'Hide') : t('property:map3d.showFloors', 'Floors')}
            </span>
          </button>
        </div>
      )}

      {/* Shadow Timelapse Panel - Right side, positioned below the control buttons */}
      {enableShadowTimelapse && !show360Tour && (
        <div className="absolute top-36 sm:top-40 right-2 sm:right-4 z-10 w-44 sm:w-52">
          {!showTimelapse ? (
            <button
              onClick={() => setShowTimelapse(true)}
              className="w-full flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-slate-900/90 text-white font-medium rounded-lg shadow-lg hover:bg-slate-800 transition-all border border-slate-700/50"
            >
              <span className="text-sm sm:text-base">{'\u2600\uFE0F'}</span>
              <span className="text-xs sm:text-sm">{t('property:shadowTimelapse.title', 'Sun & Shadows')}</span>
            </button>
          ) : (
            <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-slate-700/50">
              {/* Header with time */}
              <div
                className="p-3 transition-all duration-500"
                style={{
                  background: `linear-gradient(135deg, ${TIME_LIGHTING[timelapse.timePeriod].skyColor}cc, ${TIME_LIGHTING[timelapse.timePeriod].fogColor}99)`
                }}
              >
                <div className="flex items-center justify-between text-white">
                  <div>
                    <div className="text-2xl font-bold">{timelapse.formattedTime}</div>
                    <div className="text-sm opacity-90">
                      {PERIOD_ICONS[timelapse.timePeriod]} {t(`property:shadowTimelapse.periods.${timelapse.timePeriod}`, timelapse.timePeriod)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTimelapse(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="p-3 space-y-3">
                {/* Play/Pause and quick jumps */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={timelapse.goToSunrise}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-lg transition-all"
                    title="Sunrise"
                  >
                    {'\u{1F305}'}
                  </button>
                  <button
                    onClick={timelapse.toggle}
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all"
                  >
                    {timelapse.isPlaying ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={timelapse.goToSunset}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-lg transition-all"
                    title="Sunset"
                  >
                    {'\u{1F307}'}
                  </button>
                </div>

                {/* Progress bar */}
                <div
                  className="relative h-2 bg-slate-700 rounded-full cursor-pointer overflow-hidden"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = ((e.clientX - rect.left) / rect.width) * 100;
                    timelapse.seekToProgress(Math.max(0, Math.min(100, percent)));
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-100"
                    style={{ width: `${timelapse.progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"
                    style={{ left: `calc(${timelapse.progress}% - 6px)` }}
                  />
                </div>

                {/* Speed controls */}
                <div className="flex items-center justify-center gap-1">
                  {(['slow', 'normal', 'fast', 'ultra'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => timelapse.setSpeed(s)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                        timelapse.speed === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {s === 'slow' ? '0.5x' : s === 'normal' ? '1x' : s === 'fast' ? '2x' : '4x'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      {!show360Tour && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={flyToProperty}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm rounded-lg shadow-lg transition-all"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
            </svg>
            <span className="hidden sm:inline">{t('property:cinematicMap.controls.play', 'Fly to Property')}</span>
            <span className="sm:hidden">{t('property:cinematicMap.controls.flyShort', 'Fly')}</span>
          </button>
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900/90 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm rounded-lg shadow-lg transition-all border border-slate-700/50"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="hidden sm:inline">{t('property:cinematicMap.controls.exploreMap', 'Full Map')}</span>
              <span className="sm:hidden">{t('property:cinematicMap.controls.mapShort', 'Map')}</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default Map3DControls;
