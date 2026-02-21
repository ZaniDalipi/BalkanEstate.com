/**
 * Payment Configuration
 *
 * This file contains all payment-related configuration including:
 * - Supported payment providers (LemonSqueezy as primary MoR)
 * - Supported payment methods per provider
 * - Payment method priorities for different user types
 * - Country to provider routing
 *
 * Provider Selection Strategy:
 * - LemonSqueezy: Primary Merchant of Record for all 11 Balkan countries.
 *   Handles card, Google Pay, Apple Pay, VAT/tax compliance globally.
 *   Works for MK-based companies (MoR processes under their merchant account).
 *   Fees: ~5% + $0.50 per transaction.
 * - Paysera: Secondary provider for bank transfers in non-EU Balkans.
 *   Available for direct bank/SEPA payments. Fees: ~1.5-2.5%.
 *
 * Easy to modify and maintain as payment options change over time
 */

// ====== PAYMENT PROVIDERS ======

export type PaymentProvider = 'lemon_squeezy' | 'paysera' | 'web';

export interface PaymentProviderInfo {
  id: PaymentProvider;
  name: string;
  description: string;
  fees: string;
  logo: string;
  supportedCountries: string[];
  supportedMethods: PaymentMethodType[];
}

export const PAYMENT_PROVIDERS: Record<PaymentProvider, PaymentProviderInfo> = {
  lemon_squeezy: {
    id: 'lemon_squeezy',
    name: 'LemonSqueezy',
    description: 'Secure payments with card, Google Pay, and Apple Pay',
    fees: '~5% + $0.50 (includes VAT handling)',
    logo: 'lemon-squeezy',
    supportedCountries: ['GR', 'HR', 'BG', 'RO', 'SI', 'RS', 'AL', 'BA', 'MK', 'ME', 'XK'],
    supportedMethods: ['card', 'apple_pay', 'google_pay', 'sepa_debit'],
  },
  paysera: {
    id: 'paysera',
    name: 'Paysera',
    description: 'Bank transfer payments for Balkan countries',
    fees: '~1.5-2.5% for bank transfers',
    logo: 'paysera',
    supportedCountries: ['RS', 'AL', 'BA', 'MK', 'ME', 'XK'],
    supportedMethods: ['bank_transfer', 'wallet'],
  },
  web: {
    id: 'web',
    name: 'Web Payment',
    description: 'Secure online payments',
    fees: 'Standard fees',
    logo: 'payment',
    supportedCountries: ['GR', 'HR', 'BG', 'RO', 'SI', 'RS', 'AL', 'BA', 'MK', 'ME', 'XK'],
    supportedMethods: ['card', 'apple_pay', 'google_pay'],
  },
};

// ====== COUNTRY TO PROVIDER MAPPING ======

export interface CountryPaymentInfo {
  countryCode: string;
  countryName: string;
  provider: PaymentProvider;
  currency: string;
  isEU: boolean;
  isSEPA: boolean;
  flag: string;
}

// LemonSqueezy as primary MoR for all countries, Paysera fallback for non-EU bank transfers
export const COUNTRY_PAYMENT_MAP: Record<string, CountryPaymentInfo> = {
  // EU Countries — LemonSqueezy only (card, Google Pay, Apple Pay)
  GR: { countryCode: 'GR', countryName: 'Greece', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true, flag: '🇬🇷' },
  HR: { countryCode: 'HR', countryName: 'Croatia', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true, flag: '🇭🇷' },
  BG: { countryCode: 'BG', countryName: 'Bulgaria', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true, flag: '🇧🇬' },
  RO: { countryCode: 'RO', countryName: 'Romania', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true, flag: '🇷🇴' },
  SI: { countryCode: 'SI', countryName: 'Slovenia', provider: 'lemon_squeezy', currency: 'EUR', isEU: true, isSEPA: true, flag: '🇸🇮' },
  // Non-EU Balkans — LemonSqueezy primary, Paysera for bank transfers
  RS: { countryCode: 'RS', countryName: 'Serbia', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: true, flag: '🇷🇸' },
  AL: { countryCode: 'AL', countryName: 'Albania', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: true, flag: '🇦🇱' },
  BA: { countryCode: 'BA', countryName: 'Bosnia and Herzegovina', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: false, flag: '🇧🇦' },
  MK: { countryCode: 'MK', countryName: 'North Macedonia', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: true, flag: '🇲🇰' },
  ME: { countryCode: 'ME', countryName: 'Montenegro', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: true, flag: '🇲🇪' },
  XK: { countryCode: 'XK', countryName: 'Kosovo', provider: 'lemon_squeezy', currency: 'EUR', isEU: false, isSEPA: false, flag: '🇽🇰' },
};

/**
 * Get the payment provider for a country
 */
export function getProviderForCountry(countryCode: string): PaymentProvider {
  const info = COUNTRY_PAYMENT_MAP[countryCode.toUpperCase()];
  return info?.provider || 'lemon_squeezy';
}

/**
 * Get country payment info
 */
export function getCountryPaymentInfo(countryCode: string): CountryPaymentInfo | null {
  return COUNTRY_PAYMENT_MAP[countryCode.toUpperCase()] || null;
}

/**
 * Get all supported countries
 */
export function getSupportedCountries(): CountryPaymentInfo[] {
  return Object.values(COUNTRY_PAYMENT_MAP);
}

/**
 * Check if a country is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  return !!COUNTRY_PAYMENT_MAP[countryCode.toUpperCase()];
}

// ====== PAYMENT METHODS ======

export type PaymentMethodType =
  | 'card'
  | 'sepa_debit'
  | 'klarna'
  | 'apple_pay'
  | 'google_pay'
  | 'ideal'
  | 'bancontact'
  | 'giropay'
  | 'eps'
  | 'paypal'
  | 'bank_transfer'
  | 'wallet';

export interface PaymentMethod {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: string; // Icon identifier
  enabled: boolean;
  minAmount?: number; // Minimum transaction amount in EUR
  maxAmount?: number; // Maximum transaction amount in EUR
  countries?: string[]; // Supported countries (empty = all)
  processingTime?: string; // e.g., "Instant", "1-3 days"
}

export interface UserTypePaymentConfig {
  userRole: 'buyer' | 'private_seller' | 'agent';
  displayName: string;
  // Payment methods in order of priority (first = recommended)
  paymentMethods: PaymentMethodType[];
  // Default payment method (pre-selected)
  defaultMethod: PaymentMethodType;
}

// ====== PAYMENT METHODS DEFINITIONS ======

export const PAYMENT_METHODS: Record<PaymentMethodType, PaymentMethod> = {
  card: {
    id: 'card',
    name: 'Credit / Debit Card',
    description: 'Visa, Mastercard, Amex',
    icon: 'credit-card',
    enabled: true,
    processingTime: 'Instant',
  },
  sepa_debit: {
    id: 'sepa_debit',
    name: 'SEPA Direct Debit',
    description: 'European bank transfer',
    icon: 'bank',
    enabled: true,
    minAmount: 10,
    countries: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
    processingTime: '3-5 business days',
  },
  apple_pay: {
    id: 'apple_pay',
    name: 'Apple Pay',
    description: 'Fast and secure',
    icon: 'apple',
    enabled: true,
    maxAmount: 1000,
    processingTime: 'Instant',
  },
  google_pay: {
    id: 'google_pay',
    name: 'Google Pay',
    description: 'Fast and secure',
    icon: 'google',
    enabled: true,
    maxAmount: 1000,
    processingTime: 'Instant',
  },
  klarna: {
    id: 'klarna',
    name: 'Klarna',
    description: 'Buy now, pay later',
    icon: 'klarna',
    enabled: true,
    minAmount: 35,
    maxAmount: 5000,
    processingTime: 'Instant',
  },
  ideal: {
    id: 'ideal',
    name: 'iDEAL',
    description: 'Dutch bank payment',
    icon: 'ideal',
    enabled: true,
    countries: ['NL'],
    processingTime: 'Instant',
  },
  bancontact: {
    id: 'bancontact',
    name: 'Bancontact',
    description: 'Belgian bank payment',
    icon: 'bancontact',
    enabled: true,
    countries: ['BE'],
    processingTime: 'Instant',
  },
  giropay: {
    id: 'giropay',
    name: 'giropay',
    description: 'German bank payment',
    icon: 'giropay',
    enabled: true,
    countries: ['DE'],
    processingTime: 'Instant',
  },
  eps: {
    id: 'eps',
    name: 'EPS',
    description: 'Austrian bank payment',
    icon: 'eps',
    enabled: true,
    countries: ['AT'],
    processingTime: 'Instant',
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pay with PayPal',
    icon: 'paypal',
    enabled: true,
    processingTime: 'Instant',
  },
};

// ====== USER TYPE PAYMENT CONFIGURATIONS ======

/**
 * Payment method priorities for BUYERS (small subscriptions)
 * Priority: Quick checkout, mobile wallets, then cards
 */
export const BUYER_PAYMENT_CONFIG: UserTypePaymentConfig = {
  userRole: 'buyer',
  displayName: 'Buyer',
  paymentMethods: [
    'card',          // Most universal - recommended
    'apple_pay',     // Quick mobile checkout
    'google_pay',    // Quick mobile checkout
    'paypal',        // Alternative for users who prefer PayPal
    'ideal',         // Netherlands
    'bancontact',    // Belgium
  ],
  defaultMethod: 'card',
};

/**
 * Payment method priorities for PRIVATE SELLERS (medium amounts)
 * Priority: Flexible payment options, buy-now-pay-later
 */
export const PRIVATE_SELLER_PAYMENT_CONFIG: UserTypePaymentConfig = {
  userRole: 'private_seller',
  displayName: 'Private Seller',
  paymentMethods: [
    'card',          // Most universal - recommended
    'sepa_debit',    // Lower fees, better for recurring
    'klarna',        // Buy now pay later - good for €200-€1000 range
    'apple_pay',     // Quick checkout
    'google_pay',    // Quick checkout
    'paypal',        // Alternative payment
    'ideal',         // Netherlands
    'bancontact',    // Belgium
    'giropay',       // Germany
  ],
  defaultMethod: 'card',
};

/**
 * Payment method priorities for AGENTS (high amounts, business)
 * Priority: Bank transfers for lower fees, invoicing, then cards
 */
export const AGENT_PAYMENT_CONFIG: UserTypePaymentConfig = {
  userRole: 'agent',
  displayName: 'Agent / Real Estate Company',
  paymentMethods: [
    'sepa_debit',    // Recommended for recurring high-value - lower fees
    'card',          // Instant activation
    'paypal',        // Business accounts
    'ideal',         // Netherlands
    'bancontact',    // Belgium
    'giropay',       // Germany
    'eps',           // Austria
  ],
  defaultMethod: 'sepa_debit',
};

// ====== HELPER FUNCTIONS ======

/**
 * Get payment configuration for a specific user role
 */
export function getPaymentConfigForUser(role: 'buyer' | 'private_seller' | 'agent'): UserTypePaymentConfig {
  switch (role) {
    case 'buyer':
      return BUYER_PAYMENT_CONFIG;
    case 'private_seller':
      return PRIVATE_SELLER_PAYMENT_CONFIG;
    case 'agent':
      return AGENT_PAYMENT_CONFIG;
    default:
      return BUYER_PAYMENT_CONFIG;
  }
}

/**
 * Get available payment methods for a user, filtered by amount and country
 */
export function getAvailablePaymentMethods(
  role: 'buyer' | 'private_seller' | 'agent',
  amount: number,
  country?: string
): PaymentMethod[] {
  const config = getPaymentConfigForUser(role);

  return config.paymentMethods
    .map(methodId => PAYMENT_METHODS[methodId])
    .filter(method => {
      // Check if method is enabled
      if (!method.enabled) return false;

      // Check amount limits
      if (method.minAmount && amount < method.minAmount) return false;
      if (method.maxAmount && amount > method.maxAmount) return false;

      // Check country restrictions
      if (method.countries && method.countries.length > 0 && country) {
        if (!method.countries.includes(country)) return false;
      }

      return true;
    });
}

/**
 * Get the recommended (default) payment method for a user
 */
export function getRecommendedPaymentMethod(
  role: 'buyer' | 'private_seller' | 'agent',
  amount: number,
  country?: string
): PaymentMethod | null {
  const availableMethods = getAvailablePaymentMethods(role, amount, country);
  const config = getPaymentConfigForUser(role);

  // Try to find the default method if it's available
  const defaultMethod = availableMethods.find(m => m.id === config.defaultMethod);
  if (defaultMethod) return defaultMethod;

  // Otherwise return the first available method
  return availableMethods[0] || null;
}

// ====== PAYMENT PLANS ======

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year' | 'one-time';
  externalProductId?: string;
  externalPriceId?: string;
}

export const PAYMENT_PLANS: Record<string, PaymentPlan> = {
  buyer_pro_monthly: {
    id: 'buyer_pro_monthly',
    name: 'Buyer Pro Monthly',
    price: 3, // €3/month for Buyer Pro
    currency: 'EUR',
    interval: 'month',
    externalPriceId: undefined,
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 25, // €25/month - 20 listings/month
    currency: 'EUR',
    interval: 'month',
    externalPriceId: undefined,
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'Pro Annual',
    price: 200, // €200/year - 250 listings/year
    currency: 'EUR',
    interval: 'year',
    externalPriceId: undefined,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1000, // €1000/year - 500 listings, 5 team members
    currency: 'EUR',
    interval: 'year',
    externalPriceId: undefined,
  },
};
