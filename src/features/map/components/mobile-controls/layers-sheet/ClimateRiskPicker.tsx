import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { tapHaptic } from '@/shared/utils/haptics';
import type { ClimateRiskType } from '../../googleMapConstants';
import { CLIMATE_RISK_ICONS } from '../../layer-dock/ClimateRiskMenu';
import { CLIMATE_RISKS, CLIMATE_RISK_FALLBACK, climateRiskLabelKey, isClimateRisk } from '../../../utils/climateRisk';

interface ClimateRiskPickerProps {
  selected: ClimateRiskType;
  onSelect: (risk: ClimateRiskType) => void;
}

/** One climate overlay at a time (or Off), as a row of round iOS-style choices. */
const ClimateRiskPicker: React.FC<ClimateRiskPickerProps> = ({ selected, onSelect }) => {
  const { t } = useTranslation(['search', 'common']);
  const reduce = !!useReducedMotion();

  const choose = (risk: ClimateRiskType) => {
    if (!isClimateRisk(risk) || risk === selected) return;
    tapHaptic();
    onSelect(risk);
  };

  return (
    <div role="radiogroup" aria-label={t('search:map.climateRisks.title', 'Climate Risks')} className="grid grid-cols-6 gap-1">
      {CLIMATE_RISKS.map((risk) => {
        const checked = selected === risk;
        return (
          <motion.button
            key={risk}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => choose(risk)}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            className="flex min-h-11 flex-col items-center gap-1 focus-visible:outline-none"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                checked ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-white/80 text-neutral-500 shadow-sm'
              }`}
            >
              {risk === 'none' ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <SoftIcon name={CLIMATE_RISK_ICONS[risk]} className="h-6 w-6" />
              )}
            </span>
            <span className={`w-full truncate text-center text-[11px] ${checked ? 'font-semibold text-primary' : 'font-medium text-neutral-600'}`}>
              {t(`search:map.climateRisks.${climateRiskLabelKey(risk)}`, CLIMATE_RISK_FALLBACK[risk])}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default ClimateRiskPicker;
