import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedRunStatus, FeedState } from '../../types/propertyImports';

type BadgeKind = FeedState | FeedRunStatus;

const STYLES: Record<BadgeKind, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-amber-100 text-amber-800',
  queued: 'bg-blue-50 text-blue-700',
  fetching: 'bg-blue-100 text-blue-800',
  staged: 'bg-blue-100 text-blue-800',
  applying: 'bg-blue-100 text-blue-800',
  previewed: 'bg-indigo-100 text-indigo-800',
  succeeded: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  awaiting_review: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
};

const FALLBACK: Record<BadgeKind, string> = {
  draft: 'Not activated',
  active: 'Daily sync on',
  paused: 'Paused',
  queued: 'Queued',
  fetching: 'Downloading',
  staged: 'Validating',
  applying: 'Importing',
  previewed: 'Preview ready',
  succeeded: 'Succeeded',
  partial: 'Completed with issues',
  awaiting_review: 'Needs review',
  failed: 'Failed',
};

const ImportStatusBadge: React.FC<{ status: BadgeKind }> = ({ status }) => {
  const { t } = useTranslation(['agencyDashboard']);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${STYLES[status]}`}>
      {t(`agencyDashboard:imports.status.${status}`, FALLBACK[status])}
    </span>
  );
};

export default ImportStatusBadge;
