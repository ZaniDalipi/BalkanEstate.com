/**
 * Saved cities — the reader's Explore-Cities follows.
 *
 * Server state, so it lives in React Query rather than component state. The
 * toggle is optimistic (a follow must feel instant) but always rolls back to
 * the server's answer, because the follow is what decides whether an email is
 * sent — showing "following" for a save that failed would be a lie.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSavedCities,
  toggleSavedCity,
  savedCityKey,
  type SavedCitiesResponse,
} from '../api/savedCitiesApi';

export const savedCityKeys = {
  all: ['savedCities'] as const,
  list: () => [...savedCityKeys.all, 'list'] as const,
};

const EMPTY_RESPONSE: SavedCitiesResponse = { cities: [], count: 0, limit: 0 };

export interface UseSavedCitiesResult {
  savedCities: SavedCitiesResponse['cities'];
  savedKeys: Set<string>;
  isLoading: boolean;
  /** Non-null while a toggle for that city is in flight. */
  pendingKey: string | null;
  error: string | null;
  isSaved: (city: string, country: string) => boolean;
  toggle: (city: string, country: string) => void;
}

/**
 * @param enabled false for signed-out readers — the endpoint requires auth, so
 *        asking would only produce a 401 per page view.
 */
export function useSavedCities(enabled: boolean): UseSavedCitiesResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: savedCityKeys.list(),
    queryFn: getSavedCities,
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: ({ city, country }: { city: string; country: string }) => toggleSavedCity(city, country),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedCityKeys.all });
    },
  });

  const data = query.data ?? EMPTY_RESPONSE;

  const savedKeys = useMemo(
    () => new Set(data.cities.map(c => savedCityKey(c.city, c.country))),
    [data.cities],
  );

  const isSaved = useCallback(
    (city: string, country: string) => savedKeys.has(savedCityKey(city, country)),
    [savedKeys],
  );

  const toggle = useCallback(
    (city: string, country: string) => {
      if (!enabled) return;
      mutation.mutate({ city, country });
    },
    [enabled, mutation],
  );

  const pendingKey = mutation.isPending && mutation.variables
    ? savedCityKey(mutation.variables.city, mutation.variables.country)
    : null;

  const error = query.isError
    ? 'load'
    : mutation.isError
      ? (mutation.error instanceof Error ? mutation.error.message : 'save')
      : null;

  return {
    savedCities: data.cities,
    savedKeys,
    isLoading: enabled && query.isLoading,
    pendingKey,
    error,
    isSaved,
    toggle,
  };
}
