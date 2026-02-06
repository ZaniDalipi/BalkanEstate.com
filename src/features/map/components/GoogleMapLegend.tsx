/**
 * GoogleMapLegend - Property type legend and Climate risk legend
 * Extracted from GoogleMapComponent.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PROPERTY_TYPE_COLORS, type ClimateRiskType } from './googleMapConstants';

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

/**
 * Climate Risk Legend Component
 */
export const ClimateRiskLegend: React.FC<{ riskType: ClimateRiskType }> = ({ riskType }) => {
  const { t } = useTranslation(['search']);

  if (riskType === 'none') return null;

  const riskConfig: Record<ClimateRiskType, { label: string; colors: string[]; labels: string[] }> = {
    none: { label: '', colors: [], labels: [] },
    flood: { label: t('search:map.climateRisks.flood', 'Flood Risk'), colors: ['#e3f2fd', '#64b5f6', '#1976d2', '#0d47a1'], labels: ['Low', 'Moderate', 'High', 'Severe'] },
    fire: { label: t('search:map.climateRisks.fire', 'Fire Risk'), colors: ['#fff3e0', '#ffb74d', '#f57c00', '#bf360c'], labels: ['Low', 'Moderate', 'High', 'Severe'] },
    wind: { label: t('search:map.climateRisks.wind', 'Wind Risk'), colors: ['#e8f5e9', '#81c784', '#388e3c', '#1b5e20'], labels: ['Calm', 'Breezy', 'Windy', 'Strong'] },
    air: { label: t('search:map.climateRisks.air', 'Air Quality'), colors: ['#e8f5e9', '#fff59d', '#ff8a65', '#b71c1c'], labels: ['Good', 'Moderate', 'Poor', 'Hazardous'] },
    heat: { label: t('search:map.climateRisks.heat', 'Heat Risk'), colors: ['#e3f2fd', '#fff59d', '#ff8a65', '#d32f2f'], labels: ['Cool', 'Warm', 'Hot', 'Extreme'] },
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
    </div>
  );
};
