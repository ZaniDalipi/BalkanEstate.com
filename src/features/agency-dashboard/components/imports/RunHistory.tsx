import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedRun } from '../../types/propertyImports';
import ImportStatusBadge from './ImportStatusBadge';
import { formatDateTime } from './formatters';

interface RunHistoryProps {
  runs: FeedRun[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}

const TRIGGER_FALLBACK = { preview: 'Preview', manual: 'Sync now', scheduled: 'Daily sync' } as const;

const RunHistory: React.FC<RunHistoryProps> = ({ runs, selectedRunId, onSelect }) => {
  const { t } = useTranslation(['agencyDashboard']);
  if (runs.length === 0) {
    return <p className="text-sm text-gray-500">{t('agencyDashboard:imports.history.empty', 'No imports yet.')}</p>;
  }
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="px-4 py-2 font-medium">{t('agencyDashboard:imports.history.when', 'When')}</th>
            <th className="px-4 py-2 font-medium">{t('agencyDashboard:imports.history.type', 'Type')}</th>
            <th className="px-4 py-2 font-medium">{t('agencyDashboard:imports.history.result', 'Result')}</th>
            <th className="px-4 py-2 font-medium text-right">{t('agencyDashboard:imports.counts.created', 'Created')}</th>
            <th className="px-4 py-2 font-medium text-right">{t('agencyDashboard:imports.counts.updated', 'Updated')}</th>
            <th className="px-4 py-2 font-medium text-right hidden md:table-cell">{t('agencyDashboard:imports.counts.unchanged', 'Unchanged')}</th>
            <th className="px-4 py-2 font-medium text-right">{t('agencyDashboard:imports.counts.rejected', 'Rejected')}</th>
            <th className="px-4 py-2 font-medium text-right">{t('agencyDashboard:imports.counts.deactivated', 'Deactivated')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {runs.map((run) => (
            <tr
              key={run.id}
              onClick={() => onSelect(run.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(run.id)}
              tabIndex={0}
              aria-selected={selectedRunId === run.id}
              className={`cursor-pointer hover:bg-gray-50 focus:outline-none focus:bg-indigo-50 ${selectedRunId === run.id ? 'bg-indigo-50' : ''}`}
            >
              <td className="px-4 py-2 whitespace-nowrap text-gray-700">{formatDateTime(run.finishedAt ?? run.createdAt)}</td>
              <td className="px-4 py-2 whitespace-nowrap text-gray-700">{t(`agencyDashboard:imports.trigger.${run.trigger}`, TRIGGER_FALLBACK[run.trigger])}</td>
              <td className="px-4 py-2"><ImportStatusBadge status={run.status} /></td>
              <td className="px-4 py-2 text-right tabular-nums">{run.dryRun ? '—' : run.counts.created}</td>
              <td className="px-4 py-2 text-right tabular-nums">{run.dryRun ? '—' : run.counts.updated}</td>
              <td className="px-4 py-2 text-right tabular-nums hidden md:table-cell">{run.dryRun ? '—' : run.counts.unchanged}</td>
              <td className="px-4 py-2 text-right tabular-nums">{run.dryRun ? run.counts.received - run.counts.valid : run.counts.rejected}</td>
              <td className="px-4 py-2 text-right tabular-nums">{run.dryRun ? '—' : run.counts.deactivated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RunHistory;
