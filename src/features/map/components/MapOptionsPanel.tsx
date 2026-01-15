/**
 * MapOptionsPanel Component
 *
 * Zillow-style map options panel with:
 * - Map type selection (Automatic, Satellite, Street view)
 * - Climate risks overlay selection (Flood, Fire, Wind, Air, Heat)
 *
 * Styled to match Zillow's clean, minimal design with radio button groups.
 * Optimized for both desktop and mobile screens.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

// Map type options
export type MapOptionType = 'automatic' | 'satellite' | 'streetview';

// Climate risk types
export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface MapOptionsPanelProps {
  selectedMapOption: MapOptionType;
  selectedClimateRisk: ClimateRiskType;
  onMapOptionChange: (option: MapOptionType) => void;
  onClimateRiskChange: (risk: ClimateRiskType) => void;
  isOpen: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  showMapOptions?: boolean; // Whether to show map type options (hide on desktop where buttons exist)
}

/**
 * Compact radio button for FAB-style panel
 */
const RadioOption: React.FC<{
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ id, name, value, checked, onChange, label }) => (
  <label
    htmlFor={id}
    className={`flex items-center gap-2 cursor-pointer rounded-md py-1.5 px-1.5 transition-colors active:bg-white/50 ${
      checked ? 'bg-white/40' : 'hover:bg-white/30'
    }`}
  >
    <div className="relative flex items-center justify-center">
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div
        className={`w-4 h-4 rounded-full border-2 transition-all ${
          checked
            ? 'border-blue-500 bg-white'
            : 'border-gray-400 bg-white/80'
        }`}
      >
        {checked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
        )}
      </div>
    </div>
    <span className={`text-xs ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
      {label}
    </span>
  </label>
);

const MapOptionsPanel: React.FC<MapOptionsPanelProps> = ({
  selectedMapOption,
  selectedClimateRisk,
  onMapOptionChange,
  onClimateRiskChange,
  isOpen,
  isMobile = false,
  showMapOptions = true, // Default to showing map options
}) => {
  const { t } = useTranslation(['search']);

  if (!isOpen) return null;

  const mapOptions: { value: MapOptionType; label: string }[] = [
    { value: 'automatic', label: t('search:map.options.automatic', 'Automatic') },
    { value: 'satellite', label: t('search:map.options.satellite', 'Satellite') },
    { value: 'streetview', label: t('search:map.options.streetView', 'Street view') },
  ];

  const climateRisks: { value: ClimateRiskType; label: string }[] = [
    { value: 'none', label: t('search:map.climateRisks.none', 'None') },
    { value: 'flood', label: t('search:map.climateRisks.flood', 'Flood') },
    { value: 'fire', label: t('search:map.climateRisks.fire', 'Fire') },
    { value: 'wind', label: t('search:map.climateRisks.wind', 'Wind') },
    { value: 'air', label: t('search:map.climateRisks.air', 'Air') },
    { value: 'heat', label: t('search:map.climateRisks.heat', 'Heat') },
  ];

  // Desktop: larger, more spacious layout
  // Mobile: compact grid layout
  return (
    <div
      className={`rounded-xl shadow-lg border border-white/30 overflow-hidden ${
        isMobile ? 'w-[160px]' : 'w-[200px]'
      }`}
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      {/* Map Options Section - only shown on mobile or when explicitly enabled */}
      {showMapOptions && (
        <div className={`border-b border-gray-200/40 ${isMobile ? 'px-2 py-2' : 'px-3 py-2.5'}`}>
          <h3 className={`font-semibold text-gray-500 uppercase tracking-wider ${isMobile ? 'text-[8px] mb-1.5' : 'text-[9px] mb-2'}`}>
            {t('search:map.options.title', 'Map Options')}
          </h3>
          <div className="flex flex-wrap gap-1">
            {mapOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onMapOptionChange(option.value)}
                className={`font-medium rounded transition-all ${
                  isMobile ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
                } ${
                  selectedMapOption === option.value
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Climate Risks Section */}
      <div className={isMobile ? 'px-2 py-2' : 'px-3 py-2.5'}>
        <h3 className={`font-semibold text-gray-500 uppercase tracking-wider ${isMobile ? 'text-[8px] mb-1.5' : 'text-[9px] mb-2'}`}>
          {t('search:map.climateRisks.title', 'Climate Risks')}
        </h3>
        <div className={`grid gap-1 ${isMobile ? 'grid-cols-3' : 'grid-cols-3'}`}>
          {climateRisks.map((risk) => (
            <button
              key={risk.value}
              onClick={() => onClimateRiskChange(risk.value)}
              className={`font-medium rounded transition-all text-center ${
                isMobile ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-1 text-[11px]'
              } ${
                selectedClimateRisk === risk.value
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 bg-gray-50'
              }`}
            >
              {risk.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapOptionsPanel;
