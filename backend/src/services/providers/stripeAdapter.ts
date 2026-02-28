/**
 * Stripe Payment Provider Adapter
 *
 * Implements IPaymentProvider for Stripe.
 * Translates Stripe-specific SDK calls and event types
 * into the universal normalized format.
 */

import { Request } from 'express';
import Stripe from 'stripe';
import {
  IPaymentProvider,
  WebhookVerificationResult,
  NormalizedWebhookEvent,
  WebhookEventType,
  CreateSessionParams,
  CreateSessionResult,
  VerifyPaymentResult,
} from '../../interfaces/IPaymentProvider';
import User from '../../models/User';
import { webhookLogger } from '../../utils/logger';

/**
 * Map Stripe event types to normalized webhook event types
 */
const EVENT_TYPE_MAP: Record<string, WebhookEventType> = {
  'checkout.session.completed': 'payment.completed',
  'invoice.paid': 'subscription.renewed',
  'invoice.payment_failed': 'payment.failed',
  'customer.subscription.created': 'subscription.updated',
  'customer.subscription.updated': 'subscription.updated',
  'customer.subscription.deleted': 'subscription.canceled',
  'charge.refunded': 'payment.refunded',
  'charge.dispute.created': 'payment.disputed',
};

class StripeAdapter implements IPaymentProvider {
  public readonly name = 'stripe';
  public readonly displayName = 'Stripe';
  public readonly description = 'Secure card payments powered by Stripe';

  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  public isConfigured(): boolean {
    return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  }

  public requiresRawBody(): boolean {
    return true;
  }

  public getSignatureHeaderName(): string {
    return 'stripe-signature';
  }

  public getSupportedPaymentMethods(): string[] {
    return ['card'];
  }

  public getFeeDescription(): string {
    return '~2.9% + 30¢ per successful charge';
  }

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
   * Verify Stripe webhook signature and normalize the event.
   */
  public verifyAndParseWebhook(req: Request): WebhookVerificationResult {
    try {
      const client = this.getClient();

      if (!this.webhookSecret) {
        webhookLogger.error('STRIPE_WEBHOOK_SECRET is not configured');
        return { valid: false, event: null, error: 'Webhook secret not configured' };
      }

      const signature = req.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        return { valid: false, event: null, error: 'Missing stripe-signature header' };
      }

      // Stripe SDK verifies signature, timestamp tolerance, and replay protection
      const stripeEvent = client.webhooks.constructEvent(
        req.body,
        signature,
        this.webhookSecret
      );

      const normalized = this.normalizeEvent(stripeEvent);

      webhookLogger.info(`Stripe webhook verified: ${stripeEvent.type} -> ${normalized.type} (${stripeEvent.id})`);

      return { valid: true, event: normalized };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown verification error';
      webhookLogger.error(`Stripe webhook verification failed: ${message}`);
      return { valid: false, event: null, error: message };
    }
  }

  /**
   * Create a Stripe Checkout session.
   */
  public async createSession(params: CreateSessionParams): Promise<CreateSessionResult> {
    try {
      const client = this.getClient();

      const session = await client.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: params.userEmail,
        line_items: [
          {
            price: params.priceId || params.productId,
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
      return { success: true, sessionId: session.id, paymentUrl: session.url || undefined };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      webhookLogger.error(`Stripe session creation failed: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Verify payment status by Stripe Checkout Session ID.
   */
  public async verifyPayment(sessionId: string, userId: string): Promise<VerifyPaymentResult> {
    try {
      const client = this.getClient();
      const session = await client.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'line_items'],
      });

      if (session.metadata?.userId !== userId) {
        return {
          success: false,
          paymentStatus: 'unknown',
          provider: this.name,
          sessionId,
          message: 'Payment session does not belong to this user',
        };
      }

      if (session.payment_status === 'paid') {
        const user = await User.findById(userId);
        return {
          success: true,
          paymentStatus: 'paid',
          provider: this.name,
          sessionId,
          subscription: user ? {
            plan: user.subscriptionPlan,
            expiresAt: user.subscriptionExpiresAt,
            status: user.subscriptionStatus,
          } : undefined,
        };
      }

      return {
        success: false,
        paymentStatus: 'pending',
        provider: this.name,
        sessionId,
        message: 'Payment is being processed. Please check back in a few minutes.',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      webhookLogger.error(`Stripe payment verification failed: ${message}`);
      return {
        success: false,
        paymentStatus: 'unknown',
        provider: this.name,
        sessionId,
        message: 'Error verifying payment',
      };
    }
  }

  // ============================================================
  // PRIVATE: Stripe event normalization
  // ============================================================

  private normalizeEvent(event: Stripe.Event): NormalizedWebhookEvent {
    const type = EVENT_TYPE_MAP[event.type] || 'unknown';
    const base = {
      type,
      rawType: event.type,
      provider: this.name,
      eventId: event.id,
      rawEvent: event,
    };

    switch (event.type) {
      case 'checkout.session.completed':
        return { ...base, ...this.normalizeCheckoutSession(event.data.object as Stripe.Checkout.Session) };

      case 'invoice.paid':
        return { ...base, ...this.normalizeInvoice(event.data.object as Stripe.Invoice, 'completed') };

      case 'invoice.payment_failed':
        return { ...base, ...this.normalizeInvoice(event.data.object as Stripe.Invoice, 'failed') };

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        return { ...base, ...this.normalizeSubscription(event.data.object as Stripe.Subscription) };

      case 'customer.subscription.deleted':
        return { ...base, ...this.normalizeSubscription(event.data.object as Stripe.Subscription) };

      case 'charge.refunded':
        return { ...base, ...this.normalizeCharge(event.data.object as Stripe.Charge) };

      case 'charge.dispute.created':
        return { ...base, ...this.normalizeDispute(event.data.object as Stripe.Dispute) };

      default:
        return { ...base, metadata: { userId: '' } };
    }
  }

  private normalizeCheckoutSession(session: Stripe.Checkout.Session) {
    const meta = session.metadata || {};
    const subRef = session.subscription;
    const subId = typeof subRef === 'string' ? subRef : subRef?.id;

    return {
      metadata: {
        userId: meta.userId || '',
        productId: meta.productId,
        planName: meta.planName || 'Subscription',
        planInterval: meta.planInterval || 'month',
      },
      payment: {
        amount: (session.amount_total || 0) / 100,
        currency: (session.currency || 'eur').toUpperCase(),
        transactionId: session.id,
        purchaseToken: subId,
        status: 'completed' as const,
      },
    };
  }

  private normalizeInvoice(invoice: Stripe.Invoice, status: 'completed' | 'failed') {
    const subDetails = invoice.parent?.subscription_details;
    const subscriptionRef = subDetails?.subscription;
    const subscriptionId = typeof subscriptionRef === 'string'
      ? subscriptionRef
      : subscriptionRef?.id;
    const meta = (subDetails?.metadata as Record<string, string>) || {};

    const periodEnd = invoice.lines?.data?.[0]?.period?.end;

    return {
      metadata: {
        userId: meta.userId || '',
        productId: meta.productId,
        planName: meta.planName,
        planInterval: meta.planInterval,
      },
      payment: {
        amount: (invoice.amount_paid || 0) / 100,
        currency: (invoice.currency || 'eur').toUpperCase(),
        transactionId: invoice.id,
        purchaseToken: subscriptionId,
        status,
      },
      subscription: subscriptionId ? {
        providerSubscriptionId: subscriptionId,
        status: status === 'completed' ? 'active' : 'past_due',
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
        autoRenewing: status === 'completed',
      } : undefined,
    };
  }

  private normalizeSubscription(sub: Stripe.Subscription) {
    const meta = (sub.metadata as Record<string, string>) || {};
    const firstItem = sub.items?.data?.[0];
    const periodEnd = firstItem?.current_period_end ?? Math.floor(Date.now() / 1000);

    return {
      metadata: {
        userId: meta.userId || '',
        productId: meta.productId,
        planName: meta.planName,
        planInterval: meta.planInterval,
      },
      subscription: {
        providerSubscriptionId: sub.id,
        status: sub.status,
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        autoRenewing: !sub.cancel_at_period_end,
      },
    };
  }

  private normalizeCharge(charge: Stripe.Charge) {
    const meta = (charge.metadata as Record<string, string>) || {};
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    return {
      metadata: {
        userId: meta.userId || '',
      },
      refund: {
        amount: (charge.amount_refunded || 0) / 100,
        currency: (charge.currency || 'eur').toUpperCase(),
        isFullRefund: charge.refunded,
        reason: charge.refunds?.data?.[0]?.reason || 'requested_by_customer',
        originalTransactionId: paymentIntentId,
      },
    };
  }

  private normalizeDispute(dispute: Stripe.Dispute) {
    const chargeRef = dispute.charge;
    const chargeId = typeof chargeRef === 'string' ? chargeRef : chargeRef?.id;

    return {
      metadata: { userId: '' },
      dispute: {
        disputeId: dispute.id,
        amount: (dispute.amount || 0) / 100,
        currency: (dispute.currency || 'eur').toUpperCase(),
        reason: dispute.reason,
        chargeId,
      },
    };
  }
}

export const stripeAdapter = new StripeAdapter();
export default stripeAdapter;
