import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { AuditFamily } from '../../../hooks/useAuditLog';

interface ActivityFilterChipsProps {
  value: AuditFamily;
  onChange: (family: AuditFamily) => void;
}

const FAMILY_LABELS: Record<AuditFamily, string> = {
  all: 'All',
  units: 'Units',
  prices: 'Prices',
  explorer: 'Explorer',
  listings: 'Listings',
  structure: 'Structure',
};

/** Single-select chips narrowing the activity list to one action family. */
export const ActivityFilterChips: React.FC<ActivityFilterChipsProps> = ({ value, onChange }) => {
  const { t } = useTranslation('developments');
  return (
    <div role="group" aria-label={t('activity.filterLabel', 'Filter activity')} className="flex flex-wrap gap-2">
      {(Object.keys(FAMILY_LABELS) as AuditFamily[]).map((family) => (
        <button
          key={family}
          type="button"
          aria-pressed={value === family}
          onClick={() => onChange(family)}
          className={cn(
            'min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]',
            value === family ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          )}
        >
          {t(`activity.filters.${family}`, FAMILY_LABELS[family])}
        </button>
      ))}
    </div>
  );
};
