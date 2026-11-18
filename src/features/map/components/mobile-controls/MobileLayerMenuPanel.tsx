import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import type { MapStyleType, ClimateRiskType } from '../googleMapConstants';
import { CLIMATE_RISK_ICONS } from '../layer-dock/ClimateRiskMenu';
import type { GoogleMapControlsProps } from '../GoogleMapControls';

const MAP_STYLE_ICONS: Record<MapStyleType, SoftIconName> = {
  clean: 'sparkles',
  color: 'flower',
  street: 'city',
  satellite: 'globe',
  hybrid: 'globe',
};

/** Phone layer menu: map styles, layers, climate risks and the premium filter. */
const MobileLayerMenuPanel: React.FC<GoogleMapControlsProps> = ({ mapStyle, setMapStyle, selectedClimateRisk, setSelectedClimateRisk, showOnlyPromoted, setShowOnlyPromoted, promotedCount, show3DBuildings, setShow3DBuildings, showLandmarks, setShowLandmarks, showMeasurement, setShowMeasurement, showTerrain, setShowTerrain, showCadastre, setShowCadastre, isLegendOpen, setIsLegendOpen, setIsLayerMenuOpen }) => {
  const { t } = useTranslation(['search', 'common']);
  return (
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
            className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center justify-center ${
              mapStyle === style
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label={t(`search:map.${style}`)}
            aria-pressed={mapStyle === style}
            title={t(`search:map.${style}`)}
          >
            <SoftIcon name={MAP_STYLE_ICONS[style]} className="w-5 h-5" />
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
        <SoftIcon name="cube" className="w-5 h-5" />
        <span>{t('common:aria.buildings3D', '3D Buildings')}</span>
      </button>
      <button
        onClick={() => setShowLandmarks(!showLandmarks)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
          showLandmarks ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <SoftIcon name="landmark" className="w-5 h-5" />
        <span>{t('common:aria.poi')}</span>
      </button>
      <button
        onClick={() => setShowCadastre(!showCadastre)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
          showCadastre ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <SoftIcon name="mapGrid" className="w-5 h-5" />
        <span>{t('common:aria.cadastre')}</span>
      </button>
      <button
        onClick={() => { setShowMeasurement(!showMeasurement); setIsLayerMenuOpen(false); }}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
          showMeasurement ? 'bg-emerald-500 text-white' : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <SoftIcon name="ruler" className="w-5 h-5" />
        <span>{t('common:aria.measure')}</span>
      </button>
      <button
        onClick={() => { setShowTerrain(!showTerrain); setIsLayerMenuOpen(false); }}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
          showTerrain ? 'bg-lime-600 text-white' : 'hover:bg-gray-100 text-gray-700'
        }`}
        aria-pressed={showTerrain}
      >
        <SoftIcon name="mountain" className="w-5 h-5" />
        <span>{t('search:terrain.toggle', 'Terrain')}</span>
      </button>
      <button
        onClick={() => setIsLegendOpen(!isLegendOpen)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
          isLegendOpen ? 'bg-amber-500 text-white' : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <SoftIcon name="legend" className="w-5 h-5" />
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
            className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition-all flex items-center justify-center ${
              selectedClimateRisk === risk
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label={t(`search:map.climateRisks.${risk === 'air' ? 'airQuality' : risk}`)}
            aria-pressed={selectedClimateRisk === risk}
            title={t(`search:map.climateRisks.${risk === 'air' ? 'airQuality' : risk}`)}
          >
            {risk === 'none' ? '✕' : <SoftIcon name={CLIMATE_RISK_ICONS[risk]} className="w-5 h-5" />}
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
        <SoftIcon name="crown" className="w-5 h-5" />
        <span>{t('common:aria.premiumOnly')}</span>
        {promotedCount > 0 && !showOnlyPromoted && (
          <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-bold bg-amber-500 text-white rounded-full px-1">
            {promotedCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default MobileLayerMenuPanel;
