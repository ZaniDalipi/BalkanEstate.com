import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/context/AppContext';
import { adminKeys } from '@/src/shared/query/queryKeys';
import { UserRole } from '@/types';
import { claimSuperAdmin, getSuperAdminStatus } from '../api/superAdminApi';

/** Whether I may become the first super admin, and the action to do it. */
export function useSuperAdminClaim(enabled: boolean) {
  const qc = useQueryClient();
  const { dispatch } = useAppContext();
  const status = useQuery({
    queryKey: adminKeys.superAdminStatus(),
    queryFn: getSuperAdminStatus,
    enabled,
    staleTime: 60_000,
  });
  const claim = useMutation({
    mutationFn: claimSuperAdmin,
    onSuccess: () => {
      dispatch({ type: 'UPDATE_USER', payload: { role: UserRole.SUPER_ADMIN } });
      void qc.invalidateQueries({ queryKey: adminKeys.superAdminStatus() });
      void qc.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
  return { status, claim };
}
