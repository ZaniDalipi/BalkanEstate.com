import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { Button } from '@/src/components/ui/button';
import { useMyDevelopment, useDevelopmentUnits } from '../../hooks';
import { usePublishDevelopment } from '../../hooks';
import { StatusPill } from '../shared/Badges';
import { LoadingState, ErrorState } from '../shared/States';
import { CoverImageUpload } from '../shared/CoverImageUpload';
import { QuickAddInventory } from './inventory/QuickAddInventory';
import { UnitsTable } from './inventory/UnitsTable';
import { AttachListingPanel } from './listings/AttachListingPanel';
import type { DevelopmentUnit } from '../../types';

/**
 * Dashboard page for one development: overview + publish control, inventory
 * builder, units table, and the existing-listing attach panel. All server
 * state comes through hooks; mutations invalidate the development's detail key
 * so the whole page stays in sync.
 */
const DevelopmentManagePage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { id } = useParams();
  const { development, isLoading, error, refetch } = useMyDevelopment(id);
  const { units, refetch: refetchUnits } = useDevelopmentUnits(id, { limit: 200 });
  const { setStatus, isLoading: isPublishing } = usePublishDevelopment(id ?? '');

  const [attachUnit, setAttachUnit] = useState<DevelopmentUnit | null>(null);

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
        <ErrorState message={t('errors.notFound')} onRetry={() => refetch()} retryLabel={t('errors.generic')} />
      </main>
    );
  }

  const isPublished = development.status === 'published';

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <button
        type="button"
        onClick={() => goBack(paths.developmentsDashboard())}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('nav.dashboard')}
      </button>

      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{development.name}</h1>
          <StatusPill status={development.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {development.city}, {development.country} · {t(`category.${development.category}`)}
        </p>
        {/* Actions on their own row so they clear the app's top-right floating bar. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant={isPublished ? 'outline' : 'default'}
            disabled={isPublishing}
            onClick={() => setStatus(isPublished ? 'draft' : 'published')}
          >
            {isPublished ? t('detail.unpublish') : t('detail.publish')}
          </Button>
          {isPublished && (
            <Button variant="ghost" onClick={() => navigate(paths.development(development.slug))}>
              {t('public.viewDetails')}
            </Button>
          )}
        </div>
      </header>

      <section aria-labelledby="cover-heading" className="mb-8">
        <h2 id="cover-heading" className="mb-3 text-lg font-semibold text-foreground">
          {t('cover.heading')}
        </h2>
        <CoverImageUpload developmentId={development.id} coverImage={development.coverImage} />
      </section>

      <section aria-labelledby="inventory-heading" className="mb-8">
        <h2 id="inventory-heading" className="mb-3 text-lg font-semibold text-foreground">
          {t('detail.inventory')}
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          <QuickAddInventory developmentId={development.id} />
        </div>
      </section>

      <section aria-labelledby="units-heading" className="mb-8">
        <h2 id="units-heading" className="mb-3 text-lg font-semibold text-foreground">
          {t('detail.units')}
        </h2>
        <UnitsTable units={units} onAttach={setAttachUnit} />
      </section>

      {attachUnit && (
        <section aria-labelledby="attach-heading" className="mb-8">
          <h2 id="attach-heading" className="sr-only">
            {t('detail.listings')}
          </h2>
          <AttachListingPanel
            developmentId={development.id}
            unit={attachUnit}
            onClose={() => setAttachUnit(null)}
            onAttached={() => {
              refetchUnits();
              setAttachUnit(null);
            }}
          />
        </section>
      )}
    </main>
  );
};

export default DevelopmentManagePage;
