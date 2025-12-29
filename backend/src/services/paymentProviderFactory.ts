/**
 * Payment Provider Factory
 *
 * Unified payment routing system that selects the appropriate payment provider
 * based on the user's country. This ensures the lowest fees while maintaining
 * full coverage across all Balkan countries.
 *
 * Provider Selection:
 * - Stripe: EU countries (Greece, Croatia, Bulgaria, Romania, Slovenia)
 * - Paddle: Non-EU Balkans (Serbia, Albania, Bosnia, N. Macedonia, Montenegro, Kosovo)
 *   Paddle is a Merchant of Record (MoR) handling VAT/tax compliance globally
 */

import Stripe from 'stripe';
import { paddleService } from './paddleService';

// Payment provider types
export type PaymentProvider = 'stripe' | 'paddle';

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
 * Based on Stripe availability and PaySera coverage in the Balkans
 */
export const COUNTRY_PROVIDER_MAP: Record<string, CountryProviderMapping> = {
  // EU Countries - Use Stripe (lower fees, better integration)
  GR: {
    countryCode: 'GR',
    countryName: 'Greece',
    provider: 'stripe',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  HR: {
    countryCode: 'HR',
    countryName: 'Croatia',
    provider: 'stripe',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  BG: {
    countryCode: 'BG',
    countryName: 'Bulgaria',
    provider: 'stripe',
    currency: 'EUR', // We accept EUR, even though local is BGN
    isEU: true,
    isSEPA: true,
  },
  RO: {
    countryCode: 'RO',
    countryName: 'Romania',
    provider: 'stripe',
    currency: 'EUR', // We accept EUR, even though local is RON
    isEU: true,
    isSEPA: true,
  },
  SI: {
    countryCode: 'SI',
    countryName: 'Slovenia',
    provider: 'stripe',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },

  // Non-EU Balkans - Use Paddle (Merchant of Record with VAT compliance)
  RS: {
    countryCode: 'RS',
    countryName: 'Serbia',
    provider: 'paddle',
    currency: 'EUR',
    isEU: false,
    isSEPA: true, // Joined SEPA in 2025
  },
  AL: {
    countryCode: 'AL',
    countryName: 'Albania',
    provider: 'paddle',
    currency: 'EUR',
    isEU: false,
    isSEPA: true, // Joined SEPA in 2024
  },
  BA: {
    countryCode: 'BA',
    countryName: 'Bosnia and Herzegovina',
    provider: 'paddle',
    currency: 'EUR',
    isEU: false,
    isSEPA: false,
  },
  MK: {
    countryCode: 'MK',
    countryName: 'North Macedonia',
    provider: 'paddle',
    currency: 'EUR',
    isEU: false,
    isSEPA: true, // Joined SEPA in 2025
  },
  ME: {
    countryCode: 'ME',
    countryName: 'Montenegro',
    provider: 'paddle',
    currency: 'EUR', // Uses EUR as official currency
    isEU: false,
    isSEPA: true, // Joined SEPA in 2024
  },
  XK: {
    countryCode: 'XK',
    countryName: 'Kosovo',
    provider: 'paddle',
    currency: 'EUR', // Uses EUR
    isEU: false,
    isSEPA: false,
  },
};

// Lazy Stripe initialization to avoid crash when API key not set
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    _stripe = new Stripe(apiKey, {
      apiVersion: '2025-10-29.clover',
    });
  }
  return _stripe;
}

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
    // Default to Stripe for unknown countries (will work for most EU countries)
    return 'stripe';
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
    const provider = this.getProviderForCountry(params.countryCode);

    console.log(`🔄 Routing payment for country ${params.countryCode} to provider: ${provider}`);

    switch (provider) {
      case 'stripe':
        return this.createStripePayment(params);
      case 'paddle':
        return this.createPaddlePayment(params);
      default:
        return {
          success: false,
          provider: 'stripe',
          error: `Unknown provider: ${provider}`,
        };
    }
  }

  /**
   * Create a Stripe checkout session
   */
  private async createStripePayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const amountInCents = Math.round(params.amount * 100);

      // Determine if this is a subscription or one-time payment
      const isSubscription = params.planInterval === 'month' || params.planInterval === 'year';

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: params.planName,
                description: `${params.planName} - ${params.planInterval} subscription`,
              },
              unit_amount: amountInCents,
              ...(isSubscription && {
                recurring: {
                  interval: params.planInterval === 'year' ? 'year' : 'month',
                },
              }),
            },
            quantity: 1,
          },
        ],
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${baseUrl}/payment/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/cancel?provider=stripe`,
        client_reference_id: params.userId,
        customer_email: params.userEmail,
        metadata: {
          userId: params.userId,
          productId: params.productId,
          planName: params.planName,
          planInterval: params.planInterval,
          provider: 'stripe',
          countryCode: params.countryCode,
        },
        locale: this.mapStripeLocale(params.language),
      };

      const session = await getStripe().checkout.sessions.create(sessionConfig);

      console.log(`✅ Stripe checkout session created: ${session.id}`);

      return {
        success: true,
        provider: 'stripe',
        paymentUrl: session.url || undefined,
        sessionId: session.id,
      };
    } catch (error: any) {
      console.error('❌ Stripe payment creation failed:', error);
      return {
        success: false,
        provider: 'stripe',
        error: error.message,
      };
    }
  }

  /**
   * Create a Paddle payment
   */
  private async createPaddlePayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      // Check if Paddle is configured
      if (!paddleService.isConfigured()) {
        // Fallback to Stripe if Paddle is not configured
        console.warn('⚠️ Paddle not configured, falling back to Stripe');
        return this.createStripePayment(params);
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // For Paddle, we need to use their price IDs from dashboard
      // Or create a transaction with inline pricing
      const result = await paddleService.createCheckout({
        priceId: this.getPaddlePriceId(params.planName, params.planInterval),
        userId: params.userId,
        userEmail: params.userEmail,
        productId: params.productId,
        planName: params.planName,
        planInterval: params.planInterval,
        successUrl: `${baseUrl}/payment/success?provider=paddle`,
        cancelUrl: `${baseUrl}/payment/cancel?provider=paddle`,
      });

      if (!result.success) {
        // Fallback to Stripe if Paddle fails
        console.warn('⚠️ Paddle payment creation failed, falling back to Stripe');
        return this.createStripePayment(params);
      }

      return {
        success: true,
        provider: 'paddle',
        paymentUrl: result.checkoutUrl,
        sessionId: result.transactionId,
      };
    } catch (error: any) {
      console.error('❌ Paddle payment creation failed:', error);
      // Fallback to Stripe
      console.warn('⚠️ Falling back to Stripe due to Paddle error');
      return this.createStripePayment(params);
    }
  }

  /**
   * Get Paddle price ID based on plan
   * These should be configured in Paddle dashboard and stored as env vars
   */
  private getPaddlePriceId(planName: string, interval: string): string {
    // Map plan names to Paddle price IDs
    const priceMap: Record<string, Record<string, string>> = {
      'Pro': {
        'month': process.env.PADDLE_PRICE_PRO_MONTHLY || '',
        'year': process.env.PADDLE_PRICE_PRO_YEARLY || '',
      },
      'Pro Monthly': {
        'month': process.env.PADDLE_PRICE_PRO_MONTHLY || '',
      },
      'Pro Yearly': {
        'year': process.env.PADDLE_PRICE_PRO_YEARLY || '',
      },
      'Agency': {
        'month': process.env.PADDLE_PRICE_AGENCY_MONTHLY || '',
        'year': process.env.PADDLE_PRICE_AGENCY_YEARLY || '',
      },
      'Agency Monthly': {
        'month': process.env.PADDLE_PRICE_AGENCY_MONTHLY || '',
      },
      'Agency Yearly': {
        'year': process.env.PADDLE_PRICE_AGENCY_YEARLY || '',
      },
    };

    const planPrices = priceMap[planName];
    if (planPrices && planPrices[interval]) {
      return planPrices[interval];
    }

    // Default to Pro monthly if no match
    return process.env.PADDLE_PRICE_PRO_MONTHLY || '';
  }

  /**
   * Map language code to Stripe locale
   */
  private mapStripeLocale(lang?: string): Stripe.Checkout.SessionCreateParams.Locale {
    const localeMap: Record<string, Stripe.Checkout.SessionCreateParams.Locale> = {
      en: 'en',
      bg: 'bg',
      hr: 'hr',
      el: 'el',
      ro: 'ro',
      sl: 'sl',
      // Default to English for unsupported languages
    };
    return localeMap[lang?.toLowerCase() || 'en'] || 'en';
  }

  /**
   * Get provider info for display purposes
   */
  public getProviderInfo(provider: PaymentProvider): { name: string; description: string; fees: string } {
    switch (provider) {
      case 'stripe':
        return {
          name: 'Stripe',
          description: 'Secure card payments with Stripe',
          fees: '~2.9% + €0.25',
        };
      case 'paddle':
        return {
          name: 'Paddle',
          description: 'Secure payments with automatic VAT handling',
          fees: '~5% + €0.50',
        };
      default:
        return {
          name: 'Unknown',
          description: '',
          fees: '',
        };
    }
  }
}

// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();
export default paymentProviderFactory;
