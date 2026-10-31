import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  getNearbyDevelopments,
  attachListing,
  attachListingToDevelopment,
  requestAttachment,
} from '../api/developmentsApi';
import type { NearbySuggestion } from '../types';

export interface NearbyParams {
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  limit?: number;
  listingId?: string;
}

/**
 * Published developments near a point, used while creating/editing a listing to
 * suggest "this listing belongs to a development". Only queries when `enabled`
 * and the coordinates look real, so a half-filled form never triggers a 401 or
 * a pointless request.
 */
export function useNearbyDevelopments(
  params: NearbyParams | null,
  enabled: boolean
) {
  const hasCoords =
    !!params &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng) &&
    !(params.lat === 0 && params.lng === 0);

  return useQuery({
    queryKey: developmentKeys.nearby(params ?? {}),
    queryFn: () => getNearbyDevelopments(params as NearbyParams),
    enabled: enabled && hasCoords,
    staleTime: 60_000,
    select: (data): NearbySuggestion[] => data.suggestions ?? [],
  });
}

/**
 * Mutations a seller can run against a suggestion: put the listing on an
 * apartment or just link it to the residence when they control it, or request
 * access when they don't.
 */
export function useSuggestionActions() {
  const qc = useQueryClient();

  const attach = useMutation({
    mutationFn: ({ developmentId, listingId }: { developmentId: string; listingId: string }) =>
      attachListingToDevelopment(developmentId, listingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.all });
    },
  });

  // Put the listing on a specific apartment (also links it to the residence).
  const place = useMutation({
    mutationFn: (v: { developmentId: string; unitId: string; listingId: string; force?: boolean }) =>
      attachListing(v.developmentId, v.unitId, v.listingId, v.force ?? false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.all });
    },
  });

  const request = useMutation({
    mutationFn: ({ slug, listingId, note }: { slug: string; listingId?: string; note?: string }) =>
      requestAttachment(slug, { listingId, note }),
  });

  return {
    attach: attach.mutateAsync,
    isAttaching: attach.isPending,
    attachError: attach.error,
    place: place.mutateAsync,
    isPlacing: place.isPending,
    request: request.mutateAsync,
    isRequesting: request.isPending,
    requestError: request.error,
  };
}
