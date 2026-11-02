// useNeighborhoodInsight — the "generate a report" flow for one listing.
// Shows the user's saved insight at once; otherwise validates, requests,
// and maps every failure to a message plus a next step.

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { neighborhoodInsightKeys } from '@/src/shared/query/queryKeys';
import { validateNeighborhoodInsightPlace } from '@/src/shared/utils/validation';
import { insightLanguageName } from './insightLanguage';
import { requestNeighborhoodInsight, type InsightPlace } from './neighborhoodInsightsApi';
import type { InsightFailure, InsightUsage } from './insightFailure';
import { useSavedNeighborhoodInsight } from './useSavedNeighborhoodInsight';

export type InsightView =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string; retryable: boolean; usage?: InsightUsage }
  | { status: 'ready'; insights: string; usage?: InsightUsage };

interface Options {
  listingId?: string;
  place: InsightPlace;
  /** Signed-in user's id; undefined when signed out. */
  userId?: string;
  onAuthRequired: () => void;
}

export function useNeighborhoodInsight({ listingId, place, userId, onAuthRequired }: Options) {
  const { t, i18n } = useTranslation(['property']);
  const queryClient = useQueryClient();
  const { data: saved } = useSavedNeighborhoodInsight(listingId, userId);
  const [flow, setFlow] = useState<InsightView>({ status: 'idle' });

  const failureMessage = useCallback(
    (failure: InsightFailure): string => {
      switch (failure.kind) {
        case 'unavailable':
          return t('neighborhood.serviceUnavailable', 'AI service is temporarily unavailable. Please try again later.');
        case 'invalid':
          return t('neighborhood.coordinatesUnavailable', "Location data isn't available for this property yet, so we can't generate insights.");
        default:
          return (failure.kind === 'other' || failure.kind === 'rateLimited') && failure.message
            ? failure.message
            : t('property:ui.neighborhoodInsights.anUnknownErrorOccurred', 'An unknown error occurred.');
      }
    },
    [t],
  );

  const generate = useCallback(async () => {
    if (flow.status === 'loading') return;
    if (!userId) return onAuthRequired();

    // Boundary validation: don't spend a request without a real location.
    if (validateNeighborhoodInsightPlace(place).isValid === false) {
      setFlow({
        status: 'error',
        retryable: false,
        message: failureMessage({ kind: 'invalid' }),
      });
      return;
    }

    setFlow({ status: 'loading' });
    const result = await requestNeighborhoodInsight(place, insightLanguageName(i18n.language), listingId);

    if (result.ok === false) {
      const failure = result.error;
      if (failure.kind === 'unauthorized') {
        setFlow({ status: 'idle' });
        return onAuthRequired();
      }
      setFlow({
        status: 'error',
        message: failureMessage(failure),
        retryable: failure.kind !== 'rateLimited' && failure.kind !== 'invalid',
        usage: failure.kind === 'rateLimited' ? failure.usage : undefined,
      });
      return;
    }

    if (listingId) {
      queryClient.setQueryData(neighborhoodInsightKeys.saved(userId, listingId), result.value.insights);
    }
    setFlow({ status: 'ready', insights: result.value.insights, usage: result.value.usage });
  }, [flow.status, userId, place, listingId, i18n.language, onAuthRequired, failureMessage, queryClient]);

  // The user's own saved insight is shown straight away, without spending quota.
  const view: InsightView =
    flow.status === 'idle' && saved ? { status: 'ready', insights: saved } : flow;

  return { view, generate };
}
