import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { usePublishDevelopment } from '../../hooks/useDevelopmentMutations';
import { useUnitCounts } from '../../hooks/useInventoryQuery';
import { AVAILABILITY_META } from '../../utils/availability';
import { CoverImageUpload } from '../shared/CoverImageUpload';
import { StatusPill } from '../shared/Badges';
import type { Development, UnitAvailability } from '../../types';

interface OverviewPanelProps {
  development: Development;
  canPublish: boolean;
}

const Stat: React.FC<{ label: string; value?: number; state?: UnitAvailability }> = ({ label, value, state }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500">
      {state && <span className={`h-2 w-2 rounded-full ${AVAILABILITY_META[state].dotClass}`} aria-hidden="true" />}
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold text-slate-900">{value ?? '—'}</p>
  </div>
);

/** Status + publish control, unit totals and the cover image. */
export const OverviewPanel: React.FC<OverviewPanelProps> = ({ development, canPublish }) => {
  const { t } = useTranslation('developments');
  const notify = useNotification();
  const { setStatus, isLoading: isPublishing } = usePublishDevelopment(development.id);
  const counts = useUnitCounts(development.id);
  const isPublished = development.status === 'published';

  const onToggle = () =>
    setStatus(isPublished ? 'draft' : 'published').catch((err: { message?: string }) => {
      void notify.error(t('errors.updateFailed', 'Could not save your changes.'), err?.message || t('errors.generic'));
    });

  return (
    <div className="space-y-6">
      <section aria-labelledby="overview-status" className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 id="overview-status" className="text-base font-semibold text-slate-900">
          {t('manage.overview.status', 'Status')}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StatusPill status={development.status} />
          <span className="text-sm text-slate-600">
            {isPublished
              ? t('manage.overview.publishedHint', 'Buyers can find this residence.')
              : t('manage.overview.draftHint', 'Only your team can see this residence.')}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canPublish && (
            <Button variant={isPublished ? 'outline' : 'default'} disabled={isPublishing} onClick={onToggle}>
              {isPublished ? t('detail.unpublish', 'Unpublish') : t('detail.publish', 'Publish')}
            </Button>
          )}
          {isPublished && (
            <Button variant="ghost" onClick={() => navigate(paths.development(development.slug))}>
              {t('public.viewDetails', 'View public page')}
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="overview-stats">
        <h2 id="overview-stats" className="mb-3 text-base font-semibold text-slate-900">
          {t('manage.overview.units', 'Units')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t('manage.overview.total', 'Total')} value={counts.total} />
          <Stat label={t('availability.available', 'Available')} value={counts.available} state="available" />
          <Stat label={t('availability.reserved', 'Reserved')} value={counts.reserved} state="reserved" />
          <Stat label={t('availability.sold', 'Sold')} value={counts.sold} state="sold" />
        </div>
      </section>

      <section aria-labelledby="overview-cover">
        <h2 id="overview-cover" className="mb-3 text-base font-semibold text-slate-900">
          {t('cover.heading', 'Cover image')}
        </h2>
        <CoverImageUpload developmentId={development.id} coverImage={development.coverImage} />
      </section>
    </div>
  );
};
