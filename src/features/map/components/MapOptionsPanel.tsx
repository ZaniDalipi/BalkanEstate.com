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
}

/**
 * Radio button component for consistent styling
 * Touch-optimized with minimum 44px touch targets
 */
const RadioOption: React.FC<{
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  isMobile?: boolean;
}> = ({ id, name, value, checked, onChange, label, isMobile }) => (
  <label
    htmlFor={id}
    className={`flex items-center gap-3 cursor-pointer rounded-lg transition-colors active:bg-gray-100 ${
      isMobile ? 'py-3 px-2 min-h-[44px]' : 'py-2 px-1'
    } hover:bg-gray-50`}
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
        className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} rounded-full border-2 transition-all ${
          checked
            ? 'border-blue-500 bg-white'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        {checked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`${isMobile ? 'w-3 h-3' : 'w-2.5 h-2.5'} rounded-full bg-blue-500`} />
          </div>
        )}
      </div>
    </div>
    <span className={`${isMobile ? 'text-base' : 'text-sm'} ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
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
}) => {
  const { t } = useTranslation(['search']);

  if (!isOpen) return null;

  const mapOptions: { value: MapOptionType; label: string }[] = [
    { value: 'automatic', label: t('search:map.options.automatic', 'Automatic') },
    { value: 'satellite', label: t('search:map.options.satellite', 'Satellite') },
    { value: 'streetview', label: t('search:map.options.streetView', 'Street view') },
  ];

  const climateRisks: { value: ClimateRiskType; label: string }[] = [
    { value: 'none', label: t('search:map.climateRisks.none', 'None selected') },
    { value: 'flood', label: t('search:map.climateRisks.flood', 'Flood') },
    { value: 'fire', label: t('search:map.climateRisks.fire', 'Fire') },
    { value: 'wind', label: t('search:map.climateRisks.wind', 'Wind') },
    { value: 'air', label: t('search:map.climateRisks.air', 'Air') },
    { value: 'heat', label: t('search:map.climateRisks.heat', 'Heat') },
  ];

  return (
    <div
      className={`bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden ${
        isMobile ? 'w-[280px] max-w-[90vw]' : 'min-w-[280px]'
      }`}
      style={isMobile ? {
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
      } : undefined}
    >
      {/* Map Options Section */}
      <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-gray-100`}>
        <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900 mb-2`}>
          {t('search:map.options.title', 'Map Options')}
        </h3>
        <div className="space-y-0">
          {mapOptions.map((option) => (
            <RadioOption
              key={option.value}
              id={`map-option-${option.value}`}
              name="mapOption"
              value={option.value}
              checked={selectedMapOption === option.value}
              onChange={() => onMapOptionChange(option.value)}
              label={option.label}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>

      {/* Climate Risks Section */}
      <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900 mb-2`}>
          {t('search:map.climateRisks.title', 'Climate Risks')}
        </h3>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-x-4`}>
          {isMobile ? (
            // Single column for mobile - better touch targets
            <div className="space-y-0">
              {climateRisks.map((risk) => (
                <RadioOption
                  key={risk.value}
                  id={`climate-risk-${risk.value}`}
                  name="climateRisk"
                  value={risk.value}
                  checked={selectedClimateRisk === risk.value}
                  onChange={() => onClimateRiskChange(risk.value)}
                  label={risk.label}
                  isMobile={isMobile}
                />
              ))}
            </div>
          ) : (
            // Two columns for desktop
            <>
              <div className="space-y-1">
                {climateRisks.slice(0, 3).map((risk) => (
                  <RadioOption
                    key={risk.value}
                    id={`climate-risk-${risk.value}`}
                    name="climateRisk"
                    value={risk.value}
                    checked={selectedClimateRisk === risk.value}
                    onChange={() => onClimateRiskChange(risk.value)}
                    label={risk.label}
                  />
                ))}
              </div>
              <div className="space-y-1">
                {climateRisks.slice(3).map((risk) => (
                  <RadioOption
                    key={risk.value}
                    id={`climate-risk-${risk.value}`}
                    name="climateRisk"
                    value={risk.value}
                    checked={selectedClimateRisk === risk.value}
                    onChange={() => onClimateRiskChange(risk.value)}
                    label={risk.label}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapOptionsPanel;
