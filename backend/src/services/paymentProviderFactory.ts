/**
 * Payment Provider Factory
 *
 * Unified payment routing system for all 11 Balkan countries.
 *
 * Provider Strategy:
 * - Paysera (Primary): Handles card, Google Pay, Apple Pay, bank transfers,
 *   SEPA, and e-wallet payments for all Balkan countries.
 */

import { payseraService, type PayseraPaymentMethod } from './payseraService';

// Payment provider types
export type PaymentProvider = 'paysera' | 'stripe' | 'paddle' | 'web';

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
 * All countries use Paysera as the primary payment provider.
 */
export const COUNTRY_PROVIDER_MAP: Record<string, CountryProviderMapping> = {
  // EU Countries
  GR: { countryCode: 'GR', countryName: 'Greece', provider: 'paysera', currency: 'EUR', isEU: true, isSEPA: true },
  HR: { countryCode: 'HR', countryName: 'Croatia', provider: 'paysera', currency: 'EUR', isEU: true, isSEPA: true },
  BG: { countryCode: 'BG', countryName: 'Bulgaria', provider: 'paysera', currency: 'EUR', isEU: true, isSEPA: true },
  RO: { countryCode: 'RO', countryName: 'Romania', provider: 'paysera', currency: 'EUR', isEU: true, isSEPA: true },
  SI: { countryCode: 'SI', countryName: 'Slovenia', provider: 'paysera', currency: 'EUR', isEU: true, isSEPA: true },

  // Non-EU Balkans
  RS: { countryCode: 'RS', countryName: 'Serbia', provider: 'paysera', currency: 'EUR', isEU: false, isSEPA: true },
  AL: { countryCode: 'AL', countryName: 'Albania', provider: 'paysera', currency: 'EUR', isEU: false, isSEPA: true },
  BA: { countryCode: 'BA', countryName: 'Bosnia and Herzegovina', provider: 'paysera', currency: 'EUR', isEU: false, isSEPA: false },
  MK: { countryCode: 'MK', countryName: 'North Macedonia', provider: 'paysera', currency: 'EUR', isEU: false, isSEPA: true },
  ME: { countryCode: 'ME', countryName: 'Montenegro', provider: 'paysera', currency: 'EUR', isEU: false, isSEPA: true },
  XK: { countryCode: 'XK', countryName: 'Kosovo', provider: 'paysera', currency: 'EUR', isEU: false, isSEPA: false },
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
 * Routes payment creation to Paysera based on country and configuration.
 */
class PaymentProviderFactory {
  /**
   * Get the appropriate payment provider for a country.
   */
  public getProviderForCountry(countryCode: string): PaymentProvider {
    if (payseraService.isConfigured()) {
      return 'paysera';
    }

    const mapping = COUNTRY_PROVIDER_MAP[countryCode.toUpperCase()];
    return mapping?.provider || 'paysera';
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
   * Create a payment session using the appropriate provider
   */
  public async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const provider = params.preferredProvider || this.getProviderForCountry(params.countryCode);

    switch (provider) {
      case 'paysera':
        return this.createPayseraPayment(params);

      default:
        if (payseraService.isConfigured()) return this.createPayseraPayment(params);
        return {
          success: false,
          provider: 'web',
          error: 'No payment provider is configured. Please set up Paysera environment variables.',
        };
    }
  }

  /**
   * Create a Paysera payment session (card, Google Pay, Apple Pay, bank transfers)
   */
  private async createPayseraPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    if (!payseraService.isConfigured()) {
      return {
        success: false,
        provider: 'paysera',
        error: 'Paysera is not configured',
      };
    }

    const orderId = `BE_${params.userId.slice(-8)}_${Date.now()}`;

    const result = await payseraService.createPayment({
      orderId,
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: 'EUR',
      country: params.countryCode,
      description: `BalkanEstate ${params.planName} subscription`,
      email: params.userEmail,
      userId: params.userId,
      productId: params.productId,
      planName: params.planName,
      planInterval: params.planInterval,
      firstName: params.firstName,
      lastName: params.lastName,
      language: params.language,
      paymentMethod: params.paymentMethod as PayseraPaymentMethod,
    });

    if (result.success) {
      return {
        success: true,
        provider: 'paysera',
        paymentUrl: result.paymentUrl,
        orderId: result.orderId,
      };
    }

    return {
      success: false,
      provider: 'paysera',
      error: result.error || 'Failed to create Paysera payment',
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
    return this.createPayseraPayment({
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
      case 'paysera':
        return {
          name: 'Paysera',
          description: 'Secure payments with card, Google Pay, Apple Pay, and bank transfer',
          fees: '~1.5-2.5% for card/wallet, lower for bank transfers',
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
    const methods: string[] = [];

    if (payseraService.isConfigured()) {
      methods.push('card', 'google_pay', 'apple_pay');
      methods.push('bank_transfer');
      if (mapping?.isSEPA) methods.push('sepa_debit');
      methods.push('wallet');
    }

    // Deduplicate
    return [...new Set(methods)];
  }
}

// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();
export default paymentProviderFactory;
