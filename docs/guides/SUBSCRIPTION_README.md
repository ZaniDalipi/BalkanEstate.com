# Subscription Management System

A complete backend subscription management system for mobile and web applications with support for Google Play, App Store, and web-based payments.

## Features

### Core Functionality
- ✅ Multi-platform support (Google Play, App Store, Stripe/Web)
- ✅ Automatic subscription renewal tracking
- ✅ Real-time webhook notifications from stores
- ✅ Purchase token validation
- ✅ Grace period handling
- ✅ Subscription lifecycle management
- ✅ Payment record tracking
- ✅ Daily reconciliation worker
- ✅ Bank export for accounting (CSV, JSON, XML, QuickBooks, Xero)

### Data Models
- **Subscription** - Main subscription tracking with status, dates, and store info
- **SubscriptionEvent** - Complete event history with 23+ event types
- **Product** - Product catalog with multi-store mapping
- **PaymentRecord** - Financial transaction records with fees and taxes
- **BankExport** - Export batches for accounting

### Store Integration
- **Google Play** - Real-Time Developer Notifications (RTDN)
- **App Store** - Server Notifications v2
- **Purchase Validation** - Server-side validation for both stores
- **Webhook Processing** - Automatic event handling

### Background Jobs
- **Daily Reconciliation** - Syncs all subscriptions with stores
- **Grace Period Detection** - Automatic grace period tracking
- **Expiration Handling** - Auto-expire subscriptions

### Admin Features
- **Payment Export** - Export to CSV, JSON, XML, QuickBooks, Xero
- **Batch Processing** - Track export batches
- **Financial Reports** - Transaction summaries

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  (React Web App / iOS App / Android App)                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ REST API
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      Backend API                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Controllers                                          │   │
│  │  - subscriptionController  - productController       │   │
│  │  - googlePlayWebhookController                       │   │
│  │  - appStoreWebhookController                         │   │
│  │  - bankExportController                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Services                                             │   │
│  │  - googlePlayService (Purchase validation)           │   │
│  │  - appStoreService (Purchase validation)             │   │
│  │  - bankExportService (Financial exports)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Workers                                              │   │
│  │  - reconciliationWorker (Daily sync)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    MongoDB Database                          │
│  - Subscriptions  - SubscriptionEvents                      │
│  - Products       - PaymentRecords                          │
│  - BankExports    - Users                                   │
└──────────────────────────────────────────────────────────────┘
                 ▲
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼──────┐         ┌───────▼────┐
│  Google  │         │  App Store │
│   Play   │         │   Connect  │
└──────────┘         └────────────┘
  Webhooks             Webhooks
```

## File Structure

```
backend/
├── src/
│   ├── models/
│   │   ├── Subscription.ts          # Main subscription model
│   │   ├── SubscriptionEvent.ts     # Event tracking
│   │   ├── Product.ts               # Product catalog
│   │   ├── PaymentRecord.ts         # Payment transactions
│   │   └── BankExport.ts            # Export batches
│   │
│   ├── controllers/
│   │   ├── subscriptionController.ts          # Subscription CRUD
│   │   ├── googlePlayWebhookController.ts     # Google Play webhooks
│   │   ├── appStoreWebhookController.ts       # App Store webhooks
│   │   └── bankExportController.ts            # Export management
│   │
│   ├── services/
│   │   ├── googlePlayService.ts     # Google Play API integration
│   │   ├── appStoreService.ts       # App Store API integration
│   │   └── bankExportService.ts     # Export generation
│   │
│   ├── workers/
│   │   └── reconciliationWorker.ts  # Daily sync worker
│   │
│   ├── routes/
│   │   ├── subscriptionRoutes.ts    # Subscription endpoints
│   │   ├── webhookRoutes.ts         # Webhook endpoints
│   │   ├── productRoutes.ts         # Product catalog endpoints
│   │   └── bankExportRoutes.ts      # Export endpoints
│   │
│   └── server.ts                    # Main server file
│
├── .env.example                      # Environment variables template
└── package.json
```

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens

Optional (for store integration):
- Google Play credentials
- App Store credentials
- Stripe credentials

### 3. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details

### Subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions` - Get user subscriptions
- `GET /api/subscriptions/:id` - Get subscription details
- `POST /api/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/subscriptions/:id/restore` - Restore subscription
- `POST /api/subscriptions/:id/verify` - Verify with store
- `GET /api/subscriptions/:id/events` - Get event history
- `GET /api/subscriptions/:id/payments` - Get payment records

### Webhooks (No Auth - Verified via signature)
- `POST /api/webhooks/google-play` - Google Play notifications
- `POST /api/webhooks/app-store` - App Store notifications

### Bank Exports (Admin only)
- `POST /api/bank-exports` - Create export
- `GET /api/bank-exports` - List exports
- `GET /api/bank-exports/:batchId` - Get export details
- `GET /api/bank-exports/:batchId/download` - Download export

## Usage Examples

See `SUBSCRIPTION_INTEGRATION.md` for complete integration guide with:
- React component examples
- Mobile integration (Android/iOS)
- API reference
- Testing instructions

## Subscription Lifecycle

```
┌─────────────┐
│   Created   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     Auto-renew ┌─────────────┐
│   Active    │◄───────────────┤   Renewed   │
└──────┬──────┘                └─────────────┘
       │
       │ Payment fails
       ▼
┌─────────────┐     Payment    ┌─────────────┐
│Grace Period │────received────►│   Active    │
└──────┬──────┘                └─────────────┘
       │
       │ Grace expires
       ▼
┌─────────────┐
│   Expired   │
└─────────────┘

User cancels      Refund
     │               │
     ▼               ▼
┌──────────┐    ┌──────────┐
│Pending   │    │ Refunded │
│Cancel    │    └──────────┘
└──────────┘
     │
     │ Billing period ends
     ▼
┌──────────┐
│Canceled  │
└──────────┘
```

## Event Types

The system tracks 23+ event types including:
- `subscription_purchased` - New subscription
- `subscription_renewed` - Auto-renewal
- `subscription_canceled` - User canceled
- `subscription_expired` - Expired
- `subscription_refunded` - Refunded
- `subscription_grace_period_started` - Payment failed
- `subscription_recovered` - Recovered from grace
- And many more...

## Reconciliation

The reconciliation worker runs every 24 hours to:
1. Fetch all active subscriptions from database
2. Validate each with its store (Google Play/App Store)
3. Update subscription status based on store data
4. Handle grace periods, expirations, cancellations
5. Log all changes as events

## Bank Export

Supported formats:
- **CSV** - Simple comma-separated values
- **JSON** - Structured JSON format
- **XML** - XML format
- **QuickBooks** - IIF format for QuickBooks
- **Xero** - Xero-compatible CSV

Features:
- Filter by date range
- Filter by store (Google Play, App Store, Web)
- Filter by amount range
- Automatic batch tracking
- Mark records as exported to prevent duplicates

## Security

- JWT authentication for all user endpoints
- Admin-only endpoints for sensitive operations
- Webhook signature verification (Google Play & App Store)
- Purchase token validation with stores
- No client-side secrets

## Monitoring

The system logs:
- All subscription state changes
- Payment transactions
- Webhook notifications
- Reconciliation results
- Export operations

Events are stored in `SubscriptionEvent` collection for audit trail.

## Production Considerations

1. **Environment Variables**: Set all production credentials
2. **Webhook URLs**: Configure public HTTPS URLs for webhooks
3. **Reconciliation**: Enable with `ENABLE_RECONCILIATION=true`
4. **Database Indexes**: Ensure all indexes are created (automatic)
5. **Cloud Storage**: Configure S3 for export file storage
6. **Monitoring**: Set up logging and alerting
7. **Error Handling**: Monitor webhook errors and reconciliation failures

## Testing

### Local Testing

```bash
# Test product catalog
curl http://localhost:5001/api/products

# Test subscription creation (with auth)
curl -X POST http://localhost:5001/api/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "buyer_pro_monthly", "store": "web"}'
```

### Webhook Testing

Use ngrok for local webhook testing:

```bash
ngrok http 5001
```

Then configure the ngrok URL in Google Play Console / App Store Connect.

## Troubleshooting

### Subscriptions not syncing
- Check `ENABLE_RECONCILIATION=true` in .env
- Verify store credentials are correct
- Check reconciliation worker logs

### Webhooks not working
- Verify webhook URLs are publicly accessible (HTTPS)
- Check signature verification
- Review webhook logs in controllers

### Payment records missing
- Check PaymentRecord creation in webhook handlers
- Verify transaction IDs are unique
- Review payment controller logs

## Support

For issues and questions:
1. Check `SUBSCRIPTION_INTEGRATION.md` for integration examples
2. Review source code comments
3. Check database indexes and models

## License

MIT License - See LICENSE file for details
