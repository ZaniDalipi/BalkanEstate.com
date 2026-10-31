import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { checkoutResidence, getResidenceBilling, getResidencePricing } from '../api/residenceBillingApi';
import type { ResidenceCheckoutPayload } from '../types';

/** A residence's Residence Pass state (trial countdown, building limit, prices). */
export function useResidenceBilling(developmentId: string | undefined) {
  const q = useQuery({
    queryKey: developmentKeys.billing(developmentId ?? ''),
    queryFn: () => getResidenceBilling(developmentId as string),
    enabled: !!developmentId,
    select: (r) => r.billing,
    staleTime: 60_000,
  });
  return { billing: q.data, isLoading: q.isLoading, error: q.error };
}

/** Buy a pass or extra buildings; refreshes everything the purchase can change. */
export function useBuyResidence(developmentId: string) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (payload: ResidenceCheckoutPayload) => checkoutResidence(developmentId, payload),
    onSuccess: (r) => {
      qc.setQueryData(developmentKeys.billing(developmentId), r);
      qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId) });
      qc.invalidateQueries({ queryKey: developmentKeys.public() });
    },
  });
  return { buy: m.mutateAsync, isLoading: m.isPending, error: m.error, reset: m.reset };
}

/** Public residence prices, for the pricing page. */
export function useResidencePricing() {
  return useQuery({ queryKey: developmentKeys.pricing(), queryFn: getResidencePricing, staleTime: 10 * 60_000, retry: 1 });
}
