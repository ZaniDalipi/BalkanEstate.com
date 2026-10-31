import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
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
  const { state } = useAppContext();
  const isAuthed = !!state.isAuthenticated;
  const { developments, isLoading, error } = usePublicDevelopments({ limit: 40 });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('public.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('public.subtitle')}</p>
        {/* "My Developments" is only relevant to signed-in users who manage
            their own projects; a visitor just browses. Left-aligned on its own
            row so it never lands under the app's top-right floating bar. */}
        {isAuthed && (
          <div className="mt-4">
            <Button onClick={() => navigate(paths.developmentsDashboard())}>
              {t('nav.dashboard')}
            </Button>
          </div>
        )}
      </header>

      {isLoading && <LoadingState rows={6} />}

      {!isLoading && error && <ErrorState message={t('errors.loadFailed')} />}

      {!isLoading && !error && developments.length === 0 && (
        <EmptyState
          title={t('public.empty')}
          action={
            isAuthed ? (
              <Button onClick={() => navigate(paths.developmentsDashboard())}>
                {t('nav.dashboard')}
              </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !error && developments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {developments.map((d) => (
            <DevelopmentCard
              key={d.id}
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
