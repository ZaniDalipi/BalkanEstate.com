/**
 * MapOptionsPanel Component
 *
 * Glass pill style map options panel with:
 * - Map type selection (Automatic, Satellite, Street view)
 * - Climate risks overlay selection (Flood, Fire, Wind, Air, Heat)
 *
 * Styled to match the frosted glass design language.
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
 * Pill button for options
 */
const PillButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}> = ({ selected, onClick, children, size = 'md' }) => (
  <button
    onClick={onClick}
    className={`font-semibold rounded-xl transition-all active:scale-[0.97] ${
      size === 'sm' ? 'px-3 py-2 text-[13px]' : 'px-4 py-2.5 text-[14px]'
    } ${
      selected
        ? 'bg-primary text-white shadow-md'
        : 'text-neutral-600 bg-neutral-100/80 hover:bg-neutral-200/80'
    }`}
  >
    {children}
  </button>
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
    { value: 'none', label: t('search:map.climateRisks.none', 'None selected') },
    { value: 'flood', label: t('search:map.climateRisks.flood', 'Flood') },
    { value: 'fire', label: t('search:map.climateRisks.fire', 'Fire') },
    { value: 'wind', label: t('search:map.climateRisks.wind', 'Wind') },
    { value: 'air', label: t('search:map.climateRisks.air', 'Air') },
    { value: 'heat', label: t('search:map.climateRisks.heat', 'Heat') },
  ];

  const buttonSize = isMobile ? 'sm' : 'md';

  return (
    <div
      className="rounded-3xl shadow-2xl border border-white/40 overflow-hidden animate-fade-in"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(200%)',
        WebkitBackdropFilter: 'blur(20px) saturate(200%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        minWidth: isMobile ? '200px' : '240px',
      }}
    >
      {/* Map Options Section */}
      {showMapOptions && (
        <div className={`border-b border-neutral-200/60 ${isMobile ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-bold text-neutral-400 uppercase tracking-wider mb-3 ${isMobile ? 'text-[10px]' : 'text-[11px]'}`}>
            {t('search:map.options.title', 'Map Options')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {mapOptions.map((option) => (
              <PillButton
                key={option.value}
                selected={selectedMapOption === option.value}
                onClick={() => onMapOptionChange(option.value)}
                size={buttonSize}
              >
                {option.label}
              </PillButton>
            ))}
          </div>
        </div>
      )}

      {/* Climate Risks Section */}
      <div className={isMobile ? 'p-3' : 'p-4'}>
        <h3 className={`font-bold text-neutral-400 uppercase tracking-wider mb-3 ${isMobile ? 'text-[10px]' : 'text-[11px]'}`}>
          {t('search:map.climateRisks.title', 'Climate Risks')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {climateRisks.map((risk) => (
            <PillButton
              key={risk.value}
              selected={selectedClimateRisk === risk.value}
              onClick={() => onClimateRiskChange(risk.value)}
              size={buttonSize}
            >
              {risk.label}
            </PillButton>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapOptionsPanel;
