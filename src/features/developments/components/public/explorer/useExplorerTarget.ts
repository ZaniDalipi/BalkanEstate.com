import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicViews } from '../../../hooks/useScenes';
import type { DevelopmentBuilding, DevelopmentFloor, SceneTargetType } from '../../../types';
import type { ExplorerNav } from '../../../hooks/useExplorerUrlState';
import type { Crumb } from './ExplorerBreadcrumb';

interface Args {
  slug: string;
  residenceName: string;
  nav: ExplorerNav;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
}

/**
 * Resolve where the explorer is (residence → building → floor) and load that
 * target's published camera views. A residence without views of its own opens
 * on its first building (the East Gate B2 entry point) and drops the
 * "Residence" crumb, so there is never an empty top level to go back to.
 */
export function useExplorerTarget({ slug, residenceName, nav, buildings, floors }: Args) {
  const { t } = useTranslation('developments');
  const root = usePublicViews(slug, 'development');
  const ordered = useMemo(() => [...buildings].sort((a, b) => a.order - b.order), [buildings]);
  const rootEmpty = !root.isLoading && root.views.length === 0;

  const floor = nav.floor ? floors.find((f) => f.id === nav.floor) : undefined;
  const buildingId = nav.building ?? floor?.buildingId ?? (rootEmpty ? ordered[0]?.id : undefined);
  const building = buildingId ? buildings.find((b) => b.id === buildingId) : undefined;

  const type: SceneTargetType = nav.floor ? 'floor' : buildingId ? 'building' : 'development';
  const targetId = nav.floor ?? buildingId;
  const target = usePublicViews(slug, type, type === 'development' ? undefined : targetId);
  const views = type === 'development' ? root.views : target.views;
  const isLoading = root.isLoading || (type !== 'development' && target.isLoading);

  const viewIndex = Math.max(0, views.findIndex((v) => v.viewKey === nav.view));

  const crumbs: Crumb[] = [];
  if (!rootEmpty) crumbs.push({ key: 'residence', label: residenceName || t('explorer.residence', 'Residence') });
  if (buildingId) crumbs.push({ key: `b:${buildingId}`, label: building?.name ?? t('scene.linkTypes.building', 'Building') });
  if (nav.floor) crumbs.push({ key: `f:${nav.floor}`, label: floor?.label ?? t('scene.linkTypes.floor', 'Floor') });

  /** Nav for the i-th crumb (going back up). */
  const navForCrumb = (i: number): ExplorerNav => {
    const c = crumbs[i];
    if (!c || c.key === 'residence') return {};
    if (c.key.startsWith('b:')) return { building: c.key.slice(2) };
    return { building: buildingId, floor: nav.floor };
  };

  return {
    views,
    viewIndex,
    isLoading,
    crumbs,
    navForCrumb,
    type,
    buildingId,
    /** Nothing published anywhere we would open on: the page shows filters + grid only. */
    nothingPublished: !isLoading && rootEmpty && (type === 'development' || views.length === 0) && !nav.building && !nav.floor,
  };
}
