import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, X, SlidersHorizontal } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublishedScene } from '../../hooks';
import { HotspotCanvas } from './HotspotCanvas';
import { DualRange } from './DualRange';
import { UnitFilters } from '../public/UnitFilters';
import {
  deriveFilterBounds,
  unitMatchesCriteria,
  hasActiveCriteria,
  type UnitCriteria,
} from '../../utils/unitFilters';
import type { Hotspot, PublicUnit, SceneTargetType } from '../../types';

interface SceneExplorerProps {
  slug: string;
  units: PublicUnit[];
  criteria: UnitCriteria;
  onChange: (next: UnitCriteria) => void;
  /** Building code/name for the top-right badge, if known. */
  badge?: string;
}

interface Crumb {
  type: SceneTargetType;
  id?: string;
  label: string;
}

const AVAILABILITY_FILL: Record<string, string> = {
  available: 'rgba(45,212,191,0.45)',
  reserved: 'rgba(245,158,11,0.45)',
  sold: 'rgba(113,113,122,0.5)',
  rented: 'rgba(59,130,246,0.45)',
  not_released: 'rgba(148,163,184,0.35)',
  unavailable: 'rgba(239,68,68,0.45)',
};
const DIMMED = 'rgba(15,23,42,0.08)';

/**
 * Immersive, East Gate B2-style explorer: the published scene image full-bleed
 * with a dark filter bar overlaid along the bottom (bedrooms, apartment type,
 * area and floor ranges), a breadcrumb/back control, a building badge, and a
 * Hide toggle. Clicking a building/floor region drills into its own scene;
 * unit/listing regions navigate. The filter criteria are shared with the page
 * (and its unit grid), and non-matching unit regions fade out live.
 *
 * When no scene is published for the root target, it falls back to the plain
 * light filter bar so filtering still works on the grid below.
 */
export const SceneExplorer: React.FC<SceneExplorerProps> = ({ slug, units, criteria, onChange, badge }) => {
  const { t } = useTranslation('developments');
  const [stack, setStack] = useState<Crumb[]>([{ type: 'development', label: t('scene.sitePlan') }]);
  const [barHidden, setBarHidden] = useState(false);
  const current = stack[stack.length - 1];
  const { scene, isLoading } = usePublishedScene(slug, current.type, current.id);

  const bounds = useMemo(() => deriveFilterBounds(units), [units]);
  const bedsMax = bounds.bedOptions.length ? bounds.bedOptions[bounds.bedOptions.length - 1] : undefined;
  const matchedIds = useMemo(
    () =>
      hasActiveCriteria(criteria)
        ? new Set(units.filter((u) => unitMatchesCriteria(u, criteria, bedsMax)).map((u) => u.id))
        : undefined,
    [units, criteria, bedsMax]
  );

  const availabilityByUnit = useMemo(() => {
    const m = new Map<string, string>();
    units.forEach((u) => m.set(u.id, u.availability));
    return m;
  }, [units]);

  const atRoot = stack.length === 1;
  // No scene anywhere → fall back to the light filter bar (grid still filters).
  if (atRoot && !isLoading && (!scene || scene.hotspots.length === 0)) {
    return <UnitFilters units={units} criteria={criteria} onChange={onChange} matchCount={units.length} />;
  }

  const colorOf = (h: Hotspot): string => {
    if (h.linkType === 'unit') {
      if (matchedIds && !matchedIds.has(h.linkId)) return DIMMED;
      const av = availabilityByUnit.get(h.linkId);
      if (av && AVAILABILITY_FILL[av]) return AVAILABILITY_FILL[av];
    }
    return 'rgba(45,212,191,0.32)';
  };

  const onHotspotClick = (h: Hotspot) => {
    if (h.linkType === 'unit') navigate(paths.developmentUnit(slug, h.linkId));
    else if (h.linkType === 'listing') navigate(paths.property(h.linkId));
    else if (h.linkType === 'building' || h.linkType === 'floor') {
      setStack((prev) => [
        ...prev,
        { type: h.linkType as SceneTargetType, id: h.linkId, label: h.label || t(`scene.linkTypes.${h.linkType}`) },
      ]);
    }
  };

  const matchCount = matchedIds ? matchedIds.size : units.length;

  return (
    <section aria-label={t('scene.exploreHeading')} className="-mx-4">
      <div className="relative overflow-hidden bg-slate-900">
        {scene && scene.hotspots.length > 0 ? (
          <HotspotCanvas
            imageUrl={scene.imageUrl}
            imageWidth={scene.imageWidth}
            imageHeight={scene.imageHeight}
            hotspots={scene.hotspots}
            mode="view"
            colorOf={colorOf}
            onHotspotClick={onHotspotClick}
            className="!rounded-none"
          />
        ) : (
          <div className="flex h-[360px] items-center justify-center text-sm text-white/70">
            {isLoading ? '' : t('scene.noPlanForTarget')}
          </div>
        )}

        {/* Top-left: back / breadcrumb */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white">
          {stack.length > 1 ? (
            <button
              type="button"
              onClick={() => setStack((p) => p.slice(0, -1))}
              className="inline-flex items-center gap-1 rounded-md bg-black/45 px-2.5 py-1.5 backdrop-blur hover:bg-black/60"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {stack[stack.length - 2].label}
            </button>
          ) : (
            <span className="rounded-md bg-black/35 px-2.5 py-1.5 backdrop-blur">{t('scene.exploreHeading')}</span>
          )}
        </div>

        {/* Top-right: current target badge */}
        <div className="absolute right-3 top-3 rounded-md border border-white/30 bg-black/35 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
          {current.type === 'development' ? badge || t('scene.sitePlan') : current.label}
        </div>

        {/* Hide / show bar toggle */}
        <button
          type="button"
          onClick={() => setBarHidden((v) => !v)}
          className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 rounded-md bg-teal-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {barHidden ? t('filters.heading') : t('explorer.hide')}
        </button>

        {/* Overlaid filter bar */}
        {!barHidden && (
          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-slate-950/80 px-4 pb-4 pt-9 text-white backdrop-blur-sm sm:px-6">
            <button
              type="button"
              onClick={() => onChange({ beds: [], types: [], features: [] })}
              className="absolute right-4 top-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('filters.clear')}
            </button>

            <div className="grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-4">
              {/* Bedrooms */}
              {bounds.bedOptions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/90">{t('filters.bedrooms')}</p>
                  <div className="flex flex-wrap gap-3">
                    {bounds.bedOptions.map((b) => {
                      const on = criteria.beds.includes(b);
                      const isMax = b === bedsMax && bounds.bedOptions.length > 1;
                      return (
                        <label key={b} className="flex cursor-pointer flex-col items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              onChange({
                                ...criteria,
                                beds: on ? criteria.beds.filter((x) => x !== b) : [...criteria.beds, b],
                              })
                            }
                            className="h-5 w-5 accent-teal-400"
                          />
                          <span className="text-white/80">{b}{isMax ? '+' : ''}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Apartment type (feature flags) */}
              {bounds.features.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/90">{t('filters.apartmentType')}</p>
                  <div className="flex max-h-24 flex-col gap-1.5 overflow-y-auto pr-1">
                    {bounds.features.map((f) => {
                      const on = criteria.features.includes(f);
                      return (
                        <label key={f} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              onChange({
                                ...criteria,
                                features: on ? criteria.features.filter((x) => x !== f) : [...criteria.features, f],
                              })
                            }
                            className="h-4 w-4 accent-teal-400"
                          />
                          <span className="text-white/85">{t(`feature.${f}`, f.replace(/_/g, ' '))}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Area */}
              {bounds.areaMin != null && bounds.areaMax != null && bounds.areaMin !== bounds.areaMax && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/90">
                    {t('filters.area')} (m²)
                  </p>
                  <DualRange
                    min={bounds.areaMin}
                    max={bounds.areaMax}
                    low={criteria.minArea ?? bounds.areaMin}
                    high={criteria.maxArea ?? bounds.areaMax}
                    onChange={(lo, hi) =>
                      onChange({
                        ...criteria,
                        minArea: lo <= (bounds.areaMin as number) ? undefined : lo,
                        maxArea: hi >= (bounds.areaMax as number) ? undefined : hi,
                      })
                    }
                  />
                </div>
              )}

              {/* Floors */}
              {bounds.levelMin != null && bounds.levelMax != null && bounds.levelMin !== bounds.levelMax && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/90">{t('filters.floors')}</p>
                  <DualRange
                    min={bounds.levelMin}
                    max={bounds.levelMax}
                    low={criteria.minLevel ?? bounds.levelMin}
                    high={criteria.maxLevel ?? bounds.levelMax}
                    onChange={(lo, hi) =>
                      onChange({
                        ...criteria,
                        minLevel: lo <= (bounds.levelMin as number) ? undefined : lo,
                        maxLevel: hi >= (bounds.levelMax as number) ? undefined : hi,
                      })
                    }
                  />
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-white/70">{t('filters.matchCount', { count: matchCount })}</p>
          </div>
        )}
      </div>
    </section>
  );
};
