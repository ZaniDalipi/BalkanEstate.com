/**
 * Payment Test Fixtures
 *
 * Mock data for testing payment flows in development and staging
 */

import mongoose from 'mongoose';

// ============================================================
// TEST USERS
// ============================================================

export const TEST_USERS = {
  // User from Serbia
  serbianUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'test.serbia@balkanestateai.com',
    name: 'Test Serbian User',
    country: 'RS',
    isSubscribed: false,
    role: 'buyer',
  },

  // User from Greece
  greekUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'test.greece@balkanestateai.com',
    name: 'Test Greek User',
    country: 'GR',
    isSubscribed: false,
    role: 'buyer',
  },

  // User from Albania
  albanianUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'test.albania@balkanestateai.com',
    name: 'Test Albanian User',
    country: 'AL',
    isSubscribed: false,
    role: 'agent',
  },

  // Subscribed user
  subscribedUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'subscribed@balkanestateai.com',
    name: 'Subscribed User',
    country: 'HR',
    isSubscribed: true,
    subscriptionPlan: 'pro_monthly',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    subscriptionSource: 'web',
  },
};

// ============================================================
// TEST PRODUCTS
// ============================================================

export const TEST_PRODUCTS = {
  proMonthly: {
    productId: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Professional monthly subscription for real estate agents',
    price: 25,
    currency: 'EUR',
    billingPeriod: 'monthly',
    isActive: true,
  },

  proYearly: {
    productId: 'pro_yearly',
    name: 'Pro Yearly',
    description: 'Professional yearly subscription (save 33%)',
    price: 200,
    currency: 'EUR',
    billingPeriod: 'yearly',
    isActive: true,
  },

  agencyMonthly: {
    productId: 'agency_monthly',
    name: 'Agency Monthly',
    description: 'Agency subscription for real estate companies',
    price: 99,
    currency: 'EUR',
    billingPeriod: 'monthly',
    isActive: true,
  },

  agencyYearly: {
    productId: 'agency_yearly',
    name: 'Agency Yearly',
    description: 'Agency yearly subscription',
    price: 999,
    currency: 'EUR',
    billingPeriod: 'yearly',
    isActive: true,
  },

  buyerPro: {
    productId: 'buyer_pro_monthly',
    name: 'Buyer Pro Monthly',
    description: 'Enhanced features for property buyers',
    price: 4.99,
    currency: 'EUR',
    billingPeriod: 'monthly',
    isActive: true,
  },
};

// ============================================================
// TEST PAYMENT REQUESTS
// ============================================================

export const TEST_PAYMENT_REQUESTS = {
  // Web payment (EU country)
  webPaymentEU: {
    planName: 'Pro Monthly',
    planInterval: 'month',
    amount: 25,
    countryCode: 'GR',
    productId: 'pro_monthly',
    language: 'en',
  },

  // Web payment (non-EU country)
  webPaymentNonEU: {
    planName: 'Pro Monthly',
    planInterval: 'month',
    amount: 25,
    countryCode: 'RS',
    productId: 'pro_monthly',
    language: 'sr',
  },

  // Yearly subscription
  yearlyPayment: {
    planName: 'Pro Yearly',
    planInterval: 'year',
    amount: 200,
    countryCode: 'HR',
    productId: 'pro_yearly',
    language: 'hr',
  },

  // Agency subscription
  agencyPayment: {
    planName: 'Agency Monthly',
    planInterval: 'month',
    amount: 99,
    countryCode: 'BG',
    productId: 'agency_monthly',
    language: 'bg',
  },
};

// ============================================================
// MOCK PAYMENT RESPONSES
// ============================================================

export const MOCK_PAYMENT_RESPONSES = {
  checkoutSession: {
    id: 'session_test_a1b2c3d4e5f6g7h8i9j0',
    url: 'https://checkout.example.com/session_test_a1b2c3d4e5f6g7h8i9j0',
    payment_status: 'unpaid',
    status: 'open',
    customer_email: 'test@balkanestateai.com',
    metadata: {
      userId: 'user_123',
      productId: 'pro_monthly',
      planName: 'Pro Monthly',
      planInterval: 'month',
    },
  },

  completedSession: {
    id: 'session_test_completed',
    payment_status: 'paid',
    status: 'complete',
    customer: 'cus_test_123',
    subscription: 'sub_test_123',
    amount_total: 2500, // 25.00 EUR in cents
    currency: 'eur',
  },
};

// ============================================================
// TEST CARDS (generic test card numbers)
// ============================================================

export const TEST_CARDS = {
  success: {
    number: '4242424242424242',
    exp_month: 12,
    exp_year: 2034,
    cvc: '123',
    description: 'Always succeeds',
  },
  decline: {
    number: '4000000000000002',
    exp_month: 12,
    exp_year: 2034,
    cvc: '123',
    description: 'Always declines',
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate a mock user with specific country
 */
export function createMockUser(countryCode: string, overrides: any = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: `test.${countryCode.toLowerCase()}@balkanestateai.com`,
    name: `Test User ${countryCode}`,
    country: countryCode,
    isSubscribed: false,
    role: 'buyer',
    ...overrides,
  };
}

/**
 * Generate a mock payment request
 */
export function createMockPaymentRequest(
  countryCode: string,
  planName: string = 'Pro Monthly',
  amount: number = 25
) {
  return {
    planName,
    planInterval: planName.includes('Yearly') ? 'year' : 'month',
    amount,
    countryCode,
    productId: planName.toLowerCase().replace(' ', '_'),
    language: 'en',
  };
}
