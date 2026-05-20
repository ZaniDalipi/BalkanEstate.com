/**
 * GoogleMapControls - Desktop and mobile map controls
 * Includes layer toggles, map style selector, climate risk menu,
 * drawn bounds actions, and legend rendering.
 * Extracted from GoogleMapComponent.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
} from '@/constants';
import L from 'leaflet';
import { type MapStyleType, type ClimateRiskType } from './googleMapConstants';
import { Legend, ClimateRiskLegend } from './GoogleMapLegend';

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

const GoogleMapControls: React.FC<GoogleMapControlsProps> = ({
  isMobile,
  hideControls,
  handleRecenter,
  handleResetView,
  mapStyle,
  setMapStyle,
  isDrawing,
  onDrawStart,
  drawnBounds,
  onDrawComplete,
  onSaveSearch,
  isSaving,
  isAuthenticated,
  selectedClimateRisk,
  setSelectedClimateRisk,
  isClimateMenuOpen,
  setIsClimateMenuOpen,
  showOnlyPromoted,
  setShowOnlyPromoted,
  promotedCount,
  show3DBuildings,
  setShow3DBuildings,
  showLandmarks,
  setShowLandmarks,
  showMeasurement,
  setShowMeasurement,
  showCadastre,
  setShowCadastre,
  isLegendOpen,
  setIsLegendOpen,
  isLayerMenuOpen,
  setIsLayerMenuOpen,
}) => {
  const { t } = useTranslation(['search', 'property', 'common']);

  return (
    <>
      {/* Climate Risk Legend */}
      {selectedClimateRisk !== 'none' && (
        <div className="absolute top-14 left-4 z-[1000]">
          <ClimateRiskLegend riskType={selectedClimateRisk} />
        </div>
      )}

      {/* Desktop Controls */}
      {!isMobile && !hideControls && (
        <div className="absolute bottom-24 right-4 z-[1000] flex-col items-end gap-2 hidden md:flex">
          {/* Main control bar */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-1 xl:p-1.5 rounded-full shadow-xl shadow-black/10 flex items-center gap-1 xl:gap-1.5 transition-all duration-300">
            <button
              onClick={handleRecenter}
              className="p-1 xl:p-1.5 rounded-full transition-colors hover:bg-black/10"
              aria-label={t('search:map.centerOnLocation')}
            >
              <CrosshairsIcon className="w-4 h-4 xl:w-5 xl:h-5 text-neutral-700" />
            </button>

            <div className="flex items-center bg-neutral-200/50 p-0.5 rounded-full" role="radiogroup" aria-label={t('common:aria.mapStyle')}>
              <button
                onClick={() => { setMapStyle('clean'); if (drawnBounds) onDrawComplete(null); }}
                className={`px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-semibold transition-all ${
                  mapStyle === 'clean' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                }`}
                aria-label={t('common:aria.cleanMapStyle')}
                aria-pressed={mapStyle === 'clean'}
              >
                {t('search:map.clean', 'Clean')}
              </button>
              <button
                onClick={() => setMapStyle('color')}
                className={`px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-semibold transition-all ${
                  mapStyle === 'color' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                }`}
                aria-label={t('common:aria.colorMapStyle')}
                aria-pressed={mapStyle === 'color'}
              >
                {t('search:map.color', 'Color')}
              </button>
              <button
                onClick={() => setMapStyle('street')}
                className={`px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-semibold transition-all ${
                  mapStyle === 'street' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                }`}
                aria-label={t('common:aria.streetMapStyle')}
                aria-pressed={mapStyle === 'street'}
              >
                {t('search:map.street', 'Street')}
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-semibold transition-all ${
                  mapStyle === 'satellite' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                }`}
                aria-label={t('common:aria.satelliteMapStyle')}
                aria-pressed={mapStyle === 'satellite'}
              >
                {t('search:map.satellite', 'Satellite')}
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
            </button>
          </div>

          {/* Layer toggles */}
          <div className="relative">
            {/* Climate dropdown - rendered outside overflow container */}
            {isClimateMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 min-w-[160px] z-50">
                {(['none', 'flood', 'fire', 'wind', 'air', 'heat'] as ClimateRiskType[]).map((risk) => (
                  <button
                    key={risk}
                    onClick={() => { setSelectedClimateRisk(risk); setIsClimateMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedClimateRisk === risk ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {risk === 'none' ? `✕ ${t('search:map.climateRisks.none', 'None')}` : risk === 'flood' ? `💧 ${t('search:map.climateRisks.flood', 'Flood')}` : risk === 'fire' ? `🔥 ${t('search:map.climateRisks.fire', 'Fire')}` : risk === 'wind' ? `💨 ${t('search:map.climateRisks.wind', 'Wind')}` : risk === 'air' ? `🌬️ ${t('search:map.climateRisks.airQuality', 'Air Quality')}` : `☀️ ${t('search:map.climateRisks.heat', 'Heat')}`}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 xl:gap-1.5 bg-white/80 backdrop-blur-xl border border-white/50 p-1 xl:p-1.5 rounded-full shadow-xl shadow-black/10 max-w-[calc(100%-2rem)] overflow-x-auto scrollbar-hide">
              {/* Climate Risks Button */}
              <button
                onClick={() => setIsClimateMenuOpen(!isClimateMenuOpen)}
                className={`flex items-center gap-1 xl:gap-1.5 px-2 py-1 xl:px-3 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all flex-shrink-0 ${
                  isClimateMenuOpen || selectedClimateRisk !== 'none'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
                aria-label={t('search:map.climateRisks.title', 'Climate Risks')}
                aria-haspopup="menu"
                aria-expanded={isClimateMenuOpen}
              >
                <span className="text-xs xl:text-sm">🌡️</span>
                <span className="hidden xl:inline">{t('search:map.climateRisks.title', 'Climate')}</span>
                <svg className={`w-3 h-3 transition-transform ${isClimateMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

            {/* Promoted/Premium Filter */}
            <button
              onClick={() => setShowOnlyPromoted(!showOnlyPromoted)}
              className={`relative flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                showOnlyPromoted ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label={showOnlyPromoted ? t('common:aria.showAllListings') : t('common:aria.showOnlyPremium')}
              aria-pressed={showOnlyPromoted}
            >
              <span className="text-xs xl:text-sm">👑</span>
              <span className="hidden xl:inline">{t('search:map.promoted', 'Premium')}</span>
              {promotedCount > 0 && !showOnlyPromoted && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full px-1">
                  {promotedCount}
                </span>
              )}
            </button>

            <div className="w-px h-5 bg-gray-300/50" />

            {/* 3D Buildings Toggle */}
            <button
              onClick={() => setShow3DBuildings(!show3DBuildings)}
              className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                show3DBuildings ? 'bg-slate-700 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label={t('common:aria.toggle3DBuildings')}
              aria-pressed={show3DBuildings}
            >
              <span className="text-xs xl:text-sm">🏢</span>
              <span className="hidden xl:inline">3D</span>
            </button>

            {/* Landmarks Toggle */}
            <button
              onClick={() => setShowLandmarks(!showLandmarks)}
              className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                showLandmarks ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label={t('common:aria.togglePointsOfInterest')}
              aria-pressed={showLandmarks}
            >
              <span className="text-xs xl:text-sm">🏛️</span>
              <span className="hidden xl:inline">POI</span>
            </button>

            {/* Measurement Tool Toggle */}
            <button
              onClick={() => setShowMeasurement(!showMeasurement)}
              className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                showMeasurement ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label={t('common:aria.toggleMeasurementTool')}
              aria-pressed={showMeasurement}
            >
              <span className="text-xs xl:text-sm">📏</span>
              <span className="hidden xl:inline">{t('search:map.measure', 'Measure')}</span>
            </button>

            {/* Cadastre Layer Toggle */}
            <button
              onClick={() => setShowCadastre(!showCadastre)}
              className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                showCadastre ? 'bg-orange-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label={t('common:aria.toggleCadastreParcels')}
              aria-pressed={showCadastre}
            >
              <span className="text-xs xl:text-sm">📐</span>
              <span className="hidden xl:inline">{t('search:map.cadastre', 'Cadastre')}</span>
            </button>

            {/* Legend Toggle */}
            <button
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className={`flex items-center gap-1 px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10px] xl:text-xs font-semibold rounded-full transition-all ${
                isLegendOpen ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label={t('search:map.legend', 'Legend')}
              aria-pressed={isLegendOpen}
            >
              <MapLegendIcon className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
              <span className="hidden xl:inline">{t('search:map.legend', 'Legend')}</span>
            </button>
            </div>
          </div>

          {/* Drawn bounds actions */}
          {drawnBounds && !isDrawing && (
            <div
              className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40 animate-fade-in"
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(20px) saturate(200%)',
              }}
            >
              {isAuthenticated && (
                <button
                  onClick={onSaveSearch}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  aria-label={isSaving ? t('search:map.saving') : t('search:map.saveArea')}
                  aria-busy={isSaving}
                >
                  <SearchPlusIcon className="w-4 h-4" />
                  <span>{isSaving ? t('search:map.saving') : t('search:map.saveArea')}</span>
                </button>
              )}
              <button
                onClick={() => onDrawComplete(null)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                aria-label={t('search:map.clearArea')}
              >
                <XCircleIcon className="w-4 h-4" />
                <span>{t('search:map.clearArea')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend - bottom left */}
      {isLegendOpen && !isMobile && (
        <div className="absolute bottom-20 left-4 z-[1000] animate-fade-in">
          <Legend />
        </div>
      )}

      {/* Mobile Controls */}
      {isMobile && !hideControls && (
        <>
          {/* Mobile layer menu FAB */}
          <div className="absolute bottom-32 left-3 z-[1003]">
            {isLayerMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 animate-fade-in">
                <div
                  className="flex flex-col gap-1 p-2.5 rounded-2xl shadow-2xl border border-white/40 min-w-[180px] overflow-y-auto"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    maxHeight: 'calc(100dvh - 260px)',
                  }}
                >
                  {/* Map Styles */}
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-1">{t('common:aria.mapStyle')}</p>
                  <div className="flex gap-1 px-1 pb-1">
                    {(['clean', 'color', 'street', 'satellite'] as MapStyleType[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => setMapStyle(style)}
                        className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                          mapStyle === style
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {style === 'clean' ? '✨' : style === 'color' ? '🎨' : style === 'street' ? '🗺️' : '🛰️'}
                      </button>
                    ))}
                  </div>

                  <div className="h-px bg-gray-200 my-1" />

                  {/* Layers */}
                  <button
                    onClick={() => setShow3DBuildings(!show3DBuildings)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      show3DBuildings ? 'bg-slate-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>🏢</span>
                    <span>{t('common:aria.buildings3D', '3D Buildings')}</span>
                  </button>
                  <button
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      showLandmarks ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>🏛️</span>
                    <span>{t('common:aria.poi')}</span>
                  </button>
                  <button
                    onClick={() => setShowCadastre(!showCadastre)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      showCadastre ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>📐</span>
                    <span>{t('common:aria.cadastre')}</span>
                  </button>
                  <button
                    onClick={() => { setShowMeasurement(!showMeasurement); setIsLayerMenuOpen(false); }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      showMeasurement ? 'bg-emerald-500 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>📏</span>
                    <span>{t('common:aria.measure')}</span>
                  </button>
                  <button
                    onClick={() => setIsLegendOpen(!isLegendOpen)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isLegendOpen ? 'bg-amber-500 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <MapLegendIcon className="w-4 h-4" />
                    <span>{t('common:aria.legend')}</span>
                  </button>

                  <div className="h-px bg-gray-200 my-1" />

                  {/* Climate Risks */}
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-1">{t('common:aria.climate')}</p>
                  <div className="flex flex-wrap gap-1 px-1 pb-1">
                    {(['none', 'flood', 'fire', 'wind', 'air', 'heat'] as ClimateRiskType[]).map((risk) => (
                      <button
                        key={risk}
                        onClick={() => setSelectedClimateRisk(risk)}
                        className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition-all ${
                          selectedClimateRisk === risk
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {risk === 'none' ? '✕' : risk === 'flood' ? '💧' : risk === 'fire' ? '🔥' : risk === 'wind' ? '💨' : risk === 'air' ? '🌬️' : '☀️'}
                      </button>
                    ))}
                  </div>

                  <div className="h-px bg-gray-200 my-1" />

                  {/* Premium Filter */}
                  <button
                    onClick={() => setShowOnlyPromoted(!showOnlyPromoted)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      showOnlyPromoted ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>👑</span>
                    <span>{t('common:aria.premiumOnly')}</span>
                    {promotedCount > 0 && !showOnlyPromoted && (
                      <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-bold bg-amber-500 text-white rounded-full px-1">
                        {promotedCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all border border-white/40 ${
                isLayerMenuOpen ? 'bg-primary text-white' : 'bg-white/90 text-gray-700'
              }`}
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>

          {/* Mobile controls - top right: sits below the floating search bar */}
          <div className="absolute right-2 z-[999]" style={{ top: 'calc(var(--floating-search-top-pad, 8px) + 60px)' }}>
            <div className="flex flex-col gap-1.5 items-end">
              <div
                className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                }}
              >
                <button
                  onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-xl text-gray-700 hover:bg-white/50"
                >
                  {mapStyle === 'satellite' || mapStyle === 'hybrid' ? '🗺️' : '🛰️'}
                </button>
                {handleResetView && (
                  <button
                    onClick={handleResetView}
                    className="p-2 rounded-xl hover:bg-white/50 text-neutral-600 active:scale-95"
                    aria-label={t('common:aria.resetView')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleRecenter}
                  className="p-2 rounded-xl hover:bg-white/50 text-neutral-600"
                >
                  <CrosshairsIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={onDrawStart}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                    isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'
                  }`}
                >
                  {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                </button>
              </div>

              {drawnBounds && !isDrawing && (
                <div
                  className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                  }}
                >
                  {isAuthenticated && (
                    <button
                      onClick={onSaveSearch}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl disabled:opacity-50"
                    >
                      <SearchPlusIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDrawComplete(null)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl"
                  >
                    <XCircleIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Legend */}
          {isLegendOpen && (
            <div className="absolute bottom-44 left-3 z-[1002] animate-fade-in">
              <Legend />
            </div>
          )}

          {/* Climate Risk Legend for mobile: sits below the floating search bar */}
          {selectedClimateRisk !== 'none' && (
            <div className="absolute left-2 z-[1000] animate-fade-in" style={{ top: 'calc(var(--floating-search-top-pad, 8px) + 60px)' }}>
              <ClimateRiskLegend riskType={selectedClimateRisk} />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default GoogleMapControls;
