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
  const { t } = useTranslation(['search', 'property']);

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
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10 flex items-center gap-1.5 transition-all duration-300">
            <button
              onClick={handleRecenter}
              className="p-1.5 rounded-full transition-colors hover:bg-black/10"
              aria-label={t('search:map.centerOnLocation')}
            >
              <CrosshairsIcon className="w-5 h-5 text-neutral-700" />
            </button>

            <div className="flex items-center bg-neutral-200/50 p-0.5 rounded-full" role="radiogroup" aria-label="Map style">
              <button
                onClick={() => setMapStyle('clean')}
                className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  mapStyle === 'clean' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                }`}
                aria-label="Clean map style - minimal, properties stand out"
                aria-pressed={mapStyle === 'clean'}
              >
                {t('search:map.clean', 'Clean')}
              </button>
              <button
                onClick={() => setMapStyle('color')}
                className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  mapStyle === 'color' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                }`}
                aria-label="Color map style - shows neighborhoods, parks, amenities"
                aria-pressed={mapStyle === 'color'}
              >
                {t('search:map.color', 'Color')}
              </button>
              <button
                onClick={() => setMapStyle('street')}
                className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  mapStyle === 'street' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                }`}
                aria-label="Street map style"
                aria-pressed={mapStyle === 'street'}
              >
                {t('search:map.street', 'Street')}
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  mapStyle === 'satellite' ? 'bg-white shadow text-primary' : 'text-neutral-600 hover:bg-white/50'
                }`}
                aria-label="Satellite aerial imagery"
                aria-pressed={mapStyle === 'satellite'}
              >
                {t('search:map.satellite', 'Satellite')}
              </button>
            </div>

            <button
              onClick={onDrawStart}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full shadow-md transition-colors ${
                isDrawing
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-neutral-800 text-white hover:bg-neutral-900'
              }`}
              aria-label={isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}
              aria-pressed={isDrawing}
            >
              {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
              <span className="hidden sm:inline">{isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}</span>
            </button>
          </div>

          {/* Layer toggles */}
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-xl shadow-black/10 max-w-[calc(100%-2rem)] overflow-x-auto scrollbar-hide">
            {/* Climate Risks Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsClimateMenuOpen(!isClimateMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  isClimateMenuOpen || selectedClimateRisk !== 'none'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
                aria-label={t('search:map.climateRisks.title', 'Climate Risks')}
                aria-haspopup="menu"
                aria-expanded={isClimateMenuOpen}
              >
                <span>🌡️</span>
                <span>{t('search:map.climateRisks.title', 'Climate')}</span>
                <svg className={`w-3 h-3 transition-transform ${isClimateMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isClimateMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 min-w-[160px]">
                  {(['none', 'flood', 'fire', 'wind', 'air', 'heat'] as ClimateRiskType[]).map((risk) => (
                    <button
                      key={risk}
                      onClick={() => { setSelectedClimateRisk(risk); setIsClimateMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedClimateRisk === risk ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {risk === 'none' ? '✕ None' : risk === 'flood' ? '💧 Flood' : risk === 'fire' ? '🔥 Fire' : risk === 'wind' ? '💨 Wind' : risk === 'air' ? '🌬️ Air Quality' : '☀️ Heat'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Promoted/Premium Filter */}
            <button
              onClick={() => setShowOnlyPromoted(!showOnlyPromoted)}
              className={`relative flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                showOnlyPromoted ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label={showOnlyPromoted ? 'Show all listings' : 'Show only premium & promoted'}
              aria-pressed={showOnlyPromoted}
            >
              <span>👑</span>
              <span className="hidden sm:inline">{t('search:map.promoted', 'Premium')}</span>
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
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                show3DBuildings ? 'bg-slate-700 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label="Toggle 3D buildings"
              aria-pressed={show3DBuildings}
            >
              <span>🏢</span>
              <span className="hidden sm:inline">3D</span>
            </button>

            {/* Landmarks Toggle */}
            <button
              onClick={() => setShowLandmarks(!showLandmarks)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                showLandmarks ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label="Toggle points of interest"
              aria-pressed={showLandmarks}
            >
              <span>🏛️</span>
              <span className="hidden sm:inline">POI</span>
            </button>

            {/* Measurement Tool Toggle */}
            <button
              onClick={() => setShowMeasurement(!showMeasurement)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                showMeasurement ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label="Toggle measurement tool"
              aria-pressed={showMeasurement}
            >
              <span>📏</span>
              <span className="hidden sm:inline">Measure</span>
            </button>

            {/* Cadastre Layer Toggle */}
            <button
              onClick={() => setShowCadastre(!showCadastre)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                showCadastre ? 'bg-orange-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label="Toggle cadastre parcels"
              aria-pressed={showCadastre}
            >
              <span>📐</span>
              <span className="hidden sm:inline">Cadastre</span>
            </button>

            {/* Legend Toggle */}
            <button
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className={`flex items-center gap-1 px-2.5 py-2.5 text-xs font-semibold rounded-full transition-all ${
                isLegendOpen ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
              aria-label={t('search:map.legend', 'Legend')}
              aria-pressed={isLegendOpen}
            >
              <MapLegendIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('search:map.legend', 'Legend')}</span>
            </button>
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
          <div className="absolute bottom-28 left-3 z-[1003]">
            {isLayerMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 animate-fade-in">
                <div
                  className="flex flex-col gap-1 p-2.5 rounded-2xl shadow-2xl border border-white/40 min-w-[180px]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                  }}
                >
                  {/* Map Styles */}
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-1">Map Style</p>
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
                    <span>3D Buildings</span>
                  </button>
                  <button
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      showLandmarks ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>🏛️</span>
                    <span>POI</span>
                  </button>
                  <button
                    onClick={() => setShowCadastre(!showCadastre)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      showCadastre ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>📐</span>
                    <span>Cadastre</span>
                  </button>
                  <button
                    onClick={() => { setShowMeasurement(!showMeasurement); setIsLayerMenuOpen(false); }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      showMeasurement ? 'bg-emerald-500 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>📏</span>
                    <span>Measure</span>
                  </button>
                  <button
                    onClick={() => setIsLegendOpen(!isLegendOpen)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isLegendOpen ? 'bg-amber-500 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <MapLegendIcon className="w-4 h-4" />
                    <span>Legend</span>
                  </button>

                  <div className="h-px bg-gray-200 my-1" />

                  {/* Climate Risks */}
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-1">Climate</p>
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
                    <span>Premium Only</span>
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

          {/* Mobile controls - top right */}
          <div className="absolute top-16 right-2 z-[999]">
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

          {/* Climate Risk Legend for mobile */}
          {selectedClimateRisk !== 'none' && (
            <div className="absolute top-16 left-2 z-[1000] animate-fade-in">
              <ClimateRiskLegend riskType={selectedClimateRisk} />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default GoogleMapControls;
