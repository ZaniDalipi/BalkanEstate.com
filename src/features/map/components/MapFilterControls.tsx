import React from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import {
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
} from '@/constants';
import SunPositionControl from './SunPositionControl';
import SunArcAnimation, { type Season } from './SunArcAnimation';
import MapOptionsPanel, { MapOptionType, ClimateRiskType } from './MapOptionsPanel';
import { ClimateRiskLegend } from './ClimateRiskLayer';
import { Legend } from '@/src/components/map/MapPropertyMarker';
import { TILE_LAYERS, type TileLayerType } from './useMapComponent';

interface MapFilterControlsProps {
  isMobile: boolean;
  hideControls: boolean;

  // Map state
  mapType: TileLayerType;
  setMapType: React.Dispatch<React.SetStateAction<TileLayerType>>;
  isLegendOpen: boolean;
  setIsLegendOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showCadastre: boolean;
  setShowCadastre: React.Dispatch<React.SetStateAction<boolean>>;
  showLandmarks: boolean;
  setShowLandmarks: React.Dispatch<React.SetStateAction<boolean>>;
  show3DBuildings: boolean;
  setShow3DBuildings: React.Dispatch<React.SetStateAction<boolean>>;
  showMeasurement: boolean;
  setShowMeasurement: React.Dispatch<React.SetStateAction<boolean>>;
  isLayerMenuOpen: boolean;
  setIsLayerMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Map options
  isMapOptionsOpen: boolean;
  setIsMapOptionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMapOption: MapOptionType;
  selectedClimateRisk: ClimateRiskType;
  handleMapOptionChange: (option: MapOptionType) => void;
  handleClimateRiskChange: (risk: ClimateRiskType) => void;

  // Drawing
  isDrawing: boolean;
  onDrawStart: () => void;
  drawnBounds: L.LatLngBounds | null;
  onDrawComplete: (bounds: L.LatLngBounds | null) => void;

  // Auth & save
  isAuthenticated: boolean;
  onSaveSearch: () => void;
  isSaving: boolean;
  onRecenter: () => void;
  onResetView?: () => void;

  // Display info
  currentZoom: number;
  mapCenterLat: number;
  mapCenterLng: number;

  // 3D/Sun
  shadowDateTime: Date;
  handleShadowTimeChange: (dateTime: Date) => void;
  handleSeasonChange: (season: Season) => void;
  selectedSeason: Season;
  isManualTimeControl: boolean;
}

const MapFilterControls: React.FC<MapFilterControlsProps> = ({
  isMobile,
  hideControls,
  mapType,
  setMapType,
  isLegendOpen,
  setIsLegendOpen,
  showCadastre,
  setShowCadastre,
  showLandmarks,
  setShowLandmarks,
  show3DBuildings,
  setShow3DBuildings,
  showMeasurement,
  setShowMeasurement,
  isLayerMenuOpen,
  setIsLayerMenuOpen,
  isMapOptionsOpen,
  setIsMapOptionsOpen,
  selectedMapOption,
  selectedClimateRisk,
  handleMapOptionChange,
  handleClimateRiskChange,
  isDrawing,
  onDrawStart,
  drawnBounds,
  onDrawComplete,
  isAuthenticated,
  onSaveSearch,
  isSaving,
  onRecenter,
  onResetView,
  currentZoom,
  mapCenterLat,
  mapCenterLng,
  shadowDateTime,
  handleShadowTimeChange,
  handleSeasonChange,
  selectedSeason,
  isManualTimeControl,
}) => {
  const { t } = useTranslation(['search']);

  return (
    <>
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

      {/* Climate Risk Legend - TOP LEFT, under zoom display (both mobile and desktop) */}
      {selectedClimateRisk !== 'none' && !isMapOptionsOpen && (
        <div className={`absolute ${show3DBuildings ? 'top-14 right-4' : 'top-14 left-4'} z-[1000]`}>
          <ClimateRiskLegend riskType={selectedClimateRisk} />
        </div>
      )}

      {/* Desktop Controls - positioned above the newsletter bar */}
      {!isMobile && !hideControls && (
        <>
          <div className="absolute bottom-24 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
            {/* Main control bar - compact with glass effect */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-1 xl:p-1.5 rounded-full shadow-xl shadow-black/10 flex items-center gap-1 xl:gap-1.5 transition-all duration-300">
              <button
                onClick={onRecenter}
                className="p-1 xl:p-1.5 rounded-full transition-colors hover:bg-black/10"
                aria-label={t('search:map.centerOnLocation')}
              >
                <CrosshairsIcon className="w-4 h-4 xl:w-5 xl:h-5 text-neutral-700" />
              </button>
              <div className="flex items-center bg-neutral-200/50 p-0.5 rounded-full" role="radiogroup" aria-label="Map style">
                <button
                  onClick={() => { setMapType('positron'); if (drawnBounds) onDrawComplete(null); }}
                  className={`px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-semibold transition-all ${
                    mapType === 'positron'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  aria-label="Clean map style - minimal, properties stand out"
                  aria-pressed={mapType === 'positron'}
                >
                  {t('search:map.clean', 'Clean')}
                </button>
                <button
                  onClick={() => setMapType('voyager')}
                  className={`px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-semibold transition-all ${
                    mapType === 'voyager'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  aria-label="Color map style - shows neighborhoods, parks, amenities"
                  aria-pressed={mapType === 'voyager'}
                >
                  {t('search:map.color', 'Color')}
                </button>
                <button
                  onClick={() => setMapType('street')}
                  className={`px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-semibold transition-all ${
                    mapType === 'street'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  aria-label="Street map style"
                  aria-pressed={mapType === 'street'}
                >
                  {t('search:map.street')}
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-semibold transition-all ${
                    mapType === 'satellite'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                  aria-label="Satellite aerial imagery"
                  aria-pressed={mapType === 'satellite'}
                >
                  {t('search:map.satellite')}
                </button>
              </div>
              <button
                onClick={onDrawStart}
                className={`flex items-center gap-1 xl:gap-1.5 px-2 py-1 xl:px-3 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full shadow-md transition-colors ${
                  isDrawing
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-neutral-800 text-white hover:bg-neutral-900'
                }`}
                aria-label={isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}
                aria-pressed={isDrawing}
              >
                {isDrawing ? <XCircleIcon className="w-3.5 h-3.5 xl:w-4 xl:h-4" /> : <PencilIcon className="w-3.5 h-3.5 xl:w-4 xl:h-4" />}
                <span className="hidden xl:inline">{isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}</span>
                <span className="xl:hidden">{isDrawing ? '✕' : '✎'}</span>
              </button>
            </div>

            {/* Layer toggles - compact row with glass effect */}
            <div className="relative">
              {/* Climate dropdown - rendered outside overflow container */}
              {isMapOptionsOpen && (
                <div className="absolute bottom-full left-0 mb-2 z-[1010]">
                  <MapOptionsPanel
                    selectedMapOption={selectedMapOption}
                    selectedClimateRisk={selectedClimateRisk}
                    onMapOptionChange={handleMapOptionChange}
                    onClimateRiskChange={handleClimateRiskChange}
                    isOpen={isMapOptionsOpen}
                    onClose={() => setIsMapOptionsOpen(false)}
                    showMapOptions={false}
                    isMobile={false}
                  />
                </div>
              )}
              <div className="flex items-center gap-1 xl:gap-1.5 bg-white/80 backdrop-blur-xl border border-white/50 p-1 xl:p-1.5 rounded-full shadow-xl shadow-black/10 max-w-[calc(100%-2rem)] overflow-x-auto scrollbar-hide">
                {/* Climate Risks Button */}
                <button
                  onClick={() => setIsMapOptionsOpen(!isMapOptionsOpen)}
                  className={`flex items-center gap-1 xl:gap-1.5 px-2 py-1 xl:px-3 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all flex-shrink-0 ${
                    isMapOptionsOpen || selectedClimateRisk !== 'none'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                  }`}
                  aria-label={t('search:map.climateRisks.title', 'Climate Risks')}
                  aria-haspopup="menu"
                  aria-expanded={isMapOptionsOpen}
                >
                  <span className="text-xs xl:text-sm">🌡️</span>
                  <span className="hidden xl:inline">{t('search:map.climateRisks.title', 'Climate Risks')}</span>
                  <svg
                    className={`w-3 h-3 xl:w-3.5 xl:h-3.5 transition-transform ${isMapOptionsOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Separator */}
                <div className="w-px h-5 bg-gray-300/50" />

              {/* 3D Buildings Toggle */}
              <button
                onClick={() => setShow3DBuildings(!show3DBuildings)}
                className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                  show3DBuildings
                    ? 'bg-slate-700 text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                aria-label={t('search:map.buildings3D', '3D Buildings')}
                aria-pressed={show3DBuildings}
              >
                <span className="text-xs xl:text-sm">🏢</span>
                <span className="hidden xl:inline">{t('search:map.buildings3D', '3D')}</span>
              </button>

              {/* Landmarks Toggle */}
              <button
                onClick={() => setShowLandmarks(!showLandmarks)}
                className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                  showLandmarks
                    ? 'bg-primary text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                aria-label={t('search:map.landmarks', 'Landmarks')}
                aria-pressed={showLandmarks}
              >
                <span className="text-xs xl:text-sm">🏛️</span>
                <span className="hidden xl:inline">{t('search:map.poi', 'POI')}</span>
              </button>

              {/* Cadastre Toggle */}
              <button
                onClick={() => setShowCadastre(!showCadastre)}
                className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                  showCadastre
                    ? 'bg-orange-500 text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                aria-label={t('search:map.cadastralParcels')}
                aria-pressed={showCadastre}
              >
                <span className="text-xs xl:text-sm">📐</span>
                <span className="hidden xl:inline">{t('search:map.parcels', 'Parcels')}</span>
              </button>

              {/* Measurement Tool Toggle */}
              <button
                onClick={() => setShowMeasurement(!showMeasurement)}
                className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                  showMeasurement
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                aria-label={t('search:map.measure', 'Measure land')}
                aria-pressed={showMeasurement}
              >
                <span className="text-xs xl:text-sm">📏</span>
                <span className="hidden xl:inline">{t('search:map.measure', 'Measure')}</span>
              </button>

              {/* Legend Toggle */}
              <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                  isLegendOpen
                    ? 'bg-amber-500 text-white'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                aria-label={t('search:map.legend', 'Legend')}
                aria-pressed={isLegendOpen}
              >
                <MapLegendIcon className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                <span className="hidden xl:inline">{t('search:map.legend', 'Legend')}</span>
              </button>
              </div>
            </div>

            {drawnBounds && !isDrawing && (
              <div
                className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40 animate-fade-in"
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                }}
              >
                {isAuthenticated && (
                  <button
                    onClick={onSaveSearch}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <SearchPlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{isSaving ? t('search:map.saving') : t('search:map.saveArea')}</span>
                    <span className="sm:hidden">Save</span>
                  </button>
                )}
                <button
                  onClick={() => onDrawComplete(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
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
      {isMobile && !hideControls && (
        <>
          {/* Mobile: Layers FAB with liquid glass dropdown */}
          <div className={`absolute bottom-20 left-3 z-[1003] pointer-events-none md:hidden ${showMeasurement ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Glass pill dropdown - matching List button style */}
            {isLayerMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 pointer-events-auto animate-fade-in">
                <div
                  className="flex flex-col gap-0.5 p-2 rounded-3xl shadow-2xl border border-white/40"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {/* Legend Toggle */}
                  <button
                    onClick={() => {
                      setIsLegendOpen((p) => !p);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      isLegendOpen
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <MapLegendIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-[15px] font-semibold">{t('search:map.legend', 'Legend')}</span>
                  </button>

                  {/* Landmarks Toggle */}
                  <button
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      showLandmarks
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">🏛️</span>
                    <span className="text-[15px] font-semibold">{t('search:map.pointsOfInterest', 'Points of Interest')}</span>
                  </button>

                  {/* Measurement Tool Toggle */}
                  <button
                    onClick={() => {
                      setShowMeasurement(!showMeasurement);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      showMeasurement
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">📏</span>
                    <span className="text-[15px] font-semibold">{t('search:map.measureDistance', 'Measure Distance')}</span>
                  </button>

                  {/* 3D Buildings Toggle */}
                  <button
                    onClick={() => setShow3DBuildings(!show3DBuildings)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      show3DBuildings
                        ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">🏢</span>
                    <span className="text-[15px] font-semibold">{t('search:map.buildings3D', '3D Buildings')}</span>
                  </button>

                  {/* Cadastre Toggle */}
                  <button
                    onClick={() => setShowCadastre(!showCadastre)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                      showCadastre
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">📐</span>
                    <span className="text-[15px] font-semibold">{t('search:map.landParcels', 'Land Parcels')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* FAB Button - liquid glass effect */}
            <button
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className={`pointer-events-auto w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-95 border ${
                isLayerMenuOpen ? 'bg-neutral-800 text-white border-neutral-700' : 'text-neutral-700 border-white/40'
              }`}
              style={{
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                ...(isLayerMenuOpen ? {} : {
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                }),
              }}
            >
              <svg
                className="w-7 h-7"
                style={{
                  transform: isLayerMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease-out',
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {/* Active layers badge */}
              {!isLayerMenuOpen && (showLandmarks || show3DBuildings || showCadastre || showMeasurement) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                  {[showLandmarks, show3DBuildings, showCadastre, showMeasurement].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Legend popup - positioned closer to FAB */}
            {isLegendOpen && !isLayerMenuOpen && (
              <div className="absolute bottom-14 left-0 pointer-events-auto">
                <Legend isNightMode={false} />
              </div>
            )}

          </div>

          {/* Mobile: Top right compact controls */}
          <div className="absolute top-16 right-2 z-[999] md:hidden">
            <div className="flex flex-col gap-1.5 items-end">
              {/* Main control bar - liquid glass effect */}
              <div
                className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                }}
              >
                {/* Map Options Button */}
                <div className="relative">
                  <button
                    onClick={() => setIsMapOptionsOpen(!isMapOptionsOpen)}
                    className={`flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                      isMapOptionsOpen || selectedClimateRisk !== 'none'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-white/50'
                    }`}
                  >
                    <span>{t('search:map.options.mapButton', 'Map')}</span>
                    <svg
                      className={`w-3 h-3 transition-transform ${isMapOptionsOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Map Options Panel dropdown */}
                  {isMapOptionsOpen && (
                    <div className="absolute top-full right-0 mt-2 z-[1010]">
                      <MapOptionsPanel
                        selectedMapOption={selectedMapOption}
                        selectedClimateRisk={selectedClimateRisk}
                        onMapOptionChange={handleMapOptionChange}
                        onClimateRiskChange={handleClimateRiskChange}
                        isOpen={isMapOptionsOpen}
                        onClose={() => setIsMapOptionsOpen(false)}
                        isMobile={true}
                      />
                    </div>
                  )}
                </div>

                {/* Reset View - zoom out to see all Balkans */}
                {onResetView && (
                  <button
                    onClick={onResetView}
                    className="p-2 rounded-xl hover:bg-white/50 text-neutral-600 active:scale-95"
                    title={t('search:map.resetView', 'Reset view')}
                    aria-label={t('search:map.resetView', 'Reset view')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  </button>
                )}

                {/* Recenter */}
                <button
                  onClick={onRecenter}
                  className="p-2 rounded-xl hover:bg-white/50 text-neutral-600 active:scale-95"
                  title={t('search:map.centerOnLocation')}
                >
                  <CrosshairsIcon className="w-5 h-5" />
                </button>

                {/* Draw */}
                <button
                  onClick={onDrawStart}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 ${
                    isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'
                  }`}
                  title={isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}
                >
                  {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                  <span className="text-xs font-semibold">{isDrawing ? t('search:map.cancel') : t('search:map.draw', 'Draw')}</span>
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

              {/* Drawn bounds actions - glass pill style */}
              {drawnBounds && !isDrawing && (
                <div
                  className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40 animate-fade-in"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {isAuthenticated && (
                    <button
                      onClick={onSaveSearch}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl disabled:opacity-50 transition-all active:scale-[0.98] shadow-md"
                      title={isSaving ? t('search:map.saving') : t('search:map.saveArea')}
                    >
                      <SearchPlusIcon className="w-4 h-4" />
                      <span className="text-[13px] font-semibold">{t('search:map.save', 'Save')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl transition-all active:scale-[0.98] shadow-md"
                    title={t('search:map.clearArea')}
                  >
                    <XCircleIcon className="w-4 h-4" />
                    <span className="text-[13px] font-semibold">{t('search:map.clear', 'Clear')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </>
      )}
    </>
  );
};

export default MapFilterControls;
