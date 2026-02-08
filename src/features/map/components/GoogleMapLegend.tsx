/**
 * GoogleMapLegend - Property type legend and Climate risk legend
 * Extracted from GoogleMapComponent.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PROPERTY_TYPE_COLORS, type ClimateRiskType } from './googleMapConstants';

const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || '';

/**
 * Legend Component - Property type color legend
 */
export const Legend: React.FC = () => {
  const { t } = useTranslation(['property']);

  return (
    <div
      className="px-4 py-3 rounded-2xl shadow-xl border border-white/30"
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      <div className="flex flex-col gap-2">
        {Object.entries(PROPERTY_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs font-medium text-neutral-700">
              {t(`map.propertyTypes.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface RiskConfig {
  label: string;
  colors: string[];
  labels: string[];
  source: string;
}

/**
 * Climate Risk Legend Component
 */
export const ClimateRiskLegend: React.FC<{ riskType: ClimateRiskType }> = ({ riskType }) => {
  const { t } = useTranslation(['search']);

  if (riskType === 'none') return null;

  const riskConfig: Record<ClimateRiskType, RiskConfig> = {
    none: { label: '', colors: [], labels: [], source: '' },
    flood: {
      label: t('search:map.climateRisks.flood', 'Precipitation Radar'),
      colors: ['#88bbee', '#00ff00', '#ffff00', '#ff0000'],
      labels: ['Light', 'Moderate', 'Heavy', 'Intense'],
      source: 'RainViewer',
    },
    fire: {
      label: t('search:map.climateRisks.fire', 'Active Fires (24h)'),
      colors: ['#ffe082', '#ff9800', '#f44336', '#b71c1c'],
      labels: ['Low', 'Med', 'High', 'Intense'],
      source: 'EFFIS Copernicus',
    },
    wind: {
      label: t('search:map.climateRisks.wind', 'Wind Speed'),
      colors: ['#e8f4f8', '#a6d9e8', '#5ab4cf', '#1a8ab7'],
      labels: ['Calm', 'Light', 'Mod', 'Strong'],
      source: OWM_API_KEY ? 'OpenWeatherMap' : 'Open-Meteo',
    },
    air: {
      label: t('search:map.climateRisks.air', 'Air Quality (EPA AQI)'),
      colors: ['#00e400', '#ffff00', '#ff7e00', '#ff0000', '#7e0023'],
      labels: ['Good', 'OK', 'Poor', 'Bad', 'Hazard'],
      source: 'AQICN',
    },
    heat: {
      label: t('search:map.climateRisks.heat', 'Temperature'),
      colors: ['#313695', '#74add1', '#fee090', '#f46d43', '#a50026'],
      labels: ['Cold', 'Cool', 'Warm', 'Hot', 'Extreme'],
      source: OWM_API_KEY ? 'OpenWeatherMap' : 'Open-Meteo',
    },
  };

  const config = riskConfig[riskType];

  return (
    <div
      className="px-3 py-2 rounded-xl shadow-lg border border-white/30"
      style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)' }}
    >
      <p className="text-xs font-semibold text-gray-700 mb-2">{config.label}</p>
      <div className="flex gap-1">
        {config.colors.map((color, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-[8px] text-gray-500 mt-0.5">{config.labels[i]}</span>
          </div>
        ))}
      </div>
      <p className="text-[8px] text-gray-400 mt-1">{config.source}</p>
    </div>
  );
};
