import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon, ExclamationTriangleIcon, PencilIcon } from '@/constants';
import type { AgencyFeed } from '../../types/propertyImports';
import ImportStatusBadge from './ImportStatusBadge';
import { formatDateTime } from './formatters';

interface FeedCardProps {
  feed: AgencyFeed;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSyncNow: () => void;
  onTogglePause: () => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ feed, selected, busy, onSelect, onEdit, onSyncNow, onTogglePause }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const canSync = feed.state !== 'draft' && !feed.activeJob;

  return (
    <article
      className={`bg-white rounded-xl border p-4 sm:p-5 transition-shadow ${selected ? 'border-indigo-400 shadow-md' : 'border-gray-200 hover:shadow-sm'}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <button type="button" onClick={onSelect} className="text-left min-w-0 flex-1" aria-pressed={selected}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 truncate">{feed.name}</h3>
            <ImportStatusBadge status={feed.state} />
            {feed.activeJob && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                {t('agencyDashboard:imports.card.running', 'Import in progress')}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 break-all">{feed.url}</p>
        </button>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onSyncNow}
            disabled={!canSync || busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {t('agencyDashboard:imports.actions.syncNow', 'Sync now')}
          </button>
          {feed.state !== 'draft' && (
            <button
              type="button"
              onClick={onTogglePause}
              disabled={busy}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {feed.state === 'active'
                ? t('agencyDashboard:imports.actions.pause', 'Pause daily sync')
                : t('agencyDashboard:imports.actions.resume', 'Resume daily sync')}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            {t('agencyDashboard:imports.actions.edit', 'Edit')}
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-gray-500">{t('agencyDashboard:imports.card.lastSuccess', 'Last successful sync')}</dt>
          <dd className="font-medium text-gray-900">{formatDateTime(feed.lastSuccessfulSyncAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">{t('agencyDashboard:imports.card.nextSync', 'Next scheduled sync')}</dt>
          <dd className="font-medium text-gray-900">
            {feed.state === 'active' ? formatDateTime(feed.nextSyncAt) : t('agencyDashboard:imports.card.notScheduled', 'Not scheduled')}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">{t('agencyDashboard:imports.card.mode', 'Feed type')}</dt>
          <dd className="font-medium text-gray-900">
            {feed.mode === 'snapshot'
              ? t('agencyDashboard:imports.mode.snapshot', 'Complete listing (snapshot)')
              : t('agencyDashboard:imports.mode.delta', 'Changes only (delta)')}
          </dd>
        </div>
      </dl>

      {(feed.lastError || feed.pendingReviewRunId) && (
        <div className="mt-3 space-y-2">
          {feed.pendingReviewRunId && (
            <p className="flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
              <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" />
              {t('agencyDashboard:imports.card.reviewNeeded', 'Many listings disappeared from the feed. Review before they are deactivated.')}
            </p>
          )}
          {feed.lastError && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {feed.lastError.message}
                {feed.consecutiveFailures > 1 &&
                  ` ${t('agencyDashboard:imports.card.failedTimes', '(failed {{count}} times in a row)', { count: feed.consecutiveFailures })}`}
              </span>
            </p>
          )}
        </div>
      )}
    </article>
  );
};

export default FeedCard;
