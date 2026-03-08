/**
 * Payment Provider Factory
 *
 * Unified payment routing system for all 11 Balkan countries.
 *
 * Provider Strategy:
 * - Stripe: Greece, Croatia, Bulgaria, Romania, Slovenia, Serbia
 *   (real Stripe Checkout Sessions with webhook verification)
 * - PayPal: Albania, Bosnia, North Macedonia, Montenegro, Kosovo
 *   (real PayPal Orders API v2 with webhook verification)
 *
 * Every payment is verified server-side before activating subscriptions.
 * No dummy data — all payments go through real provider APIs.
 */

import { stripeService } from './stripeService';
import { paypalService } from './paypalService';

// Payment provider types
export type PaymentProvider = 'stripe' | 'paypal' | 'web';

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
 * Stripe: GR, HR, BG, RO, SI, RS (6 countries)
 * PayPal: AL, BA, MK, ME, XK (5 countries)
 */
export const COUNTRY_PROVIDER_MAP: Record<string, CountryProviderMapping> = {
  // Stripe countries (EU + Serbia)
  GR: { countryCode: 'GR', countryName: 'Greece', provider: 'stripe', currency: 'EUR', isEU: true, isSEPA: true },
  HR: { countryCode: 'HR', countryName: 'Croatia', provider: 'stripe', currency: 'EUR', isEU: true, isSEPA: true },
  BG: { countryCode: 'BG', countryName: 'Bulgaria', provider: 'stripe', currency: 'EUR', isEU: true, isSEPA: true },
  RO: { countryCode: 'RO', countryName: 'Romania', provider: 'stripe', currency: 'EUR', isEU: true, isSEPA: true },
  SI: { countryCode: 'SI', countryName: 'Slovenia', provider: 'stripe', currency: 'EUR', isEU: true, isSEPA: true },
  RS: { countryCode: 'RS', countryName: 'Serbia', provider: 'stripe', currency: 'EUR', isEU: false, isSEPA: true },

  // PayPal countries (non-Stripe Balkans)
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
 * Routes payment creation to Stripe or PayPal based on country.
 */
class PaymentProviderFactory {
  /**
   * Get the appropriate payment provider for a country.
   */
  public getProviderForCountry(countryCode: string): PaymentProvider {
    const mapping = COUNTRY_PROVIDER_MAP[countryCode.toUpperCase()];
    if (!mapping) return 'stripe'; // Default to Stripe for unknown countries
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
   * Routes to Stripe for GR/HR/BG/RO/SI/RS, PayPal for AL/BA/MK/ME/XK.
   */
  public async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const provider = params.preferredProvider || this.getProviderForCountry(params.countryCode);

    switch (provider) {
      case 'stripe':
        return this.createStripePayment(params);

      case 'paypal':
        return this.createPayPalPayment(params);

      default:
        return {
          success: false,
          provider: 'web',
          error: 'No payment provider is configured for this country.',
        };
    }
  }

  /**
   * Create a Stripe Checkout Session (real payment, verified via webhook)
   */
  private async createStripePayment(params: CreatePaymentParams): Promise<PaymentResult> {
    if (!stripeService.isConfigured()) {
      return {
        success: false,
        provider: 'stripe',
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY.',
      };
    }

    const result = await stripeService.createCheckoutSession({
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
        provider: 'stripe',
        paymentUrl: result.paymentUrl,
        sessionId: result.sessionId,
      };
    }

    return {
      success: false,
      provider: 'stripe',
      error: result.error || 'Failed to create Stripe checkout session',
    };
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
      case 'stripe':
        return {
          name: 'Stripe',
          description: 'Secure payments with card, Apple Pay, and Google Pay',
          fees: '~1.5-3% for card payments',
        };
      case 'paypal':
        return {
          name: 'PayPal',
          description: 'Secure payments with PayPal account or card',
          fees: '~2.9% + €0.35 per transaction',
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
      case 'stripe':
        const methods = ['card', 'apple_pay', 'google_pay'];
        if (mapping.isSEPA) methods.push('sepa_debit');
        return methods;
      case 'paypal':
        return ['paypal', 'card'];
      default:
        return ['card'];
    }
  }
}

// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();
export default paymentProviderFactory;
