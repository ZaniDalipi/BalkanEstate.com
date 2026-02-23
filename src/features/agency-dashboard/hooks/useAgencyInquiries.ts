import { useQuery } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import { getDashboardInquiries } from '../api/agencyDashboardApi';
import type { DashboardInquiry, PaginatedResponse, InquiryFilters } from '../types';

export function useAgencyInquiries(agencyId: string, filters?: InquiryFilters) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<PaginatedResponse<DashboardInquiry>>({
    queryKey: agencyDashboardKeys.inquiries(agencyId, filters),
    queryFn: () => getDashboardInquiries(agencyId, filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!agencyId,
  });

  return {
    inquiries: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  };
}
