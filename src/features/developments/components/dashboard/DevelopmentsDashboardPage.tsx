import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { Button } from '@/src/components/ui/button';
import { useMyDevelopments } from '../../hooks';
import { DevelopmentCard } from '../shared/DevelopmentCard';
import { LoadingState, EmptyState, ErrorState } from '../shared/States';

interface DevelopmentsDashboardPageProps {
  /** When embedded inside the account page, drop the standalone <main> chrome. */
  embedded?: boolean;
}

/**
 * Dashboard landing: the developments the signed-in user owns or belongs to,
 * plus the entry point to create a new one. Creating is gated server-side on an
 * active subscription plan; the create form surfaces that if it applies.
 *
 * Rendered both as a standalone route (`/dashboard/developments`) and embedded
 * in the account page's "Residences" tab, so sellers find it from their profile.
 */
const DevelopmentsDashboardPage: React.FC<DevelopmentsDashboardPageProps> = ({ embedded = false }) => {
  const { t } = useTranslation('developments');
  const { developments, isLoading, error, refetch } = useMyDevelopments();

  const Wrapper = embedded ? 'div' : 'main';

  return (
    <Wrapper className={embedded ? 'w-full' : 'mx-auto w-full max-w-6xl px-4 py-8'}>
      <header className="mb-6">
        {!embedded && <h1 className="text-2xl font-bold text-foreground">{t('nav.dashboard')}</h1>}
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        {/* On its own row (left-aligned) so it never lands under the app's
            top-right floating action bar. */}
        <div className="mt-4">
          <Button onClick={() => navigate(paths.developmentNew())}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('list.create')}
          </Button>
        </div>
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
              key={d.id}
              development={d}
              showStatus
              onOpen={() => navigate(paths.developmentManage(d.id))}
            />
          ))}
        </div>
      )}
    </Wrapper>
  );
};

export default DevelopmentsDashboardPage;
