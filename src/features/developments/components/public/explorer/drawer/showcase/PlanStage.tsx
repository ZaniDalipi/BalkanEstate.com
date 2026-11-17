import React, { Suspense, lazy, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Camera, RotateCcw, RotateCw } from 'lucide-react';
import type { PropertyImage } from '@/types';
import { cn } from '@/src/lib/utils';
import { FloorPlanModel } from './FloorPlanModel';
import type { ScreenBox } from './showcaseMotion';
import { PlanWalls } from './walls/PlanWalls';
import { usePlanOrbit } from './walls/usePlanOrbit';
import { usePlanWalls } from './walls/usePlanWalls';

const FloorPlanViewerModal = lazy(() => import('@/src/features/property-details/components/FloorPlanViewerModal'));

interface PlanStageProps {
  plan: { url: string; ratio: number; photos?: PropertyImage[] };
  alt: string;
  origin: ScreenBox | null;
}

const MODE = 'min-h-[44px] min-w-[44px] rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary landscape:min-h-[32px]';
const ICON = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary landscape:min-h-[32px]';
export const SHOWCASE_DOCK = 'absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white/95 p-1 shadow-md ring-1 ring-black/5 landscape:bottom-2';

/**
 * The apartment's own floor plan as a model on a table: its walls stand up
 * (when the plan draws them as dark lines), and the buyer drags — or uses the
 * turn buttons and arrow keys — to walk round it. A 3D / 2D switch lays it
 * flat to read, and when the developer placed photos on the plan, a button
 * opens it with a camera for each photo.
 */
export const PlanStage: React.FC<PlanStageProps> = ({ plan, alt, origin }) => {
  const { t } = useTranslation('developments');
  const [tilted, setTilted] = useState(true);
  const [spots, setSpots] = useState(false);
  const walls = usePlanWalls(plan.url, tilted);
  const { orbit, moved, bind, step } = usePlanOrbit();

  return (
    <>
      <div
        {...(tilted ? bind : {})}
        role={tilted ? 'application' : undefined}
        tabIndex={tilted ? 0 : undefined}
        aria-label={tilted ? t('explorer.showcase.modelLabel', 'Floor plan model. Drag, or use the arrow keys, to turn it.') : undefined}
        className={cn('rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', tilted && 'cursor-grab touch-none select-none active:cursor-grabbing')}
        data-testid="plan-orbit"
      >
        <FloorPlanModel
          url={plan.url}
          ratio={plan.ratio}
          alt={alt}
          tilted={tilted}
          origin={origin}
          orbit={orbit}
          orbitFast={moved}
          overlay={tilted && walls ? <PlanWalls walls={walls} /> : undefined}
        />
      </div>
      {tilted && !moved && (
        <p className="pointer-events-none absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-medium text-white landscape:bottom-14">
          {t('explorer.showcase.dragHint', 'Drag to turn it round')}
        </p>
      )}
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
        {tilted && (
          <>
            <button type="button" onClick={() => step(-45)} className={ICON} aria-label={t('explorer.showcase.turnLeft', 'Turn left')} title={t('explorer.showcase.turnLeft', 'Turn left')}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => step(45)} className={ICON} aria-label={t('explorer.showcase.turnRight', 'Turn right')} title={t('explorer.showcase.turnRight', 'Turn right')}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
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
