/**
 * Payment API Service
 *
 * Handles all payment-related API calls.
 * Routes to Paysera based on country.
 * The backend auto-routes via PaymentProviderFactory.
 */

import { apiRequest } from '@/shared/api/httpClient';
import {
  PaymentProvider,
  getProviderForCountry,
  getCountryPaymentInfo,
  COUNTRY_PAYMENT_MAP,
} from '@/config/paymentConfig';
import { validatePaymentRedirectUrl } from '@/src/utils/security';

// ====== TYPES ======

export interface CreatePaymentRequest {
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  amount: number;
  productId?: string;
  countryCode: string;
  language?: string;
  preferredProvider?: PaymentProvider;
  /** Preferred payment method (e.g. 'google_pay', 'apple_pay', 'card', 'bank') */
  paymentMethod?: string;
}

export interface CreatePaymentResponse {
  success: boolean;
  provider: PaymentProvider;
  paymentUrl?: string;
  sessionId?: string;
  orderId?: string;
  countryCode: string;
  providerInfo: {
    name: string;
    description: string;
    fees: string;
  };
  error?: string;
}

export interface PaymentProviderResponse {
  success: boolean;
  countryCode: string;
  countryName: string;
  provider: PaymentProvider;
  providerInfo: {
    name: string;
    description: string;
    fees: string;
  };
  isEU: boolean;
  isSEPA: boolean;
  currency: string;
  supportedMethods: string[];
}

export interface SupportedCountriesResponse {
  success: boolean;
  countries: Array<{
    countryCode: string;
    countryName: string;
    provider: PaymentProvider;
    currency: string;
    isEU: boolean;
    isSEPA: boolean;
    providerInfo: {
      name: string;
      description: string;
      fees: string;
    };
  }>;
}

export interface VerifyPaymentResponse {
  success: boolean;
  paymentStatus: string;
  provider?: PaymentProvider;
  customerEmail?: string;
  amountTotal?: number;
  orderId?: string;
  subscription?: {
    plan: string;
    expiresAt: string;
    status: string;
  };
  message?: string;
}

export interface SubscriptionStatusResponse {
  isSubscribed: boolean;
  subscriptionPlan?: string;
  subscriptionProductName?: string;
  subscriptionSource?: string;
  subscriptionExpiresAt?: string;
  subscriptionStatus?: string;
  hasActiveSubscription: boolean;
  canAccessPremium: boolean;
}

export interface PaymentMethodsResponse {
  success: boolean;
  countryCode: string;
  methods: string[];
  provider: PaymentProvider;
  isEU: boolean;
  isSEPA: boolean;
}

export interface CustomerPortalResponse {
  success: boolean;
  portalUrl?: string;
  updatePaymentUrl?: string;
  message?: string;
}

// ====== API FUNCTIONS ======

/**
 * Create a payment session using the unified endpoint
 * Backend automatically routes to Paysera based on country
 */
export async function createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
  try {
    const response = await apiRequest<CreatePaymentResponse>(
      '/payments/create-payment',
      { method: 'POST', body: request, requiresAuth: true }
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      provider: getProviderForCountry(request.countryCode),
      countryCode: request.countryCode,
      providerInfo: { name: 'Unknown', description: '', fees: '' },
      error: error.message,
    };
  }
}

/**
 * Get payment provider info for a specific country
 */
export async function getPaymentProvider(countryCode: string): Promise<PaymentProviderResponse | null> {
  try {
    const response = await apiRequest<PaymentProviderResponse>(
      `/payments/providers/${countryCode}`,
      { method: 'GET' }
    );
    return response;
  } catch (error: any) {
    const info = getCountryPaymentInfo(countryCode);
    if (info) {
      return {
        success: true,
        countryCode: info.countryCode,
        countryName: info.countryName,
        provider: info.provider,
        providerInfo: {
          name: 'Paysera',
          description: 'Secure online payments',
          fees: '~1.5-2.5%',
        },
        isEU: info.isEU,
        isSEPA: info.isSEPA,
        currency: info.currency,
        supportedMethods: ['card', 'google_pay', 'apple_pay', 'bank_transfer'],
      };
    }
    return null;
  }
}

/**
 * Get all supported countries and their payment providers
 */
export async function getSupportedCountries(): Promise<SupportedCountriesResponse | null> {
  try {
    const response = await apiRequest<SupportedCountriesResponse>(
      '/payments/supported-countries',
      { method: 'GET' }
    );
    return response;
  } catch (error: any) {
    const countries = Object.values(COUNTRY_PAYMENT_MAP);
    return {
      success: true,
      countries: countries.map(c => ({
        ...c,
        providerInfo: {
          name: 'Paysera',
          description: 'Secure online payments',
          fees: '~1.5-2.5%',
        },
      })),
    };
  }
}

/**
 * Get available payment methods for a country
 */
export async function getPaymentMethods(countryCode: string): Promise<PaymentMethodsResponse | null> {
  try {
    return await apiRequest<PaymentMethodsResponse>(
      `/payments/methods/${countryCode}`,
      { method: 'GET' }
    );
  } catch {
    return null;
  }
}

/**
 * Verify a payment (auto-detects provider from URL params)
 */
export async function verifyPayment(params: URLSearchParams): Promise<VerifyPaymentResponse> {
  const sessionId = params.get('session_id');
  const orderId = params.get('order_id');
  const provider = params.get('provider') as PaymentProvider | null;

  if (sessionId || orderId) {
    try {
      const endpoint = sessionId
        ? `/payments/verify-session/${sessionId}`
        : `/payments/verify-order/${orderId}`;
      const response = await apiRequest<VerifyPaymentResponse>(
        endpoint,
        { method: 'GET', requiresAuth: true }
      );
      return { ...response, provider: provider || 'paysera' };
    } catch (error: any) {
      return {
        success: true,
        paymentStatus: 'pending_confirmation',
        provider: provider || 'paysera',
        message: 'Payment received! Your subscription will be activated shortly.',
      };
    }
  }

  return {
    success: false,
    paymentStatus: 'error',
    message: 'Invalid payment verification parameters',
  };
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse | null> {
  try {
    const response = await apiRequest<SubscriptionStatusResponse>(
      '/payments/subscription-status',
      { method: 'GET', requiresAuth: true }
    );
    return response;
  } catch (error: any) {
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiRequest<{ message: string }>(
      '/payments/cancel-subscription',
      { method: 'POST', requiresAuth: true }
    );
    return { success: true, message: response.message };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Apply a free subscription with discount code
 */
export async function applyFreeSubscription(params: {
  planName: string;
  planInterval: string;
  productId: string;
  discountCode: string;
}): Promise<{ success: boolean; subscription?: any; message?: string }> {
  try {
    const response = await apiRequest<{ subscription: any; message: string }>(
      '/payments/apply-free-subscription',
      { method: 'POST', body: params, requiresAuth: true }
    );
    return {
      success: true,
      subscription: response.subscription,
      message: response.message,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Get customer portal URL (manage subscription, update payment method)
 */
export async function getCustomerPortal(): Promise<CustomerPortalResponse> {
  try {
    return await apiRequest<CustomerPortalResponse>(
      '/payments/customer-portal',
      { method: 'GET', requiresAuth: true }
    );
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Redirect to payment page (validated against trusted domain allowlist)
 * Throws if the URL is not on the trusted domain allowlist.
 */
export function redirectToPayment(paymentUrl: string): void {
  if (!paymentUrl) return;

  const validatedUrl = validatePaymentRedirectUrl(paymentUrl);
  if (validatedUrl) {
    window.location.href = validatedUrl;
  } else {
    throw new Error('REDIRECT_BLOCKED');
  }
}

/**
 * Initiate payment flow
 * Creates payment session and redirects to Paysera checkout
 */
export async function initiatePayment(request: CreatePaymentRequest): Promise<{
  success: boolean;
  error?: string;
}> {
  const result = await createPayment(request);

  if (result.success && result.paymentUrl) {
    try {
      redirectToPayment(result.paymentUrl);
      return { success: true };
    } catch {
      return { success: false, error: 'REDIRECT_BLOCKED' };
    }
  }

  return {
    success: false,
    error: result.error || 'Failed to create payment session',
  };
}

export default {
  createPayment,
  getPaymentProvider,
  getSupportedCountries,
  getPaymentMethods,
  verifyPayment,
  getSubscriptionStatus,
  cancelSubscription,
  applyFreeSubscription,
  getCustomerPortal,
  redirectToPayment,
  initiatePayment,
};
