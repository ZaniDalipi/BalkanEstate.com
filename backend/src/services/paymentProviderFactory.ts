/**
 * Payment Provider Factory
 *
 * Unified payment routing system for all 11 Balkan countries.
 *
 * Provider Strategy:
 * - LemonSqueezy (Primary): Merchant of Record for all countries.
 *   Handles card, Google Pay, Apple Pay, VAT/tax compliance globally.
 *   Works for MK-based companies (MoR processes under their merchant account).
 * - Paysera (Secondary): Bank transfers / SEPA for non-EU Balkans.
 *   Available for direct bank payments where users prefer it.
 */

import { lemonSqueezyService } from './lemonSqueezy';
import { payseraService } from './payseraService';
import { paymentLogger } from '../utils/logger';

// Payment provider types
export type PaymentProvider = 'lemon_squeezy' | 'paysera' | 'web';

// Country to provider mapping
export interface CountryProviderMapping {
  countryCode: string;
  countryName: string;
  provider: PaymentProvider;
  currency: string;
  isEU: boolean;
  isSEPA: boolean;
  fallbackProvider?: PaymentProvider;
}

/**
 * Country to Payment Provider Mapping
 * All countries use LemonSqueezy as primary (MoR handles tax/compliance).
 * Non-EU countries have Paysera as fallback for bank transfers.
 */
export const COUNTRY_PROVIDER_MAP: Record<string, CountryProviderMapping> = {
  // EU Countries — LemonSqueezy primary
  GR: { countryCode: 'GR', countryName: 'Greece', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true },
  HR: { countryCode: 'HR', countryName: 'Croatia', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true },
  BG: { countryCode: 'BG', countryName: 'Bulgaria', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true },
  RO: { countryCode: 'RO', countryName: 'Romania', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true },
  SI: { countryCode: 'SI', countryName: 'Slovenia', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true },

  // Non-EU Balkans — LemonSqueezy primary, Paysera fallback for bank transfers
  RS: { countryCode: 'RS', countryName: 'Serbia', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: true, fallbackProvider: 'paysera' },
  AL: { countryCode: 'AL', countryName: 'Albania', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: true, fallbackProvider: 'paysera' },
  BA: { countryCode: 'BA', countryName: 'Bosnia and Herzegovina', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: false, fallbackProvider: 'paysera' },
  MK: { countryCode: 'MK', countryName: 'North Macedonia', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: true, fallbackProvider: 'paysera' },
  ME: { countryCode: 'ME', countryName: 'Montenegro', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: true, fallbackProvider: 'paysera' },
  XK: { countryCode: 'XK', countryName: 'Kosovo', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: false, fallbackProvider: 'paysera' },
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
 * Routes payment creation to the appropriate provider based on country,
 * configuration availability, and user preference.
 */
class PaymentProviderFactory {
  /**
   * Get the appropriate payment provider for a country.
   *
   * Resolution order:
   * 1. If LemonSqueezy (or future MoR) is configured → use it (card + Google Pay + Apple Pay)
   * 2. If Paysera is configured → use it (bank transfers, SEPA, e-wallet)
   * 3. Return the default provider from the mapping (unconfigured — will show setup error)
   *
   * Note: LemonSqueezy may not be available for MK-registered companies.
   * If MoR env vars are not set, Paysera is used as primary for ALL countries.
   */
  public getProviderForCountry(countryCode: string): PaymentProvider {
    const mapping = COUNTRY_PROVIDER_MAP[countryCode.toUpperCase()];

    // If the MoR (LemonSqueezy) is configured, use it as primary
    if (lemonSqueezyService.isConfigured()) {
      return 'lemon_squeezy';
    }

    // MoR not configured — fall back to Paysera for all countries if configured
    if (payseraService.isConfigured()) {
      return 'paysera';
    }

    // Neither configured — return mapping default (will show config error)
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
      case 'lemon_squeezy':
        return this.createLemonSqueezyPayment(params);

      case 'paysera':
        return this.createPayseraPayment(params);

      default:
        // Try any configured provider
        if (lemonSqueezyService.isConfigured()) return this.createLemonSqueezyPayment(params);
        if (payseraService.isConfigured()) return this.createPayseraPayment(params);
        return {
          success: false,
          provider: 'web',
          error: 'No payment provider is configured. Please set up LemonSqueezy or Paysera environment variables.',
        };
    }
  }

  /**
   * Create a LemonSqueezy checkout session (MoR — card, Google Pay, Apple Pay)
   */
  private async createLemonSqueezyPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    if (!lemonSqueezyService.isConfigured()) {
      // Fall back to Paysera if available
      if (payseraService.isConfigured()) {
        paymentLogger.info('LemonSqueezy not configured, falling back to Paysera');
        return this.createPayseraPayment(params);
      }
      return {
        success: false,
        provider: 'lemon_squeezy',
        error: 'Payment provider is not configured. Please contact support.',
      };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${frontendUrl}/payment/success?provider=lemon_squeezy`;

    const result = await lemonSqueezyService.createCheckout({
      email: params.userEmail,
      name: params.firstName
        ? `${params.firstName}${params.lastName ? ` ${params.lastName}` : ''}`
        : undefined,
      userId: params.userId,
      planName: params.planName,
      planInterval: params.planInterval === 'one_time' ? 'month' : params.planInterval,
      countryCode: params.countryCode,
      productId: params.productId,
      successUrl,
    });

    if (result.success) {
      return {
        success: true,
        provider: 'lemon_squeezy',
        paymentUrl: result.checkoutUrl,
        sessionId: result.checkoutId,
      };
    }

    // If LemonSqueezy fails, try Paysera as fallback for any country
    if (payseraService.isConfigured()) {
      paymentLogger.warn('LemonSqueezy checkout failed, falling back to Paysera');
      return this.createPayseraPayment(params);
    }

    return {
      success: false,
      provider: 'lemon_squeezy',
      error: result.error || 'Failed to create checkout session',
    };
  }

  /**
   * Create a Paysera payment session (bank transfers for non-EU Balkans)
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
    // Promotions are one-time payments routed through LemonSqueezy
    const promoType = params.promotionType || params.promotionTier || 'standard';
    return this.createLemonSqueezyPayment({
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
      case 'lemon_squeezy':
        return {
          name: 'LemonSqueezy',
          description: 'Secure payment processing with card, Google Pay, and Apple Pay',
          fees: '~5% + $0.50 (includes VAT handling)',
        };
      case 'paysera':
        return {
          name: 'Paysera',
          description: 'Bank transfer payments for Balkan countries',
          fees: '~1.5-2.5% for bank transfers',
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
    const provider = this.getProviderForCountry(countryCode);
    const mapping = this.getCountryMapping(countryCode);
    const methods: string[] = [];

    if (provider === 'lemon_squeezy' && lemonSqueezyService.isConfigured()) {
      // MoR handles card, Google Pay, Apple Pay globally
      methods.push('card', 'google_pay', 'apple_pay');
      if (mapping?.isSEPA) methods.push('sepa_debit');
    }

    if (provider === 'paysera' || payseraService.isConfigured()) {
      // Paysera: bank transfers, SEPA, e-wallet, card (EU merchants only)
      methods.push('bank_transfer');
      if (mapping?.isSEPA) methods.push('sepa_debit');
      // Paysera card payments for bank links + e-wallet
      methods.push('wallet');
    }

    // Deduplicate
    return [...new Set(methods)];
  }
}

// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();
export default paymentProviderFactory;
