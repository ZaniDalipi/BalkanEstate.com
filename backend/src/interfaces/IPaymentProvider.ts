/**
 * Payment Provider Interface
 *
 * Universal contract that ALL payment providers must implement.
 * This abstraction allows adding new providers (Paddle, Monri, etc.)
 * without modifying any webhook handling, routing, or business logic.
 *
 * SOLID Principles Applied:
 * - Interface Segregation: Focused contract — only what providers need
 * - Dependency Inversion: Business logic depends on this abstraction, not concrete SDKs
 * - Open/Closed: New providers are added by implementing this interface, not editing code
 * - Liskov Substitution: Any IPaymentProvider can replace another transparently
 */

import { Request } from 'express';

// ============================================================
// NORMALIZED WEBHOOK EVENT TYPES
// ============================================================

/**
 * Provider-agnostic webhook event types.
 * Every payment provider maps its native events to one of these.
 */
export type WebhookEventType =
  | 'payment.completed'        // Initial payment success (checkout, callback)
  | 'payment.failed'           // Payment attempt failed
  | 'subscription.renewed'     // Recurring payment succeeded
  | 'subscription.updated'     // Subscription status change (cancel scheduled, plan change)
  | 'subscription.canceled'    // Subscription ended / fully canceled
  | 'payment.refunded'         // Full or partial refund
  | 'payment.disputed'         // Chargeback / dispute opened
  | 'unknown';                 // Unhandled provider-specific event

/**
 * Normalized webhook event payload.
 * Regardless of the provider, all webhook data is normalized to this shape
 * before any business logic processes it.
 */
export interface NormalizedWebhookEvent {
  /** Provider-agnostic event type */
  type: WebhookEventType;

  /** Original provider-specific event type (e.g. 'checkout.session.completed') */
  rawType: string;

  /** Provider identifier (e.g. 'stripe', 'paysera', 'paddle') */
  provider: string;

  /** Provider's unique event ID for idempotency */
  eventId: string;

  /** User metadata — must contain at least userId */
  metadata: WebhookEventMetadata;

  /** Payment details (when applicable) */
  payment?: WebhookPaymentData;

  /** Subscription details (when applicable) */
  subscription?: WebhookSubscriptionData;

  /** Refund details (when applicable) */
  refund?: WebhookRefundData;

  /** Dispute details (when applicable) */
  dispute?: WebhookDisputeData;

  /** The raw, provider-specific event object for edge cases */
  rawEvent: unknown;
}

export interface WebhookEventMetadata {
  userId: string;
  productId?: string;
  planName?: string;
  planInterval?: string;
  [key: string]: string | undefined;
}

export interface WebhookPaymentData {
  /** Amount in major currency units (e.g. euros, not cents) */
  amount: number;
  currency: string;
  transactionId: string;
  /** Provider-specific subscription/purchase token for matching */
  purchaseToken?: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface WebhookSubscriptionData {
  providerSubscriptionId: string;
  status: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  autoRenewing?: boolean;
}

export interface WebhookRefundData {
  amount: number;
  currency: string;
  isFullRefund: boolean;
  reason?: string;
  originalTransactionId?: string;
}

export interface WebhookDisputeData {
  disputeId: string;
  amount: number;
  currency: string;
  reason?: string;
  chargeId?: string;
}

// ============================================================
// WEBHOOK VERIFICATION
// ============================================================

/**
 * Result of verifying a webhook signature.
 */
export interface WebhookVerificationResult {
  /** Whether the signature is cryptographically valid */
  valid: boolean;

  /** The normalized event (null if verification failed) */
  event: NormalizedWebhookEvent | null;

  /** Error message when verification fails */
  error?: string;
}

// ============================================================
// PAYMENT SESSION CREATION
// ============================================================

export interface CreateSessionParams {
  userId: string;
  userEmail: string;
  productId: string;
  /** Provider-specific price identifier */
  priceId?: string;
  planName: string;
  planInterval: string;
  amount?: number;
  currency?: string;
  countryCode?: string;
  language?: string;
  firstName?: string;
  lastName?: string;
  successUrl: string;
  cancelUrl: string;
  /** Provider-specific payment method preference */
  paymentMethod?: string;
}

export interface CreateSessionResult {
  success: boolean;
  /** URL to redirect the user to for payment */
  paymentUrl?: string;
  /** Provider-specific session/order identifier */
  sessionId?: string;
  error?: string;
}

// ============================================================
// PAYMENT VERIFICATION (client-side polling)
// ============================================================

export interface VerifyPaymentResult {
  success: boolean;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'unknown';
  provider: string;
  sessionId: string;
  subscription?: {
    plan?: string;
    expiresAt?: Date;
    status?: string;
  };
  message?: string;
}

// ============================================================
// THE UNIVERSAL INTERFACE
// ============================================================

/**
 * Universal Payment Provider Interface
 *
 * Every payment provider adapter (Stripe, Paysera, Paddle, Monri, etc.)
 * MUST implement this interface. The webhook controller and payment factory
 * work exclusively through this contract.
 *
 * To add a new provider:
 * 1. Create a new file: backend/src/services/providers/<provider>Adapter.ts
 * 2. Implement IPaymentProvider
 * 3. Register it in providerRegistry.ts
 * That's it — no other files need modification.
 */
export interface IPaymentProvider {
  /** Unique provider identifier (e.g. 'paysera', 'paddle') */
  readonly name: string;

  /** Human-readable display name (e.g. 'Paysera') */
  readonly displayName: string;

  /** Brief description for UI */
  readonly description: string;

  /** Whether this provider is configured with required env vars */
  isConfigured(): boolean;

  /**
   * Whether this provider needs the raw (unparsed) request body
   * for webhook signature verification. If true, the webhook route
   * must use express.raw() instead of express.json().
   */
  requiresRawBody(): boolean;

  /**
   * The HTTP header name that contains the webhook signature.
   * e.g. 'x-paysera-signature', 'x-paddle-signature'
   */
  getSignatureHeaderName(): string;

  /**
   * Verify the webhook signature and parse the event into a
   * NormalizedWebhookEvent. This is the core security gate —
   * NO payment data is processed unless this returns valid: true.
   */
  verifyAndParseWebhook(req: Request): WebhookVerificationResult;

  /**
   * Create a payment/checkout session.
   */
  createSession(params: CreateSessionParams): Promise<CreateSessionResult>;

  /**
   * Verify a payment by session/order ID (for client-side polling).
   */
  verifyPayment(sessionId: string, userId: string): Promise<VerifyPaymentResult>;

  /**
   * Payment methods this provider supports.
   * e.g. ['card', 'google_pay', 'apple_pay', 'bank_transfer']
   */
  getSupportedPaymentMethods(): string[];

  /**
   * Fee description string for display purposes.
   */
  getFeeDescription(): string;
}
