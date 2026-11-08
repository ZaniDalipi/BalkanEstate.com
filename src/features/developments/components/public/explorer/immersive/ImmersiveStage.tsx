import React from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import { BuildingChips } from '../BuildingChips';
import { ExplorerCanvas } from '../ExplorerCanvas';
import { ExplorerLegend } from '../ExplorerLegend';
import type { ExplorerStageProps } from '../ExplorerStage';
import { FiltersOverlay } from '../FiltersOverlay';
import { StageTopBar } from '../StageTopBar';
import { ViewSwitcher } from '../ViewSwitcher';
import { HIDE_WHEN_IMMERSED } from '../dive/diveStyle';
import { useStageControls } from './useStageControls';
import { FRAME_DRIVEN } from '../../motion/frameDriven';

export interface ImmersiveStageProps extends ExplorerStageProps {
  /** The residence's own bar along the top (back, name, sections, call to action). */
  nav: React.ReactNode;
  /** The headline block on the left ("Find your home in …"). */
  intro: React.ReactNode;
}

/** Soft dark gradients so white text and controls read on any rendering. */
const SCRIMS = 'pointer-events-none absolute';

/**
 * The residence page's full-screen hero: the rendering fills the screen beside
 * the app sidebar, edge to edge (a blurred copy fills any band the picture
 * can't cover without cropping too much), with the residence's bar, the
 * headline and the explorer's controls laid over it. Every overlay fades away
 * while the buyer flies into an apartment.
 */
export const ImmersiveStage: React.FC<ImmersiveStageProps> = (p) => {
  const { t } = useTranslation('developments');
  const { fs, showFilters, setShowFilters, mode, setMode, onKeyDown } = useStageControls(p.views.length, p.viewIndex, p.onViewIndex);
  const reduced = useReducedMotion();
  const view = p.views[p.viewIndex];
  const full = fs.isFullscreen;
  // At the residence itself the bar and headline already name it; the trail appears once inside a building.
  const crumbs = p.crumbs.length > 1 ? p.crumbs : [];

  const stage = (
    <section
      ref={fs.stageRef}
      aria-label={t('explorer.heading', 'Interactive residence explorer')}
      onKeyDown={onKeyDown}
      style={full ? { zIndex: 4000 } : undefined}
      className={cn('group/stage overflow-hidden bg-slate-950', full ? 'fixed inset-0' : 'relative h-dvh w-full')}
      data-testid="immersive-stage"
    >
      {view && (
        <img
          src={optimizeImageUrl(view.imageUrl, { width: 640 })}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl"
        />
      )}
      {view && (
        <motion.div
          key={view.viewKey}
          {...FRAME_DRIVEN}
          className="absolute inset-0"
          initial={reduced ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <ExplorerCanvas
            fit="cover"
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
            openUnitId={p.openUnitId}
          />
        </motion.div>
      )}

      <div className={cn(SCRIMS, 'inset-x-0 top-0 h-44 bg-gradient-to-b from-black/60 via-black/25 to-transparent', HIDE_WHEN_IMMERSED)} />
      <div className={cn(SCRIMS, 'inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black/50 via-black/15 to-transparent landscape:hidden', HIDE_WHEN_IMMERSED)} />
      <div className={cn(SCRIMS, 'inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/50 to-transparent', HIDE_WHEN_IMMERSED)} />

      <div className={cn('absolute inset-x-0 top-0 z-30', HIDE_WHEN_IMMERSED)}>{p.nav}</div>

      <div className="absolute inset-x-3 top-[4.75rem] z-20 xl:inset-x-7 landscape:top-14">
        <StageTopBar
          crumbs={crumbs}
          onCrumb={p.onCrumb}
          actions={p.actions}
          filtersOpen={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
          activeFilters={p.activeFilters}
          fullscreen={full}
          onToggleFullscreen={fs.toggle}
        />
      </div>

      <div className={cn('pointer-events-none absolute left-8 top-1/2 z-10 w-[min(30rem,42%)] -translate-y-1/2 xl:left-12 landscape:hidden', HIDE_WHEN_IMMERSED)}>
        {p.intro}
        {p.buildings.length > 1 && (
          <div className="pointer-events-auto mt-7">
            <BuildingChips buildings={p.buildings} activeId={p.activeBuildingId} onSelect={p.onBuilding} />
          </div>
        )}
      </div>

      <div className={cn('absolute bottom-6 left-8 z-10 max-w-[40%] xl:left-12', HIDE_WHEN_IMMERSED)}>
        <ExplorerLegend
          counts={p.legend}
          selected={p.selectedAvailability}
          onToggle={p.onToggleAvailability}
          showAvailability={mode === 'availability'}
          onToggleShowAvailability={() => setMode(mode === 'availability' ? 'clean' : 'availability')}
        />
      </div>

      <div className={cn('absolute bottom-6 left-1/2 z-10 -translate-x-1/2', HIDE_WHEN_IMMERSED)}>
        <ViewSwitcher views={p.views} index={p.viewIndex} onChange={p.onViewIndex} />
      </div>

      {showFilters && (
        <div className="absolute inset-x-0 bottom-0 top-[7.5rem] z-30">
          <FiltersOverlay fullscreen onClose={() => setShowFilters(false)}>
            {p.filters}
          </FiltersOverlay>
        </div>
      )}
    </section>
  );

  return full && typeof document !== 'undefined' ? (
    <>
      <div className="h-dvh w-full bg-slate-950" aria-hidden="true" />
      {createPortal(stage, document.body)}
    </>
  ) : (
    stage
  );
};
