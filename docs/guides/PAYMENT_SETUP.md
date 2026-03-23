# Payment System Setup Guide

This application uses **external payment processing** to ensure security and PCI compliance. All sensitive payment information (credit card details, bank accounts, etc.) is handled by third-party payment providers like Braintree.

## Overview

**How External Payments Work:**
1. User clicks "Pay" in the app
2. App requests a client token from the backend (which fetches it from Braintree)
3. User completes payment using the **Braintree Drop-in UI or hosted fields** (we never see card details)
4. Braintree returns a payment method nonce to the frontend
5. Frontend sends the nonce to our backend to create the transaction
6. Braintree sends webhook confirmation to our backend
7. Backend updates subscription/payment status in database

**Security Benefits:**
- ✅ **No credit card data stored in our database**
- ✅ **PCI DSS compliance handled entirely by Braintree**
- ✅ Secure payment processing infrastructure
- ✅ Fraud detection and prevention by Braintree
- ✅ Multiple payment methods supported
- ✅ Automatic invoicing and receipts

The payment system supports:
- Multiple payment methods (cards, SEPA, Apple Pay, Google Pay, etc.)
- Configurable payment options based on user role (buyer, private seller, agent, enterprise)
- Subscription management
- Webhook handling for automatic subscription updates
- One-time payments and recurring subscriptions

## Prerequisites

1. **Braintree Account**: Create a sandbox account at [braintreegateway.com](https://www.braintreegateway.com)
2. **Braintree API Credentials**: Get your Merchant ID, Public Key, and Private Key from the Braintree Control Panel
3. **Node.js & npm**: Ensure you have Node.js 18+ installed

## Installation

### 1. Install Dependencies

#### Backend
```bash
cd backend
npm install braintree
npm install --save-dev @types/braintree
```

#### Frontend
```bash
cd ..  # back to root
npm install braintree-web braintree-web-drop-in
```

### 2. Configure Environment Variables

#### Backend (.env)
Create or update `backend/.env` with the following:

```env
# Braintree Configuration
BRAINTREE_MERCHANT_ID=your_merchant_id_here
BRAINTREE_PUBLIC_KEY=your_public_key_here
BRAINTREE_PRIVATE_KEY=your_private_key_here

# These can be found in your Braintree Control Panel
```

#### Frontend (.env or .env.local)
No frontend keys are required. The backend generates a client token that the frontend uses to initialize the Braintree Drop-in UI.

**⚠️ Important**: Never commit your private keys to version control!

### 3. Get Your Braintree Keys

1. Log in to [Braintree Control Panel](https://sandbox.braintreegateway.com/login) (sandbox) or [Production Control Panel](https://www.braintreegateway.com/login)
2. Go to **Settings** → **API** (under "API Keys, Tokenization Keys, Encryption Keys")
3. Copy your **Merchant ID** → Add to backend `.env` as `BRAINTREE_MERCHANT_ID`
4. Copy your **Public Key** → Add to backend `.env` as `BRAINTREE_PUBLIC_KEY`
5. Copy your **Private Key** → Add to backend `.env` as `BRAINTREE_PRIVATE_KEY`

### 4. Set Up Webhook (for Production)

Webhooks allow Braintree to notify your backend when payments succeed/fail.

#### For Development:
Use a tunneling tool like ngrok to expose your local server:
```bash
# Install and run ngrok
ngrok http 5001

# Use the ngrok URL as your webhook destination in the Braintree Control Panel
```

#### For Production:
1. Go to **Braintree Control Panel** → **Settings** → **Webhooks**
2. Click **Create New Webhook**
3. Enter your production URL: `https://your-domain.com/api/payments/webhook`
4. Select notifications to listen for:
   - `subscription_charged_successfully`
   - `subscription_charged_unsuccessfully`
   - `subscription_canceled`
   - `subscription_went_active`
   - `subscription_expired`
5. Braintree will verify the endpoint automatically

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

Braintree provides test card numbers for sandbox development:

| Card Number         | Description           |
|--------------------|-----------------------|
| 4111 1111 1111 1111 | Success (Visa)        |
| 5555 5555 5555 4444 | Success (Mastercard)  |
| 4000 1111 1111 1115 | Processor declined    |
| 4000 0000 0000 0010 | Gateway rejected      |

- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)

### Testing the Flow

1. Start your backend: `cd backend && npm run dev`
2. Start your frontend: `npm run dev`
3. Navigate to subscription page
4. Select a plan
5. Use test card `4111 1111 1111 1111`
6. Complete payment
7. Check backend logs for "Subscription activated"
8. Check Braintree Control Panel → **Transactions** to see the test payment

## Going Live

### 1. Switch to Production Mode

1. In Braintree Control Panel, switch from **Sandbox** to **Production**
2. Get your **production** API credentials (Merchant ID, Public Key, Private Key)
3. Update environment variables with production credentials

### 2. Create Braintree Plans (Optional but Recommended)

For better tracking and subscription management:

1. Go to **Plans** in Braintree Control Panel (under Subscriptions)
2. Create plans for each tier:
   - **Buyer Pro Monthly** - €1.50/month
   - **Pro Monthly** - €25/month
   - **Pro Annual** - €200/year
   - **Enterprise** - €1000/year
3. Copy the Plan IDs and add to `config/paymentConfig.ts`:

```typescript
export const PAYMENT_PLANS: Record<string, PaymentPlan> = {
  buyer_pro_monthly: {
    // ...
    braintreePlanId: 'buyer_pro_monthly',  // Add Plan ID here
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
2. `BRAINTREE_MERCHANT_ID`, `BRAINTREE_PUBLIC_KEY`, and `BRAINTREE_PRIVATE_KEY` are set in backend `.env`
3. Payment endpoint is accessible: `POST /api/payments/client-token`

### "Braintree Drop-in failed to initialize"

**Solution**: Check that:
1. The backend is returning a valid client token
2. You've restarted the frontend dev server after adding env vars

### Webhook not receiving events

**Solution**:
1. Verify webhook URL is correct in Braintree Control Panel
2. Check that your server is publicly accessible (use ngrok for local development)
3. Check endpoint is properly configured to parse Braintree webhook notifications

### Payment succeeds but subscription not activated

**Solution**:
1. Check backend logs for errors in `handlePaymentSuccess`
2. Verify user exists in database
3. Check webhook notifications in Braintree Control Panel → **Settings** → **Webhooks**

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

- **Braintree Documentation**: https://developer.paypal.com/braintree/docs
- **Braintree Support**: Available in Braintree Control Panel
- **Drop-in UI Docs**: https://developer.paypal.com/braintree/docs/guides/drop-in/overview

## Architecture

### Components
- **PaymentWindow**: Main payment modal component
- **PaymentConfig**: Configuration for payment methods and plans
- **Backend Controller**: Handles transactions and webhooks

### Flow
1. User selects a plan
2. Frontend requests a client token from the backend
3. Braintree Drop-in UI displays available payment methods
4. User completes payment and a nonce is returned
5. Backend creates transaction using the nonce
6. Braintree webhook notifies backend
7. Backend updates user subscription status
8. User sees success message

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

Update Braintree Drop-in appearance in `PaymentWindow.tsx`:
```typescript
const braintreeOptions = {
  authorization: clientToken,
  // ...
  card: {
    overrides: {
      styles: {
        input: {
          color: '#YOUR_TEXT_COLOR',
          'font-size': '16px',
        },
      },
    },
  },
};
```

---

**Last Updated**: 2025-11-14
