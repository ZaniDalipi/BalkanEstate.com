# Payment Testing Guide

This guide covers how to test the Stripe + Paddle payment integration in development.

## Quick Start

```bash
# 1. Set up test environment variables
cp .env.example .env
# Edit .env with your test credentials

# 2. Start the server
npm run dev

# 3. Run automated tests
npm test -- --testPathPattern=payments

# 4. Run manual API tests
chmod +x test-payments.sh
./test-payments.sh
```

---

## Test Credentials

### Stripe Test Mode

Use these test API keys (get from https://dashboard.stripe.com/test/apikeys):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From webhook setup
```

### Paddle Sandbox

Use sandbox credentials (get from https://sandbox-vendors.paddle.com):

```env
PADDLE_API_KEY=test_...
PADDLE_CLIENT_TOKEN=test_...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_ENVIRONMENT=sandbox
```

---

## Test Cards

### Stripe Test Cards

| Card Number | Description |
|-------------|-------------|
| `4242424242424242` | Successful payment |
| `4000000000003220` | 3D Secure authentication required |
| `4000000000009995` | Declined - insufficient funds |
| `4000000000000002` | Declined - generic decline |
| `4000000000009987` | Declined - lost card |
| `4000000000009979` | Declined - stolen card |
| `4000002500003155` | Requires authentication (SCA) |

**For all test cards:**
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any valid ZIP (e.g., 12345)

### Paddle Sandbox Cards

| Card Number | Description |
|-------------|-------------|
| `4242424242424242` | Successful payment |
| `4000000000000002` | Declined |
| `4000000000003220` | 3D Secure required |

**For Paddle test cards:**
- Expiry: Any future date
- CVC: Any 3 digits

---

## API Test Endpoints

### 1. Get Supported Countries

```bash
curl http://localhost:5001/api/payments/supported-countries
```

Expected response:
```json
{
  "success": true,
  "countries": [...],
  "stripeCountries": [{"countryCode": "GR"}, {"countryCode": "HR"}, ...],
  "paddleCountries": [{"countryCode": "RS"}, {"countryCode": "AL"}, ...]
}
```

### 2. Get Provider for Country

```bash
# Serbia (Paddle)
curl http://localhost:5001/api/payments/providers/RS

# Greece (Stripe)
curl http://localhost:5001/api/payments/providers/GR
```

### 3. Create Payment (Authenticated)

```bash
# First, login to get a token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.token')

# Create payment for Serbia (Paddle)
curl -X POST http://localhost:5001/api/payments/create-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planName": "Pro Monthly",
    "planInterval": "month",
    "amount": 25,
    "countryCode": "RS",
    "productId": "pro_monthly"
  }'

# Create payment for Greece (Stripe)
curl -X POST http://localhost:5001/api/payments/create-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planName": "Pro Monthly",
    "planInterval": "month",
    "amount": 25,
    "countryCode": "GR",
    "productId": "pro_monthly"
  }'
```

### 4. Get Paddle Config

```bash
curl http://localhost:5001/api/payments/paddle/config
```

### 5. Check Subscription Status

```bash
curl http://localhost:5001/api/payments/subscription-status \
  -H "Authorization: Bearer $TOKEN"
```

---

## Webhook Testing

### Stripe Webhooks (Local)

Use Stripe CLI to forward webhooks locally:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: See https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5001/api/payments/webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.paid
```

### Paddle Webhooks (Local)

Use ngrok to expose local server:

```bash
# Install ngrok
# Download from https://ngrok.com/download

# Expose local server
ngrok http 5001

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Set this as webhook URL in Paddle Sandbox dashboard:
# https://abc123.ngrok.io/api/payments/paddle/webhook
```

### Test Webhook Payloads

**Paddle Transaction Completed:**
```bash
curl -X POST http://localhost:5001/api/payments/paddle/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "transaction.completed",
    "event_id": "evt_test_123",
    "occurred_at": "2024-01-15T10:00:00Z",
    "data": {
      "id": "txn_test_123",
      "status": "completed",
      "customer_id": "ctm_test_123",
      "currency_code": "EUR",
      "details": {
        "totals": {
          "total": "2500"
        }
      },
      "custom_data": {
        "user_id": "USER_ID_HERE",
        "product_id": "pro_monthly",
        "plan_name": "Pro Monthly",
        "plan_interval": "month"
      }
    }
  }'
```

**Paddle Subscription Created:**
```bash
curl -X POST http://localhost:5001/api/payments/paddle/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "subscription.created",
    "event_id": "evt_test_456",
    "occurred_at": "2024-01-15T10:00:00Z",
    "data": {
      "id": "sub_test_123",
      "status": "active",
      "customer_id": "ctm_test_123",
      "current_billing_period": {
        "starts_at": "2024-01-15T00:00:00Z",
        "ends_at": "2024-02-15T00:00:00Z"
      },
      "custom_data": {
        "user_id": "USER_ID_HERE"
      }
    }
  }'
```

---

## Country Routing Reference

| Country | Code | Provider | Currency | EU | SEPA |
|---------|------|----------|----------|----|----- |
| Greece | GR | Stripe | EUR | Yes | Yes |
| Croatia | HR | Stripe | EUR | Yes | Yes |
| Bulgaria | BG | Stripe | EUR | Yes | Yes |
| Romania | RO | Stripe | EUR | Yes | Yes |
| Slovenia | SI | Stripe | EUR | Yes | Yes |
| Serbia | RS | Paddle | EUR | No | Yes |
| Albania | AL | Paddle | EUR | No | Yes |
| Bosnia | BA | Paddle | EUR | No | No |
| N. Macedonia | MK | Paddle | EUR | No | Yes |
| Montenegro | ME | Paddle | EUR | No | Yes |
| Kosovo | XK | Paddle | EUR | No | No |

---

## Testing Checklist

### Provider Routing
- [ ] Serbia (RS) routes to Paddle
- [ ] Albania (AL) routes to Paddle
- [ ] Bosnia (BA) routes to Paddle
- [ ] N. Macedonia (MK) routes to Paddle
- [ ] Montenegro (ME) routes to Paddle
- [ ] Kosovo (XK) routes to Paddle
- [ ] Greece (GR) routes to Stripe
- [ ] Croatia (HR) routes to Stripe
- [ ] Bulgaria (BG) routes to Stripe
- [ ] Romania (RO) routes to Stripe
- [ ] Slovenia (SI) routes to Stripe
- [ ] Unknown country defaults to Stripe

### Payment Flow
- [ ] Stripe checkout session created successfully
- [ ] Stripe redirects to checkout page
- [ ] Stripe payment completes
- [ ] Stripe webhook updates subscription
- [ ] Paddle checkout URL generated
- [ ] Paddle redirects to checkout
- [ ] Paddle payment completes
- [ ] Paddle webhook updates subscription

### Subscription Management
- [ ] Subscription status reflects after payment
- [ ] User isSubscribed flag updated
- [ ] Subscription expiration date set
- [ ] Cancel subscription works
- [ ] Subscription status updates on cancel

### Error Handling
- [ ] Invalid country handled gracefully
- [ ] Missing auth token returns 401
- [ ] Invalid payment data returns 400
- [ ] Webhook signature verification works
- [ ] Fallback to Stripe when Paddle not configured

---

## Troubleshooting

### "Paddle not configured, falling back to Stripe"

Set the Paddle environment variables:
```env
PADDLE_API_KEY=your-api-key
PADDLE_CLIENT_TOKEN=your-client-token
PADDLE_ENVIRONMENT=sandbox
```

### "STRIPE_SECRET_KEY not configured"

Set the Stripe environment variables:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Webhook signature verification failed

- For Stripe: Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint secret
- For Paddle: Ensure `PADDLE_WEBHOOK_SECRET` is set correctly

### Payment not updating user subscription

Check the webhook logs:
```bash
# Watch server logs
npm run dev 2>&1 | grep -E "(webhook|payment|subscription)"
```

Verify the user ID is being passed in custom_data for Paddle payments.
