/**
 * Payment Configuration
 *
 * This file contains all payment-related configuration including:
 * - Supported payment methods
 * - Payment method priorities for different user types
 * - Payment provider settings
 *
 * Easy to modify and maintain as payment options change over time
 */

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
  | 'paypal';

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

// ====== STRIPE CONFIGURATION ======

export const STRIPE_CONFIG = {
  // Use environment variable for publishable key
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',

  // Stripe API version
  apiVersion: '2023-10-16' as const,

  // Supported locales for Stripe checkout
  locale: 'en' as const,

  // Enable these Stripe features
  features: {
    applePayEnabled: true,
    googlePayEnabled: true,
    linkEnabled: true, // Stripe Link for faster checkout
  },
};

// ====== PAYMENT PLANS ======

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year' | 'one-time';
  stripeProductId?: string;
  stripePriceId?: string;
}

export const PAYMENT_PLANS: Record<string, PaymentPlan> = {
  buyer_pro_monthly: {
    id: 'buyer_pro_monthly',
    name: 'Buyer Pro Monthly',
    price: 1.50,
    currency: 'EUR',
    interval: 'month',
    // Add your Stripe Price ID here when created
    stripePriceId: process.env.STRIPE_PRICE_BUYER_PRO_MONTHLY,
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 25,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'Pro Annual',
    price: 200,
    currency: 'EUR',
    interval: 'year',
    stripePriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1000,
    currency: 'EUR',
    interval: 'year',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
  },
};
