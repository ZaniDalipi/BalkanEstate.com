# Paddle Sandbox Testing Guide

This guide explains how to test Paddle payments locally using the sandbox environment.

## Prerequisites

1. A Paddle Sandbox account (separate from production)
2. Products and Prices created in the sandbox dashboard
3. ngrok or similar tool for webhook testing

---

## Step 1: Access Paddle Sandbox Dashboard

**IMPORTANT**: Sandbox and Production are completely separate environments!

- **Sandbox Dashboard**: https://sandbox-vendors.paddle.com/
- **Production Dashboard**: https://vendors.paddle.com/

Login to the **SANDBOX** dashboard to get your test credentials.

---

## Step 2: Get Your Sandbox Credentials

### API Key
1. Go to **Developer Tools → Authentication**
2. Create or copy your **API Key** (starts with `pdl_`)

### Client Token
1. Go to **Developer Tools → Authentication**
2. Copy your **Client-side Token** (starts with `test_` or `ctk_`)

### Webhook Secret
1. Go to **Developer Tools → Notifications**
2. Create a webhook endpoint (see Step 4)
3. Copy the **Webhook Secret** (starts with `pdl_ntfset_`)

---

## Step 3: Create Products and Prices in Sandbox

1. Go to **Catalog → Products** in sandbox dashboard
2. Create your subscription products:

| Product Name | Description |
|-------------|-------------|
| Buyer Pro | Pro subscription for buyers |
| Private Seller Pro | Pro subscription for private sellers |
| Agency | Agency subscription |

3. For each product, create **Prices**:
   - Monthly Price (e.g., €9.99/month)
   - Yearly Price (e.g., €99.99/year)

4. Copy each **Price ID** (starts with `pri_`) and add to your `.env`:

```bash
PADDLE_PRICE_BUYER_PRO_MONTHLY=pri_01abc123...
PADDLE_PRICE_PRO_MONTHLY=pri_01def456...
PADDLE_PRICE_PRO_YEARLY=pri_01ghi789...
PADDLE_PRICE_AGENCY_MONTHLY=pri_01jkl012...
PADDLE_PRICE_AGENCY_YEARLY=pri_01mno345...
```

---

## Step 4: Set Up Webhooks for Local Development

Paddle needs to send webhook events to your server. Since localhost isn't accessible from the internet, use **ngrok**:

### Install ngrok
```bash
# macOS
brew install ngrok

# or download from https://ngrok.com/download
```

### Start ngrok
```bash
# Start ngrok pointing to your backend port
ngrok http 5001
```

This will give you a URL like: `https://abc123.ngrok.io`

### Configure Webhook in Paddle
1. Go to **Developer Tools → Notifications** in sandbox dashboard
2. Click **New destination**
3. Enter your ngrok URL + webhook path:
   ```
   https://abc123.ngrok.io/api/payments/paddle/webhook
   ```
4. Select these events:
   - `transaction.completed`
   - `transaction.refunded`
   - `subscription.created`
   - `subscription.activated`
   - `subscription.updated`
   - `subscription.canceled`
   - `subscription.paused`
   - `subscription.resumed`
   - `subscription.past_due`
5. Save and copy the **Webhook Secret**
6. Add to your `.env`:
   ```bash
   PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
   ```

**Note**: ngrok URLs change each time you restart. Update the webhook URL in Paddle dashboard if you restart ngrok.

---

## Step 5: Update Your .env File

Your `backend/.env` should look like:

```bash
# Paddle SANDBOX Configuration
PADDLE_API_KEY=pdl_YOUR_SANDBOX_API_KEY
PADDLE_CLIENT_TOKEN=test_YOUR_SANDBOX_CLIENT_TOKEN
PADDLE_WEBHOOK_SECRET=pdl_ntfset_YOUR_WEBHOOK_SECRET
PADDLE_ENVIRONMENT=sandbox

# Price IDs from your sandbox products
PADDLE_PRICE_BUYER_PRO_MONTHLY=pri_...
PADDLE_PRICE_PRO_MONTHLY=pri_...
PADDLE_PRICE_PRO_YEARLY=pri_...
PADDLE_PRICE_AGENCY_MONTHLY=pri_...
PADDLE_PRICE_AGENCY_YEARLY=pri_...
```

---

## Step 6: Test Cards for Sandbox

Use these test cards in sandbox checkout:

### Successful Payments
| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Visa - Success |
| `4000 0566 5566 5556` | Visa Debit - Success |
| `5555 5555 5555 4444` | Mastercard - Success |

### Testing Failures
| Card Number | Description |
|-------------|-------------|
| `4000 0000 0000 0002` | Card Declined |
| `4000 0000 0000 9995` | Insufficient Funds |
| `4000 0000 0000 0069` | Expired Card |
| `4000 0000 0000 0127` | Incorrect CVC |

### Card Details
- **Expiry**: Any future date (e.g., 12/30)
- **CVC**: Any 3 digits (e.g., 123)
- **Name**: Any name
- **Address**: Any valid address

---

## Step 7: Testing the Payment Flow

### Start Your Servers

```bash
# Terminal 1: Start ngrok
ngrok http 5001

# Terminal 2: Start backend
cd backend && npm run dev

# Terminal 3: Start frontend
npm run dev
```

### Test a Payment

1. Open the app at `http://localhost:5173`
2. Log in as a user
3. Go to subscription/pricing page
4. Select a Balkan country (Serbia, Albania, etc.)
5. Click to subscribe
6. Paddle overlay should open
7. Enter test card details
8. Complete payment
9. Check webhook logs in your backend

### Verify Success

1. Check backend console for webhook events
2. Check MongoDB for:
   - New subscription record
   - Updated user subscription status
   - Payment record
3. Check Paddle sandbox dashboard for the transaction

---

## Troubleshooting

### "Paddle not configured" error
- Ensure `PADDLE_API_KEY` and `PADDLE_CLIENT_TOKEN` are set
- Restart the backend after changing `.env`

### Checkout doesn't open
- Check browser console for errors
- Verify `PADDLE_CLIENT_TOKEN` is correct
- Ensure `PADDLE_ENVIRONMENT=sandbox`

### Webhooks not received
- Verify ngrok is running
- Check ngrok URL matches Paddle webhook config
- Verify webhook secret matches

### "Invalid signature" on webhooks
- Ensure `PADDLE_WEBHOOK_SECRET` matches Paddle dashboard
- Don't modify the raw request body before verification

### Prices not found
- Verify Price IDs in `.env` match sandbox dashboard
- Price IDs are different between sandbox and production!

---

## Switching to Production

When ready for production:

1. Create products/prices in production dashboard (vendors.paddle.com)
2. Get production API keys
3. Update `.env`:
   ```bash
   PADDLE_ENVIRONMENT=production
   PADDLE_API_KEY=pdl_live_...
   PADDLE_CLIENT_TOKEN=live_...
   # Update all price IDs to production ones
   ```
4. Update webhook URL to your production server
5. Complete Paddle's verification process

---

## Quick Reference

| Environment | Dashboard URL | API URL |
|-------------|---------------|---------|
| Sandbox | sandbox-vendors.paddle.com | sandbox-api.paddle.com |
| Production | vendors.paddle.com | api.paddle.com |
