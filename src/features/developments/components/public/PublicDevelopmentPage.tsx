import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Globe, ArrowLeft } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublicDevelopment, usePublicDevelopmentUnits } from '../../hooks';
import { LoadingState, ErrorState } from '../shared/States';
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

      {development.coverImage && (
        <div className="mb-6 overflow-hidden rounded-3xl">
          <img
            src={optimizeImageUrl(development.coverImage, { width: 1600 })}
            srcSet={imageSrcSet(development.coverImage)}
            sizes="(max-width: 1024px) 100vw, 1024px"
            alt={development.name}
            className="aspect-[16/7] w-full object-cover"
          />
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{development.name}</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {[development.address, development.city, development.country].filter(Boolean).join(', ')}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-0.5">{t(`category.${development.category}`)}</span>
          <span className="rounded-full bg-muted px-2.5 py-0.5">
            {t(`construction.${development.constructionStatus}`)}
          </span>
          {development.website && (
            <a
              href={development.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              {t('wizard.website')}
            </a>
          )}
        </div>
      </header>

      {development.description && (
        <p className="mb-6 whitespace-pre-line text-sm text-foreground/90">{development.description}</p>
      )}

      <StatsBar summary={summary} buildings={buildings.length} />

      <section aria-labelledby="units-heading" className="mb-10">
        <h2 id="units-heading" className="mb-3 text-xl font-bold text-foreground">
          {t('units.heading')}
        </h2>
        <UnitsBrowser units={units} />
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
