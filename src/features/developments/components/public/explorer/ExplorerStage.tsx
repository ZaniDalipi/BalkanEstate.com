import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { ExplorerCanvas } from './ExplorerCanvas';
import { ViewSwitcher } from './ViewSwitcher';
import { FiltersOverlay } from './FiltersOverlay';
import { StageTopBar } from './StageTopBar';
import { useStageControls } from './immersive/useStageControls';
import { HIDE_WHEN_IMMERSED } from './dive/diveStyle';
import { OrbitView } from './orbit/OrbitView';
import { ExplorerStageControls } from './ExplorerStageControls';
import { useFloorPreview } from './floors/useFloorPreview';
import type { ExplorerStageProps } from './explorerStageProps';

export type { ExplorerStageProps };

/**
 * Full-bleed explorer layout (East Gate B2): the rendering edge to edge with
 * the breadcrumb, building chips, legend, camera arrows and zoom laid over it.
 * On phones the chips and legend flow below the image so they don't bury it.
 * ←/→ switch camera views; the full-screen toggle portals the stage to <body>.
 * While the buyer dives into an apartment the controls fade away (`group/stage`).
 */
export const ExplorerStage: React.FC<ExplorerStageProps> = (p) => {
  const { t } = useTranslation('developments');
  const targetKey = p.crumbs.map((c) => c.key).join('/');
  const level = p.floors?.find((f) => f.id === p.activeFloorId)?.level;
  const { fs, showFilters, setShowFilters, mode, setMode, onKeyDown, orbit } = useStageControls(p.views, p.viewIndex, p.onViewIndex, targetKey, level);
  const preview = useFloorPreview(p.unitsById, p.onPointFloor);
  const view = p.views[p.viewIndex];
  const full = fs.isFullscreen;

  const stage = (
    <section
      ref={fs.stageRef}
      aria-label={t('explorer.heading', 'Interactive residence explorer')}
      onKeyDown={onKeyDown}
      style={full ? { zIndex: 4000 } : undefined}
      className={cn(
        'group/stage bg-slate-900',
        // Off full screen, desktop keeps the controls in bands above/below the
        // image so they never cover the top or ground-floor apartments.
        full ? 'fixed inset-0 flex items-center justify-center overflow-hidden' : 'relative w-full sm:pb-32 sm:pt-28 lg:pb-[4.5rem]'
      )}
    >
      <div className={full ? 'absolute inset-0 flex items-center justify-center' : 'relative sm:static'}>
        {view && (
          // Views of one building orbit into each other; a new building fades in, so drilling in after the glide reads as one move.
          <OrbitView viewKey={`${targetKey}:${view.viewKey}`} move={orbit.move}>
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
              openUnitId={p.openUnitId}
              litUnitIds={preview.litUnitIds}
            />
          </OrbitView>
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

        <div className={cn('absolute bottom-3 left-1/2 z-10 -translate-x-1/2 lg:left-auto lg:right-3 lg:translate-x-0', HIDE_WHEN_IMMERSED)}>
          <ViewSwitcher views={p.views} index={p.viewIndex} onChange={orbit.switchTo} />
        </div>
      </div>

      <ExplorerStageControls
        fullscreen={full}
        buildings={p.buildings}
        activeBuildingId={p.activeBuildingId}
        onBuilding={p.onBuilding}
        floors={p.floors}
        activeFloorId={p.activeFloorId}
        onFloor={p.onFloor}
        onPreviewFloor={preview.setPreviewFloorId}
        legend={p.legend}
        selectedAvailability={p.selectedAvailability}
        onToggleAvailability={p.onToggleAvailability}
        showAvailability={mode === 'availability'}
        onToggleShowAvailability={() => setMode(mode === 'availability' ? 'clean' : 'availability')}
      />

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
