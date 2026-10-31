/** Residence Pass endpoints (dashboard billing + public pricing). */
import { apiRequest } from '@/src/shared/api';
import type { ResidenceBilling, ResidenceCheckoutPayload, ResidencePricing } from '../types';

const DASH = '/dashboard/developments';

export const getResidenceBilling = (developmentId: string): Promise<{ billing: ResidenceBilling }> =>
  apiRequest(`${DASH}/${developmentId}/billing`, { requiresAuth: true });

export const checkoutResidence = (
  developmentId: string,
  payload: ResidenceCheckoutPayload
): Promise<{ billing: ResidenceBilling }> =>
  apiRequest(`${DASH}/${developmentId}/billing/checkout`, { method: 'POST', body: payload, requiresAuth: true });

export const getResidencePricing = (): Promise<ResidencePricing> =>
  apiRequest('/developments/pricing', { requiresAuth: false });
