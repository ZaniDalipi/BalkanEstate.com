/**
 * Customer calls for plan orders (backend: routes/paymentOrderRoutes.ts).
 */
import { apiRequest } from '@/src/shared/api/httpClient';
import type { MyPlanOrders, RequestPlanResult } from '../types/paymentOrders';

/** Ask for a plan. The price is worked out on the server; a partial discount code may be passed. */
export const requestPlan = (input: { productId: string; discountCode?: string }) =>
  apiRequest<RequestPlanResult>('/payment-orders', {
    method: 'POST',
    body: { productId: input.productId, ...(input.discountCode ? { discountCode: input.discountCode } : {}) },
    requiresAuth: true,
  });

/** My plan requests (newest first) and how to pay. */
export const getMyPlanOrders = () => apiRequest<MyPlanOrders>('/payment-orders/mine', { requiresAuth: true });
