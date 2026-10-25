import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '@/src/shared/query/queryKeys';
import {
  addAgencyResidences,
  getAgencyResidenceAllowance,
  grantResidencePass,
  listAdminResidences,
  setResidenceBuildingLimit,
  type AdminResidenceFilter,
} from '../api/residenceAdminApi';

export function useAdminResidences(params: { search: string; filter: AdminResidenceFilter; page: number }) {
  return useQuery({
    queryKey: adminKeys.residences(params),
    queryFn: () => listAdminResidences(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** Building limit and pass grants refresh the residence list. */
export function useResidenceAdminActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: adminKeys.residencesAll() });
  const limit = useMutation({ mutationFn: (v: { id: string; limit: number | null }) => setResidenceBuildingLimit(v.id, v.limit), onSuccess: refresh });
  const grant = useMutation({ mutationFn: (v: { id: string; months: number; note?: string }) => grantResidencePass(v.id, { months: v.months, note: v.note }), onSuccess: refresh });
  return { setLimit: limit.mutateAsync, isSettingLimit: limit.isPending, grant: grant.mutateAsync, isGranting: grant.isPending };
}

export function useAgencyResidenceAllowance(agencyId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: adminKeys.agencyResidenceAllowance(agencyId ?? ''),
    queryFn: () => getAgencyResidenceAllowance(agencyId as string),
    enabled: !!agencyId,
    select: (r) => r.allowance,
    retry: false,
  });
  const add = useMutation({
    mutationFn: (v: { extra: number; note?: string }) => addAgencyResidences(agencyId as string, v),
    onSuccess: (r) => {
      qc.setQueryData(adminKeys.agencyResidenceAllowance(agencyId ?? ''), r);
      qc.invalidateQueries({ queryKey: adminKeys.residencesAll() });
    },
  });
  return { allowance: query.data, isLoading: query.isLoading, error: query.error, add: add.mutateAsync, isAdding: add.isPending };
}
