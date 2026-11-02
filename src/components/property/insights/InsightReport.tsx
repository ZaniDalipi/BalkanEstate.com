// InsightReport — the generated report, plus the remaining-quota note.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { parseMarkdown } from '../../../utils/markdown';
import { createSanitizedMarkup } from '../../../shared/utils/sanitize';
import type { InsightUsage } from './insightFailure';

interface InsightReportProps {
  insights: string;
  /** Absent for a saved report: it cost no quota, so there is nothing to show. */
  usage?: InsightUsage;
  isSubscribed: boolean;
}

export const InsightReport: React.FC<InsightReportProps> = ({ insights, usage, isSubscribed }) => {
  const { t } = useTranslation(['property']);
  const unlimited = usage?.limit === -1 || usage?.remaining === -1;
  return (
    <>
      <div
        className="prose prose-sm max-w-none text-neutral-700 space-y-3 animate-fade-in"
        dangerouslySetInnerHTML={createSanitizedMarkup(parseMarkdown(insights))}
      />
      {usage && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 text-center">
            {unlimited
              ? t('neighborhood.unlimitedInsights', 'Unlimited insights available with your plan')
              : t('neighborhood.remainingInfo', { remaining: usage.remaining, limit: usage.limit })}
            {usage.remaining === 0 && !unlimited && !isSubscribed && (
              <span className="block mt-1 text-xs">{t('neighborhood.upgradePrompt')}</span>
            )}
          </p>
        </div>
      )}
    </>
  );
};
