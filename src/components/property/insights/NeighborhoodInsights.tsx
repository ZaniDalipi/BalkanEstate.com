// NeighborhoodInsights — AI neighborhood report for a property.
// Orchestrates the flow; rendering lives in the Insight* sub-components and
// the flow itself in useNeighborhoodInsight. Requires sign-in; free users get a
// monthly allowance, and a generated report is kept for that user per listing.

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../../context/AppContext';
import { SoftIcon } from '@/src/shared/illustrations';
import { InsightError } from './InsightError';
import { InsightReport } from './InsightReport';
import { InsightSkeleton } from './InsightSkeleton';
import { InsightTeaser } from './InsightTeaser';
import { useNeighborhoodInsight } from './useNeighborhoodInsight';

interface NeighborhoodInsightsProps {
  /** Listing id; lets the user's generated insight be kept for this listing. */
  listingId?: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
}

export const NeighborhoodInsights: React.FC<NeighborhoodInsightsProps> = ({
  listingId,
  lat,
  lng,
  address,
  city,
  country,
}) => {
  const { t } = useTranslation(['property']);
  const { state, dispatch } = useAppContext();
  const userId = state.isAuthenticated ? (state.currentUser?.id ?? state.currentUser?._id) : undefined;

  const place = useMemo(() => ({ lat, lng, address, city, country }), [lat, lng, address, city, country]);
  const onAuthRequired = useCallback(
    () => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } }),
    [dispatch],
  );
  const { view, generate } = useNeighborhoodInsight({ listingId, place, userId, onAuthRequired });
  const isSubscribed = Boolean(state.currentUser?.isSubscribed);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
      <div className="flex items-center mb-4">
        <SoftIcon name="pin" className="flex-shrink-0 w-8 h-8 mr-3" />
        <h3 className="text-lg sm:text-xl font-bold text-neutral-800">{t('neighborhood.title')}</h3>
      </div>
      {view.status === 'idle' && <InsightTeaser isAuthenticated={Boolean(userId)} onGenerate={generate} />}
      {view.status === 'loading' && <InsightSkeleton />}
      {view.status === 'error' && (
        <InsightError
          message={view.message}
          retryable={view.retryable}
          usage={view.usage}
          showUpgrade={view.usage !== undefined && !isSubscribed}
          onRetry={generate}
        />
      )}
      {view.status === 'ready' && (
        <InsightReport insights={view.insights} usage={view.usage} isSubscribed={isSubscribed} />
      )}
    </div>
  );
};
