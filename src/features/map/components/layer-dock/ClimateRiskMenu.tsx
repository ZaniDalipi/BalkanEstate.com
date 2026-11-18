import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import type { ClimateRiskType } from '../googleMapConstants';
import { CLIMATE_RISKS, CLIMATE_RISK_FALLBACK } from '../../utils/climateRisk';

export const CLIMATE_RISK_ICONS: Record<Exclude<ClimateRiskType, 'none'>, SoftIconName> = {
  flood: 'sea',
  fire: 'flame',
  wind: 'leafAutumn',
  air: 'leaf',
  heat: 'sun',
};


interface ClimateRiskMenuProps {
  selected: ClimateRiskType;
  onSelect: (risk: ClimateRiskType) => void;
}

/** Dropdown opened from the dock's Climate Risks icon. */
const ClimateRiskMenu: React.FC<ClimateRiskMenuProps> = ({ selected, onSelect }) => {
  const { t } = useTranslation('search');
  // The menu has room for the long names ("None", "Air Quality"); the phone tiles use the short ones.
  const label = (risk: ClimateRiskType) =>
    risk === 'none'
      ? t('map.climateRisks.none', 'None')
      : risk === 'air'
        ? t('map.climateRisks.airQuality', 'Air Quality')
        : t(`map.climateRisks.${risk}`, CLIMATE_RISK_FALLBACK[risk]);

  return (
    <div role="menu" className="absolute bottom-full left-0 z-50 mb-3 min-w-[160px] rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
      {CLIMATE_RISKS.map((risk) => (
        <button
          key={risk}
          type="button"
          role="menuitemradio"
          aria-checked={selected === risk}
          onClick={() => onSelect(risk)}
          className={`flex min-h-11 w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
            selected === risk ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {risk === 'none' ? (
            `✕ ${label(risk)}`
          ) : (
            <>
              <SoftIcon name={CLIMATE_RISK_ICONS[risk]} className="h-5 w-5 flex-shrink-0" />
              {label(risk)}
            </>
          )}
        </button>
      ))}
    </div>
  );
};

export default ClimateRiskMenu;
