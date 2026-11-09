import { useMutation, useQueryClient } from '@tanstack/react-query';
import { linkBuilderBusiness } from '../api/developmentsApi';
import { developmentKeys } from '../api/developmentKeys';

/** Link / unlink the builder's Business Directory company; the residence (dashboard and public) refreshes after. */
export function useBuilderBusiness(developmentId: string) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (businessId: string | null) => linkBuilderBusiness(developmentId, businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId) });
      qc.invalidateQueries({ queryKey: developmentKeys.public() });
    },
  });
  return { link: mutation.mutateAsync, busy: mutation.isPending, error: mutation.error, reset: mutation.reset };
}
