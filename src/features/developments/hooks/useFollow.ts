import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  getFollowStatus,
  followDevelopment,
  unfollowDevelopment,
} from '../api/developmentsApi';
import type { FollowFilters, FollowPreferences } from '../types';

const followKey = (slug: string) => developmentKeys.follow(slug);

/**
 * Follow state + mutations for a development. Only queries when `enabled`
 * (i.e. a signed-in user), so public visitors don't trigger a 401.
 */
export function useFollow(slug: string | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const key = followKey(slug ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => getFollowStatus(slug as string),
    enabled: !!slug && enabled,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: (payload: { preferences: FollowPreferences; filters: FollowFilters }) =>
      followDevelopment(slug as string, payload),
    onSuccess: (data) => qc.setQueryData(key, data),
  });

  const remove = useMutation({
    mutationFn: () => unfollowDevelopment(slug as string),
    onSuccess: () => qc.setQueryData(key, { following: false }),
  });

  return {
    following: query.data?.following ?? false,
    follow: query.data?.follow,
    isLoading: query.isLoading,
    save: save.mutateAsync,
    isSaving: save.isPending,
    saveError: save.error,
    unfollow: remove.mutateAsync,
    isUnfollowing: remove.isPending,
  };
}
