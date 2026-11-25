import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { Maximize2, Minimize2, SlidersHorizontal } from 'lucide-react';
import { ExplorerBreadcrumb, type Crumb } from './ExplorerBreadcrumb';
import { EXPLORER_PILL } from './explorerPill';
import { HIDE_WHEN_IMMERSED } from './dive/diveStyle';

interface StageTopBarProps {
  crumbs: Crumb[];
  onCrumb: (i: number) => void;
  /** Extra buttons before the filters toggle; their popups anchor under this bar. */
  actions?: React.ReactNode;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilters: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  /**
   * On the page (not full screen): on phones the bar sits in the band above the picture instead of over it,
   * so the small picture stays clear to tap. From tablet up it floats over the picture as before.
   */
  docked?: boolean;
}

/**
 * While an action's popup (e.g. the budget panel, `aria-haspopup="dialog"`) is
 * open, the bar rises above the building chips, the legend and the stats card
 * below the picture, so the popup is always the top layer. The filters toggle
 * has no popup of its own, so the filters overlay still covers the bar.
 */
const RAISED_WHILE_POPUP_OPEN = 'has-[[aria-haspopup=dialog][aria-expanded=true]]:z-40';

/** Over the picture, clear of the notch and rounded corners in full screen. */
const FLOATING =
  'absolute items-start left-[calc(var(--stage-safe-left,0px)+0.75rem)] right-[calc(var(--stage-safe-right,0px)+0.75rem)] top-[calc(var(--stage-safe-top,0px)+0.75rem)]';
/** Docked: in the band above the picture on phones (first in the stage's column), floating from tablet up. */
const DOCKED = 'relative order-first items-center px-3 pb-2 pt-3 sm:absolute sm:order-none sm:items-start sm:p-0 sm:left-3 sm:right-3 sm:top-3';

/** The bar at the top of the picture: breadcrumb on the left, helper/filters/full-screen buttons on the right. */
export const StageTopBar: React.FC<StageTopBarProps> = (p) => {
  const { t } = useTranslation('developments');
  return (
    <div
      className={cn(
        'pointer-events-none z-10 flex justify-between gap-2',
        p.docked ? DOCKED : FLOATING,
        RAISED_WHILE_POPUP_OPEN,
        HIDE_WHEN_IMMERSED
      )}
    >
      {/* Only the chip itself takes taps; the free space beside it still reaches the picture. */}
      <div className="min-w-0 flex-1">
        {/* Docked on a phone at the top level, the residence name is already the page title: say what to do instead. */}
        {p.docked && p.crumbs.length <= 1 && (
          <p className="text-[13px] leading-snug text-white/80 sm:hidden">{t('explorer.phoneHint', 'Tap a building to explore · pinch to zoom')}</p>
        )}
        {p.crumbs.length > 0 && (
          <div className={cn(p.docked && p.crumbs.length <= 1 && 'hidden sm:block')}>
            <ExplorerBreadcrumb crumbs={p.crumbs} onSelect={p.onCrumb} />
          </div>
        )}
      </div>
      <div className="pointer-events-auto relative flex shrink-0 gap-2">
        {p.actions}
        <button type="button" className={EXPLORER_PILL} onClick={p.onToggleFilters} aria-expanded={p.filtersOpen}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('filters.heading', 'Find your home')}</span>
          {p.activeFilters && <span className="h-2 w-2 rounded-full bg-primary" aria-label={t('explorer.filtersActive', 'Filters active')} />}
        </button>
        <button
          type="button"
          className={EXPLORER_PILL}
          onClick={p.onToggleFullscreen}
          aria-pressed={p.fullscreen}
          aria-label={p.fullscreen ? t('explorer.exitFullscreen', 'Exit full screen') : t('explorer.fullscreen', 'Full screen')}
        >
          {p.fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};
