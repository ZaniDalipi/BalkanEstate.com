import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { useAuditLog, type AuditFamily } from '../../../hooks/useAuditLog';
import { EmptyState, ErrorState, LoadingState } from '../../shared/States';
import { ActivityEntryRow } from './ActivityEntryRow';
import { ActivityFilterChips } from './ActivityFilterChips';

interface ActivityPanelProps {
  developmentId: string;
}

/**
 * The development's audit trail, newest first, filterable by action family
 * and paged with "Load more". Only rendered for roles with `team.manage`
 * (the server answers 403 to anyone else).
 */
export const ActivityPanel: React.FC<ActivityPanelProps> = ({ developmentId }) => {
  const { t } = useTranslation('developments');
  const [family, setFamily] = useState<AuditFamily>('all');
  const log = useAuditLog(developmentId, family);

  return (
    <section aria-labelledby="activity-heading" className="space-y-4">
      <div>
        <h2 id="activity-heading" className="text-base font-semibold text-slate-900">{t('activity.title', 'Activity')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('activity.subtitle', 'Every change your team made to this residence, newest first.')}</p>
      </div>
      <ActivityFilterChips value={family} onChange={setFamily} />
      {log.isLoading ? (
        <LoadingState rows={4} />
      ) : log.error && log.entries.length === 0 ? (
        <ErrorState message={t('activity.loadFailed', 'Could not load the activity.')} onRetry={() => log.refetch()} retryLabel={t('inventory.retry', 'Retry')} />
      ) : log.entries.length === 0 ? (
        <EmptyState title={t('activity.empty', 'No activity yet.')} description={family === 'all' ? undefined : t('activity.emptyFiltered', 'Nothing in this category yet.')} />
      ) : (
        <>
          <p className="text-sm text-slate-600" aria-live="polite">
            {t('activity.showing', 'Showing {{shown}} of {{total}}', { shown: log.entries.length, total: log.total })}
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {log.entries.map((entry) => (
              <ActivityEntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
          {log.error && <p role="alert" className="text-sm text-red-700">{t('activity.loadMoreFailed', 'Could not load more activity. Try again.')}</p>}
          {log.hasMore && (
            <div className="flex justify-center">
              <Button type="button" variant="outline" onClick={() => log.loadMore()} disabled={log.isFetchingMore} className="min-h-[44px]">
                {log.isFetchingMore ? t('inventory.loading', 'Loading…') : t('activity.loadMore', 'Load more')}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
