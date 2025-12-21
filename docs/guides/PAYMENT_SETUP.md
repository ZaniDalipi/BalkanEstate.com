# Payment System Setup Guide

This application uses **external payment processing** to ensure security and PCI compliance. All sensitive payment information (credit card details, bank accounts, etc.) is handled by third-party payment providers like Stripe.

## Overview

**How External Payments Work:**
1. User clicks "Pay" in the app
2. App creates a payment session with Stripe (backend API call)
3. User is **redirected to Stripe's secure external payment page**
4. User completes payment on Stripe's website (we never see card details)
5. Stripe redirects back to our app with success/cancel status
6. Stripe sends webhook confirmation to our backend
7. Backend updates subscription/payment status in database

**Security Benefits:**
- ✅ **No credit card data stored in our database**
- ✅ **PCI DSS compliance handled entirely by Stripe**
- ✅ Secure payment processing infrastructure
- ✅ Fraud detection and prevention by Stripe
- ✅ Multiple payment methods supported
- ✅ Automatic invoicing and receipts

The payment system supports:
- Multiple payment methods (cards, SEPA, Apple Pay, Google Pay, etc.)
- Configurable payment options based on user role (buyer, private seller, agent, enterprise)
- Subscription management
- Webhook handling for automatic subscription updates
- One-time payments and recurring subscriptions

## Prerequisites

1. **Stripe Account**: Create a free account at [stripe.com](https://stripe.com)
2. **Stripe API Keys**: Get your publishable and secret keys from the Stripe Dashboard
3. **Node.js & npm**: Ensure you have Node.js 18+ installed

## Installation

### 1. Install Dependencies

#### Backend
```bash
cd backend
npm install stripe
npm install --save-dev @types/stripe
```

#### Frontend
```bash
cd ..  # back to root
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Configure Environment Variables

#### Backend (.env)
Create or update `backend/.env` with the following:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# These can be found in your Stripe Dashboard
```

#### Frontend (.env or .env.local)
Create or update `.env` with:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**⚠️ Important**: Never commit your secret keys to version control!

### 3. Get Your Stripe Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** (starts with `pk_test_`) → Add to frontend `.env`
4. Copy your **Secret key** (starts with `sk_test_`) → Add to backend `.env`

### 4. Set Up Webhook (for Production)

Webhooks allow Stripe to notify your backend when payments succeed/fail.

#### For Development (using Stripe CLI):
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5001/api/payments/webhook
```

This will give you a webhook secret starting with `whsec_` - add it to your backend `.env`.

#### For Production:
1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your production URL: `https://your-domain.com/api/payments/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copy the signing secret and add to production `.env`

## Payment Configuration

### Customizing Payment Methods

Edit `config/paymentConfig.ts` to customize:

1. **Enable/Disable Payment Methods**:
```typescript
export const PAYMENT_METHODS: Record<PaymentMethodType, PaymentMethod> = {
  card: {
    id: 'card',
    name: 'Credit / Debit Card',
    enabled: true,  // Set to false to disable
    // ...
  },
  // ...
};
```

2. **Change Payment Method Priority by User Type**:
```typescript
export const AGENT_PAYMENT_CONFIG: UserTypePaymentConfig = {
  userRole: 'agent',
  displayName: 'Agent / Real Estate Company',
  paymentMethods: [
    'sepa_debit',    // First = highest priority (recommended)
    'card',
    'paypal',
    // Add or remove methods as needed
  ],
  defaultMethod: 'sepa_debit',  // Pre-selected method
};
```

3. **Add New Payment Methods**:
   - Add the method to `PaymentMethodType`
   - Define it in `PAYMENT_METHODS`
   - Add it to relevant user configs

### Pricing Plans

Update prices in `config/paymentConfig.ts`:

```typescript
export const PAYMENT_PLANS: Record<string, PaymentPlan> = {
  buyer_pro_monthly: {
    id: 'buyer_pro_monthly',
    name: 'Buyer Pro Monthly',
    price: 1.50,  // Change price here
    currency: 'EUR',
    interval: 'month',
  },
  // ...
};
```

**Note**: Also update prices in:
- `components/BuyerFlow/SubscriptionModal.tsx` (line 56)
- `components/SellerFlow/PricingPlans.tsx` (lines 65-67)

## Testing Payments

### Test Card Numbers

Stripe provides test cards for development:

| Card Number         | Description           |
|--------------------|-----------------------|
| 4242 4242 4242 4242 | Success (Visa)        |
| 4000 0025 0000 3155 | 3D Secure required    |
| 4000 0000 0000 9995 | Declined (insufficient funds) |
| 4000 0000 0000 0002 | Declined (generic)    |

- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

### Testing the Flow

1. Start your backend: `cd backend && npm run dev`
2. Start your frontend: `npm run dev`
3. Navigate to subscription page
4. Select a plan
5. Use test card `4242 4242 4242 4242`
6. Complete payment
7. Check backend logs for "Subscription activated"
8. Check Stripe Dashboard → **Payments** to see the test payment

## Going Live

### 1. Switch to Live Mode

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Get your **live** API keys (start with `pk_live_` and `sk_live_`)
3. Update environment variables with live keys

### 2. Create Stripe Products (Optional but Recommended)

For better tracking and subscription management:

1. Go to **Products** in Stripe Dashboard
2. Create products for each plan:
   - **Buyer Pro Monthly** - €1.50/month
   - **Pro Monthly** - €25/month
   - **Pro Annual** - €200/year
   - **Enterprise** - €1000/year
3. Copy the Price IDs and add to `config/paymentConfig.ts`:

```typescript
export const PAYMENT_PLANS: Record<string, PaymentPlan> = {
  buyer_pro_monthly: {
    // ...
    stripePriceId: 'price_XXXXXXXXXXXXX',  // Add Price ID here
  },
};
```

### 3. Security Checklist

- ✅ Never expose secret keys in frontend code
- ✅ Use HTTPS in production
- ✅ Validate webhook signatures
- ✅ Set up proper CORS policies
- ✅ Enable rate limiting on payment endpoints
- ✅ Log all payment events
- ✅ Set up monitoring for failed payments

## Troubleshooting

### "Unable to load payment"

**Solution**: Check that:
1. Backend is running
2. `STRIPE_SECRET_KEY` is set in backend `.env`
3. Payment endpoint is accessible: `POST /api/payments/create-intent`

### "Stripe is not defined"

**Solution**: Check that:
1. `VITE_STRIPE_PUBLISHABLE_KEY` is set in frontend `.env`
2. You've restarted the frontend dev server after adding env vars

### Webhook not receiving events

**Solution**:
1. Verify webhook secret is correct
2. Check Stripe CLI is running: `stripe listen --forward-to localhost:5001/api/payments/webhook`
3. Check endpoint accepts raw body: `express.raw({ type: 'application/json' })`

### Payment succeeds but subscription not activated

**Solution**:
1. Check backend logs for errors in `handlePaymentSuccess`
2. Verify user exists in database
3. Check webhook events in Stripe Dashboard → **Developers** → **Webhooks**

## Payment Method Recommendations

### For Buyers (€1.50/month)
- ✅ **Card**: Universal, instant
- ✅ **Apple Pay / Google Pay**: Quick mobile checkout
- ⚠️ **SEPA**: Slower (3-5 days) but lower fees

### For Private Sellers (€25-200)
- ✅ **Card**: Instant activation
- ✅ **SEPA**: Lower fees for recurring
- ✅ **Klarna**: Buy now, pay later option

### For Agents (€200-1000)
- ✅ **SEPA Direct Debit**: Lowest fees, best for business
- ✅ **Card**: Instant activation
- ⚠️ Consider adding invoice option for companies

## Support

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: Available 24/7 in Stripe Dashboard
- **Payment Element Docs**: https://stripe.com/docs/payments/payment-element

## Architecture

### Components
- **PaymentWindow**: Main payment modal component
- **PaymentConfig**: Configuration for payment methods and plans
- **Backend Controller**: Handles payment intents and webhooks

### Flow
1. User selects a plan
2. Frontend creates payment intent via API
3. Stripe Payment Element displays available payment methods
4. User completes payment
5. Stripe webhook notifies backend
6. Backend updates user subscription status
7. User sees success message

## Customization Guide

### Adding a New Plan

1. Add to `config/paymentConfig.ts`:
```typescript
my_new_plan: {
  id: 'my_new_plan',
  name: 'My New Plan',
  price: 50,
  currency: 'EUR',
  interval: 'month',
},
```

2. Add to pricing components (SubscriptionModal or PricingPlans)

3. Update backend controller to handle the new plan

### Changing Payment Methods Order

Edit the `paymentMethods` array in user configs:
```typescript
export const BUYER_PAYMENT_CONFIG: UserTypePaymentConfig = {
  // ...
  paymentMethods: [
    'apple_pay',    // Now first (recommended)
    'card',         // Now second
    // ...
  ],
};
```

### Custom Branding

Update Stripe appearance in `PaymentWindow.tsx`:
```typescript
const stripeOptions = {
  // ...
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#YOUR_PRIMARY_COLOR',  // Change colors
      // ...
    },
  },
};
```

---

**Last Updated**: 2025-11-14
