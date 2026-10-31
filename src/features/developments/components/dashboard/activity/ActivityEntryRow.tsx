import React from 'react';
import { useTranslation } from 'react-i18next';
import { RelativeTime } from '../inventory/InventoryCells';
import type { AuditEntry } from '../../../types';
import { actionLabel, entryDetail } from './auditLabels';

/** One audit entry: what happened, who did it, when, and a short detail. */
export const ActivityEntryRow: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
  const { t } = useTranslation('developments');
  const detail = entryDetail(t, entry);
  return (
    <li className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{actionLabel(t, entry.action)}</p>
        {detail && <p className="mt-0.5 break-words text-xs text-slate-600">{detail}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-slate-600 sm:flex-col sm:items-end sm:gap-0.5">
        <span className="font-medium text-slate-700">{entry.actorName || t('activity.unknownActor', 'Unknown user')}</span>
        <RelativeTime iso={entry.createdAt} />
      </div>
    </li>
  );
};
