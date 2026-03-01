/**
 * Country-specific real estate agent license validation.
 *
 * Each Balkan country has its own licensing body and format.
 * We validate the license number format (regex + length) — actual
 * verification against government databases is done via admin review.
 */

export interface LicenseValidationResult {
  valid: boolean;
  formatHint: string;
}

interface CountryRule {
  pattern: RegExp;
  formatHint: string;
  minLength: number;
  maxLength: number;
}

/**
 * Country-specific license format rules.
 *
 * RS – Serbia: Ministry of Trade, Tourism & Telecommunications
 * HR – Croatia: Croatian Chamber of Economy (HGK)
 * BA – Bosnia & Herzegovina: Cantonal ministries / entity-level
 * ME – Montenegro: Ministry of Economic Development & Tourism
 * MK – North Macedonia: Chamber of Commerce
 * AL – Albania: Local government / ASHK
 * BG – Bulgaria: BULSTAT / Chamber of Commerce (EIK number)
 * GR – Greece: Chamber (GEOTEE / TEE) – μεσίτης license
 * RO – Romania: ARAI / National Union of Realtors
 * XK – Kosovo: Ministry of Environment & Spatial Planning
 * SI – Slovenia: Ministry of Environment
 */
const COUNTRY_RULES: Record<string, CountryRule> = {
  RS: {
    pattern: /^\d{3,10}(\/\d{4})?$/,
    formatHint: '3-10 digits, optionally followed by /YYYY (e.g. 12345 or 123/2024)',
    minLength: 3,
    maxLength: 15,
  },
  HR: {
    pattern: /^[A-Za-z0-9\-]{6,15}$/,
    formatHint: '6-15 alphanumeric characters with optional dashes (e.g. HR-1234-5678)',
    minLength: 6,
    maxLength: 15,
  },
  BA: {
    pattern: /^[A-Za-z0-9\-]{5,15}$/,
    formatHint: '5-15 alphanumeric characters with optional dashes (e.g. FBH-1234 or RS-12345)',
    minLength: 5,
    maxLength: 15,
  },
  ME: {
    pattern: /^[A-Za-z0-9\-]{4,12}$/,
    formatHint: '4-12 alphanumeric characters with optional dashes (e.g. ME-12345 or 12345)',
    minLength: 4,
    maxLength: 12,
  },
  MK: {
    pattern: /^[A-Za-z0-9\-]{5,12}$/,
    formatHint: '5-12 alphanumeric characters with optional dashes (e.g. MK-12345)',
    minLength: 5,
    maxLength: 12,
  },
  AL: {
    pattern: /^[A-Za-z0-9\-]{5,15}$/,
    formatHint: '5-15 alphanumeric characters with optional dashes (e.g. AL-12345)',
    minLength: 5,
    maxLength: 15,
  },
  BG: {
    pattern: /^\d{5,13}$/,
    formatHint: '5-13 digits — EIK/BULSTAT number (e.g. 1234567890)',
    minLength: 5,
    maxLength: 13,
  },
  GR: {
    pattern: /^[A-Za-z0-9\-]{5,12}$/,
    formatHint: '5-12 alphanumeric characters with optional dashes (e.g. GR-12345)',
    minLength: 5,
    maxLength: 12,
  },
  RO: {
    pattern: /^[A-Za-z0-9\-]{5,15}$/,
    formatHint: '5-15 alphanumeric characters with optional dashes (e.g. RO-12345-2024)',
    minLength: 5,
    maxLength: 15,
  },
  XK: {
    pattern: /^[A-Za-z0-9\-]{4,12}$/,
    formatHint: '4-12 alphanumeric characters with optional dashes (e.g. XK-1234)',
    minLength: 4,
    maxLength: 12,
  },
  SI: {
    pattern: /^[A-Za-z0-9\-]{5,12}$/,
    formatHint: '5-12 alphanumeric characters with optional dashes (e.g. SI-12345)',
    minLength: 5,
    maxLength: 12,
  },
};

/** All supported country codes */
export const SUPPORTED_LICENSE_COUNTRIES = Object.keys(COUNTRY_RULES);

/**
 * Validate a license number against country-specific format rules.
 *
 * @returns `{ valid, formatHint }` — formatHint is always populated so
 *          it can be shown to the user regardless of validity.
 */
export function validateLicenseNumber(
  licenseNumber: string,
  countryCode: string,
): LicenseValidationResult {
  const trimmed = licenseNumber.trim();
  const upperCountry = countryCode.toUpperCase();

  const rule = COUNTRY_RULES[upperCountry];

  if (!rule) {
    // Unknown country — accept any alphanumeric 5-20 char string
    const fallbackValid = /^[A-Za-z0-9\-\/]{5,20}$/.test(trimmed);
    return {
      valid: fallbackValid,
      formatHint: '5-20 alphanumeric characters',
    };
  }

  if (trimmed.length < rule.minLength || trimmed.length > rule.maxLength) {
    return { valid: false, formatHint: rule.formatHint };
  }

  return {
    valid: rule.pattern.test(trimmed),
    formatHint: rule.formatHint,
  };
}

/**
 * Get the format hint for a country without validating.
 */
export function getLicenseFormatHint(countryCode: string): string {
  const rule = COUNTRY_RULES[countryCode.toUpperCase()];
  return rule?.formatHint ?? '5-20 alphanumeric characters';
}
