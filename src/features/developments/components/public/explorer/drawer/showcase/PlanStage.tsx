import React, { Suspense, lazy, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera } from 'lucide-react';
import type { PropertyImage } from '@/types';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { FloorPlanModel } from './FloorPlanModel';
import type { ScreenBox } from './showcaseMotion';

const FloorPlanViewerModal = lazy(() => import('@/src/features/property-details/components/FloorPlanViewerModal'));

interface PlanStageProps {
  plan: { url: string; ratio: number; photos?: PropertyImage[] };
  alt: string;
  origin: ScreenBox | null;
}

const MODE = 'min-h-[44px] min-w-[52px] rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary landscape:min-h-[32px]';
export const SHOWCASE_DOCK = 'absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white/95 p-1 shadow-md ring-1 ring-black/5 landscape:bottom-2';

/**
 * The apartment's own floor plan as a tilted model, with a 3D / 2D switch to
 * lay it flat and read it, and — when the developer placed photos on the plan —
 * a button opening the plan with a camera for each photo.
 */
export const PlanStage: React.FC<PlanStageProps> = ({ plan, alt, origin }) => {
  const { t } = useTranslation('developments');
  const [tilted, setTilted] = useState(true);
  const [spots, setSpots] = useState(false);
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
        {plan.photos && (
          <button type="button" onClick={() => setSpots(true)} className={cn(MODE, 'inline-flex items-center gap-1.5 text-slate-700 hover:bg-slate-100')}>
            <Camera className="h-4 w-4" aria-hidden="true" />
            {t('explorer.showcase.photoSpots', 'Where photos were taken')}
          </button>
        )}
      </div>
      {spots &&
        plan.photos &&
        createPortal(
          <Suspense fallback={null}>
            <FloorPlanViewerModal floors={[{ url: plan.url, label: alt }]} photos={plan.photos} onClose={() => setSpots(false)} title={alt} />
          </Suspense>,
          document.body
        )}
    </>
  );
};
