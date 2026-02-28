/**
 * Universal Payment Provider Tests
 *
 * Tests for the IPaymentProvider interface, provider registry,
 * Stripe adapter, Paysera adapter, and universal webhook controller.
 *
 * Run: npm test -- --testPathPattern=stripe-webhook
 */

import Stripe from 'stripe';

// ============================================================
// PROVIDER REGISTRY TESTS
// ============================================================

describe('ProviderRegistry', () => {
  test('registers and retrieves Stripe adapter', () => {
    const { providerRegistry } = require('../services/providers/providerRegistry');
    const stripe = providerRegistry.get('stripe');
    expect(stripe).not.toBeNull();
    expect(stripe!.name).toBe('stripe');
    expect(stripe!.displayName).toBe('Stripe');
  });

  test('registers and retrieves Paysera adapter', () => {
    const { providerRegistry } = require('../services/providers/providerRegistry');
    const paysera = providerRegistry.get('paysera');
    expect(paysera).not.toBeNull();
    expect(paysera!.name).toBe('paysera');
    expect(paysera!.displayName).toBe('Paysera');
  });

  test('returns null for unknown provider', () => {
    const { providerRegistry } = require('../services/providers/providerRegistry');
    expect(providerRegistry.get('nonexistent')).toBeNull();
  });

  test('getAll returns at least 2 providers', () => {
    const { providerRegistry } = require('../services/providers/providerRegistry');
    expect(providerRegistry.getAll().length).toBeGreaterThanOrEqual(2);
  });

  test('getNames includes stripe and paysera', () => {
    const { providerRegistry } = require('../services/providers/providerRegistry');
    const names = providerRegistry.getNames();
    expect(names).toContain('stripe');
    expect(names).toContain('paysera');
  });
});

// ============================================================
// STRIPE ADAPTER TESTS
// ============================================================

describe('StripeAdapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('implements IPaymentProvider interface', () => {
    const { stripeAdapter } = require('../services/providers/stripeAdapter');
    expect(stripeAdapter.name).toBe('stripe');
    expect(stripeAdapter.displayName).toBe('Stripe');
    expect(typeof stripeAdapter.isConfigured).toBe('function');
    expect(typeof stripeAdapter.requiresRawBody).toBe('function');
    expect(typeof stripeAdapter.getSignatureHeaderName).toBe('function');
    expect(typeof stripeAdapter.verifyAndParseWebhook).toBe('function');
    expect(typeof stripeAdapter.createSession).toBe('function');
    expect(typeof stripeAdapter.verifyPayment).toBe('function');
    expect(typeof stripeAdapter.getSupportedPaymentMethods).toBe('function');
    expect(typeof stripeAdapter.getFeeDescription).toBe('function');
  });

  test('requiresRawBody returns true', () => {
    const { stripeAdapter } = require('../services/providers/stripeAdapter');
    expect(stripeAdapter.requiresRawBody()).toBe(true);
  });

  test('getSignatureHeaderName returns stripe-signature', () => {
    const { stripeAdapter } = require('../services/providers/stripeAdapter');
    expect(stripeAdapter.getSignatureHeaderName()).toBe('stripe-signature');
  });

  test('isConfigured returns false without env vars', () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { stripeAdapter } = require('../services/providers/stripeAdapter');
    expect(stripeAdapter.isConfigured()).toBe(false);
  });

  test('isConfigured returns true with both env vars', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    const { stripeAdapter } = require('../services/providers/stripeAdapter');
    expect(stripeAdapter.isConfigured()).toBe(true);
  });

  test('getSupportedPaymentMethods includes card', () => {
    const { stripeAdapter } = require('../services/providers/stripeAdapter');
    expect(stripeAdapter.getSupportedPaymentMethods()).toContain('card');
  });

  test('verifyAndParseWebhook fails with tampered signature', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_51ABC123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

    const { stripeAdapter } = require('../services/providers/stripeAdapter');

    const mockReq = {
      body: Buffer.from('{"tampered": true}'),
      headers: { 'stripe-signature': 't=1234567890,v1=invalid_signature_hash' },
    };

    const result = stripeAdapter.verifyAndParseWebhook(mockReq);
    expect(result.valid).toBe(false);
    expect(result.event).toBeNull();
    expect(result.error).toBeDefined();
  });

  test('verifyAndParseWebhook fails with missing signature header', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_51ABC123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

    const { stripeAdapter } = require('../services/providers/stripeAdapter');

    const mockReq = {
      body: Buffer.from('{}'),
      headers: {},
    };

    const result = stripeAdapter.verifyAndParseWebhook(mockReq);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing stripe-signature');
  });
});

// ============================================================
// PAYSERA ADAPTER TESTS
// ============================================================

describe('PayseraAdapter', () => {
  test('implements IPaymentProvider interface', () => {
    const { payseraAdapter } = require('../services/providers/payseraAdapter');
    expect(payseraAdapter.name).toBe('paysera');
    expect(payseraAdapter.displayName).toBe('Paysera');
    expect(typeof payseraAdapter.isConfigured).toBe('function');
    expect(typeof payseraAdapter.requiresRawBody).toBe('function');
    expect(typeof payseraAdapter.verifyAndParseWebhook).toBe('function');
    expect(typeof payseraAdapter.createSession).toBe('function');
    expect(typeof payseraAdapter.verifyPayment).toBe('function');
  });

  test('requiresRawBody returns false', () => {
    const { payseraAdapter } = require('../services/providers/payseraAdapter');
    expect(payseraAdapter.requiresRawBody()).toBe(false);
  });

  test('getSupportedPaymentMethods includes card and wallet', () => {
    const { payseraAdapter } = require('../services/providers/payseraAdapter');
    const methods = payseraAdapter.getSupportedPaymentMethods();
    expect(methods).toContain('card');
    expect(methods).toContain('wallet');
  });

  test('verifyAndParseWebhook fails with missing query params', () => {
    const { payseraAdapter } = require('../services/providers/payseraAdapter');

    const mockReq = { query: {} };
    const result = payseraAdapter.verifyAndParseWebhook(mockReq);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing data or signature');
  });
});

// ============================================================
// UNIVERSAL PAYMENT PROVIDER FACTORY TESTS
// ============================================================

describe('PaymentProviderFactory (universal)', () => {
  test('getProviderInfo returns adapter info for registered providers', () => {
    const { paymentProviderFactory } = require('../services/paymentProviderFactory');

    const stripeInfo = paymentProviderFactory.getProviderInfo('stripe');
    expect(stripeInfo.name).toBe('Stripe');

    const payseraInfo = paymentProviderFactory.getProviderInfo('paysera');
    expect(payseraInfo.name).toBe('Paysera');
  });

  test('getProviderInfo returns fallback for unknown provider', () => {
    const { paymentProviderFactory } = require('../services/paymentProviderFactory');
    const info = paymentProviderFactory.getProviderInfo('unknown_provider');
    expect(info.name).toBe('Web Payment');
  });

  test('getRegisteredProviderNames includes stripe, paysera, and web', () => {
    const { paymentProviderFactory } = require('../services/paymentProviderFactory');
    const names = paymentProviderFactory.getRegisteredProviderNames();
    expect(names).toContain('stripe');
    expect(names).toContain('paysera');
    expect(names).toContain('web');
  });

  test('getSupportedCountries returns all 11 Balkan countries', () => {
    const { paymentProviderFactory } = require('../services/paymentProviderFactory');
    expect(paymentProviderFactory.getSupportedCountries().length).toBe(11);
  });
});

// ============================================================
// UNIVERSAL WEBHOOK CONTROLLER TESTS
// ============================================================

describe('Universal Webhook Controller', () => {
  test('exports handleProviderWebhook and verifyProviderPayment', () => {
    const controller = require('../controllers/webhookController');
    expect(typeof controller.handleProviderWebhook).toBe('function');
    expect(typeof controller.verifyProviderPayment).toBe('function');
  });
});

// ============================================================
// IPAYMENT PROVIDER INTERFACE CONTRACT TESTS
// ============================================================

describe('IPaymentProvider contract', () => {
  test('all registered providers have required properties', () => {
    const { providerRegistry } = require('../services/providers/providerRegistry');

    for (const provider of providerRegistry.getAll()) {
      // Required readonly properties
      expect(typeof provider.name).toBe('string');
      expect(provider.name.length).toBeGreaterThan(0);
      expect(typeof provider.displayName).toBe('string');
      expect(typeof provider.description).toBe('string');

      // Required methods
      expect(typeof provider.isConfigured()).toBe('boolean');
      expect(typeof provider.requiresRawBody()).toBe('boolean');
      expect(typeof provider.getSignatureHeaderName()).toBe('string');
      expect(Array.isArray(provider.getSupportedPaymentMethods())).toBe(true);
      expect(typeof provider.getFeeDescription()).toBe('string');
    }
  });
});
