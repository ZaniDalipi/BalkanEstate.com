import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublishedScene } from '../../hooks';
import { HotspotCanvas } from './HotspotCanvas';
import type { Hotspot, PublicUnit, SceneTargetType } from '../../types';

interface SceneViewerProps {
  slug: string;
  units: PublicUnit[];
}

/** One level of the drill-down stack (site plan → building → floor). */
interface Crumb {
  type: SceneTargetType;
  id?: string;
  label: string;
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
 * Public interactive viewer with drill-down: starts on the development site
 * plan and, when a building or floor region is clicked, descends into that
 * target's own published scene (a facade or floor plan) — the East Gate
 * site-map → building → floor flow. Unit regions are tinted by availability and
 * navigate to the unit; listing regions navigate to the listing. A breadcrumb
 * walks back up. Renders nothing when the development itself has no scene.
 */
export const SceneViewer: React.FC<SceneViewerProps> = ({ slug, units }) => {
  const { t } = useTranslation('developments');
  const [stack, setStack] = useState<Crumb[]>([{ type: 'development', label: t('scene.sitePlan') }]);
  const current = stack[stack.length - 1];

  const { scene, isLoading } = usePublishedScene(slug, current.type, current.id);

  const availabilityByUnit = useMemo(() => {
    const m = new Map<string, string>();
    units.forEach((u) => m.set(u.id, u.availability));
    return m;
  }, [units]);

  // At the root with nothing published, stay out of the page entirely.
  const atRoot = stack.length === 1;
  if (atRoot && !isLoading && (!scene || scene.hotspots.length === 0)) return null;

  const colorOf = (h: Hotspot): string => {
    if (h.linkType === 'unit') {
      const av = availabilityByUnit.get(h.linkId);
      if (av && AVAILABILITY_FILL[av]) return AVAILABILITY_FILL[av];
    }
    return 'rgba(37,99,235,0.28)';
  };

  const onHotspotClick = (h: Hotspot) => {
    if (h.linkType === 'unit') {
      navigate(paths.developmentUnit(slug, h.linkId));
    } else if (h.linkType === 'listing') {
      navigate(paths.property(h.linkId));
    } else if (h.linkType === 'building' || h.linkType === 'floor') {
      // Descend into the clicked target's own scene.
      setStack((prev) => [
        ...prev,
        { type: h.linkType as SceneTargetType, id: h.linkId, label: h.label || t(`scene.linkTypes.${h.linkType}`) },
      ]);
    }
  };

  const goTo = (index: number) => setStack((prev) => prev.slice(0, index + 1));

  return (
    <section aria-labelledby="explore-heading" className="mt-10">
      <h2 id="explore-heading" className="mb-3 text-2xl font-bold text-foreground">
        {t('scene.exploreHeading')}
      </h2>

      {/* Breadcrumb trail */}
      {stack.length > 1 && (
        <nav aria-label="breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-sm">
          {stack.map((c, i) => {
            const last = i === stack.length - 1;
            return (
              <span key={`${c.type}-${c.id ?? 'root'}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
                {last ? (
                  <span className="font-medium text-foreground">{c.label}</span>
                ) : (
                  <button type="button" onClick={() => goTo(i)} className="text-primary hover:underline">
                    {c.label}
                  </button>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {scene && scene.hotspots.length > 0 ? (
        <HotspotCanvas
          imageUrl={scene.imageUrl}
          imageWidth={scene.imageWidth}
          imageHeight={scene.imageHeight}
          hotspots={scene.hotspots}
          mode="view"
          colorOf={colorOf}
          onHotspotClick={onHotspotClick}
        />
      ) : (
        !isLoading && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t('scene.noPlanForTarget')}
          </div>
        )
      )}

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
