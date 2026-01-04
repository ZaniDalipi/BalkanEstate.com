/**
 * Payment API Service
 *
 * Handles all payment-related API calls with support for multiple providers:
 * - Stripe for EU countries (Greece, Croatia, Bulgaria, Romania, Slovenia)
 * - Paddle for non-EU Balkan countries (Serbia, Albania, Bosnia, N. Macedonia, Montenegro, Kosovo)
 *
 * The API automatically routes to the appropriate provider based on country.
 * Paddle is a Merchant of Record (MoR) handling VAT/tax compliance.
 */

import { apiRequest } from '@/shared/api/httpClient';
import {
  PaymentProvider,
  getProviderForCountry,
  getCountryPaymentInfo,
  COUNTRY_PAYMENT_MAP,
} from '@/config/paymentConfig';

// ====== TYPES ======

export interface CreatePaymentRequest {
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  amount: number;
  productId?: string;
  countryCode: string;
  language?: string;
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
  stripeCountries: Array<{ countryCode: string; countryName: string }>;
  paddleCountries: Array<{ countryCode: string; countryName: string }>;
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

// ====== API FUNCTIONS ======

/**
 * Create a payment session using the unified endpoint
 * Automatically routes to the appropriate provider based on country
 */
export async function createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
  try {
    const response = await apiRequest<CreatePaymentResponse>(
      '/payments/create-payment',
      { method: 'POST', body: request, requiresAuth: true }
    );
    return response;
  } catch (error: any) {
    console.error('Error creating payment:', error);
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
    console.error('Error getting payment provider:', error);
    // Fallback to local config
    const info = getCountryPaymentInfo(countryCode);
    if (info) {
      return {
        success: true,
        countryCode: info.countryCode,
        countryName: info.countryName,
        provider: info.provider,
        providerInfo: {
          name: info.provider === 'stripe' ? 'Stripe' : 'Paddle',
          description: info.provider === 'stripe'
            ? 'Secure card payments'
            : 'Secure payments with automatic VAT handling',
          fees: info.provider === 'stripe' ? '~2.9%' : '~5%',
        },
        isEU: info.isEU,
        isSEPA: info.isSEPA,
        currency: info.currency,
        supportedMethods: info.provider === 'stripe'
          ? ['card', 'sepa_debit', 'apple_pay', 'google_pay']
          : ['card', 'bank_transfer', 'wallet'],
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
    console.error('Error getting supported countries:', error);
    // Fallback to local config
    const countries = Object.values(COUNTRY_PAYMENT_MAP);
    return {
      success: true,
      countries: countries.map(c => ({
        ...c,
        providerInfo: {
          name: c.provider === 'stripe' ? 'Stripe' : 'Paddle',
          description: c.provider === 'stripe'
            ? 'Secure card payments'
            : 'Secure payments with automatic VAT handling',
          fees: c.provider === 'stripe' ? '~2.9%' : '~5%',
        },
      })),
      stripeCountries: countries
        .filter(c => c.provider === 'stripe')
        .map(c => ({ countryCode: c.countryCode, countryName: c.countryName })),
      paddleCountries: countries
        .filter(c => c.provider === 'paddle')
        .map(c => ({ countryCode: c.countryCode, countryName: c.countryName })),
    };
  }
}

/**
 * Verify a Stripe payment session
 */
export async function verifyStripePayment(sessionId: string): Promise<VerifyPaymentResponse> {
  try {
    const response = await apiRequest<VerifyPaymentResponse>(
      `/payments/verify-session/${sessionId}`,
      { method: 'GET', requiresAuth: true }
    );
    return { ...response, provider: 'stripe' };
  } catch (error: any) {
    console.error('Error verifying Stripe payment:', error);
    return {
      success: false,
      paymentStatus: 'error',
      provider: 'stripe',
      message: error.message,
    };
  }
}

/**
 * Verify a Paddle payment by transaction ID
 */
export async function verifyPaddlePayment(transactionId: string): Promise<VerifyPaymentResponse> {
  try {
    const response = await apiRequest<VerifyPaymentResponse>(
      `/payments/paddle/verify/${transactionId}`,
      { method: 'GET', requiresAuth: true }
    );
    return { ...response, provider: 'paddle' };
  } catch (error: any) {
    console.error('Error verifying Paddle payment:', error);
    return {
      success: false,
      paymentStatus: 'error',
      provider: 'paddle',
      message: error.message,
    };
  }
}

/**
 * Verify a payment (auto-detects provider from URL params)
 */
export async function verifyPayment(params: URLSearchParams): Promise<VerifyPaymentResponse> {
  const provider = params.get('provider') as PaymentProvider | null;
  const sessionId = params.get('session_id');
  const orderId = params.get('order_id');

  if (provider === 'paddle' && orderId) {
    return verifyPaddlePayment(orderId);
  } else if (sessionId) {
    return verifyStripePayment(sessionId);
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
    console.error('Error getting subscription status:', error);
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
    console.error('Error canceling subscription:', error);
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
    console.error('Error applying free subscription:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Redirect to payment page
 * Handles the redirect to either Stripe or PaySera checkout
 */
export function redirectToPayment(paymentUrl: string): void {
  if (paymentUrl) {
    window.location.href = paymentUrl;
  }
}

/**
 * Initiate payment flow
 * Creates payment and redirects to checkout page
 */
export async function initiatePayment(request: CreatePaymentRequest): Promise<{
  success: boolean;
  error?: string;
}> {
  const result = await createPayment(request);

  if (result.success && result.paymentUrl) {
    redirectToPayment(result.paymentUrl);
    return { success: true };
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
  verifyStripePayment,
  verifyPaddlePayment,
  verifyPayment,
  getSubscriptionStatus,
  cancelSubscription,
  applyFreeSubscription,
  redirectToPayment,
  initiatePayment,
};
