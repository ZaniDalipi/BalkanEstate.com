import React from 'react';
import { useTranslation } from 'react-i18next';

export interface InsightStatusProps {
  message: string;
  /** A failed request: shown as an alert with a way to try again. */
  failed?: boolean;
  retrying?: boolean;
  onRetry?: () => void;
}

/** Why a card has nothing to show, and — after a failure — a retry. */
const InsightStatus: React.FC<InsightStatusProps> = ({ message, failed = false, retrying = false, onRetry }) => {
  const { t } = useTranslation(['property']);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role={failed ? 'alert' : undefined} className="text-sm text-neutral-600">{message}</p>
      {failed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="min-h-[44px] landscape:min-h-[32px] rounded-md px-1 text-sm font-semibold text-primary hover:underline disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {retrying ? t('property:areaPrices.retrying', 'Retrying…') : t('property:areaPrices.retry', 'Try again')}
        </button>
      )}
    </div>
  );
};

/** Two grey blocks while a card loads. */
export const InsightSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse motion-reduce:animate-none" aria-hidden="true">
    <div className="h-24 rounded-xl bg-neutral-100" />
    <div className="h-24 rounded-xl bg-neutral-100" />
  </div>
);

export default InsightStatus;
