import React, { useMemo, useRef } from 'react';
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
import { SceneViewer } from '../scene/SceneViewer';
import type { DevelopmentFloor } from '../../types';

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

      {/* Sticky in-page section nav */}
      <nav
        aria-label="sections"
        className="sticky top-0 z-20 -mx-4 mt-4 overflow-x-auto border-b border-border bg-background/85 px-4 backdrop-blur"
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

      <div className="mt-6">
        <StatsBar summary={summary} buildings={buildings.length} />
      </div>

      {units.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t('units.availabilityHeading')}</h2>
          <AvailabilityBar units={units} />
        </div>
      )}

      <section id="overview" className="mt-8 scroll-mt-20">
        <h2 className="mb-3 text-lg font-semibold text-foreground">{t('detail.overview')}</h2>
        <KeyFacts development={development} buildings={buildings.length} />
        {development.description && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {development.description}
          </p>
        )}
      </section>

      {development.amenities && development.amenities.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">{t('amenities.heading')}</h2>
          <ul className="flex flex-wrap gap-2">
            {development.amenities.map((a) => (
              <li
                key={a}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground"
              >
                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <FollowCard slug={development.slug} developmentName={development.name} />
      </div>

      {/* Interactive plans — renders only when the owner has published a scene. */}
      <div id="plans" className="scroll-mt-20">
        <SceneViewer slug={development.slug} units={units} />
      </div>

      <section ref={unitsRef} id="units" aria-labelledby="units-heading" className="mt-10 scroll-mt-20">
        <h2 id="units-heading" className="mb-4 text-2xl font-bold text-foreground">
          {t('units.heading')}
        </h2>
        <UnitsBrowser units={units} slug={development.slug} />
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
                <li key={b.id} className="rounded-2xl border border-border bg-card px-4 py-3">
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
