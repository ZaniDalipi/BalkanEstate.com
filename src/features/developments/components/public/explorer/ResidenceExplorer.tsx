import React from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { DevelopmentBuilding, DevelopmentFloor, Hotspot, PublicUnit } from '../../../types';
import type { ExplorerNav } from '../../../hooks/useExplorerUrlState';
import { hasActiveCriteria, toggleIn, type UnitCriteria } from '../../../utils/unitFilters';
import { UnitFilters } from '../UnitFilters';
import { ExplorerStage } from './ExplorerStage';
import { useExplorerData } from './useExplorerData';
import { useExplorerTarget } from './useExplorerTarget';
import { BudgetAssistant } from './budget/BudgetAssistant';
import { EXPLORER_PILL } from './explorerPill';
import { FloorByFloor } from './FloorByFloor';
import { useFlyToUnit } from './useFlyToUnit';

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
  /** The apartment open in the details sheet (from `?unit=`). */
  openUnitId?: string | null;
  /** Where the residence is: the budget helper compares prices with this city's average. */
  city?: string;
  country?: string;
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

  const { type, buildingId } = target;
  const floorId = p.nav.floor;
  const { unitsById, buildingsById, buildingFacts, matched, matchedIds, legend } = useExplorerData({
    units: p.units,
    buildings: p.buildings,
    criteria: p.criteria,
    type,
    buildingId,
    floorId,
  });
  const trip = useFlyToUnit({
    unitsById,
    views: target.views,
    viewIndex: target.viewIndex,
    isLoading: target.isLoading,
    nav: p.nav,
    buildingId: target.buildingId,
    onNavChange: p.onNavChange,
    onOpenUnit: p.onOpenUnit,
  });
  // Anything the buyer does themselves takes over from the budget helper's trip.
  const go = (n: ExplorerNav) => {
    trip.cancel();
    p.onNavChange(n);
  };

  if (target.isLoading && target.views.length === 0 && !p.nav.building) {
    return <div className="aspect-video w-full animate-pulse bg-slate-200" aria-busy="true" />;
  }
  if (target.nothingPublished) return <>{p.fallback ?? null}</>;

  const onActivate = (h: Hotspot) => {
    trip.cancel();
    if (h.linkType === 'unit') p.onOpenUnit(h.linkId);
    else if (h.linkType === 'building') go({ building: h.linkId });
    else if (h.linkType === 'floor') go({ building: target.buildingId, floor: h.linkId });
    else if (h.linkType === 'listing') navigate(paths.property(h.linkId));
  };

  const building = target.buildingId ? buildingsById.get(target.buildingId) : undefined;
  const floorList = (
    back?: { label: string; onClick: () => void },
    note?: string
  ) => (
    <FloorByFloor
      title={building?.name ?? t('scene.linkTypes.building', 'Building')}
      floors={p.floors.filter((f) => f.buildingId === target.buildingId && (!floorId || f.id === floorId))}
      units={p.units.filter((u) => (floorId ? u.floorId === floorId : u.buildingId === target.buildingId))}
      matchedIds={matchedIds}
      onOpenUnit={p.onOpenUnit}
      openUnitId={p.openUnitId}
      back={back}
      note={note}
    />
  );

  if (!target.isLoading && target.views.length === 0) {
    // No picture for this building/floor yet: still open it, as a floor-by-floor plan.
    const crumb = target.crumbs.length > 1 ? target.crumbs[target.crumbs.length - 2] : undefined;
    return (
      <>
        {p.header}
        {floorList(crumb && { label: crumb.label, onClick: () => go(target.navForCrumb(target.crumbs.length - 2)) })}
      </>
    );
  }
  // A building/floor picture with nothing marked on it yet: keep every apartment reachable below it.
  const unmarked = type !== 'development' && !target.isLoading && target.views.every((v) => v.hotspots.length === 0);

  return (
    <>
    {p.header}
    <ExplorerStage
      views={target.views}
      viewIndex={target.viewIndex}
      onViewIndex={(i) => go({ ...p.nav, view: target.views[i]?.viewKey })}
      crumbs={target.crumbs}
      onCrumb={(i) => go(target.navForCrumb(i))}
      buildings={target.type === 'floor' ? [] : p.buildings}
      activeBuildingId={target.buildingId}
      onBuilding={(b) => go({ building: b.id })}
      legend={legend}
      selectedAvailability={p.criteria.availability ?? []}
      onToggleAvailability={(s) => p.onCriteriaChange(toggleIn(p.criteria, 'availability', s))}
      unitsById={unitsById}
      matchedIds={matchedIds}
      buildingsById={buildingsById}
      buildingFacts={buildingFacts}
      onActivate={onActivate}
      activeFilters={hasActiveCriteria(p.criteria)}
      actions={<BudgetAssistant units={p.units} city={p.city} country={p.country} onShow={trip.start} buttonClassName={EXPLORER_PILL} />}
      focus={trip.focus}
      onFocusArrive={trip.onArrive}
      filters={
        <UnitFilters units={p.units} criteria={p.criteria} onChange={p.onCriteriaChange} matchCount={matched.length} defaultExpanded />
      }
    />
    {unmarked && floorList(undefined, t('explorer.unmarkedNote', 'Apartments aren’t marked on this picture yet — choose one floor by floor below.'))}
    </>
  );
};
