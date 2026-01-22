/**
 * Payment Provider Factory
 *
 * Unified payment routing system for all Balkan countries.
 * Using LemonSqueezy as the primary payment provider for all regions.
 *
 * LemonSqueezy acts as Merchant of Record (MoR), handling:
 * - Payment processing
 * - VAT/tax compliance automatically
 * - Chargeback protection
 * - Global coverage including all Balkan countries
 */

import Stripe from 'stripe';
import { paddleService } from './paddleService';
import { lemonSqueezyService } from './lemonSqueezyService';
import Product from '../models/Product';

// Payment provider types
export type PaymentProvider = 'stripe' | 'paddle' | 'lemonsqueezy';

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
 * All countries use LemonSqueezy for unified payment processing and VAT compliance
 */
export const COUNTRY_PROVIDER_MAP: Record<string, CountryProviderMapping> = {
  // EU Countries
  GR: {
    countryCode: 'GR',
    countryName: 'Greece',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  HR: {
    countryCode: 'HR',
    countryName: 'Croatia',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  BG: {
    countryCode: 'BG',
    countryName: 'Bulgaria',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  RO: {
    countryCode: 'RO',
    countryName: 'Romania',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },
  SI: {
    countryCode: 'SI',
    countryName: 'Slovenia',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: true,
    isSEPA: true,
  },

  // Non-EU Balkans
  RS: {
    countryCode: 'RS',
    countryName: 'Serbia',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: false,
    isSEPA: true,
  },
  AL: {
    countryCode: 'AL',
    countryName: 'Albania',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: false,
    isSEPA: true,
  },
  BA: {
    countryCode: 'BA',
    countryName: 'Bosnia and Herzegovina',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: false,
    isSEPA: false,
  },
  MK: {
    countryCode: 'MK',
    countryName: 'North Macedonia',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: false,
    isSEPA: true,
  },
  ME: {
    countryCode: 'ME',
    countryName: 'Montenegro',
    provider: 'lemonsqueezy',
    currency: 'EUR',
    isEU: false,
    isSEPA: true,
  },
  XK: {
    countryCode: 'XK',
    countryName: 'Kosovo',
    provider: 'lemonsqueezy',
    currency: 'EUR',
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
    // Check if LemonSqueezy is configured - use it as primary provider
    if (lemonSqueezyService.isConfigured()) {
      return this.createLemonSqueezyPayment(params);
    }

    // Fallback to country-based provider selection
    const provider = this.getProviderForCountry(params.countryCode);

    switch (provider) {
      case 'stripe':
        return this.createStripePayment(params);
      case 'paddle':
        return this.createPaddlePayment(params);
      case 'lemonsqueezy':
        return this.createLemonSqueezyPayment(params);
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

      return {
        success: true,
        provider: 'stripe',
        paymentUrl: session.url || undefined,
        sessionId: session.id,
      };
    } catch (error: any) {
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
      // Check if Paddle is configured with real credentials
      if (!paddleService.isConfigured()) {
        return {
          success: false,
          provider: 'paddle',
          error: 'Payment provider not configured. Please restart the backend server.',
        };
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
        return {
          success: false,
          provider: 'paddle',
          error: result.error || 'Failed to create Paddle checkout',
        };
      }

      return {
        success: true,
        provider: 'paddle',
        paymentUrl: result.checkoutUrl,
        sessionId: result.transactionId,
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'paddle',
        error: error.message || 'Failed to create payment session',
      };
    }
  }

  /**
   * Create a LemonSqueezy payment
   */
  private async createLemonSqueezyPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      // Check if LemonSqueezy is configured
      if (!lemonSqueezyService.isConfigured()) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: 'LemonSqueezy is not configured. Please set API key and store ID.',
        };
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Get the LemonSqueezy variant ID from the product
      const variantId = await this.getLemonSqueezyVariantId(params.planName, params.planInterval);

      if (!variantId) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: `No LemonSqueezy variant found for plan: ${params.planName} (${params.planInterval})`,
        };
      }

      const result = await lemonSqueezyService.createCheckout({
        variantId,
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.firstName ? `${params.firstName} ${params.lastName || ''}`.trim() : undefined,
        productId: params.productId,
        planName: params.planName,
        planInterval: params.planInterval,
        successUrl: `${baseUrl}/payment/success?provider=lemonsqueezy`,
        cancelUrl: `${baseUrl}/payment/cancel?provider=lemonsqueezy`,
      });

      if (!result.success) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: result.error || 'Failed to create LemonSqueezy checkout',
        };
      }

      return {
        success: true,
        provider: 'lemonsqueezy',
        paymentUrl: result.checkoutUrl,
        sessionId: result.checkoutId,
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'lemonsqueezy',
        error: error.message || 'Failed to create payment session',
      };
    }
  }

  /**
   * Get LemonSqueezy variant ID based on plan
   * First tries to find in database, then falls back to env vars
   */
  private async getLemonSqueezyVariantId(planName: string, interval: string): Promise<string | null> {
    // Try to find the product in database with LemonSqueezy variant ID
    const product = await Product.findOne({
      $or: [
        { name: planName },
        { productId: planName.toLowerCase().replace(/\s+/g, '_') },
      ],
    });

    if (product?.lemonSqueezyVariantId) {
      return product.lemonSqueezyVariantId;
    }

    // Fallback to environment variables
    const variantMap: Record<string, Record<string, string>> = {
      // Buyer plans
      'Buyer Pro': {
        'month': process.env.LEMONSQUEEZY_VARIANT_BUYER_PRO_MONTHLY || '',
      },
      'Buyer Pro Monthly': {
        'month': process.env.LEMONSQUEEZY_VARIANT_BUYER_PRO_MONTHLY || '',
      },
      'buyer_pro_monthly': {
        'month': process.env.LEMONSQUEEZY_VARIANT_BUYER_PRO_MONTHLY || '',
      },
      // Pro/Seller plans
      'Pro': {
        'month': process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY || '',
        'year': process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY || '',
      },
      'Pro Monthly': {
        'month': process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY || '',
      },
      'Pro Yearly': {
        'year': process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY || '',
      },
      // Agency/Enterprise plans
      'Agency': {
        'year': process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY || '',
      },
      'Enterprise': {
        'year': process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY || '',
      },
      'Enterprise Yearly': {
        'year': process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY || '',
      },
    };

    const planVariants = variantMap[planName];
    if (planVariants && planVariants[interval]) {
      return planVariants[interval];
    }

    return null;
  }

  /**
   * Get Paddle price ID based on plan
   * These should be configured in Paddle dashboard and stored as env vars
   */
  private getPaddlePriceId(planName: string, interval: string): string {
    // Map plan names to Paddle price IDs
    const priceMap: Record<string, Record<string, string>> = {
      // Buyer plans
      'Buyer Pro': {
        'month': process.env.PADDLE_PRICE_BUYER_PRO_MONTHLY || '',
        'year': process.env.PADDLE_PRICE_BUYER_PRO_YEARLY || '',
      },
      'Buyer Pro Monthly': {
        'month': process.env.PADDLE_PRICE_BUYER_PRO_MONTHLY || '',
      },
      'buyer_pro_monthly': {
        'month': process.env.PADDLE_PRICE_BUYER_PRO_MONTHLY || '',
      },
      // Pro/Seller plans
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
      // Agency plans
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
      'Enterprise': {
        'year': process.env.PADDLE_PRICE_AGENCY_YEARLY || '',
      },
    };

    const planPrices = priceMap[planName];
    if (planPrices && planPrices[interval]) {
      return planPrices[interval];
    }

    // Default to Buyer Pro monthly if no match
    return process.env.PADDLE_PRICE_BUYER_PRO_MONTHLY || '';
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
      case 'lemonsqueezy':
        return {
          name: 'LemonSqueezy',
          description: 'Secure payments with automatic VAT handling',
          fees: '~5% + $0.50',
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
