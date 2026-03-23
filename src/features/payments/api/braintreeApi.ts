/**
 * Braintree Payment API
 *
 * Client-side API functions for Braintree payment flow:
 * 1. Get a client token to initialize the Drop-in UI
 * 2. Process a payment using the nonce from the Drop-in UI
 */

import { apiRequest } from '@/shared/api/httpClient';

// ====== TYPES ======

export interface BraintreeClientTokenResponse {
  success: boolean;
  clientToken: string;
}

export interface BraintreeProcessRequest {
  paymentMethodNonce: string;
  amount: number;
  productId: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  countryCode: string;
  deviceData?: string;
}

export interface BraintreeProcessResponse {
  success: boolean;
  paymentStatus?: string;
  provider?: string;
  transactionId?: string;
  subscription?: {
    id: string;
    plan: string;
    expiresAt: string;
    status: string;
  };
  message?: string;
  error?: string;
}

// ====== API FUNCTIONS ======

/**
 * Get a Braintree client token for initializing the Drop-in UI
 */
export async function getBraintreeClientToken(): Promise<BraintreeClientTokenResponse> {
  return apiRequest<BraintreeClientTokenResponse>(
    '/payments/braintree/client-token',
    { method: 'GET', requiresAuth: true }
  );
}

/**
 * Process a Braintree payment using a payment method nonce
 */
export async function processBraintreePayment(
  request: BraintreeProcessRequest
): Promise<BraintreeProcessResponse> {
  return apiRequest<BraintreeProcessResponse>(
    '/payments/braintree/process-payment',
    { method: 'POST', body: request, requiresAuth: true, encryptResponse: true }
  );
}
