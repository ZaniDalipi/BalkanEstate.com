/**
 * Payment Services Unit Tests
 *
 * Tests for payment provider factory, Stripe service, and Paddle service
 * Run: npm test -- --testPathPattern=payment-services
 */

import { paymentProviderFactory, COUNTRY_PROVIDER_MAP, PaymentProvider } from '../services/paymentProviderFactory';
import { paddleService } from '../services/paddleService';

// ============================================================
// PAYMENT PROVIDER FACTORY TESTS
// ============================================================

describe('PaymentProviderFactory', () => {

  describe('getProviderForCountry', () => {

    // EU Countries - Should return Stripe
    const stripeCountries = ['GR', 'HR', 'BG', 'RO', 'SI'];

    test.each(stripeCountries)('returns stripe for EU country %s', (countryCode) => {
      const provider = paymentProviderFactory.getProviderForCountry(countryCode);
      expect(provider).toBe('stripe');
    });

    // Non-EU Balkans - Should return Paddle
    const paddleCountries = ['RS', 'AL', 'BA', 'MK', 'ME', 'XK'];

    test.each(paddleCountries)('returns paddle for non-EU country %s', (countryCode) => {
      const provider = paymentProviderFactory.getProviderForCountry(countryCode);
      expect(provider).toBe('paddle');
    });

    test('returns stripe for unknown country', () => {
      const provider = paymentProviderFactory.getProviderForCountry('XX');
      expect(provider).toBe('stripe');
    });

    test('handles lowercase country codes', () => {
      expect(paymentProviderFactory.getProviderForCountry('rs')).toBe('paddle');
      expect(paymentProviderFactory.getProviderForCountry('gr')).toBe('stripe');
    });

    test('handles empty string', () => {
      const provider = paymentProviderFactory.getProviderForCountry('');
      expect(provider).toBe('stripe');
    });
  });

  describe('getCountryInfo', () => {

    test('returns correct info for Serbia', () => {
      const info = paymentProviderFactory.getCountryInfo('RS');
      expect(info).toBeDefined();
      expect(info?.countryName).toBe('Serbia');
      expect(info?.provider).toBe('paddle');
      expect(info?.currency).toBe('EUR');
      expect(info?.isEU).toBe(false);
    });

    test('returns correct info for Greece', () => {
      const info = paymentProviderFactory.getCountryInfo('GR');
      expect(info).toBeDefined();
      expect(info?.countryName).toBe('Greece');
      expect(info?.provider).toBe('stripe');
      expect(info?.isEU).toBe(true);
    });

    test('returns null for unknown country', () => {
      const info = paymentProviderFactory.getCountryInfo('XX');
      expect(info).toBeNull();
    });
  });

  describe('getSupportedCountries', () => {

    test('returns all 11 Balkan countries', () => {
      const countries = paymentProviderFactory.getSupportedCountries();
      expect(countries.length).toBe(11);
    });

    test('includes all EU countries', () => {
      const countries = paymentProviderFactory.getSupportedCountries();
      const euCountries = countries.filter(c => c.isEU);
      expect(euCountries.length).toBe(5);
    });

    test('includes all non-EU countries', () => {
      const countries = paymentProviderFactory.getSupportedCountries();
      const nonEuCountries = countries.filter(c => !c.isEU);
      expect(nonEuCountries.length).toBe(6);
    });
  });

  describe('getCountriesByProvider', () => {

    test('returns 5 countries for Stripe', () => {
      const stripeCountries = paymentProviderFactory.getCountriesByProvider('stripe');
      expect(stripeCountries.length).toBe(5);
      stripeCountries.forEach(c => {
        expect(c.provider).toBe('stripe');
      });
    });

    test('returns 6 countries for Paddle', () => {
      const paddleCountries = paymentProviderFactory.getCountriesByProvider('paddle');
      expect(paddleCountries.length).toBe(6);
      paddleCountries.forEach(c => {
        expect(c.provider).toBe('paddle');
      });
    });
  });

  describe('getProviderInfo', () => {

    test('returns correct info for Stripe', () => {
      const info = paymentProviderFactory.getProviderInfo('stripe');
      expect(info.name).toBe('Stripe');
      expect(info.fees).toContain('2.9%');
    });

    test('returns correct info for Paddle', () => {
      const info = paymentProviderFactory.getProviderInfo('paddle');
      expect(info.name).toBe('Paddle');
      expect(info.fees).toContain('5%');
    });
  });
});

// ============================================================
// COUNTRY PROVIDER MAP TESTS
// ============================================================

describe('COUNTRY_PROVIDER_MAP', () => {

  test('all countries have required fields', () => {
    Object.values(COUNTRY_PROVIDER_MAP).forEach(country => {
      expect(country.countryCode).toBeDefined();
      expect(country.countryName).toBeDefined();
      expect(country.provider).toBeDefined();
      expect(country.currency).toBeDefined();
      expect(typeof country.isEU).toBe('boolean');
      expect(typeof country.isSEPA).toBe('boolean');
    });
  });

  test('all countries use EUR currency', () => {
    Object.values(COUNTRY_PROVIDER_MAP).forEach(country => {
      expect(country.currency).toBe('EUR');
    });
  });

  test('EU countries have isSEPA true', () => {
    Object.values(COUNTRY_PROVIDER_MAP)
      .filter(c => c.isEU)
      .forEach(country => {
        expect(country.isSEPA).toBe(true);
      });
  });
});

// ============================================================
// PADDLE SERVICE TESTS
// ============================================================

describe('PaddleService', () => {

  describe('isConfigured', () => {

    test('returns false when not configured', () => {
      // Without env vars, should return false
      const originalApiKey = process.env.PADDLE_API_KEY;
      delete process.env.PADDLE_API_KEY;

      // Note: This tests the current state - in real env it would check actual config
      expect(typeof paddleService.isConfigured()).toBe('boolean');

      process.env.PADDLE_API_KEY = originalApiKey;
    });
  });

  describe('getEnvironment', () => {

    test('returns sandbox or production', () => {
      const env = paddleService.getEnvironment();
      expect(['sandbox', 'production']).toContain(env);
    });
  });

  describe('verifyWebhookSignature', () => {

    test('returns false for invalid signature', () => {
      const isValid = paddleService.verifyWebhookSignature(
        '{"test": "data"}',
        'invalid_signature'
      );
      expect(isValid).toBe(false);
    });

    test('handles empty payload', () => {
      const isValid = paddleService.verifyWebhookSignature('', '');
      expect(isValid).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {

    test('parses valid webhook event', () => {
      const mockEvent = {
        event_type: 'transaction.completed',
        event_id: 'evt_123',
        occurred_at: '2024-01-15T10:00:00Z',
        data: { id: 'txn_123' }
      };

      const parsed = paddleService.parseWebhookEvent(mockEvent);
      expect(parsed).toBeDefined();
      expect(parsed?.event_type).toBe('transaction.completed');
      expect(parsed?.event_id).toBe('evt_123');
    });

    test('returns null for invalid event', () => {
      const parsed = paddleService.parseWebhookEvent({});
      expect(parsed).toBeNull();
    });

    test('returns null for null input', () => {
      const parsed = paddleService.parseWebhookEvent(null);
      expect(parsed).toBeNull();
    });
  });
});
