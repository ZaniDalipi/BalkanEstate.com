/**
 * Payment Provider Factory
 *
 * Unified payment routing system for all Balkan countries.
 * Payment provider TBD - evaluating 2Checkout, Dodo Payments, FastSpring.
 * See PAYMENT_OPTIONS_2026.md for full analysis.
 */

// Payment provider types - will be updated when new provider is selected
export type PaymentProvider = 'web';

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
 * All countries use 'web' (direct) payment processing until new provider is integrated
 */
export const COUNTRY_PROVIDER_MAP: Record<string, CountryProviderMapping> = {
  // EU Countries
  GR: {
    countryCode: 'GR',
    countryName: 'Greece',
    provider: 'web',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  HR: {
    countryCode: 'HR',
    countryName: 'Croatia',
    provider: 'web',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  BG: {
    countryCode: 'BG',
    countryName: 'Bulgaria',
    provider: 'web',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  RO: {
    countryCode: 'RO',
    countryName: 'Romania',
    provider: 'web',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  SI: {
    countryCode: 'SI',
    countryName: 'Slovenia',
    provider: 'web',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },

  // Non-EU Balkans
  RS: {
    countryCode: 'RS',
    countryName: 'Serbia',
    provider: 'web',
    currency: 'EUR',
    isEU: false,
    isSEPA: true,
  },
  AL: {
    countryCode: 'AL',
    countryName: 'Albania',
    provider: 'web',
    currency: 'EUR',
    isEU: false,
    isSEPA: true,
  },
  BA: {
    countryCode: 'BA',
    countryName: 'Bosnia and Herzegovina',
    provider: 'web',
    currency: 'EUR',
    isEU: false,
    isSEPA: false,
  },
  MK: {
    countryCode: 'MK',
    countryName: 'North Macedonia',
    provider: 'web',
    currency: 'EUR',
    isEU: false,
    isSEPA: true,
  },
  ME: {
    countryCode: 'ME',
    countryName: 'Montenegro',
    provider: 'web',
    currency: 'EUR',
    isEU: false,
    isSEPA: true,
  },
  XK: {
    countryCode: 'XK',
    countryName: 'Kosovo',
    provider: 'web',
    currency: 'EUR',
    isEU: false,
    isSEPA: false,
  },
};

export interface CreatePaymentParams {
  userId: string;
  userEmail: string;
  countryCode: string;
  amount: number; // Amount in EUR (not cents)
  productId: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  language?: string;
  firstName?: string;
  lastName?: string;
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
 * Currently a placeholder - payment provider integration pending.
 * The factory pattern is preserved so a new provider can be plugged in
 * without changing the rest of the codebase.
 */
class PaymentProviderFactory {
  /**
   * Get the appropriate payment provider for a country
   */
  public getProviderForCountry(countryCode: string): PaymentProvider {
    const mapping = COUNTRY_PROVIDER_MAP[countryCode.toUpperCase()];
    if (mapping) {
      return mapping.provider;
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
   * Create a payment session using the appropriate provider
   * TODO: Integrate new payment provider (2Checkout, Dodo Payments, or FastSpring)
   */
  public async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    // Payment provider not yet configured - return error with guidance
    return {
      success: false,
      provider: 'web',
      error: 'Payment provider not yet configured. See PAYMENT_OPTIONS_2026.md for integration options.',
    };
  }

  /**
   * Get provider info for display purposes
   */
  public getProviderInfo(provider: PaymentProvider): { name: string; description: string; fees: string } {
    return {
      name: 'Web Payment',
      description: 'Payment provider pending integration',
      fees: 'TBD',
    };
  }
}

// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();
export default paymentProviderFactory;
