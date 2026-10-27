import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { PublicSceneView } from '../../../types';

interface ViewSwitcherProps {
  views: PublicSceneView[];
  index: number;
  onChange: (index: number) => void;
}

const DIRECTION_DEFAULTS: Record<string, string> = {
  front: 'Front view',
  back: 'Back view',
  left: 'Left view',
  right: 'Right view',
  aerial: 'Aerial view',
  courtyard: 'Courtyard view',
  custom: 'View',
};

export const useViewName = () => {
  const { t } = useTranslation('developments');
  return (v: PublicSceneView) =>
    v.viewName || t(`explorer.direction.${v.viewDirection}`, DIRECTION_DEFAULTS[v.viewDirection] ?? 'View');
};

const arrow =
  'flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Camera-view switcher (East Gate's arrows): previous / next, a dot per view
 * and the current view's name. ←/→ are handled by the explorer stage.
 */
export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ views, index, onChange }) => {
  const { t } = useTranslation('developments');
  const nameOf = useViewName();
  if (views.length < 2) return null;
  const go = (d: number) => onChange((index + d + views.length) % views.length);
  const current = views[index];
  return (
    <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={arrow} onClick={() => go(-1)} aria-label={t('explorer.prevView', 'Previous view')}>
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="flex min-w-[100px] flex-col items-center rounded-full bg-black/55 px-3 py-1 sm:px-4 sm:py-1.5 text-white backdrop-blur">
        <span className="text-sm font-semibold" aria-live="polite">{nameOf(current)}</span>
        <span className="mt-1 hidden gap-1.5 sm:flex" role="tablist" aria-label={t('explorer.views', 'Camera views')}>
          {views.map((v, i) => (
            <button
              key={v.viewKey}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={nameOf(v)}
              onClick={() => onChange(i)}
              className={cn('h-2 min-h-0 w-2 min-w-0 rounded-full p-0 transition-colors', i === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70')}
            />
          ))}
        </span>
      </div>
      <button type="button" className={arrow} onClick={() => go(1)} aria-label={t('explorer.nextView', 'Next view')}>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
};
