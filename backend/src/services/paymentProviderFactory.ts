/**
 * Payment Provider Factory
 *
 * Unified payment routing system for all 11 Balkan countries.
 * Uses the provider registry to discover available providers dynamically.
 *
 * Provider Strategy:
 * - Paysera (Primary): Handles card, Google Pay, Apple Pay, bank transfers,
 *   SEPA, and e-wallet payments for all Balkan countries.
 * - Additional providers (Paddle, etc.) can be added via preferredProvider
 *   or as fallbacks when the primary provider is not configured.
 */

import { providerRegistry } from './providers/providerRegistry';
import type { IPaymentProvider } from '../interfaces/IPaymentProvider';

// Payment provider types — dynamically extended by registered providers
export type PaymentProvider = string;

// Country to provider mapping
export interface CountryProviderMapping {
  countryCode: string;
  countryName: string;
  provider: string;
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
 * Routes payment creation through the provider registry.
 * All provider-specific logic lives in the adapter implementations.
 */
class PaymentProviderFactory {
  /**
   * Get the appropriate payment provider for a country.
   * Checks the country mapping first, then falls back to any configured provider.
   */
  public getProviderForCountry(countryCode: string): PaymentProvider {
    const mapping = COUNTRY_PROVIDER_MAP[countryCode.toUpperCase()];
    const preferredName = mapping?.provider || 'paysera';

    // Check if the mapped provider is configured
    const preferred = providerRegistry.get(preferredName);
    if (preferred?.isConfigured()) {
      return preferredName;
    }

    // Fall back to any configured provider
    const configured = providerRegistry.getConfigured();
    if (configured.length > 0) {
      return configured[0].name;
    }

    return 'web';
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
   * Delegates entirely to the provider adapter via the registry.
   */
  public async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const providerName = params.preferredProvider || this.getProviderForCountry(params.countryCode);
    const provider = providerRegistry.get(providerName);

    if (provider?.isConfigured()) {
      return this.createSessionViaProvider(provider, params);
    }

    // Fall back to any configured provider
    const configured = providerRegistry.getConfigured();
    if (configured.length > 0) {
      return this.createSessionViaProvider(configured[0], params);
    }

    return {
      success: false,
      provider: 'web',
      error: 'No payment provider is configured. Please set up payment environment variables.',
    };
  }

  /**
   * Create a session through a specific provider adapter.
   */
  private async createSessionViaProvider(
    provider: IPaymentProvider,
    params: CreatePaymentParams
  ): Promise<PaymentResult> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const result = await provider.createSession({
      userId: params.userId,
      userEmail: params.userEmail,
      productId: params.productId,
      planName: params.planName,
      planInterval: params.planInterval,
      amount: params.amount,
      currency: 'EUR',
      countryCode: params.countryCode,
      language: params.language,
      firstName: params.firstName,
      lastName: params.lastName,
      paymentMethod: params.paymentMethod,
      successUrl: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/payment/cancel`,
    });

    if (result.success) {
      return {
        success: true,
        provider: provider.name,
        paymentUrl: result.paymentUrl,
        sessionId: result.sessionId,
        orderId: result.sessionId,
      };
    }

    return {
      success: false,
      provider: provider.name,
      error: result.error || `Failed to create ${provider.displayName} payment`,
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
   * Get provider info for display purposes.
   * Reads from the provider adapter if available, otherwise generic fallback.
   */
  public getProviderInfo(provider: PaymentProvider): { name: string; description: string; fees: string } {
    const adapter = providerRegistry.get(provider);
    if (adapter) {
      return {
        name: adapter.displayName,
        description: adapter.description,
        fees: adapter.getFeeDescription(),
      };
    }

    return {
      name: 'Web Payment',
      description: 'Secure online payment',
      fees: 'Standard processing fees',
    };
  }

  /**
   * Get available payment methods for a country based on active providers
   */
  public getAvailablePaymentMethods(countryCode: string): string[] {
    const mapping = this.getCountryMapping(countryCode);
    const methods: string[] = [];

    for (const provider of providerRegistry.getConfigured()) {
      methods.push(...provider.getSupportedPaymentMethods());
    }

    // Add SEPA for supported countries
    if (mapping?.isSEPA && methods.includes('card')) {
      methods.push('sepa_debit');
    }

    // Deduplicate
    return [...new Set(methods)];
  }

  /**
   * Get all registered provider names (for validation).
   */
  public getRegisteredProviderNames(): string[] {
    return [...providerRegistry.getNames(), 'web'];
  }
}

// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();
export default paymentProviderFactory;
