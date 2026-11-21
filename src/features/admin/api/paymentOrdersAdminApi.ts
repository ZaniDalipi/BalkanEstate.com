/**
 * Admin calls for plan orders (backend: /api/admin/payment-orders, adminRoutes.ts).
 */
import { apiRequest } from '@/src/shared/api/httpClient';
import type { AdminPlanOrder } from '@/src/features/payments/types/paymentOrders';

export type ManualPaymentMethod = 'bank_transfer' | 'cash' | 'card_terminal' | 'other';

export interface PaymentOrderFilters {
  status?: 'requested' | 'paid' | 'cancelled' | 'mismatch';
  q?: string;
  page?: number;
}

export interface PaymentOrderPage {
  orders: AdminPlanOrder[];
  total: number;
  page: number;
  pages: number;
}

export interface OrderablePlan {
  productId: string;
  name: string;
  price: number;
  billingPeriod?: string;
  tier?: string;
}

export interface PaymentInput {
  /** Euros received. */
  amount: number;
  method: ManualPaymentMethod;
  /** yyyy-mm-dd */
  paidAt?: string;
  note?: string;
  acceptDifferentAmount?: boolean;
}

export interface SettledOrder {
  order: AdminPlanOrder;
  alreadyPaid: boolean;
  expiresAt?: string;
}

export const listPaymentOrders = (filters: PaymentOrderFilters) => {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return apiRequest<PaymentOrderPage>(`/admin/payment-orders${query ? `?${query}` : ''}`, { requiresAuth: true });
};

export const listOrderablePlans = () =>
  apiRequest<{ plans: OrderablePlan[] }>('/admin/payment-orders/plans', { requiresAuth: true }).then((r) => r.plans);

export const markOrderPaid = (reference: string, input: PaymentInput) =>
  apiRequest<SettledOrder>(`/admin/payment-orders/${encodeURIComponent(reference)}/mark-paid`, {
    method: 'POST',
    body: input,
    requiresAuth: true,
  });

export const cancelOrder = (reference: string, reason?: string) =>
  apiRequest<{ order: AdminPlanOrder; alreadyCancelled: boolean }>(`/admin/payment-orders/${encodeURIComponent(reference)}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : {},
    requiresAuth: true,
  });

export const recordPayment = (input: PaymentInput & { userId: string; productId: string }) =>
  apiRequest<SettledOrder>('/admin/payment-orders/record-payment', { method: 'POST', body: input, requiresAuth: true });

export const freeGrant = (input: { userId: string; productId: string; reason: string }) =>
  apiRequest<SettledOrder>('/admin/payment-orders/free-grant', { method: 'POST', body: input, requiresAuth: true });

/** Turn a plan off (the user manager's Deactivate). */
export const deactivateUserPlan = (userId: string) =>
  apiRequest<{ success: boolean; message: string }>(`/admin/subscriptions/manage/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { isSubscribed: false, reason: 'Admin deactivation via User Manager' },
    requiresAuth: true,
  });
