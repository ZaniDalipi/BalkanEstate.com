import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { FloorPlanModel } from './FloorPlanModel';
import type { ScreenBox } from './showcaseMotion';

interface PlanStageProps {
  plan: { url: string; ratio: number };
  alt: string;
  origin: ScreenBox | null;
}

const MODE = 'min-h-[44px] min-w-[52px] rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary landscape:min-h-[32px]';
export const SHOWCASE_DOCK = 'absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white/95 p-1 shadow-md ring-1 ring-black/5 landscape:bottom-2';

/** The apartment's own floor plan as a tilted model, with a 3D / 2D switch to lay it flat and read it. */
export const PlanStage: React.FC<PlanStageProps> = ({ plan, alt, origin }) => {
  const { t } = useTranslation('developments');
  const [tilted, setTilted] = useState(true);
  return (
    <>
      <FloorPlanModel url={plan.url} ratio={plan.ratio} alt={alt} tilted={tilted} origin={origin} />
      <div role="group" aria-label={t('explorer.showcase.mode', 'Floor plan view')} className={SHOWCASE_DOCK}>
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
    </>
  );
};
