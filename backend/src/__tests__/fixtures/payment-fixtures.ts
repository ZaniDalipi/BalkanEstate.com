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
  // User from Serbia (Paddle)
  serbianUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'test.serbia@balkanestate.com',
    name: 'Test Serbian User',
    country: 'RS',
    isSubscribed: false,
    role: 'buyer',
  },

  // User from Greece (Stripe)
  greekUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'test.greece@balkanestate.com',
    name: 'Test Greek User',
    country: 'GR',
    isSubscribed: false,
    role: 'buyer',
  },

  // User from Albania (Paddle)
  albanianUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'test.albania@balkanestate.com',
    name: 'Test Albanian User',
    country: 'AL',
    isSubscribed: false,
    role: 'agent',
  },

  // Subscribed user
  subscribedUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'subscribed@balkanestate.com',
    name: 'Subscribed User',
    country: 'HR',
    isSubscribed: true,
    subscriptionPlan: 'pro_monthly',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    subscriptionSource: 'stripe',
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
  // Stripe payment (EU country)
  stripePayment: {
    planName: 'Pro Monthly',
    planInterval: 'month',
    amount: 25,
    countryCode: 'GR',
    productId: 'pro_monthly',
    language: 'en',
  },

  // Paddle payment (non-EU country)
  paddlePayment: {
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
// MOCK STRIPE RESPONSES
// ============================================================

export const MOCK_STRIPE_RESPONSES = {
  checkoutSession: {
    id: 'cs_test_a1b2c3d4e5f6g7h8i9j0',
    object: 'checkout.session',
    url: 'https://checkout.stripe.com/pay/cs_test_a1b2c3d4e5f6g7h8i9j0',
    payment_status: 'unpaid',
    status: 'open',
    customer_email: 'test@balkanestate.com',
    metadata: {
      userId: 'user_123',
      productId: 'pro_monthly',
      planName: 'Pro Monthly',
      planInterval: 'month',
    },
  },

  completedSession: {
    id: 'cs_test_completed',
    object: 'checkout.session',
    payment_status: 'paid',
    status: 'complete',
    customer: 'cus_test_123',
    subscription: 'sub_test_123',
    amount_total: 2500, // 25.00 EUR in cents
    currency: 'eur',
  },

  webhookEvent: {
    id: 'evt_test_123',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_completed',
        payment_status: 'paid',
        status: 'complete',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: {
          userId: 'user_123',
          productId: 'pro_monthly',
        },
      },
    },
  },

  subscription: {
    id: 'sub_test_123',
    object: 'subscription',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    customer: 'cus_test_123',
    items: {
      data: [
        {
          price: {
            id: 'price_test_123',
            unit_amount: 2500,
            currency: 'eur',
          },
        },
      ],
    },
  },
};

// ============================================================
// MOCK PADDLE RESPONSES
// ============================================================

export const MOCK_PADDLE_RESPONSES = {
  checkoutResponse: {
    success: true,
    transactionId: 'txn_01abc123def456',
    checkoutUrl: 'https://checkout.paddle.com/txn_01abc123def456',
  },

  transactionCompleted: {
    event_type: 'transaction.completed',
    event_id: 'evt_01abc123',
    occurred_at: new Date().toISOString(),
    data: {
      id: 'txn_01abc123def456',
      status: 'completed',
      customer_id: 'ctm_01xyz789',
      currency_code: 'EUR',
      details: {
        totals: {
          total: '2500', // 25.00 EUR in cents
          subtotal: '2100',
          tax: '400',
        },
      },
      custom_data: {
        user_id: 'user_123',
        product_id: 'pro_monthly',
        plan_name: 'Pro Monthly',
        plan_interval: 'month',
      },
    },
  },

  subscriptionCreated: {
    event_type: 'subscription.created',
    event_id: 'evt_02abc456',
    occurred_at: new Date().toISOString(),
    data: {
      id: 'sub_01abc123',
      status: 'active',
      customer_id: 'ctm_01xyz789',
      current_billing_period: {
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      custom_data: {
        user_id: 'user_123',
      },
    },
  },

  subscriptionCanceled: {
    event_type: 'subscription.canceled',
    event_id: 'evt_03abc789',
    occurred_at: new Date().toISOString(),
    data: {
      id: 'sub_01abc123',
      status: 'canceled',
      customer_id: 'ctm_01xyz789',
      current_billing_period: {
        ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  },

  subscription: {
    id: 'sub_01abc123',
    status: 'active',
    customer_id: 'ctm_01xyz789',
    current_billing_period: {
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    next_billed_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

// ============================================================
// TEST CARDS
// ============================================================

export const TEST_CARDS = {
  stripe: {
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
    requiresAuth: {
      number: '4000002500003155',
      exp_month: 12,
      exp_year: 2034,
      cvc: '123',
      description: 'Requires 3D Secure authentication',
    },
    insufficientFunds: {
      number: '4000000000009995',
      exp_month: 12,
      exp_year: 2034,
      cvc: '123',
      description: 'Declined - insufficient funds',
    },
  },

  paddle: {
    success: {
      number: '4242424242424242',
      exp_month: 12,
      exp_year: 2034,
      cvc: '123',
      description: 'Always succeeds in sandbox',
    },
    decline: {
      number: '4000000000000002',
      exp_month: 12,
      exp_year: 2034,
      cvc: '123',
      description: 'Always declines in sandbox',
    },
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
    email: `test.${countryCode.toLowerCase()}@balkanestate.com`,
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

/**
 * Generate mock Paddle webhook event
 */
export function createMockPaddleWebhook(
  eventType: string,
  userId: string,
  transactionId: string = `txn_${Date.now()}`
) {
  return {
    event_type: eventType,
    event_id: `evt_${Date.now()}`,
    occurred_at: new Date().toISOString(),
    data: {
      id: transactionId,
      status: 'completed',
      customer_id: `ctm_${Date.now()}`,
      currency_code: 'EUR',
      details: {
        totals: { total: '2500' },
      },
      custom_data: {
        user_id: userId,
        product_id: 'pro_monthly',
        plan_name: 'Pro Monthly',
        plan_interval: 'month',
      },
    },
  };
}
