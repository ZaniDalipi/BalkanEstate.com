import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'lucide-react';
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublicDevelopment, usePublicDevelopmentUnits } from '../../hooks';
import { LoadingState, ErrorState } from '../shared/States';
import { ResidenceHero } from './ResidenceHero';
import { StatsBar } from './StatsBar';
import { UnitsBrowser } from './UnitsBrowser';
import type { DevelopmentFloor } from '../../types';

/**
 * Public development detail. Presents the project and a list-based
 * building → floor navigation (the accessible, crawlable fallback the design
 * requires alongside any future interactive explorer).
 */
const PublicDevelopmentPage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { slug } = useParams();
  const { development, buildings, floors, isLoading, error } = usePublicDevelopment(slug);
  const { units, summary } = usePublicDevelopmentUnits(slug);
  const unitsRef = useRef<HTMLDivElement>(null);
  const scrollToUnits = () => unitsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

      <ResidenceHero development={development} onViewUnits={scrollToUnits} />

      <div className="mt-6">
        <StatsBar summary={summary} buildings={buildings.length} />
      </div>

      {development.description && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t('detail.overview')}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {development.description}
          </p>
        </section>
      )}

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

      <section ref={unitsRef} aria-labelledby="units-heading" className="mt-10 scroll-mt-20">
        <h2 id="units-heading" className="mb-4 text-2xl font-bold text-foreground">
          {t('units.heading')}
        </h2>
        <UnitsBrowser units={units} slug={development.slug} />
      </section>

      {buildings.length > 0 && (
        <section aria-labelledby="buildings-heading" className="mb-6">
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
