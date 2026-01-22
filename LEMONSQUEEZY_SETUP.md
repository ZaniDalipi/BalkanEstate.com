# LemonSqueezy Integration Setup Guide

This guide explains how to set up LemonSqueezy as the payment provider for BalkanEstate.

## 1. LemonSqueezy Dashboard Setup

### Create Products in LemonSqueezy

1. Go to https://app.lemonsqueezy.com
2. Navigate to **Products** > **New Product**
3. Create the following products:

| Product Name | Price | Billing |
|-------------|-------|---------|
| Buyer Pro Monthly | €3/month | Monthly |
| Pro Monthly | €25/month | Monthly |
| Pro Yearly | €200/year | Yearly |
| Enterprise | €1000/year | Yearly |

4. For each product, note down the **Variant ID** (found in product settings)

### Create Webhook

1. Go to **Settings** > **Webhooks**
2. Click **Add Webhook**
3. Set the URL to: `https://your-domain.com/api/payments/lemonsqueezy/webhook`
4. Select these events:
   - `order_created`
   - `order_refunded`
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_resumed`
   - `subscription_expired`
   - `subscription_paused`
   - `subscription_unpaused`
   - `subscription_payment_success`
   - `subscription_payment_failed`
5. Copy the **Signing Secret**

### Get API Key

1. Go to **Settings** > **API**
2. Click **Create API Key**
3. Copy the API key

### Get Store ID

1. Go to **Settings** > **Store**
2. Your Store ID is shown in the URL or settings

## 2. Environment Variables

Add these to your backend `.env` file:

```env
# LemonSqueezy Configuration
LEMONSQUEEZY_API_KEY=your_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id_here
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_signing_secret_here
LEMONSQUEEZY_TEST_MODE=true  # Set to false for production

# LemonSqueezy Product Variant IDs
LEMONSQUEEZY_VARIANT_BUYER_PRO_MONTHLY=your_variant_id
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=your_variant_id
LEMONSQUEEZY_VARIANT_PRO_YEARLY=your_variant_id
LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY=your_variant_id
```

## 3. Database Configuration

You can also store variant IDs in the Product model. Update each product in your database:

```javascript
// Example: Update Pro Monthly product
db.products.updateOne(
  { productId: 'pro_monthly' },
  { $set: { lemonSqueezyVariantId: 'your_variant_id' } }
)
```

## 4. Admin Panel Configuration

1. Go to Admin > Pricing & Products
2. For each product, add the LemonSqueezy Variant ID in the edit modal

## 5. Testing

### Test Mode
1. Make sure `LEMONSQUEEZY_TEST_MODE=true` in your `.env`
2. Use test card numbers from LemonSqueezy docs
3. All transactions will be in test mode

### Verify Webhook
1. Make a test purchase
2. Check backend logs for webhook events
3. Verify user subscription is updated

### Test Cards
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- Any future expiry date and CVC

## 6. Going Live

1. Set `LEMONSQUEEZY_TEST_MODE=false`
2. Create a **live API key** in LemonSqueezy dashboard
3. Update webhook URL if different for production
4. Create live products (test products don't transfer)
5. Update variant IDs for live products

## Architecture

### Files Created/Modified

```
backend/src/
├── services/
│   └── lemonSqueezyService.ts     # LemonSqueezy API client
├── controllers/
│   └── lemonSqueezyWebhookController.ts  # Webhook handlers
├── routes/
│   └── paymentRoutes.ts           # Added /lemonsqueezy/* routes
└── models/
    ├── Product.ts                 # Added lemonSqueezyVariantId
    └── User.ts                    # Added lemonSqueezy* fields
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/lemonsqueezy/webhook` | Webhook handler |
| GET | `/api/payments/lemonsqueezy/config` | Get client config |
| GET | `/api/payments/lemonsqueezy/portal` | Get customer portal URL |

### Webhook Events Handled

- `order_created` - New purchase
- `order_refunded` - Refund processed
- `subscription_created` - New subscription
- `subscription_updated` - Plan changed
- `subscription_cancelled` - Cancellation
- `subscription_resumed` - Reactivation
- `subscription_expired` - Subscription ended
- `subscription_paused` - Subscription paused
- `subscription_payment_success` - Renewal success
- `subscription_payment_failed` - Payment failed

## Troubleshooting

### Webhook not receiving events
1. Check webhook URL is correct
2. Verify webhook is enabled in LemonSqueezy
3. Check server logs for errors

### Payment not working
1. Verify API key is correct
2. Check store ID matches
3. Ensure variant IDs are correct

### Subscription not updating
1. Check webhook signature verification
2. Verify custom_data is being passed correctly
3. Check user_id in custom data matches database

## Support

- LemonSqueezy Docs: https://docs.lemonsqueezy.com
- API Reference: https://docs.lemonsqueezy.com/api
- Support: support@lemonsqueezy.com
