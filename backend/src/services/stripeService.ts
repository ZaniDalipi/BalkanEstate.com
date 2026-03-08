/**
 * Stripe Payment Service
 *
 * Handles payment processing for Stripe-supported Balkan countries:
 * - Greece (GR)
 * - Croatia (HR)
 * - Bulgaria (BG)
 * - Romania (RO)
 * - Slovenia (SI)
 * - Serbia (RS)
 *
 * Uses Stripe Checkout Sessions for secure, verified payments.
 * No dummy data — every payment is verified via Stripe webhooks
 * before activating any subscription.
 *
 * Stripe API Documentation: https://docs.stripe.com/api
 */

import Stripe from 'stripe';
import { paymentLogger } from '../utils/logger';
import { buildFrontendRedirectUrl } from '../utils/redirectValidation';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
});

export interface StripePaymentRequest {
  userId: string;
  userEmail: string;
  amount: number; // Amount in EUR (not cents)
  currency: string;
  productId: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  countryCode: string;
  language?: string;
  firstName?: string;
  lastName?: string;
}

export interface StripePaymentResponse {
  success: boolean;
  paymentUrl?: string;
  sessionId?: string;
  error?: string;
}

class StripeService {
  /**
   * Check if Stripe is properly configured
   */
  public isConfigured(): boolean {
    return !!(STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== 'sk_not_configured');
  }

  /**
   * Get the webhook secret for signature verification
   */
  public getWebhookSecret(): string {
    return STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Get Stripe instance for webhook verification
   */
  public getStripeInstance(): Stripe {
    return stripe;
  }

  /**
   * Create a Stripe Checkout Session with real payment verification.
   * The session redirects the user to Stripe's hosted checkout page.
   * Payment is only confirmed via webhook — no client-side trust.
   */
  public async createCheckoutSession(request: StripePaymentRequest): Promise<StripePaymentResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
      }

      const isRecurring = request.planInterval === 'month' || request.planInterval === 'year';

      const successUrl = buildFrontendRedirectUrl('/payment/success', {
        provider: 'stripe',
        session_id: '{CHECKOUT_SESSION_ID}',
      });

      const cancelUrl = buildFrontendRedirectUrl('/payment/cancel', {
        provider: 'stripe',
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              product_data: {
                name: request.planName,
                description: `BalkanEstate ${request.planName} subscription`,
              },
              unit_amount: Math.round(request.amount * 100), // Convert EUR to cents
              recurring: isRecurring
                ? { interval: request.planInterval === 'year' ? 'year' : 'month' }
                : undefined,
            },
            quantity: 1,
          },
        ],
        mode: isRecurring ? 'subscription' : 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: request.userEmail,
        client_reference_id: request.userId,
        metadata: {
          userId: request.userId,
          productId: request.productId,
          planName: request.planName,
          planInterval: request.planInterval,
          countryCode: request.countryCode,
          userEmail: request.userEmail,
        },
        locale: this.mapLocale(request.language),
      });

      paymentLogger.info(`Stripe checkout session created: ${session.id} for user ${request.userId}`);

      return {
        success: true,
        paymentUrl: session.url || undefined,
        sessionId: session.id,
      };
    } catch (error: any) {
      paymentLogger.error('Stripe checkout session creation failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify a Stripe webhook event signature.
   * This is the ONLY way we trust payment completion — never from client-side.
   */
  public constructWebhookEvent(payload: Buffer | string, signature: string): Stripe.Event {
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret not configured');
    }
    return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  }

  /**
   * Retrieve a checkout session to verify payment status server-side.
   * Used for the verification endpoint after redirect.
   */
  public async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Retrieve a subscription from Stripe
   */
  public async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Cancel a Stripe subscription
   */
  public async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Get supported countries for Stripe
   */
  public getSupportedCountries(): string[] {
    return ['GR', 'HR', 'BG', 'RO', 'SI', 'RS'];
  }

  /**
   * Check if a country is supported by Stripe
   */
  public isCountrySupported(countryCode: string): boolean {
    return this.getSupportedCountries().includes(countryCode.toUpperCase());
  }

  /**
   * Map language code to Stripe locale
   */
  private mapLocale(lang?: string): Stripe.Checkout.SessionCreateParams.Locale | undefined {
    if (!lang) return 'auto';
    const localeMap: Record<string, Stripe.Checkout.SessionCreateParams.Locale> = {
      en: 'en',
      el: 'el',
      bg: 'bg',
      hr: 'hr',
      ro: 'ro',
      sl: 'sl',
      sr: 'sr' as any, // Serbian may not be directly supported
      de: 'de',
      fr: 'fr',
    };
    return localeMap[lang.toLowerCase()] || 'auto';
  }
}

export const stripeService = new StripeService();
export default stripeService;
