import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentOrderKeys, userKeys } from '@/src/shared/query/queryKeys';
import {
  cancelOrder,
  deactivateUserPlan,
  freeGrant,
  listOrderablePlans,
  listPaymentOrders,
  markOrderPaid,
  recordPayment,
  type PaymentInput,
  type PaymentOrderFilters,
} from '../api/paymentOrdersAdminApi';

export function usePaymentOrders(filters: PaymentOrderFilters) {
  return useQuery({
    queryKey: paymentOrderKeys.adminList(filters),
    queryFn: () => listPaymentOrders(filters),
    placeholderData: keepPreviousData,
  });
}

export function useOrderablePlans() {
  return useQuery({ queryKey: paymentOrderKeys.adminPlans(), queryFn: listOrderablePlans, staleTime: 5 * 60_000 });
}

/** After any change: the order lists and the users (their plan changed) are out of date. */
function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: paymentOrderKeys.all });
    queryClient.invalidateQueries({ queryKey: userKeys.admin() });
  };
}

export function useMarkOrderPaid() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ reference, input }: { reference: string; input: PaymentInput }) => markOrderPaid(reference, input),
    onSuccess: refresh,
  });
}

export function useCancelOrder() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ reference, reason }: { reference: string; reason?: string }) => cancelOrder(reference, reason),
    onSuccess: refresh,
  });
}

export function useRecordPayment() {
  const refresh = useRefreshAfterChange();
  return useMutation({ mutationFn: recordPayment, onSuccess: refresh });
}

export function useFreeGrant() {
  const refresh = useRefreshAfterChange();
  return useMutation({ mutationFn: freeGrant, onSuccess: refresh });
}

export function useDeactivatePlan() {
  const refresh = useRefreshAfterChange();
  return useMutation({ mutationFn: deactivateUserPlan, onSuccess: refresh });
}
