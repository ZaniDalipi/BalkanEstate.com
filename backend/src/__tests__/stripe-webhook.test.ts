/**
 * Stripe Webhook Verification Tests
 *
 * Tests for Stripe webhook signature verification and event processing.
 * Run: npm test -- --testPathPattern=stripe-webhook
 */

import Stripe from 'stripe';
import { stripeService } from '../services/stripeService';

// ============================================================
// STRIPE SERVICE TESTS
// ============================================================

describe('StripeService', () => {
  describe('isConfigured', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('returns false when STRIPE_SECRET_KEY is not set', () => {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      expect(stripeService.isConfigured()).toBe(false);
    });

    test('returns false when STRIPE_WEBHOOK_SECRET is not set', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      delete process.env.STRIPE_WEBHOOK_SECRET;
      expect(stripeService.isConfigured()).toBe(false);
    });

    test('returns true when both keys are set', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      expect(stripeService.isConfigured()).toBe(true);
    });
  });

  describe('verifyWebhookSignature', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('returns invalid when webhook secret is not configured', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      delete process.env.STRIPE_WEBHOOK_SECRET;

      // Force re-initialization by creating a fresh service
      const { StripeService } = jest.requireActual('../services/stripeService') as any;

      const result = stripeService.verifyWebhookSignature(
        Buffer.from('{}'),
        'invalid_sig'
      );

      expect(result.valid).toBe(false);
      expect(result.event).toBeNull();
    });

    test('returns invalid for tampered payload', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_51ABC123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      const result = stripeService.verifyWebhookSignature(
        Buffer.from('{"tampered": true}'),
        't=1234567890,v1=invalid_signature_hash'
      );

      expect(result.valid).toBe(false);
      expect(result.event).toBeNull();
      expect(result.error).toBeDefined();
    });

    test('returns invalid for empty signature', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_51ABC123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      const result = stripeService.verifyWebhookSignature(
        Buffer.from('{"id": "evt_test"}'),
        ''
      );

      expect(result.valid).toBe(false);
      expect(result.event).toBeNull();
    });

    test('returns invalid for missing timestamp in signature', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_51ABC123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      const result = stripeService.verifyWebhookSignature(
        Buffer.from('{"id": "evt_test"}'),
        'v1=abc123'
      );

      expect(result.valid).toBe(false);
      expect(result.event).toBeNull();
    });
  });

  describe('extractSessionMetadata', () => {
    test('returns metadata when all required fields present', () => {
      const mockSession = {
        id: 'cs_test_123',
        metadata: {
          userId: 'user_abc',
          productId: 'pro_monthly',
          planName: 'Pro Monthly',
          planInterval: 'month',
        },
      } as unknown as Stripe.Checkout.Session;

      const result = stripeService.extractSessionMetadata(mockSession);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user_abc');
      expect(result!.productId).toBe('pro_monthly');
      expect(result!.planName).toBe('Pro Monthly');
      expect(result!.planInterval).toBe('month');
    });

    test('returns null when userId is missing', () => {
      const mockSession = {
        id: 'cs_test_123',
        metadata: {
          productId: 'pro_monthly',
        },
      } as unknown as Stripe.Checkout.Session;

      const result = stripeService.extractSessionMetadata(mockSession);
      expect(result).toBeNull();
    });

    test('returns null when productId is missing', () => {
      const mockSession = {
        id: 'cs_test_123',
        metadata: {
          userId: 'user_abc',
        },
      } as unknown as Stripe.Checkout.Session;

      const result = stripeService.extractSessionMetadata(mockSession);
      expect(result).toBeNull();
    });

    test('returns null when metadata is null', () => {
      const mockSession = {
        id: 'cs_test_123',
        metadata: null,
      } as unknown as Stripe.Checkout.Session;

      const result = stripeService.extractSessionMetadata(mockSession);
      expect(result).toBeNull();
    });

    test('uses defaults for optional fields', () => {
      const mockSession = {
        id: 'cs_test_123',
        metadata: {
          userId: 'user_abc',
          productId: 'pro_monthly',
        },
      } as unknown as Stripe.Checkout.Session;

      const result = stripeService.extractSessionMetadata(mockSession);

      expect(result).not.toBeNull();
      expect(result!.planName).toBe('Stripe Subscription');
      expect(result!.planInterval).toBe('month');
    });
  });

  describe('extractSubscriptionDetails', () => {
    test('extracts details from subscription with string customer', () => {
      const mockSubscription = {
        id: 'sub_test_123',
        customer: 'cus_test_456',
        status: 'active',
        current_period_end: 1700000000,
        cancel_at_period_end: false,
        metadata: { userId: 'user_abc' },
      } as unknown as Stripe.Subscription;

      const details = stripeService.extractSubscriptionDetails(mockSubscription);

      expect(details.stripeSubscriptionId).toBe('sub_test_123');
      expect(details.stripeCustomerId).toBe('cus_test_456');
      expect(details.status).toBe('active');
      expect(details.currentPeriodEnd).toEqual(new Date(1700000000 * 1000));
      expect(details.cancelAtPeriodEnd).toBe(false);
      expect(details.metadata.userId).toBe('user_abc');
    });

    test('extracts customer ID from customer object', () => {
      const mockSubscription = {
        id: 'sub_test_123',
        customer: { id: 'cus_test_789' },
        status: 'canceled',
        current_period_end: 1700000000,
        cancel_at_period_end: true,
        metadata: {},
      } as unknown as Stripe.Subscription;

      const details = stripeService.extractSubscriptionDetails(mockSubscription);

      expect(details.stripeCustomerId).toBe('cus_test_789');
      expect(details.cancelAtPeriodEnd).toBe(true);
    });
  });
});

// ============================================================
// WEBHOOK CONTROLLER TESTS (unit-level, no HTTP)
// ============================================================

describe('Stripe Webhook Controller', () => {
  test('module exports handleStripeWebhook and verifyStripePayment', () => {
    const controller = require('../controllers/stripeWebhookController');
    expect(typeof controller.handleStripeWebhook).toBe('function');
    expect(typeof controller.verifyStripePayment).toBe('function');
  });
});

// ============================================================
// PAYMENT PROVIDER FACTORY — STRIPE INTEGRATION
// ============================================================

describe('PaymentProviderFactory - Stripe', () => {
  test('includes stripe in provider type', () => {
    const { paymentProviderFactory } = require('../services/paymentProviderFactory');
    const info = paymentProviderFactory.getProviderInfo('stripe');
    expect(info.name).toBe('Stripe');
    expect(info.description).toContain('Stripe');
  });

  test('returns generic info for unknown provider', () => {
    const { paymentProviderFactory } = require('../services/paymentProviderFactory');
    const info = paymentProviderFactory.getProviderInfo('unknown');
    expect(info.name).toBe('Web Payment');
  });
});
