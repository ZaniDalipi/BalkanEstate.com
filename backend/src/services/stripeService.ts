/**
 * Stripe Service
 *
 * Handles Stripe API interactions including:
 * - Webhook signature verification using Stripe SDK
 * - Payment session creation
 * - Event parsing and validation
 *
 * Follows Single Responsibility Principle: this service only handles
 * Stripe-specific API interactions and signature verification.
 * Payment processing logic lives in subscriptionPaymentService.
 */

import Stripe from 'stripe';
import { webhookLogger } from '../utils/logger';

// Stripe event types we handle
export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'charge.refunded'
  | 'charge.dispute.created';

// Parsed metadata from Stripe checkout session
export interface StripeSessionMetadata {
  userId: string;
  productId: string;
  planName: string;
  planInterval: string;
}

// Result of webhook signature verification
export interface WebhookVerificationResult {
  valid: boolean;
  event: Stripe.Event | null;
  error?: string;
}

// Result of creating a Stripe checkout session
export interface StripeCheckoutResult {
  success: boolean;
  sessionId?: string;
  paymentUrl?: string;
  error?: string;
}

class StripeService {
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  /**
   * Check if Stripe is configured with required environment variables
   */
  public isConfigured(): boolean {
    return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  }

  /**
   * Get or initialize the Stripe client instance (lazy singleton)
   */
  private getClient(): Stripe {
    if (!this.stripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is not set');
      }

      this.stripe = new Stripe(secretKey, {
        apiVersion: '2026-02-25.clover',
        typescript: true,
      });

      this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
    }
    return this.stripe;
  }

  /**
   * Verify a webhook signature using the Stripe SDK.
   *
   * IMPORTANT: This must receive the raw request body (Buffer), not parsed JSON.
   * Express's json() middleware must be bypassed for the webhook route.
   *
   * @param rawBody - The raw request body as a Buffer or string
   * @param signature - The Stripe-Signature header value
   * @returns Verification result with the parsed event or error details
   */
  public verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string
  ): WebhookVerificationResult {
    try {
      const client = this.getClient();

      if (!this.webhookSecret) {
        webhookLogger.error('STRIPE_WEBHOOK_SECRET is not configured');
        return {
          valid: false,
          event: null,
          error: 'Webhook secret not configured',
        };
      }

      // Stripe SDK handles signature verification, timestamp tolerance,
      // and replay attack prevention internally
      const event = client.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );

      webhookLogger.info(`Stripe webhook signature verified: ${event.type} (${event.id})`);

      return { valid: true, event };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown verification error';
      webhookLogger.error(`Stripe webhook signature verification failed: ${message}`);

      return {
        valid: false,
        event: null,
        error: message,
      };
    }
  }

  /**
   * Extract session metadata from a Stripe checkout session object.
   * Returns null if required metadata fields are missing.
   */
  public extractSessionMetadata(
    session: Stripe.Checkout.Session
  ): StripeSessionMetadata | null {
    const metadata = session.metadata;

    if (!metadata?.userId || !metadata?.productId) {
      webhookLogger.warn(
        `Stripe session ${session.id} missing required metadata (userId, productId)`
      );
      return null;
    }

    return {
      userId: metadata.userId,
      productId: metadata.productId,
      planName: metadata.planName || 'Stripe Subscription',
      planInterval: metadata.planInterval || 'month',
    };
  }

  /**
   * Extract subscription details from a Stripe subscription object.
   */
  public extractSubscriptionDetails(subscription: Stripe.Subscription): {
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    metadata: Record<string, string>;
  } {
    // In Stripe SDK v20+, current_period_end lives on subscription items
    const firstItem = subscription.items?.data?.[0];
    const periodEnd = firstItem?.current_period_end
      ?? Math.floor(Date.now() / 1000);

    return {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id,
      status: subscription.status,
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: (subscription.metadata as Record<string, string>) || {},
    };
  }

  /**
   * Create a Stripe Checkout Session for a subscription payment.
   */
  public async createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    productId: string;
    stripePriceId: string;
    planName: string;
    planInterval: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<StripeCheckoutResult> {
    try {
      const client = this.getClient();

      const session = await client.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: params.userEmail,
        line_items: [
          {
            price: params.stripePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: params.userId,
          productId: params.productId,
          planName: params.planName,
          planInterval: params.planInterval,
        },
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      });

      webhookLogger.info(`Stripe checkout session created: ${session.id}`);

      return {
        success: true,
        sessionId: session.id,
        paymentUrl: session.url || undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create checkout session';
      webhookLogger.error(`Stripe checkout session creation failed: ${message}`);

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Retrieve a Stripe Checkout Session by ID for payment verification.
   */
  public async retrieveCheckoutSession(
    sessionId: string
  ): Promise<Stripe.Checkout.Session | null> {
    try {
      const client = this.getClient();
      return await client.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'line_items'],
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      webhookLogger.error(`Failed to retrieve Stripe session ${sessionId}: ${message}`);
      return null;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
export default stripeService;
