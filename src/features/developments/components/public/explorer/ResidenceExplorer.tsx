import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { DevelopmentBuilding, DevelopmentFloor, Hotspot, PublicUnit } from '../../../types';
import type { ExplorerNav } from '../../../hooks/useExplorerUrlState';
import { countByAvailability } from '../../../utils/availability';
import { filterUnits, hasActiveCriteria, toggleIn, type UnitCriteria } from '../../../utils/unitFilters';
import { UnitFilters } from '../UnitFilters';
import { ExplorerStage } from './ExplorerStage';
import { useExplorerTarget } from './useExplorerTarget';

export interface ResidenceExplorerProps {
  slug: string;
  residenceName: string;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
  units: PublicUnit[];
  criteria: UnitCriteria;
  onCriteriaChange: (c: UnitCriteria) => void;
  nav: ExplorerNav;
  onNavChange: (n: ExplorerNav) => void;
  onOpenUnit: (unitId: string) => void;
  /** Rendered above the stage when there is something to explore. */
  header?: React.ReactNode;
  /** Rendered instead when no view is published (e.g. the cover hero). */
  fallback?: React.ReactNode;
}

/**
 * Public interactive explorer: Residence (development views) → Building
 * (building views, chips with "N available") → regions. Building/floor regions
 * drill in, unit regions open the details drawer, listing regions go to the
 * listing. Renders nothing when no view is published — the page then offers
 * filters + the unit grid alone, never an empty frame.
 */
export const ResidenceExplorer: React.FC<ResidenceExplorerProps> = (p) => {
  const { t } = useTranslation('developments');
  const target = useExplorerTarget({ slug: p.slug, residenceName: p.residenceName, nav: p.nav, buildings: p.buildings, floors: p.floors });

  const unitsById = useMemo(() => new Map(p.units.map((u) => [u.id, u])), [p.units]);
  const buildingsById = useMemo(() => new Map(p.buildings.map((b) => [b.id, b])), [p.buildings]);
  const matched = useMemo(() => filterUnits(p.units, p.criteria), [p.units, p.criteria]);
  const matchedIds = useMemo(
    () => (hasActiveCriteria(p.criteria) ? new Set(matched.map((u) => u.id)) : undefined),
    [matched, p.criteria]
  );
  // Legend counts cover what is on screen (this building / floor) and ignore the
  // availability filter itself, so a toggled state never disappears from it.
  const { type, buildingId } = target;
  const floorId = p.nav.floor;
  const legend = useMemo(() => {
    const scoped = p.units.filter((u) =>
      type === 'floor' ? u.floorId === floorId : type === 'building' ? u.buildingId === buildingId : true
    );
    return countByAvailability(filterUnits(scoped, { ...p.criteria, availability: [] }));
  }, [p.units, p.criteria, type, buildingId, floorId]);

  if (target.isLoading && target.views.length === 0 && !p.nav.building) {
    return <div className="aspect-video w-full animate-pulse bg-slate-200" aria-busy="true" />;
  }
  if (target.nothingPublished) return <>{p.fallback ?? null}</>;

  const onActivate = (h: Hotspot) => {
    if (h.linkType === 'unit') p.onOpenUnit(h.linkId);
    else if (h.linkType === 'building') p.onNavChange({ building: h.linkId });
    else if (h.linkType === 'floor') p.onNavChange({ building: target.buildingId, floor: h.linkId });
    else if (h.linkType === 'listing') navigate(paths.property(h.linkId));
  };

  if (!target.isLoading && target.views.length === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">{t('explorer.noViewsForTarget', 'No interactive view has been published for this yet.')}</p>
        {target.crumbs.length > 1 && (
          <button
            type="button"
            onClick={() => p.onNavChange(target.navForCrumb(target.crumbs.length - 2))}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {target.crumbs[target.crumbs.length - 2].label}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
    {p.header}
    <ExplorerStage
      views={target.views}
      viewIndex={target.viewIndex}
      onViewIndex={(i) => p.onNavChange({ ...p.nav, view: target.views[i]?.viewKey })}
      crumbs={target.crumbs}
      onCrumb={(i) => p.onNavChange(target.navForCrumb(i))}
      buildings={target.type === 'floor' ? [] : p.buildings}
      activeBuildingId={target.buildingId}
      onBuilding={(b) => p.onNavChange({ building: b.id })}
      legend={legend}
      selectedAvailability={p.criteria.availability ?? []}
      onToggleAvailability={(s) => p.onCriteriaChange(toggleIn(p.criteria, 'availability', s))}
      unitsById={unitsById}
      matchedIds={matchedIds}
      buildingsById={buildingsById}
      onActivate={onActivate}
      activeFilters={hasActiveCriteria(p.criteria)}
      filters={
        <UnitFilters units={p.units} criteria={p.criteria} onChange={p.onCriteriaChange} matchCount={matched.length} defaultExpanded />
      }
    />
    </>
  );
};
