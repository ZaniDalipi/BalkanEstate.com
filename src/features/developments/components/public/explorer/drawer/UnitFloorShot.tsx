import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../../../types';
import { useUnitText } from '../useUnitText';
import { FloorShotView } from './showcase/FloorShotView';
import type { FloorShotState } from './showcase/floorShotState';

interface UnitFloorShotProps {
  unit: PublicUnit;
  floor: FloorShotState;
  /** `hero`: it leads the details (the apartment has no photo or plan); `section`: a section among them. */
  variant: 'hero' | 'section';
}

/**
 * Phones: the apartment on its floor's picture inside the details sheet —
 * the picture the developer posted for that floor, the apartment outlined —
 * with a placeholder while it loads and a way to try again when it could not.
 */
export const UnitFloorShot: React.FC<UnitFloorShotProps> = ({ unit, floor, variant }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  if (floor.status === 'none') return null;
  const hero = variant === 'hero';
  const floorName = [unit.floorLabel, unit.buildingName].filter(Boolean).join(' · ');
  const box = hero ? 'w-full' : 'w-full overflow-hidden rounded-2xl ring-1 ring-slate-200';

  let body: React.ReactNode;
  if (floor.status === 'ready') {
    const { view } = floor.shot;
    const ratio = view.imageWidth && view.imageHeight ? `${view.imageWidth} / ${view.imageHeight}` : '16 / 9';
    const alt = t('explorer.showcase.floorAlt', { name: txt.title(unit), floor: unit.floorLabel ?? '', defaultValue: '{{floor}}: {{name}} highlighted' });
    body = <FloorShotView shot={floor.shot} alt={alt} caption={floorName || undefined} className={box} style={{ aspectRatio: ratio }} />;
  } else if (floor.status === 'loading') {
    body = (
      <div aria-busy="true" className={cn(box, 'aspect-[3/2] animate-pulse bg-slate-100 motion-reduce:animate-none')}>
        <span className="sr-only">{t('explorer.showcase.loading', 'Loading the floor picture…')}</span>
      </div>
    );
  } else {
    body = (
      <div role="alert" className={cn(box, 'flex flex-col items-center gap-2 bg-slate-50 px-4 py-6 text-center')}>
        <p className="text-sm text-slate-600">{t('explorer.showcase.floorFailed', 'The floor picture could not be loaded.')}</p>
        <button type="button" onClick={floor.retry} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <SoftIcon name="refresh" className="h-5 w-5" />
          {t('explorer.showcase.retry', 'Try again')}
        </button>
      </div>
    );
  }

  if (hero) return body;
  return (
    <section aria-label={t('explorer.showcase.modeFloor', 'On its floor')} className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">{t('explorer.showcase.modeFloor', 'On its floor')}</h3>
      {body}
    </section>
  );
};
