import React from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { Button } from '@/src/components/ui/button';
import { usePublicDevelopments } from '../../hooks';
import { DevelopmentCard } from '../shared/DevelopmentCard';
import { LoadingState, EmptyState, ErrorState } from '../shared/States';

/**
 * Public discovery grid of published residences. Read-only; links to each
 * development's detail page. Fully list-based so it is accessible and
 * crawlable without any interactive map/explorer.
 */
const PublicDevelopmentsPage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { developments, isLoading, error } = usePublicDevelopments({ limit: 40 });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('public.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => navigate(paths.developmentsDashboard())}
        >
          {t('nav.dashboard')}
        </Button>
      </header>

      {isLoading && <LoadingState rows={6} />}

      {!isLoading && error && <ErrorState message={t('errors.loadFailed')} />}

      {!isLoading && !error && developments.length === 0 && (
        <EmptyState title={t('public.empty')} />
      )}

      {!isLoading && !error && developments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {developments.map((d) => (
            <DevelopmentCard
              key={d._id}
              development={d}
              onOpen={() => navigate(paths.development(d.slug))}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default PublicDevelopmentsPage;
