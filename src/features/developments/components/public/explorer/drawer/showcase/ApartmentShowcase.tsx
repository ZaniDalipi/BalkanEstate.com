import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { PublicUnit, UnitImage } from '../../../../../types';
import { DIVE_PAPER } from '../../dive/diveStyle';
import { useUnitText } from '../../useUnitText';
import { FloorPlanModel } from './FloorPlanModel';
import { apartmentBox } from './showcaseMotion';

interface ApartmentShowcaseProps {
  unit: PublicUnit;
  plan: UnitImage;
  onClose: () => void;
}

const PILL = 'inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-black/5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const MODE = 'min-h-[44px] min-w-[52px] rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Desktop stage beside the apartment details: the building has washed out to
 * paper and the apartment's floor plan rises out of it as a tilted model.
 * The buyer can lay the plan flat to read it, or go back to the building.
 */
export const ApartmentShowcase: React.FC<ApartmentShowcaseProps> = ({ unit, plan, onClose }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const reduced = useReducedMotion();
  // Measured once, as the showcase opens: where the buyer saw the apartment.
  const [origin] = useState(() => apartmentBox(unit.id));
  const [tilted, setTilted] = useState(true);
  const ratio = plan.width && plan.height ? plan.width / plan.height : 4 / 3;

  return (
    <motion.div
      className="relative flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 50% 45%, #fbfaf7 0%, ${DIVE_PAPER} 62%, #e6e0d6 100%)` }}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.35, ease: 'easeOut' }}
      data-testid="apartment-showcase"
    >
      <button type="button" onClick={onClose} className={cn(PILL, 'absolute left-4 top-4 z-10')}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {origin ? t('explorer.showcase.back', 'Back to building') : t('explorer.showcase.backPlain', 'Back')}
      </button>

      <FloorPlanModel
        url={plan.url}
        ratio={ratio}
        alt={t('explorer.showcase.planAlt', { name: txt.title(unit), defaultValue: 'Floor plan of {{name}}' })}
        tilted={tilted}
        origin={origin}
      />

      <div
        role="group"
        aria-label={t('explorer.showcase.mode', 'Floor plan view')}
        className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white/95 p-1 shadow-md ring-1 ring-black/5"
      >
        {([true, false] as const).map((on) => (
          <button
            key={String(on)}
            type="button"
            aria-pressed={tilted === on}
            onClick={() => setTilted(on)}
            className={cn(MODE, tilted === on ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
          >
            {on ? t('explorer.showcase.tilted', '3D') : t('explorer.showcase.flat', '2D')}
          </button>
        ))}
      </div>
    </motion.div>
  );
};
