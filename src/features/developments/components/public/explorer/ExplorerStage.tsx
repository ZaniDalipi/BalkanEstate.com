import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilding, DevelopmentEntrance, Hotspot, PublicSceneView, PublicUnit, UnitAvailability } from '../../../types';
import { ExplorerCanvas } from './ExplorerCanvas';
import { ViewSwitcher } from './ViewSwitcher';
import type { Crumb } from './ExplorerBreadcrumb';
import { FiltersOverlay } from './FiltersOverlay';
import { StageTopBar } from './StageTopBar';
import type { ExplorerFocus } from './useFlyFocus';
import { BuildingChips } from './BuildingChips';
import { ExplorerLegend } from './ExplorerLegend';
import { usePseudoFullscreen } from './usePseudoFullscreen';
import { useDisplayMode } from './useDisplayMode';
import type { BuildingFacts } from './useRegionCard';

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
  entrancesById?: Map<string, DevelopmentEntrance>;
  buildingFacts?: Map<string, BuildingFacts>;
  onActivate: (h: Hotspot) => void;
  /** The shared filter panel, shown over the stage on demand. */
  filters: React.ReactNode;
  activeFilters: boolean;
  /** Extra buttons before the filters toggle (the budget helper); their popups anchor under the bar. */
  actions?: React.ReactNode;
  /** Region the explorer is gliding to; see ExplorerCanvas. */
  focus?: ExplorerFocus;
  onFocusArrive?: (h: Hotspot) => void;
}

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
  const [mode, setMode] = useDisplayMode();
  const reduced = useReducedMotion();
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
          // Each picture fades in, so drilling into a building after the glide reads as one move.
          <motion.div
            key={view.viewKey}
            className="w-full"
            initial={reduced ? false : { opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <ExplorerCanvas
              view={view}
              unitsById={p.unitsById}
              matchedIds={p.matchedIds}
              buildingsById={p.buildingsById}
              entrancesById={p.entrancesById}
              buildingFacts={p.buildingFacts}
              mode={mode}
              onActivate={p.onActivate}
              fullscreen={full}
              focus={p.focus}
              onFocusArrive={p.onFocusArrive}
            />
          </motion.div>
        )}

        <StageTopBar
          crumbs={p.crumbs}
          onCrumb={p.onCrumb}
          actions={p.actions}
          filtersOpen={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
          activeFilters={p.activeFilters}
          fullscreen={full}
          onToggleFullscreen={fs.toggle}
        />

        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 lg:left-auto lg:right-3 lg:translate-x-0">
          <ViewSwitcher views={p.views} index={p.viewIndex} onChange={p.onViewIndex} />
        </div>
      </div>

      <div className={cn(float, 'z-10 px-3 pt-3 sm:left-3 sm:top-16 sm:p-0', full && 'left-3 top-16 p-0')}>
        <BuildingChips buildings={p.buildings} activeId={p.activeBuildingId} onSelect={p.onBuilding} />
      </div>

      <div className={cn(float, 'z-10 px-3 py-3 sm:bottom-[4.25rem] sm:left-3 sm:p-0 lg:bottom-3', full && 'bottom-20 left-3 p-0 lg:bottom-3')}>
        <ExplorerLegend
          counts={p.legend}
          selected={p.selectedAvailability}
          onToggle={p.onToggleAvailability}
          showAvailability={mode === 'availability'}
          onToggleShowAvailability={() => setMode(mode === 'availability' ? 'clean' : 'availability')}
        />
      </div>

      {showFilters && (
        <FiltersOverlay fullscreen={full} onClose={() => setShowFilters(false)}>
          {p.filters}
        </FiltersOverlay>
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
