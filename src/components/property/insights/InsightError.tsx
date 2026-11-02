// InsightError — the reason a report could not be made, and the next best step:
// "try again" when a retry can help, an upgrade hint when the monthly limit is hit.

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { InsightUsage } from './insightFailure';

interface InsightErrorProps {
  message: string;
  retryable: boolean;
  usage?: InsightUsage;
  showUpgrade: boolean;
  onRetry: () => void;
}

export const InsightError: React.FC<InsightErrorProps> = ({ message, retryable, usage, showUpgrade, onRetry }) => {
  const { t } = useTranslation(['property']);
  return (
    <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
      <p className="text-center">
        <strong>{message}</strong>
      </p>
      {usage && usage.limit !== -1 && (
        <p className="text-sm text-center mt-2">
          {t('neighborhood.usageInfo', { used: usage.used, limit: usage.limit })}
        </p>
      )}
      {showUpgrade && (
        <p className="text-sm text-center mt-2 font-semibold">{t('neighborhood.upgradePrompt')}</p>
      )}
      {retryable && (
        <div className="text-center">
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-[44px] px-4 text-sm font-semibold underline"
          >
            {t('neighborhood.tryAgain')}
          </button>
        </div>
      )}
    </div>
  );
};
