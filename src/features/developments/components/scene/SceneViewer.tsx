import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublishedScene } from '../../hooks';
import { HotspotCanvas } from './HotspotCanvas';
import type { Hotspot, PublicUnit, SceneTargetType } from '../../types';

interface SceneViewerProps {
  slug: string;
  units: PublicUnit[];
  targetType?: SceneTargetType;
  targetId?: string;
}

const AVAILABILITY_FILL: Record<string, string> = {
  available: 'rgba(34,197,94,0.40)',
  reserved: 'rgba(245,158,11,0.40)',
  sold: 'rgba(113,113,122,0.45)',
  rented: 'rgba(59,130,246,0.40)',
  not_released: 'rgba(148,163,184,0.35)',
  unavailable: 'rgba(239,68,68,0.40)',
};

/**
 * Public interactive viewer: renders a development's published scene (aerial /
 * facade / floor plan) with its clickable regions. Unit regions are tinted by
 * availability; clicking a region navigates to the unit or listing it links to.
 * Renders nothing when no scene has been published for the target.
 */
export const SceneViewer: React.FC<SceneViewerProps> = ({
  slug,
  units,
  targetType = 'development',
  targetId,
}) => {
  const { t } = useTranslation('developments');
  const { scene } = usePublishedScene(slug, targetType, targetId);

  const availabilityByUnit = useMemo(() => {
    const m = new Map<string, string>();
    units.forEach((u) => m.set(u.id, u.availability));
    return m;
  }, [units]);

  if (!scene || !scene.hotspots || scene.hotspots.length === 0) return null;

  const colorOf = (h: Hotspot): string => {
    if (h.linkType === 'unit') {
      const av = availabilityByUnit.get(h.linkId);
      if (av && AVAILABILITY_FILL[av]) return AVAILABILITY_FILL[av];
    }
    return 'rgba(37,99,235,0.28)';
  };

  const onHotspotClick = (h: Hotspot) => {
    if (h.linkType === 'unit') navigate(paths.developmentUnit(slug, h.linkId));
    else if (h.linkType === 'listing') navigate(paths.property(h.linkId));
    // building / floor / entrance links are informational in this view.
  };

  return (
    <section aria-labelledby="explore-heading" className="mt-10">
      <h2 id="explore-heading" className="mb-3 text-2xl font-bold text-foreground">
        {t('scene.exploreHeading')}
      </h2>
      <HotspotCanvas
        imageUrl={scene.imageUrl}
        imageWidth={scene.imageWidth}
        imageHeight={scene.imageHeight}
        hotspots={scene.hotspots}
        mode="view"
        colorOf={colorOf}
        onHotspotClick={onHotspotClick}
      />
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(['available', 'reserved', 'sold'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: AVAILABILITY_FILL[s] }}
              aria-hidden="true"
            />
            {t(`availability.${s}`)}
          </span>
        ))}
      </div>
    </section>
  );
};
