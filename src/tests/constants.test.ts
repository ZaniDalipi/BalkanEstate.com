/**
 * App Constants Tests
 * Tests for application configuration constants
 */

import { describe, it, expect } from 'vitest';
import {
  API_CONFIG,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  ROUTES,
  PAGINATION,
  FILE_LIMITS,
  PROPERTY_LIMITS,
  STORAGE_KEYS,
  TIMEOUTS,
  PROMOTION_TIERS,
  ADMIN_SECTIONS,
  HOW_IT_WORKS_TABS,
} from '../shared/constants/app.constants';

describe('API_CONFIG', () => {
  it('should have a BASE_URL defined', () => {
    expect(API_CONFIG.BASE_URL).toBeDefined();
    expect(typeof API_CONFIG.BASE_URL).toBe('string');
  });

  it('should have reasonable timeout value', () => {
    expect(API_CONFIG.TIMEOUT).toBeGreaterThan(0);
    expect(API_CONFIG.TIMEOUT).toBeLessThanOrEqual(60000);
  });

  it('should have max retries defined', () => {
    expect(API_CONFIG.MAX_RETRIES).toBeGreaterThan(0);
    expect(API_CONFIG.MAX_RETRIES).toBeLessThanOrEqual(10);
  });
});

describe('SUPPORTED_LANGUAGES', () => {
  it('should include English', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en');
  });

  it('should include Balkan languages', () => {
    expect(SUPPORTED_LANGUAGES).toContain('sr'); // Serbian
    expect(SUPPORTED_LANGUAGES).toContain('sq'); // Albanian
    expect(SUPPORTED_LANGUAGES).toContain('hr'); // Croatian
    expect(SUPPORTED_LANGUAGES).toContain('bs'); // Bosnian
    expect(SUPPORTED_LANGUAGES).toContain('mk'); // Macedonian
    expect(SUPPORTED_LANGUAGES).toContain('sl'); // Slovenian
    expect(SUPPORTED_LANGUAGES).toContain('bg'); // Bulgarian
    expect(SUPPORTED_LANGUAGES).toContain('ro'); // Romanian
    expect(SUPPORTED_LANGUAGES).toContain('el'); // Greek
    expect(SUPPORTED_LANGUAGES).toContain('tr'); // Turkish
  });

  it('should have at least 10 languages', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(10);
  });
});

describe('DEFAULT_LANGUAGE', () => {
  it('should be a supported language', () => {
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });

  it('should be English by default', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });
});

describe('ROUTES', () => {
  it('should have home route', () => {
    expect(ROUTES.HOME).toBe('/');
  });

  it('should have search route', () => {
    expect(ROUTES.SEARCH).toBe('/search');
  });

  it('should have all essential routes defined', () => {
    expect(ROUTES.SAVED_SEARCHES).toBeDefined();
    expect(ROUTES.SAVED_PROPERTIES).toBeDefined();
    expect(ROUTES.INBOX).toBeDefined();
    expect(ROUTES.AGENTS).toBeDefined();
    expect(ROUTES.AGENCIES).toBeDefined();
    expect(ROUTES.ACCOUNT).toBeDefined();
    expect(ROUTES.CREATE_LISTING).toBeDefined();
  });

  it('should have legal pages routes', () => {
    expect(ROUTES.PRIVACY).toBeDefined();
    expect(ROUTES.TERMS).toBeDefined();
    expect(ROUTES.COOKIES).toBeDefined();
    expect(ROUTES.REFUND).toBeDefined();
  });

  it('should have payment callback routes', () => {
    expect(ROUTES.PAYMENT_SUCCESS).toBe('/payment/success');
    expect(ROUTES.PAYMENT_CANCEL).toBe('/payment/cancel');
  });
});

describe('PAGINATION', () => {
  it('should have reasonable default page size', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(50);
  });

  it('should have max page size greater than default', () => {
    expect(PAGINATION.MAX_PAGE_SIZE).toBeGreaterThan(PAGINATION.DEFAULT_PAGE_SIZE);
  });
});

describe('FILE_LIMITS', () => {
  it('should have max image size in reasonable range (1MB - 20MB)', () => {
    expect(FILE_LIMITS.MAX_IMAGE_SIZE).toBeGreaterThanOrEqual(1024 * 1024);
    expect(FILE_LIMITS.MAX_IMAGE_SIZE).toBeLessThanOrEqual(20 * 1024 * 1024);
  });

  it('should allow multiple images per property', () => {
    expect(FILE_LIMITS.MAX_IMAGES_PER_PROPERTY).toBeGreaterThan(1);
  });

  it('should allow common image formats', () => {
    expect(FILE_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
    expect(FILE_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/png');
  });
});

describe('PROPERTY_LIMITS', () => {
  it('should have valid title length limits', () => {
    expect(PROPERTY_LIMITS.MIN_TITLE_LENGTH).toBeGreaterThan(0);
    expect(PROPERTY_LIMITS.MAX_TITLE_LENGTH).toBeGreaterThan(PROPERTY_LIMITS.MIN_TITLE_LENGTH);
  });

  it('should have valid description length limits', () => {
    expect(PROPERTY_LIMITS.MIN_DESCRIPTION_LENGTH).toBeGreaterThan(0);
    expect(PROPERTY_LIMITS.MAX_DESCRIPTION_LENGTH).toBeGreaterThan(PROPERTY_LIMITS.MIN_DESCRIPTION_LENGTH);
  });

  it('should have reasonable price limits', () => {
    expect(PROPERTY_LIMITS.MIN_PRICE).toBe(0);
    expect(PROPERTY_LIMITS.MAX_PRICE).toBeGreaterThan(0);
  });

  it('should have valid year built minimum', () => {
    expect(PROPERTY_LIMITS.MIN_YEAR_BUILT).toBeGreaterThan(1000);
    expect(PROPERTY_LIMITS.MIN_YEAR_BUILT).toBeLessThan(2000);
  });
});

describe('STORAGE_KEYS', () => {
  it('should have auth token key', () => {
    expect(STORAGE_KEYS.AUTH_TOKEN).toBeDefined();
    expect(typeof STORAGE_KEYS.AUTH_TOKEN).toBe('string');
  });

  it('should have refresh token key', () => {
    expect(STORAGE_KEYS.REFRESH_TOKEN).toBeDefined();
  });

  it('should have cookie consent key', () => {
    expect(STORAGE_KEYS.COOKIE_CONSENT).toBeDefined();
  });

  it('should have unique keys', () => {
    const keys = Object.values(STORAGE_KEYS);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});

describe('TIMEOUTS', () => {
  it('should have search debounce timeout', () => {
    expect(TIMEOUTS.SEARCH_DEBOUNCE).toBeGreaterThan(0);
    expect(TIMEOUTS.SEARCH_DEBOUNCE).toBeLessThan(1000);
  });

  it('should have toast duration', () => {
    expect(TIMEOUTS.TOAST_DURATION).toBeGreaterThan(1000);
  });

  it('should have session warning timeout', () => {
    expect(TIMEOUTS.SESSION_WARNING).toBeGreaterThan(60000); // At least 1 minute
  });
});

describe('PROMOTION_TIERS', () => {
  it('should have all tier levels defined', () => {
    expect(PROMOTION_TIERS.standard).toBeDefined();
    expect(PROMOTION_TIERS.featured).toBeDefined();
    expect(PROMOTION_TIERS.highlight).toBeDefined();
    expect(PROMOTION_TIERS.premium).toBeDefined();
  });

  it('should have required properties for each tier', () => {
    Object.values(PROMOTION_TIERS).forEach(tier => {
      expect(tier.name).toBeDefined();
      expect(tier.color).toBeDefined();
      expect(tier.bg).toBeDefined();
      expect(tier.icon).toBeDefined();
    });
  });
});

describe('ADMIN_SECTIONS', () => {
  it('should include dashboard', () => {
    expect(ADMIN_SECTIONS).toContain('dashboard');
  });

  it('should include essential management sections', () => {
    expect(ADMIN_SECTIONS).toContain('users');
    expect(ADMIN_SECTIONS).toContain('properties');
    expect(ADMIN_SECTIONS).toContain('agencies');
    expect(ADMIN_SECTIONS).toContain('settings');
  });

  it('should have at least 5 sections', () => {
    expect(ADMIN_SECTIONS.length).toBeGreaterThanOrEqual(5);
  });
});

describe('HOW_IT_WORKS_TABS', () => {
  it('should include getting-started', () => {
    expect(HOW_IT_WORKS_TABS).toContain('getting-started');
  });

  it('should include user type tabs', () => {
    expect(HOW_IT_WORKS_TABS).toContain('buyers');
    expect(HOW_IT_WORKS_TABS).toContain('sellers');
    expect(HOW_IT_WORKS_TABS).toContain('agents');
    expect(HOW_IT_WORKS_TABS).toContain('agencies');
  });
});
