import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, MapPin } from 'lucide-react';
import type { Development, UnitsSummary } from '../../../types';
import { ShareResidenceButton } from '../share/ShareResidenceButton';

interface ResidenceTitleBarProps {
  development: Development;
  summary?: UnitsSummary;
  onViewUnits: () => void;
}

/** Compact name / location / availability strip above the full-bleed explorer. */
export const ResidenceTitleBar: React.FC<ResidenceTitleBarProps> = ({ development, summary, onViewUnits }) => {
  const { t } = useTranslation('developments');
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-2">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{development.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {[development.address, development.city, development.country].filter(Boolean).join(', ')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {summary && (
          <span className="text-sm text-slate-600">
            {t('explorer.availableOfTotal', {
              available: summary.available,
              total: summary.total,
              defaultValue: '{{available}} of {{total}} available',
            })}
          </span>
        )}
        <button
          type="button"
          onClick={onViewUnits}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {t('hero.viewUnits', 'View available units')}
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </button>
        <ShareResidenceButton
          slug={development.slug}
          name={development.name}
          place={[development.city, development.country].filter(Boolean).join(', ')}
        />
      </div>
    </div>
  );
};
