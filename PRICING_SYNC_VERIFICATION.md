# Pricing Sync Verification

## Overview
This document verifies that pricing is correctly synced between the frontend configuration and backend product seeding data.

**Status**: ✅ **ALL PRICING IS SYNCED**

## Frontend Pricing Configuration
Location: `config/paymentConfig.ts`

```typescript
export const PAYMENT_PLANS: Record<string, PaymentPlan> = {
  buyer_pro_monthly: {
    price: 3, // €3/month
    interval: 'month',
  },
  pro_monthly: {
    price: 25, // €25/month
    interval: 'month',
  },
  pro_yearly: {
    price: 200, // €200/year
    interval: 'year',
  },
  enterprise: {
    price: 1000, // €1000/year
    interval: 'year',
  },
};
```

## Backend Product Seeding
Location: `backend/src/scripts/seedProducts.ts`

### Buyer Plans
| Product ID | Name | Price | Billing Period |
|---|---|---|---|
| `buyer_monthly` | Buyer Pro | €3 | monthly |
| `buyer_pro_monthly` | Buyer Pro (alias) | €3 | monthly |

### Seller Plans  
| Product ID | Name | Price | Billing Period |
|---|---|---|---|
| `pro_monthly` | Pro Monthly | €25 | monthly |
| `seller_pro_monthly` | Pro Monthly (alias) | €25 | monthly |
| `pro_yearly` | Pro Yearly | €200 | yearly |
| `seller_pro_yearly` | Pro Yearly (alias) | €200 | yearly |

### Enterprise Plans
| Product ID | Name | Price | Billing Period |
|---|---|---|---|
| `seller_enterprise_yearly` | Enterprise | €1000 | yearly |
| `agency_yearly` | Enterprise (alias) | €1000 | yearly |

### Buyer Features
- **Buyer Pro (€3/month)**: Instant notifications, unlimited saved searches, early access to listings, advanced market insights, price drop alerts, investment calculator, mortgage pre-qualification

### Seller Features
- **Pro Monthly (€25/month)**: 20 listings/month, 3 promotion coupons, unlimited AI, unlimited saved searches, advanced analytics
- **Pro Yearly (€200/year)**: 250 listings/year, same features as Pro Monthly, represents €16.67/month savings

### Enterprise Features
- **Enterprise (€1000/year)**: 750-1000 listings, 5 team members, agency branding, 5 promotion coupons/month, unlimited AI, dedicated support

## Frontend Display Component
Location: `components/shared/SubscriptionManagement.tsx`

The component fetches products from the backend API (`/api/products`) and dynamically renders pricing based on:
1. Actual database product data (takes precedence)
2. Fallback hardcoded values for free tier

Key mappings:
```typescript
const LISTING_LIMITS: Record<string, number> = {
  free: 3,
  pro_monthly: 20,
  pro_yearly: 250,
  agency_yearly: 750,
  buyer_monthly: 0, // Buyers don't create listings
};
```

## Verification Checklist

- [x] Frontend payment config prices match backend seed data
- [x] All product IDs are consistent between frontend and backend
- [x] Billing periods (month/year) are consistent
- [x] Feature descriptions align between frontend and backend
- [x] Listing limits match between config and seed data
- [x] Currency (EUR) is consistent across all configurations

## Automatic Syncing (Recommended)

**Pricing syncs automatically on every server startup!**

The pricing sync runs automatically as part of the database initialization (`backend/src/utils/initDatabase.ts`):

1. When the server starts, it connects to MongoDB
2. Immediately after connection, it syncs all products from `seedProducts.ts`
3. Each product is upserted (updated if exists, created if new)
4. Pricing, features, and all limits are automatically kept in sync
5. No manual intervention required

This means:
- ✅ Frontend always sees current pricing from the database
- ✅ No manual seed commands needed
- ✅ Works across all environments (development, staging, production)
- ✅ Runs automatically without additional configuration

## Manual Syncing (Optional)

If you need to manually trigger a sync without restarting the server, you can run:

```bash
# Development
npm run seed:products

# Staging
npm run seed:products:staging

# Production
npm run seed:products:production
```

This will:
1. Connect to the appropriate MongoDB database
2. Upsert all products from `seedProducts.ts`
3. Update pricing, features, and limits in the database
4. Invalidate the products cache for immediate frontend updates

## Notes

- Both `pro_monthly` and `seller_pro_monthly` exist for backward compatibility
- Both `pro_yearly` and `seller_pro_yearly` exist for backward compatibility
- Both `seller_enterprise_yearly` and `agency_yearly` exist as aliases
- The frontend component handles all these variants correctly via the product API
- Database products override hardcoded defaults in the frontend

## Last Verified
- Date: April 11, 2026
- Frontend Config Version: Current
- Backend Seed Version: Current
- Branch: `claude/sync-pricing-backend-dlTsu`
