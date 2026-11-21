import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentOrderKeys } from '@/src/shared/query/queryKeys';
import { getMyPlanOrders, requestPlan } from '../api/paymentOrdersApi';

/** My plan requests and how to pay. */
export function useMyPlanRequests(enabled = true) {
  return useQuery({
    queryKey: paymentOrderKeys.mine(),
    queryFn: getMyPlanOrders,
    enabled,
    // Reload whenever the list is shown: the team can mark a request paid at
    // any moment, and an active plan next to "waiting for payment" confuses.
    staleTime: 0,
  });
}

/** Request a plan; the list of my requests refreshes afterwards. */
export function useRequestPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentOrderKeys.mine() }),
  });
}
