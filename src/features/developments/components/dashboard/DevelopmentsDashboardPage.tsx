import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { Button } from '@/src/components/ui/button';
import { useMyDevelopments } from '../../hooks';
import { DevelopmentCard } from '../shared/DevelopmentCard';
import { LoadingState, EmptyState, ErrorState } from '../shared/States';

/**
 * Dashboard landing: the developments the signed-in user owns or belongs to,
 * plus the entry point to create a new one. Creating is gated server-side on an
 * active subscription plan; the create form surfaces that if it applies.
 */
const DevelopmentsDashboardPage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { developments, isLoading, error, refetch } = useMyDevelopments();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.dashboard')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => navigate(paths.developmentNew())} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('list.create')}
        </Button>
      </header>

      {isLoading && <LoadingState rows={4} />}

      {!isLoading && error && (
        <ErrorState message={t('errors.loadFailed')} onRetry={() => refetch()} retryLabel={t('errors.generic')} />
      )}

      {!isLoading && !error && developments.length === 0 && (
        <EmptyState
          title={t('list.empty')}
          action={
            <Button onClick={() => navigate(paths.developmentNew())}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('list.create')}
            </Button>
          }
        />
      )}

      {!isLoading && !error && developments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {developments.map((d) => (
            <DevelopmentCard
              key={d._id}
              development={d}
              showStatus
              onOpen={() => navigate(paths.developmentManage(d._id))}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default DevelopmentsDashboardPage;
