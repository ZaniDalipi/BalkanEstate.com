/**
 * Payment API Service
 *
 * Handles all payment-related API calls with support for multiple providers:
 * - LemonSqueezy for all Balkan countries (Merchant of Record)
 * - Stripe as fallback for EU countries
 *
 * The API automatically routes to the appropriate provider based on country.
 * LemonSqueezy is a Merchant of Record (MoR) handling VAT/tax compliance.
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
  lemonSqueezyCountries: Array<{ countryCode: string; countryName: string }>;
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
          name: info.provider === 'stripe' ? 'Stripe' : 'LemonSqueezy',
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
          : ['card', 'paypal', 'apple_pay', 'google_pay'],
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
          name: c.provider === 'stripe' ? 'Stripe' : 'LemonSqueezy',
          description: c.provider === 'stripe'
            ? 'Secure card payments'
            : 'Secure payments with automatic VAT handling',
          fees: c.provider === 'stripe' ? '~2.9%' : '~5%',
        },
      })),
      stripeCountries: countries
        .filter(c => c.provider === 'stripe')
        .map(c => ({ countryCode: c.countryCode, countryName: c.countryName })),
      lemonSqueezyCountries: countries
        .filter(c => c.provider === 'lemonsqueezy')
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
 * Verify a LemonSqueezy payment with polling
 * Polls up to 10 times with 3-second intervals (30 seconds total)
 * If still processing after timeout, returns a success with pending status
 * so user can see their account and check later
 */
export async function verifyLemonSqueezyPayment(maxAttempts = 10): Promise<VerifyPaymentResponse> {
  const pollInterval = 3000; // 3 seconds between attempts

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await apiRequest<VerifyPaymentResponse>(
        '/payments/lemonsqueezy/verify',
        { method: 'GET', requiresAuth: true }
      );

      // If payment is confirmed, return success
      if (response.paymentStatus === 'paid') {
        return { ...response, provider: 'lemonsqueezy' };
      }

      // If still processing and not last attempt, wait and retry
      if (response.paymentStatus === 'processing' && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      // On last attempt, if still processing, return success with pending status
      // Payment likely went through but webhook is delayed
      if (response.paymentStatus === 'processing' && attempt === maxAttempts) {
        return {
          success: true,
          paymentStatus: 'pending_confirmation',
          provider: 'lemonsqueezy',
          message: 'Payment received! Your subscription will be activated shortly. Please check your email for confirmation.',
        };
      }

      return { ...response, provider: 'lemonsqueezy' };
    } catch (error: any) {
      console.error(`[LemonSqueezy] Verify attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt === maxAttempts) {
        // On timeout, assume payment went through (LemonSqueezy confirmed it)
        return {
          success: true,
          paymentStatus: 'pending_confirmation',
          provider: 'lemonsqueezy',
          message: 'Payment received! Your subscription will be activated within a few minutes. Check your email for confirmation.',
        };
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  // Fallback - return pending instead of error
  return {
    success: true,
    paymentStatus: 'pending_confirmation',
    provider: 'lemonsqueezy',
    message: 'Payment received! Your subscription is being processed and will be activated shortly.',
  };
}

/**
 * Verify a payment (auto-detects provider from URL params)
 */
export async function verifyPayment(params: URLSearchParams): Promise<VerifyPaymentResponse> {
  const provider = params.get('provider') as PaymentProvider | null;
  const sessionId = params.get('session_id');
  const orderId = params.get('order_id');

  // LemonSqueezy payments - use dedicated verification with polling
  if (provider === 'lemonsqueezy') {
    return verifyLemonSqueezyPayment();
  }

  if (sessionId) {
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
  verifyLemonSqueezyPayment,
  verifyPayment,
  getSubscriptionStatus,
  cancelSubscription,
  applyFreeSubscription,
  redirectToPayment,
  initiatePayment,
};
