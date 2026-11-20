/**
 * Payment Services Unit Tests
 *
 * Tests for payment provider factory.
 * Every country is served by Paysera (services/paymentProviderFactory.ts:
 * COUNTRY_PROVIDER_MAP, and Paysera is also the fallback). These tests used to
 * expect 'web', from before the factory was moved to Paysera.
 * Run: npx jest -i src/__tests__/payment-services.test.ts
 */

// Pure functions only: no database needed.
process.env.SKIP_TEST_DB = 'true';

import { paymentProviderFactory, COUNTRY_PROVIDER_MAP } from '../services/paymentProviderFactory';

// ============================================================
// PAYMENT PROVIDER FACTORY TESTS
// ============================================================

describe('PaymentProviderFactory', () => {

  describe('getProviderForCountry', () => {

    const allCountries = ['GR', 'HR', 'BG', 'RO', 'SI', 'RS', 'AL', 'BA', 'MK', 'ME', 'XK'];

    test.each(allCountries)('returns paysera for country %s', (countryCode) => {
      const provider = paymentProviderFactory.getProviderForCountry(countryCode);
      expect(provider).toBe('paysera');
    });

    test('returns paysera for unknown country (default)', () => {
      const provider = paymentProviderFactory.getProviderForCountry('XX');
      expect(provider).toBe('paysera');
    });

    test('handles lowercase country codes', () => {
      expect(paymentProviderFactory.getProviderForCountry('rs')).toBe('paysera');
      expect(paymentProviderFactory.getProviderForCountry('gr')).toBe('paysera');
    });

    test('handles empty string', () => {
      const provider = paymentProviderFactory.getProviderForCountry('');
      expect(provider).toBe('paysera');
    });
  });

  describe('getCountryMapping', () => {

    test('returns correct info for Serbia', () => {
      const info = paymentProviderFactory.getCountryMapping('RS');
      expect(info).toBeDefined();
      expect(info?.countryName).toBe('Serbia');
      expect(info?.provider).toBe('paysera');
      expect(info?.currency).toBe('EUR');
      expect(info?.isEU).toBe(false);
    });

    test('returns correct info for Greece', () => {
      const info = paymentProviderFactory.getCountryMapping('GR');
      expect(info).toBeDefined();
      expect(info?.countryName).toBe('Greece');
      expect(info?.provider).toBe('paysera');
      expect(info?.isEU).toBe(true);
    });

    test('returns null for unknown country', () => {
      const info = paymentProviderFactory.getCountryMapping('XX');
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
