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
import { lemonSqueezyService } from './lemonSqueezyService';
import Product from '../models/Product';

// Payment provider types
export type PaymentProvider = 'stripe' | 'lemonsqueezy';

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

  /**
   * Create a LemonSqueezy checkout for property promotions
   * Promotions are one-time payments for highlighting properties
   */
  public async createPromotionPayment(params: {
    userId: string;
    userEmail: string;
    userName?: string;
    propertyId: string;
    propertyTitle: string;
    promotionTier: 'featured' | 'highlight' | 'premium';
    duration: number;
    hasUrgentBadge: boolean;
    amount: number;
    couponCode?: string;
    couponDiscount?: number;
  }): Promise<PaymentResult> {
    try {
      // Check if LemonSqueezy is configured
      if (!lemonSqueezyService.isConfigured()) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: 'LemonSqueezy is not configured',
        };
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Get variant ID for the promotion tier
      const variantId = this.getPromotionVariantId(params.promotionTier, params.duration);

      if (!variantId) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: `No LemonSqueezy variant configured for ${params.promotionTier} promotion (${params.duration} days)`,
        };
      }

      const result = await lemonSqueezyService.createCheckout({
        variantId,
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.userName,
        productId: `promotion_${params.promotionTier}_${params.duration}`,
        planName: `${params.promotionTier.charAt(0).toUpperCase() + params.promotionTier.slice(1)} Promotion`,
        planInterval: 'one_time',
        successUrl: `${baseUrl}/promotions/success?provider=lemonsqueezy&property_id=${params.propertyId}`,
        cancelUrl: `${baseUrl}/promotions/cancel?property_id=${params.propertyId}`,
        customData: {
          propertyId: params.propertyId,
          propertyTitle: params.propertyTitle,
          promotionTier: params.promotionTier,
          duration: String(params.duration),
          hasUrgentBadge: String(params.hasUrgentBadge),
          couponCode: params.couponCode || '',
          couponDiscount: String(params.couponDiscount || 0),
        },
      });

      if (!result.success) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: result.error || 'Failed to create promotion checkout',
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
        error: error.message || 'Failed to create promotion payment',
      };
    }
  }

  /**
   * Get LemonSqueezy variant ID for promotion tier/duration
   */
  private getPromotionVariantId(tier: string, duration: number): string | null {
    // Promotion variant IDs from environment variables
    // Format: LEMONSQUEEZY_VARIANT_PROMO_{TIER}_{DURATION}
    const variantKey = `LEMONSQUEEZY_VARIANT_PROMO_${tier.toUpperCase()}_${duration}`;
    const variantId = process.env[variantKey];

    if (variantId) {
      return variantId;
    }

    // Fallback to tier-only variant (if using single product per tier)
    const tierOnlyKey = `LEMONSQUEEZY_VARIANT_PROMO_${tier.toUpperCase()}`;
    return process.env[tierOnlyKey] || null;
  }

  /**
   * Create a LemonSqueezy checkout for agency featured subscription
   */
  public async createAgencyFeaturedPayment(params: {
    userId: string;
    userEmail: string;
    userName?: string;
    agencyId: string;
    agencyName: string;
    interval: 'weekly' | 'monthly' | 'yearly';
    amount: number;
  }): Promise<PaymentResult> {
    try {
      if (!lemonSqueezyService.isConfigured()) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: 'LemonSqueezy is not configured',
        };
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Get variant ID for agency featured subscription
      const variantId = this.getAgencyFeaturedVariantId(params.interval);

      if (!variantId) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: `No LemonSqueezy variant configured for agency featured (${params.interval})`,
        };
      }

      const result = await lemonSqueezyService.createCheckout({
        variantId,
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.userName,
        productId: `agency_featured_${params.interval}`,
        planName: `Agency Featured (${params.interval})`,
        planInterval: params.interval === 'weekly' ? 'one_time' : (params.interval === 'monthly' ? 'month' : 'year'),
        successUrl: `${baseUrl}/agencies/${params.agencyId}/featured/success?provider=lemonsqueezy`,
        cancelUrl: `${baseUrl}/agencies/${params.agencyId}/featured/cancel`,
        customData: {
          agencyId: params.agencyId,
          agencyName: params.agencyName,
          interval: params.interval,
        },
      });

      if (!result.success) {
        return {
          success: false,
          provider: 'lemonsqueezy',
          error: result.error || 'Failed to create agency featured checkout',
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
        error: error.message || 'Failed to create agency featured payment',
      };
    }
  }

  /**
   * Get LemonSqueezy variant ID for agency featured subscription
   */
  private getAgencyFeaturedVariantId(interval: string): string | null {
    const variantMap: Record<string, string> = {
      'weekly': process.env.LEMONSQUEEZY_VARIANT_AGENCY_FEATURED_WEEKLY || '',
      'monthly': process.env.LEMONSQUEEZY_VARIANT_AGENCY_FEATURED_MONTHLY || '',
      'yearly': process.env.LEMONSQUEEZY_VARIANT_AGENCY_FEATURED_YEARLY || '',
    };
    return variantMap[interval] || null;
  }
}

// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();
export default paymentProviderFactory;
