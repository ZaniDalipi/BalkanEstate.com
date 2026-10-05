import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedRunCounts } from '../../types/propertyImports';

interface RunCountsProps {
  counts: FeedRunCounts;
  compact?: boolean;
}

const ITEMS: Array<{ key: keyof FeedRunCounts; label: string; tone: string }> = [
  { key: 'created', label: 'Created', tone: 'text-green-700' },
  { key: 'updated', label: 'Updated', tone: 'text-indigo-700' },
  { key: 'unchanged', label: 'Unchanged', tone: 'text-gray-700' },
  { key: 'rejected', label: 'Rejected', tone: 'text-red-700' },
  { key: 'deactivated', label: 'Deactivated', tone: 'text-amber-700' },
];

const RunCounts: React.FC<RunCountsProps> = ({ counts, compact = false }) => {
  const { t } = useTranslation(['agencyDashboard']);
  return (
    <dl className={`grid grid-cols-3 sm:grid-cols-5 ${compact ? 'gap-2' : 'gap-3'}`}>
      {ITEMS.map(({ key, label, tone }) => (
        <div key={key} className={`rounded-lg bg-gray-50 ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}>
          <dt className="text-[11px] uppercase tracking-wide text-gray-500 truncate">
            {t(`agencyDashboard:imports.counts.${key}`, label)}
          </dt>
          <dd className={`${compact ? 'text-base' : 'text-xl'} font-bold ${tone}`}>{counts[key] ?? 0}</dd>
        </div>
      ))}
    </dl>
  );
};

export default RunCounts;
