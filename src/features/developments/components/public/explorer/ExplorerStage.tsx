import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Maximize2, Minimize2, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilding, Hotspot, PublicSceneView, PublicUnit, UnitAvailability } from '../../../types';
import { ExplorerCanvas } from './ExplorerCanvas';
import { ViewSwitcher } from './ViewSwitcher';
import { ExplorerBreadcrumb, type Crumb } from './ExplorerBreadcrumb';
import { BuildingChips } from './BuildingChips';
import { ExplorerLegend } from './ExplorerLegend';
import { usePseudoFullscreen } from './usePseudoFullscreen';

export interface ExplorerStageProps {
  views: PublicSceneView[];
  viewIndex: number;
  onViewIndex: (i: number) => void;
  crumbs: Crumb[];
  onCrumb: (i: number) => void;
  buildings: DevelopmentBuilding[];
  activeBuildingId?: string;
  onBuilding: (b: DevelopmentBuilding) => void;
  legend: Array<{ state: UnitAvailability; count: number }>;
  selectedAvailability: readonly UnitAvailability[];
  onToggleAvailability: (s: UnitAvailability) => void;
  unitsById: Map<string, PublicUnit>;
  matchedIds?: Set<string>;
  buildingsById: Map<string, DevelopmentBuilding>;
  onActivate: (h: Hotspot) => void;
  /** The shared filter panel, shown over the stage on demand. */
  filters: React.ReactNode;
  activeFilters: boolean;
}

const pill =
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/95 px-3 text-sm font-semibold text-slate-800 shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Full-bleed explorer layout (East Gate B2): the rendering edge to edge with
 * the breadcrumb, building chips, legend, camera arrows and zoom laid over it.
 * On phones the chips and legend flow below the image so they don't bury it.
 * ←/→ switch camera views; the full-screen toggle portals the stage to <body>.
 */
export const ExplorerStage: React.FC<ExplorerStageProps> = (p) => {
  const { t } = useTranslation('developments');
  const fs = usePseudoFullscreen<HTMLElement>();
  const [showFilters, setShowFilters] = useState(false);
  const view = p.views[p.viewIndex];
  const full = fs.isFullscreen;
  const float = full ? 'absolute' : 'relative sm:absolute';

  const onKeyDown = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || p.views.length < 2) return;
    if (e.key === 'ArrowRight') p.onViewIndex((p.viewIndex + 1) % p.views.length);
    else if (e.key === 'ArrowLeft') p.onViewIndex((p.viewIndex - 1 + p.views.length) % p.views.length);
  };

  const stage = (
    <section
      ref={fs.stageRef}
      aria-label={t('explorer.heading', 'Interactive residence explorer')}
      onKeyDown={onKeyDown}
      style={full ? { zIndex: 4000 } : undefined}
      className={cn(
        'bg-slate-900',
        // Off full screen, desktop keeps the controls in bands above/below the
        // image so they never cover the top or ground-floor apartments.
        full ? 'fixed inset-0 flex items-center justify-center overflow-hidden' : 'relative w-full sm:pb-32 sm:pt-28 lg:pb-[4.5rem]'
      )}
    >
      <div className={full ? 'absolute inset-0 flex items-center justify-center' : 'relative sm:static'}>
        {view && (
          <ExplorerCanvas
            key={view.viewKey}
            view={view}
            unitsById={p.unitsById}
            matchedIds={p.matchedIds}
            buildingsById={p.buildingsById}
            onActivate={p.onActivate}
            fullscreen={full}
          />
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <div className="pointer-events-auto">
            <ExplorerBreadcrumb crumbs={p.crumbs} onSelect={p.onCrumb} />
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button type="button" className={pill} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('filters.heading', 'Find your home')}</span>
              {p.activeFilters && <span className="h-2 w-2 rounded-full bg-primary" aria-label={t('explorer.filtersActive', 'Filters active')} />}
            </button>
            <button
              type="button"
              className={pill}
              onClick={fs.toggle}
              aria-pressed={full}
              aria-label={full ? t('explorer.exitFullscreen', 'Exit full screen') : t('explorer.fullscreen', 'Full screen')}
            >
              {full ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
          <ViewSwitcher views={p.views} index={p.viewIndex} onChange={p.onViewIndex} />
        </div>
      </div>

      <div className={cn(float, 'z-10 px-3 pt-3 sm:left-3 sm:top-16 sm:p-0', full && 'left-3 top-16 p-0')}>
        <BuildingChips buildings={p.buildings} activeId={p.activeBuildingId} onSelect={p.onBuilding} />
      </div>

      <div className={cn(float, 'z-10 px-3 py-3 sm:bottom-[4.25rem] sm:left-3 sm:p-0 lg:bottom-3', full && 'bottom-20 left-3 p-0 lg:bottom-3')}>
        <ExplorerLegend counts={p.legend} selected={p.selectedAvailability} onToggle={p.onToggleAvailability} />
      </div>

      {showFilters && (
        <div
          className={cn(
            'z-20 overflow-y-auto',
            full
              ? 'absolute inset-x-2 top-3 max-h-[calc(100%-1.5rem)] sm:left-auto sm:right-3 sm:w-[420px]'
              : 'relative px-2 pb-2 sm:absolute sm:right-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-[420px] sm:p-0'
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md hover:bg-white"
              aria-label={t('explorer.closeFilters', 'Close filters')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {p.filters}
        </div>
      )}
    </section>
  );

  return full && typeof document !== 'undefined' ? (
    <>
      <div className="aspect-video w-full bg-slate-900" aria-hidden="true" />
      {createPortal(stage, document.body)}
    </>
  ) : (
    stage
  );
};
