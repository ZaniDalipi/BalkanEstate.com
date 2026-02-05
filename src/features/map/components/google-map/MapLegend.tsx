/**
 * Map Legend Component
 * Shows property type color coding
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

// Property type colors
export const PROPERTY_TYPE_COLORS: Record<string, string> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  land: '#8B4513',
  other: '#6c757d',
};

const MapLegend: React.FC = () => {
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

export default MapLegend;
