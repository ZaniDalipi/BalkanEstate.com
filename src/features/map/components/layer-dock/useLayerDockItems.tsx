import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import type { DockApp } from '@/src/components/ui/mac-os-dock';

export type LayerId = 'climate' | 'premium' | '3d' | 'poi' | 'measure' | 'terrain' | 'cadastre' | 'legend';

interface LayerState {
  active: Record<LayerId, boolean>;
  promotedCount: number;
}

const ICONS: Record<LayerId, SoftIconName> = {
  climate: 'thermometer',
  premium: 'crown',
  '3d': 'cube',
  poi: 'landmark',
  measure: 'ruler',
  terrain: 'mountain',
  cadastre: 'mapGrid',
  legend: 'legend',
};

/** Dock items for the map layers, plus the ids that are switched on. */
export function useLayerDockItems({ active, promotedCount }: LayerState) {
  const { t } = useTranslation(['search', 'common']);

  const apps = useMemo<DockApp[]>(() => {
    const names: Record<LayerId, string> = {
      climate: t('search:map.climateRisks.title', 'Climate Risks'),
      premium: t('search:map.promoted', 'Premium'),
      '3d': t('common:aria.toggle3DBuildings', '3D buildings'),
      poi: t('common:aria.togglePointsOfInterest', 'Points of interest'),
      measure: t('search:map.measure', 'Measure'),
      terrain: t('search:terrain.toggle', 'Terrain'),
      cadastre: t('search:map.cadastre', 'Cadastre'),
      legend: t('search:map.legend', 'Legend'),
    };
    return (Object.keys(ICONS) as LayerId[]).map((id) => ({
      id,
      name: names[id],
      icon: <SoftIcon name={ICONS[id]} className="h-full w-full" />,
      badge: id === 'premium' && !active.premium ? promotedCount : undefined,
    }));
  }, [t, active.premium, promotedCount]);

  const openApps = useMemo(() => (Object.keys(active) as LayerId[]).filter((id) => active[id]), [active]);
  return { apps, openApps };
}
