import React, { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'lucide-react';
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublicDevelopment, usePublicDevelopmentUnits } from '../../hooks';
import { LoadingState, ErrorState } from '../shared/States';
import { ResidenceHero } from './ResidenceHero';
import { StatsBar } from './StatsBar';
import { KeyFacts } from './KeyFacts';
import { AvailabilityBar } from './AvailabilityBar';
import { UnitsBrowser } from './UnitsBrowser';
import { FollowCard } from './FollowCard';
import { ResidenceLocation } from './ResidenceLocation';
import { SceneExplorer } from '../scene/SceneExplorer';
import type { DevelopmentFloor } from '../../types';
import {
  deriveFilterBounds,
  unitMatchesCriteria,
  hasActiveCriteria,
  EMPTY_CRITERIA,
  type UnitCriteria,
} from '../../utils/unitFilters';

/** Smooth-scroll to a section by id, accounting for the sticky nav offset. */
const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/**
 * Public development detail — a premium, section-navigated residence page:
 * hero, KPIs, key facts, availability breakdown, interactive plans, unit
 * browser and a location map. A sticky in-page nav ties the sections together,
 * and a list-based building → floor outline remains as the crawlable fallback.
 */
const PublicDevelopmentPage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { slug } = useParams();
  const { development, buildings, floors, isLoading, error } = usePublicDevelopment(slug);
  const { units, summary } = usePublicDevelopmentUnits(slug);
  const unitsRef = useRef<HTMLDivElement>(null);

  const [criteria, setCriteria] = useState<UnitCriteria>(EMPTY_CRITERIA);
  const bedsMax = useMemo(() => {
    const opts = deriveFilterBounds(units).bedOptions;
    return opts.length ? opts[opts.length - 1] : undefined;
  }, [units]);
  const matchedUnits = useMemo(
    () => (hasActiveCriteria(criteria) ? units.filter((u) => unitMatchesCriteria(u, criteria, bedsMax)) : units),
    [units, criteria, bedsMax]
  );

  const sections = useMemo(
    () => [
      { id: 'overview', label: t('detail.overview') },
      { id: 'plans', label: t('scene.exploreHeading') },
      { id: 'units', label: t('units.heading') },
      { id: 'location', label: t('detail.location') },
    ],
    [t]
  );

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <LoadingState rows={4} />
      </main>
    );
  }

  if (error || !development) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <ErrorState message={t('errors.notFound')} />
        <button
          type="button"
          onClick={() => navigate(paths.developments())}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('public.backToList')}
        </button>
      </main>
    );
  }

  const floorsByBuilding = (buildingId: string): DevelopmentFloor[] =>
    floors.filter((f) => f.buildingId === buildingId).sort((a, b) => a.level - b.level);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <button
        type="button"
        onClick={() => goBack(paths.developments())}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('public.backToList')}
      </button>

      <ResidenceHero development={development} onViewUnits={() => scrollToId('units')} />

      {/* Floating KPI strip overlapping the hero's lower edge. */}
      <div className="relative z-10 -mt-10 px-2 sm:-mt-12 sm:px-8">
        <StatsBar summary={summary} buildings={buildings.length} />
      </div>

      {/* Sticky in-page section nav */}
      <nav
        aria-label="sections"
        className="sticky top-0 z-20 -mx-4 mt-6 overflow-x-auto border-b border-border bg-background/85 px-4 backdrop-blur"
      >
        <ul className="flex gap-1 py-2">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollToId(s.id)}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {units.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t('units.availabilityHeading')}</h2>
          <AvailabilityBar units={units} />
        </div>
      )}

      <section id="overview" className="mt-10 scroll-mt-20">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-teal-400 to-emerald-500" aria-hidden="true" />
          {t('detail.overview')}
        </h2>
        <KeyFacts development={development} buildings={buildings.length} />
        {development.description && (
          <p className="mt-5 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
            {development.description}
          </p>
        )}
      </section>

      {development.amenities && development.amenities.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-teal-400 to-emerald-500" aria-hidden="true" />
            {t('amenities.heading')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {development.amenities.map((a) => (
              <li
                key={a}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-sm text-foreground shadow-sm"
              >
                <Check className="h-3.5 w-3.5 text-teal-500" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <FollowCard slug={development.slug} developmentName={development.name} />
      </div>

      {/* Immersive B2-style explorer: full-bleed plan with an overlaid filter
          bar. Falls back to a plain filter bar when no scene is published. Its
          criteria also drive the unit grid below. */}
      {units.length > 0 && (
        <div id="plans" className="mt-8 scroll-mt-20">
          <SceneExplorer
            slug={development.slug}
            units={units}
            criteria={criteria}
            onChange={setCriteria}
            badge={development.name}
          />
        </div>
      )}

      <section ref={unitsRef} id="units" aria-labelledby="units-heading" className="mt-12 scroll-mt-20">
        <h2 id="units-heading" className="mb-5 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-foreground">
          <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-teal-400 to-emerald-500" aria-hidden="true" />
          {t('units.heading')}
        </h2>
        <UnitsBrowser units={matchedUnits} slug={development.slug} />
      </section>

      <ResidenceLocation development={development} />

      {buildings.length > 0 && (
        <section aria-labelledby="buildings-heading" className="mt-10">
          <h2 id="buildings-heading" className="mb-3 text-lg font-semibold text-foreground">
            {t('detail.buildings')}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {buildings.map((b) => {
              const bFloors = floorsByBuilding(b.id);
              return (
                <li key={b.id} className="rounded-2xl border border-border bg-white px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">{b.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('detail.floors')}: {bFloors.length}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
};

export default PublicDevelopmentPage;
