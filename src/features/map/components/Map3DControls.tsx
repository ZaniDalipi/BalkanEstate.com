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
  has360Tour: boolean;
  floorNumber?: number;
  totalFloors?: number;
  virtualTour360Url?: string;
  propertyType?: string;

  // POI
  showPOI?: boolean;

  // Handlers
  toggle3DMode: () => void;
  setShowShadows: (value: boolean) => void;
  setShowFloorLabels: (value: boolean) => void;
  setShowTimelapse: (value: boolean) => void;
  setShowFloorIndicator: (value: boolean) => void;
  setShowPOI?: (value: boolean) => void;
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
  has360Tour,
  floorNumber,
  totalFloors,
  virtualTour360Url,
  propertyType,
  showPOI,
  toggle3DMode,
  setShowShadows,
  setShowFloorLabels,
  setShowTimelapse,
  setShowFloorIndicator,
  setShowPOI,
  flyToProperty,
  handleEnterBuilding,
  onNavigateToMap,
  timelapse,
}) => {
  const { t } = useTranslation(['property']);

  return (
    <>
      {/* Floor Level Panel - left side of map */}
      {hasFloorInfo && showFloorIndicator && !show360Tour && (
        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20">
          <div className="flex flex-col items-center gap-2 bg-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 px-3 sm:px-4 py-3 sm:py-4"
               style={{ minWidth: '72px' }}>

            {/* FLOOR badge */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
              {t('property:floorIndicator.title', 'Floor')}
            </div>

            {/* Mini building visualization - split floor slabs */}
            <div className="relative w-10 sm:w-12 flex flex-col-reverse"
                 style={{ height: `clamp(100px, 20vh, 200px)`, gap: '2px' }}>
              {Array.from({ length: totalFloors! }).map((_, i) => {
                const floor = i + 1;
                const isHighlighted = floor === floorNumber;

                return (
                  <div
                    key={floor}
                    className="rounded-[2px]"
                    style={{
                      flex: 1,
                      background: isHighlighted
                        ? 'linear-gradient(90deg, #22c55e, #10b981)'
                        : floor % 2 === 0 ? '#374151' : '#4b5563',
                      boxShadow: isHighlighted
                        ? '0 0 8px rgba(34, 197, 94, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}
                  />
                );
              })}
            </div>
            {/* Ground line */}
            <div className="w-12 sm:w-14 h-1 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded-sm -mt-1" />

            {/* Floor number */}
            <div className="flex flex-col items-center -mt-1">
              <span className="text-xl sm:text-2xl font-black text-white leading-none">{floorNumber}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5">
                {t('property:floorIndicator.ofFloors', 'of {{total}} floors', { total: totalFloors })}
              </span>
            </div>

            {/* Enter button (360 tour) */}
            {virtualTour360Url && (
              <button
                onClick={handleEnterBuilding}
                disabled={isEnteringBuilding}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-[10px] sm:text-xs font-bold rounded-lg shadow-md transition-all disabled:opacity-70"
              >
                {isEnteringBuilding ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12h18m-6-6l6 6-6 6" />
                    </svg>
                    <span>{t('property:floorIndicator.enter', 'Enter')}</span>
                  </>
                )}
              </button>
            )}

            {/* Hide link */}
            <button
              onClick={() => setShowFloorIndicator(false)}
              className="text-[9px] sm:text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-medium"
            >
              {t('property:floorIndicator.hide', 'Hide')}
            </button>
          </div>
        </div>
      )}

      {/* Collapsed floor indicator - "Floors" button */}
      {hasFloorInfo && !showFloorIndicator && !show360Tour && (
        <button
          onClick={() => setShowFloorIndicator(true)}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-3 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-600/50 transition-all group"
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-4 h-6 rounded-t-sm border border-slate-500/60 bg-slate-700/50 relative overflow-hidden">
              {totalFloors && floorNumber && (
                <div
                  className="absolute left-0 right-0 bg-emerald-500/80"
                  style={{
                    height: `${100 / totalFloors}%`,
                    bottom: `${((floorNumber - 1) / totalFloors) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="w-5 h-0.5 bg-slate-500 rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs font-bold leading-tight">{t('property:floorIndicator.title', 'Floors')}</span>
            <span className="text-[9px] sm:text-[10px] text-emerald-400 font-semibold leading-tight">{floorNumber}/{totalFloors}</span>
          </div>
        </button>
      )}

      {/* 360 Tour button for non-apartment types (villas, houses, land) */}
      {!hasFloorInfo && has360Tour && !show360Tour && (
        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20">
          <button
            onClick={handleEnterBuilding}
            disabled={isEnteringBuilding}
            className="flex flex-col items-center gap-1.5 px-3 sm:px-4 py-3 sm:py-4 bg-slate-900/95 backdrop-blur-sm hover:bg-slate-800 rounded-xl shadow-2xl border border-slate-700/50 transition-all group"
          >
            {isEnteringBuilding ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] sm:text-xs text-white font-medium">
                  {t('property:virtualTour.entering', 'Entering...')}
                </span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 rounded-full border-2 border-white shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs text-white font-bold">360° Tour</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 2D/3D Toggle, Floor Labels Toggle, Shadow Toggle, Nearby, Floors overlay, and Timelapse - top right */}
      {!show360Tour && (
        <div className="absolute top-[4.25rem] sm:top-[5.25rem] right-1.5 sm:right-4 z-10 flex flex-col items-end gap-1 sm:gap-2 max-h-[calc(100%-120px)] max-w-[calc(100%-1rem)] sm:max-w-none overflow-y-auto">
          <button
            onClick={toggle3DMode}
            className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg font-bold text-[10px] sm:text-sm shadow-lg transition-all flex items-center justify-center ${
              is3DMode
                ? 'bg-slate-900/90 text-white border border-slate-600'
                : 'bg-white/90 text-slate-800'
            }`}
          >
            {is3DMode ? '2D' : '3D'}
          </button>

          {/* Floors overlay toggle - shows the property floor indicator */}
          {hasFloorInfo && (
            <button
              onClick={() => setShowFloorIndicator(!showFloorIndicator)}
              className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg font-bold text-[10px] sm:text-sm shadow-lg transition-all flex items-center justify-center gap-1 ${
                showFloorIndicator
                  ? 'bg-emerald-600 text-white border border-emerald-500'
                  : 'bg-slate-900/90 text-white border border-slate-600'
              }`}
              title={t('property:floorIndicator.title', 'Floors')}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="hidden sm:inline text-xs">
                {t('property:floorIndicator.title', 'Floors')}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowShadows(!showShadows)}
            className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg font-bold text-[10px] sm:text-sm shadow-lg transition-all flex items-center justify-center gap-1 ${
              showShadows
                ? 'bg-amber-500 text-white border border-amber-400'
                : 'bg-slate-900/90 text-white border border-slate-600'
            }`}
            title={t('property:map3d.shadows', 'Show Building Shadows')}
          >
            <span className="text-xs sm:text-sm">{'\u2600\uFE0F'}</span>
            <span className="hidden sm:inline text-xs">
              {showShadows ? t('property:map3d.shadowsOn', 'Shadows') : t('property:map3d.shadowsOff', 'Shadows')}
            </span>
          </button>
          <button
            onClick={() => setShowFloorLabels(!showFloorLabels)}
            className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg font-bold text-[10px] sm:text-sm shadow-lg transition-all flex items-center justify-center gap-1 ${
              showFloorLabels
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-slate-900/90 text-white border border-slate-600'
            }`}
            title={t('property:map3d.floorLabels', 'Show Floor Levels')}
          >
            <span className="text-xs sm:text-sm">{'\u{1F3E2}'}</span>
            <span className="hidden sm:inline text-xs">
              {showFloorLabels ? t('property:map3d.hideFloors', 'Hide') : t('property:map3d.showFloors', 'Labels')}
            </span>
          </button>
          {setShowPOI && (
            <button
              onClick={() => setShowPOI(!showPOI)}
              className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg font-bold text-[10px] sm:text-sm shadow-lg transition-all flex items-center justify-center gap-1 ${
                showPOI
                  ? 'bg-green-600 text-white border border-green-500'
                  : 'bg-slate-900/90 text-white border border-slate-600'
              }`}
              title={t('property:map3d.nearbyPlaces', 'Nearby Places')}
            >
              <span className="text-xs sm:text-sm">{'\u{1F4CD}'}</span>
              <span className="hidden sm:inline text-xs">
                {t('property:map3d.nearbyPOI', 'Nearby')}
              </span>
            </button>
          )}

          {/* Shadow Timelapse - inline below control buttons to avoid overlap */}
          {enableShadowTimelapse && (
            <div className={showTimelapse ? 'w-36 sm:w-52 max-w-[calc(100vw-4rem)]' : 'w-8 sm:w-auto'}>
              {!showTimelapse ? (
                <button
                  onClick={() => setShowTimelapse(true)}
                  className="w-full flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 sm:px-4 py-2 sm:py-3 bg-slate-900/90 text-white font-medium rounded-lg shadow-lg hover:bg-slate-800 transition-all border border-slate-700/50"
                >
                  <span className="text-xs sm:text-base">{'\u2600\uFE0F'}</span>
                  <span className="hidden sm:inline text-sm">{t('property:shadowTimelapse.title', 'Sun & Shadows')}</span>
                </button>
              ) : (
                <div className="w-36 sm:w-52 max-w-[calc(100vw-4rem)] bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-slate-700/50">
                  {/* Header with time */}
                  <div
                    className="p-2 sm:p-3 transition-all duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${TIME_LIGHTING[timelapse.timePeriod].skyColor}cc, ${TIME_LIGHTING[timelapse.timePeriod].fogColor}99)`
                    }}
                  >
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-lg sm:text-2xl font-bold">{timelapse.formattedTime}</div>
                        <div className="text-[10px] sm:text-sm opacity-90">
                          {PERIOD_ICONS[timelapse.timePeriod]} {t(`property:shadowTimelapse.periods.${timelapse.timePeriod}`, timelapse.timePeriod)}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowTimelapse(false)}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 transition-all"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                    {/* Play/Pause and quick jumps */}
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <button
                        onClick={timelapse.goToSunrise}
                        className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm sm:text-lg transition-all"
                        title="Sunrise"
                      >
                        {'\u{1F305}'}
                      </button>
                      <button
                        onClick={timelapse.toggle}
                        className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all"
                      >
                        {timelapse.isPlaying ? (
                          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 sm:w-6 sm:h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={timelapse.goToSunset}
                        className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm sm:text-lg transition-all"
                        title="Sunset"
                      >
                        {'\u{1F307}'}
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="relative h-1.5 sm:h-2 bg-slate-700 rounded-full cursor-pointer overflow-hidden"
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
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      {(['slow', 'normal', 'fast', 'ultra'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => timelapse.setSpeed(s)}
                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded transition-all ${
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
