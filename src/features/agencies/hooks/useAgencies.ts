import { useQuery } from '@tanstack/react-query';
import { agencyKeys, getAgencies, getFeaturedAgencies } from '../api';

export function useAgencies(filters?: { city?: string; featured?: boolean; page?: number; limit?: number }) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: agencyKeys.list(filters),
    queryFn: () => getAgencies(filters),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
  });

  return {
    agencies: data?.agencies || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
  };
}

export function useFeaturedAgencies(limit?: number) {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: agencyKeys.featured(),
    queryFn: () => getFeaturedAgencies(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes - featured agencies don't change often
    gcTime: 15 * 60 * 1000,
  });

  return { agencies: data?.agencies || [], isLoading, error };
}
