import React from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2, Minimize2, SlidersHorizontal } from 'lucide-react';
import { ExplorerBreadcrumb, type Crumb } from './ExplorerBreadcrumb';
import { EXPLORER_PILL } from './explorerPill';

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
}

/** The bar over the top of the picture: breadcrumb on the left, helper/filters/full-screen buttons on the right. */
export const StageTopBar: React.FC<StageTopBarProps> = (p) => {
  const { t } = useTranslation('developments');
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
      <div className="pointer-events-auto">
        <ExplorerBreadcrumb crumbs={p.crumbs} onSelect={p.onCrumb} />
      </div>
      <div className="pointer-events-auto relative flex gap-2">
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
