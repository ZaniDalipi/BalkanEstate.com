import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import { tapHaptic } from '@/shared/utils/haptics';
import type { MapStyleType } from '../../googleMapConstants';
import { DESKTOP_MAP_STYLES, planStyleChange, type DesktopMapStyle } from '../../../utils/mapStyleOptions';

const LOOK: Record<DesktopMapStyle, { icon: SoftIconName; tile: string; fallback: string }> = {
  clean: { icon: 'sparkles', tile: 'from-white to-slate-100', fallback: 'Clean' },
  color: { icon: 'flower', tile: 'from-emerald-50 to-lime-100', fallback: 'Color' },
  street: { icon: 'city', tile: 'from-sky-50 to-blue-100', fallback: 'Street' },
  satellite: { icon: 'globe', tile: 'from-slate-700 to-slate-900', fallback: 'Satellite' },
};

interface MapStylePickerProps {
  mapStyle: MapStyleType;
  setMapStyle: (style: MapStyleType) => void;
  hasDrawnArea: boolean;
  clearDrawnArea: () => void;
}

/** Map style as four tiles (like Apple Maps' "Choose Map"); the ring glides to the chosen one. */
const MapStylePicker: React.FC<MapStylePickerProps> = ({ mapStyle, setMapStyle, hasDrawnArea, clearDrawnArea }) => {
  const { t } = useTranslation(['search', 'common']);
  const reduce = !!useReducedMotion();
  const current = mapStyle === 'hybrid' ? 'satellite' : mapStyle;

  const pick = (style: DesktopMapStyle) => {
    const plan = planStyleChange(style, hasDrawnArea);
    if (plan === null || plan.style === mapStyle) return;
    tapHaptic();
    setMapStyle(plan.style);
    if (plan.clearDrawnArea) clearDrawnArea();
  };

  return (
    <div role="radiogroup" aria-label={t('common:aria.mapStyle', 'Map style')} className="grid grid-cols-4 gap-2.5">
      {DESKTOP_MAP_STYLES.map((style) => {
        const checked = current === style;
        return (
          <motion.button
            key={style}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => pick(style)}
            whileTap={reduce ? undefined : { scale: 0.94 }}
            className="flex min-h-11 flex-col items-center gap-1.5 focus-visible:outline-none"
          >
            <span className={`relative flex aspect-[5/4] w-full items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ${LOOK[style].tile}`}>
              <SoftIcon name={LOOK[style].icon} className="h-8 w-8" />
              {checked && (
                <motion.span
                  layoutId="map-style-ring"
                  aria-hidden="true"
                  className="absolute -inset-[3px] rounded-[19px] ring-[2.5px] ring-primary"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
            </span>
            <span className={`text-[12px] ${checked ? 'font-semibold text-primary' : 'font-medium text-neutral-600'}`}>
              {t(`search:map.${style}`, LOOK[style].fallback)}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default MapStylePicker;
