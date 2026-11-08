import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../../../types';
import { useUnitText } from '../useUnitText';

interface DiveHudProps {
  /** Shown while flying in, until the apartment opens. */
  show: boolean;
  unit?: PublicUnit;
  onBack: () => void;
  onSkip: () => void;
}

const HUD_PILL =
  'inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/85 px-4 text-sm font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * The only controls during the flight into an apartment (everything else has
 * faded): turn back to the building, or skip to the apartment. It also covers
 * the picture, so a stray click or scroll can't knock the camera off course.
 */
export const DiveHud: React.FC<DiveHudProps> = ({ show, unit, onBack, onSkip }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const reduced = useReducedMotion();
  const name = unit ? txt.title(unit) : t('explorer.card.apartment', 'Apartment');
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="hud"
          className="absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.35, ease: 'easeOut' }}
          data-testid="dive-hud"
        >
          <p role="status" className="sr-only">
            {t('explorer.dive.status', { name, defaultValue: 'Taking you to {{name}}' })}
          </p>
          <button type="button" onClick={onBack} className={cn(HUD_PILL, 'absolute left-4 top-4')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('explorer.showcase.back', 'Back to building')}
          </button>
          <button type="button" onClick={onSkip} className={cn(HUD_PILL, 'absolute right-4 top-4')}>
            {t('explorer.dive.skip', 'Skip')}
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
