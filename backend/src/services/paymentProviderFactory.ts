/**
 * Payment Provider Factory
 *
 * Unified payment routing system for all 11 Balkan countries.
 *
 * Provider Strategy:
 * - Braintree: Greece, Croatia, Bulgaria, Romania, Slovenia, Serbia (6 countries)
 *   (on-site card payments with Drop-in UI, Apple Pay, Google Pay)
 * - PayPal: All 11 countries as alternative option
 *   (real PayPal Orders API v2 with webhook verification)
 *
 * Every payment is verified server-side before activating subscriptions.
 * No dummy data — all payments go through real provider APIs.
 */

import { paypalService } from './paypalService';
import { braintreeService } from './braintreeService';

// Payment provider types
export type PaymentProvider = 'paypal' | 'braintree' | 'web';

// Country to provider mapping
export interface CountryProviderMapping {
  countryCode: string;
  countryName: string;
  provider: PaymentProvider;
  currency: string;
  isEU: boolean;
  isSEPA: boolean;
}

/**
 * Country to Payment Provider Mapping
 *
 * Braintree: GR, HR, BG, RO, SI, RS (6 countries) — inline card + Apple/Google Pay
 * PayPal: AL, BA, MK, ME, XK (5 countries) — redirect-based PayPal checkout
 *
 * All 11 countries also have PayPal available as a secondary option.
 */
export const COUNTRY_PROVIDER_MAP: Record<string, CountryProviderMapping> = {
  // Braintree countries (EU + Serbia)
  GR: { countryCode: 'GR', countryName: 'Greece', provider: 'braintree', currency: 'EUR', isEU: true, isSEPA: true },
  HR: { countryCode: 'HR', countryName: 'Croatia', provider: 'braintree', currency: 'EUR', isEU: true, isSEPA: true },
  BG: { countryCode: 'BG', countryName: 'Bulgaria', provider: 'braintree', currency: 'EUR', isEU: true, isSEPA: true },
  RO: { countryCode: 'RO', countryName: 'Romania', provider: 'braintree', currency: 'EUR', isEU: true, isSEPA: true },
  SI: { countryCode: 'SI', countryName: 'Slovenia', provider: 'braintree', currency: 'EUR', isEU: true, isSEPA: true },
  RS: { countryCode: 'RS', countryName: 'Serbia', provider: 'braintree', currency: 'EUR', isEU: false, isSEPA: true },

  // PayPal countries
  AL: { countryCode: 'AL', countryName: 'Albania', provider: 'paypal', currency: 'EUR', isEU: false, isSEPA: true },
  BA: { countryCode: 'BA', countryName: 'Bosnia and Herzegovina', provider: 'paypal', currency: 'EUR', isEU: false, isSEPA: false },
  MK: { countryCode: 'MK', countryName: 'North Macedonia', provider: 'paypal', currency: 'EUR', isEU: false, isSEPA: true },
  ME: { countryCode: 'ME', countryName: 'Montenegro', provider: 'paypal', currency: 'EUR', isEU: false, isSEPA: true },
  XK: { countryCode: 'XK', countryName: 'Kosovo', provider: 'paypal', currency: 'EUR', isEU: false, isSEPA: false },
};

export interface CreatePaymentParams {
  userId: string;
  userEmail: string;
  countryCode: string;
  amount: number;
  productId: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  language?: string;
  firstName?: string;
  lastName?: string;
  preferredProvider?: PaymentProvider;
  /** Preferred payment method (e.g. 'google_pay', 'apple_pay', 'card', 'bank') */
  paymentMethod?: string;
}

export interface PaymentResult {
  success: boolean;
  provider: PaymentProvider;
  paymentUrl?: string;
  sessionId?: string;
  orderId?: string;
  error?: string;
}

/**
 * Payment Provider Factory Class
 *
 * Routes payment creation to Braintree or PayPal based on country.
 */
class PaymentProviderFactory {
  /**
   * Get the appropriate payment provider for a country.
   */
  public getProviderForCountry(countryCode: string): PaymentProvider {
    const mapping = COUNTRY_PROVIDER_MAP[countryCode.toUpperCase()];
    if (!mapping) return 'braintree'; // Default to Braintree for unknown countries
    return mapping.provider;
  }

  /**
   * Get country mapping information
   */
  public getCountryMapping(countryCode: string): CountryProviderMapping | null {
    return COUNTRY_PROVIDER_MAP[countryCode.toUpperCase()] || null;
  }

  /**
   * Check if a country is supported
   */
  public isCountrySupported(countryCode: string): boolean {
    return !!COUNTRY_PROVIDER_MAP[countryCode.toUpperCase()];
  }

  /**
   * Get all supported countries
   */
  public getSupportedCountries(): CountryProviderMapping[] {
    return Object.values(COUNTRY_PROVIDER_MAP);
  }

  /**
   * Get countries by provider
   */
  public getCountriesByProvider(provider: PaymentProvider): CountryProviderMapping[] {
    return Object.values(COUNTRY_PROVIDER_MAP).filter(c => c.provider === provider);
  }

  /**
   * Create a payment session using the appropriate provider.
   * Routes to Braintree for GR/HR/BG/RO/SI/RS, PayPal for AL/BA/MK/ME/XK.
   */
  public async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const provider = params.preferredProvider || this.getProviderForCountry(params.countryCode);

    switch (provider) {
      case 'paypal':
        return this.createPayPalPayment(params);

      case 'braintree':
        return this.createBraintreePayment(params);

      default:
        return {
          success: false,
          provider: 'web',
          error: 'No payment provider is configured for this country.',
        };
    }
  }

  /**
   * Create a PayPal Order (real payment, verified via webhook/capture)
   */
  private async createPayPalPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    if (!paypalService.isConfigured()) {
      return {
        success: false,
        provider: 'paypal',
        error: 'PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      };
    }

    const result = await paypalService.createOrder({
      userId: params.userId,
      userEmail: params.userEmail,
      amount: params.amount,
      currency: 'EUR',
      productId: params.productId,
      planName: params.planName,
      planInterval: params.planInterval,
      countryCode: params.countryCode,
      language: params.language,
      firstName: params.firstName,
      lastName: params.lastName,
    });

    if (result.success) {
      return {
        success: true,
        provider: 'paypal',
        paymentUrl: result.paymentUrl,
        orderId: result.orderId,
      };
    }

    return {
      success: false,
      provider: 'paypal',
      error: result.error || 'Failed to create PayPal order',
    };
  }

  /**
   * Create a Braintree payment session (on-site card payment).
   * Returns a client token for the Drop-in UI — no redirect URL.
   */
  private async createBraintreePayment(params: CreatePaymentParams): Promise<PaymentResult> {
    if (!braintreeService.isConfigured()) {
      return {
        success: false,
        provider: 'braintree',
        error: 'Braintree is not configured. Please set BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY, and BRAINTREE_PRIVATE_KEY.',
      };
    }

    // For Braintree, the frontend handles the payment flow inline.
    // Return success with no paymentUrl — the frontend will use the
    // /braintree/client-token and /braintree/process-payment endpoints.
    return {
      success: true,
      provider: 'braintree',
      // No paymentUrl — frontend renders Drop-in UI inline
    };
  }

  /**
   * Create a promotion payment session
   */
  public async createPromotionPayment(params: {
    userId: string;
    userEmail: string;
    userName?: string;
    countryCode?: string;
    amount: number;
    promotionType?: string;
    promotionTier?: 'featured' | 'highlight' | 'premium';
    propertyId: string;
    propertyTitle?: string;
    duration?: number;
    hasUrgentBadge?: boolean;
    couponCode?: string;
    couponDiscount?: number;
    language?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<PaymentResult> {
    const promoType = params.promotionType || params.promotionTier || 'standard';
    return this.createPayment({
      ...params,
      countryCode: params.countryCode || 'GR',
      productId: `promotion_${promoType}`,
      planName: `${promoType}_promotion`,
      planInterval: 'one_time',
    });
  }

  /**
   * Get provider info for display purposes
   */
  public getProviderInfo(provider: PaymentProvider): { name: string; description: string; fees: string } {
    switch (provider) {
      case 'paypal':
        return {
          name: 'PayPal',
          description: 'Secure payments with PayPal account or card',
          fees: '~2.9% + €0.35 per transaction',
        };
      case 'braintree':
        return {
          name: 'Braintree',
          description: 'Secure card payments with Apple Pay, Google Pay, and 3D Secure',
          fees: '~1.9% + €0.30 per transaction',
        };
      default:
        return {
          name: 'Web Payment',
          description: 'Secure online payment',
          fees: 'Standard processing fees',
        };
    }
  }

  /**
   * Get available payment methods for a country based on active providers
   */
  public getAvailablePaymentMethods(countryCode: string): string[] {
    const mapping = this.getCountryMapping(countryCode);
    if (!mapping) return ['card'];

    switch (mapping.provider) {
      case 'paypal':
        return ['paypal', 'card'];
      case 'braintree':
        return ['card', 'apple_pay', 'google_pay'];
      default:
        return ['card'];
    }
  }
}

// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();
export default paymentProviderFactory;
