import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '@/src/shared/query/queryKeys';
import {
  createResidenceCodes,
  deleteResidenceCode,
  listResidenceCodes,
  updateResidenceCode,
  type CreateResidenceCodes,
  type ResidenceCodeFilter,
} from '../api/residenceCodeAdminApi';

export function useResidenceCodes(params: { status: ResidenceCodeFilter; search: string; page: number }) {
  return useQuery({
    queryKey: adminKeys.residenceCodes(params),
    queryFn: () => listResidenceCodes(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/** Create, switch off/on, mark sent and delete codes; the list refreshes after each. */
export function useResidenceCodeActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: adminKeys.residenceCodesAll() });
  const create = useMutation({ mutationFn: (body: CreateResidenceCodes) => createResidenceCodes(body), onSuccess: refresh });
  const update = useMutation({ mutationFn: (v: { id: string; isActive?: boolean; isSent?: boolean }) => updateResidenceCode(v.id, { isActive: v.isActive, isSent: v.isSent }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => deleteResidenceCode(id), onSuccess: refresh });
  return {
    create: create.mutateAsync,
    isCreating: create.isPending,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    busy: update.isPending || remove.isPending,
  };
}
