# Featured Agency Subscription System

## Overview

This system allows agencies to subscribe to a weekly featured listing service for €10/week. Featured agencies get:
- Top placement in search results
- Featured in the agency carousel on the homepage
- Premium badge on their profile
- Monthly rotation to maintain freshness

## Features

### 1. **7-Day Free Trial for New Agencies**
- When a new agency is created, they automatically get a 7-day free featured trial
- Trial is applied automatically in the background
- After 7 days, the agency needs to subscribe to continue being featured

### 2. **Flexible Pricing**
- **Weekly**: €10/week
- **Monthly**: €35/month (30% discount)
- **Yearly**: €400/year (~23% discount)

### 3. **Coupon System**
- Agencies can apply coupon codes for discounts
- Admins can create custom coupons in the admin panel
- Trial coupon is auto-generated with format `TRIAL7-{AGENCY_ID}`

## Backend Implementation

### Models

#### AgencyFeaturedSubscription
Located: `/backend/src/models/AgencyFeaturedSubscription.ts`

Fields:
- `agencyId`: Reference to Agency
- `userId`: Reference to User (agency owner)
- `status`: 'active' | 'trial' | 'expired' | 'canceled' | 'pending_payment'
- `interval`: 'weekly' | 'monthly' | 'yearly'
- `price`: Subscription price
- `currentPeriodStart` & `currentPeriodEnd`: Billing period
- `isTrial`: Boolean flag for trial status
- `autoRenewing`: Auto-renewal setting
- `appliedCouponCode` & `discountApplied`: Coupon tracking

### API Endpoints

#### Agency Owner Endpoints
- `POST /api/agencies/:agencyId/featured-subscription` - Create subscription
- `GET /api/agencies/:agencyId/featured-subscription` - Get subscription details
- `DELETE /api/agencies/:agencyId/featured-subscription` - Cancel subscription
- `POST /api/agencies/:agencyId/featured-subscription/apply-coupon` - Apply coupon
- `POST /api/agencies/:agencyId/featured-subscription/confirm-payment` - Confirm payment

#### Admin Endpoints
- `GET /api/admin/featured-subscriptions` - List all subscriptions
- `POST /api/admin/featured-subscriptions/check-expired` - Check and update expired subscriptions

### Automatic Features

#### 1. Auto Free Trial on Agency Creation
When an agency is created in `agencyController.ts`:
```typescript
const trialResult = await startAutoFreeTrial(agency._id.toString(), user._id.toString());
```

This automatically:
- Creates a 7-day trial subscription
- Sets agency as featured
- Sets `featuredStartDate` and `featuredEndDate`

#### 2. Subscription Expiration Check
Run via cron job or admin panel:
```typescript
POST /api/admin/featured-subscriptions/check-expired
```

This checks all active subscriptions and:
- Auto-renews if `autoRenewing` is true
- Expires subscription if not set to renew
- Updates agency `isFeatured` status

## Frontend Implementation

### Components

#### 1. FeaturedSubscriptionCard
Located: `/components/shared/FeaturedSubscriptionCard.tsx`

Displays:
- Current subscription status
- Days remaining (for trials)
- Renewal date
- Applied coupons
- Upgrade button if no subscription

Usage:
```tsx
<FeaturedSubscriptionCard
  agencyId={agency._id}
  onUpgrade={() => setShowDialog(true)}
/>
```

#### 2. FeaturedSubscriptionDialog
Located: `/components/shared/FeaturedSubscriptionDialog.tsx`

Features:
- Plan selection (weekly/monthly/yearly)
- Coupon code input
- Feature list
- Payment integration placeholder

Usage:
```tsx
<FeaturedSubscriptionDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  agencyId={agency._id}
  onSuccess={() => window.location.reload()}
/>
```

### API Service Methods

Located: `/services/apiService.ts`

```typescript
// Create subscription
await createFeaturedSubscription(agencyId, {
  interval: 'weekly',
  couponCode: 'SUMMER2024',
  startTrial: false
});

// Get subscription
const subscription = await getFeaturedSubscription(agencyId);

// Cancel subscription
await cancelFeaturedSubscription(agencyId, immediately: false);

// Apply coupon
await applyFeaturedCoupon(agencyId, 'DISCOUNT20');
```

## Integration Guide

### For Agency Management Page

```tsx
import FeaturedSubscriptionCard from '../shared/FeaturedSubscriptionCard';
import FeaturedSubscriptionDialog from '../shared/FeaturedSubscriptionDialog';

const AgencyManagement = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { agencyId } = useAppContext();

  return (
    <div>
      <FeaturedSubscriptionCard
        agencyId={agencyId}
        onUpgrade={() => setShowDialog(true)}
      />

      <FeaturedSubscriptionDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        agencyId={agencyId}
        onSuccess={() => {
          // Reload data
        }}
      />
    </div>
  );
};
```

### For Admin Panel

```tsx
import { getAllFeaturedSubscriptions, checkExpiredSubscriptions } from '../services/apiService';

const AdminFeaturedSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    const data = await getAllFeaturedSubscriptions({
      status: 'active',
      page: 1,
      limit: 20
    });
    setSubscriptions(data.subscriptions);
  };

  const handleCheckExpired = async () => {
    await checkExpiredSubscriptions();
    await loadSubscriptions();
  };

  return (
    <div>
      <button onClick={handleCheckExpired}>Check Expired</button>
      {/* Display subscriptions */}
    </div>
  );
};
```

## Testing

### 1. Test Free Trial on Agency Creation
1. Create a new agency
2. Check that `agency.isFeatured` is true
3. Verify 7-day trial subscription exists
4. Confirm agency appears in featured carousel

### 2. Test Subscription Creation
1. Click "Start Featured Plan" button
2. Select plan (weekly/monthly/yearly)
3. Optional: Enter coupon code
4. Click Subscribe
5. Verify subscription is created
6. Check agency is featured

### 3. Test Expiration
1. Create subscription with short period (or modify in DB)
2. Run `POST /api/admin/featured-subscriptions/check-expired`
3. Verify expired subscriptions are handled
4. Check agency `isFeatured` is set to false

## TODO: Payment Integration

Currently, payment is simulated. To integrate real payments:

1. Add Stripe SDK
2. Create payment intent in `confirmPayment` controller
3. Handle webhook events
4. Update subscription with payment details

Example:
```typescript
// In confirmPayment controller
const paymentIntent = await stripe.paymentIntents.create({
  amount: subscription.price * 100, // cents
  currency: 'eur',
  customer: stripeCustomerId,
});
```

## Cron Job Setup

Add to your cron scheduler:
```bash
# Check expired subscriptions daily at midnight
0 0 * * * curl -X POST http://localhost:5001/api/admin/featured-subscriptions/check-expired
```

## Notes

- All prices are in EUR (€)
- Subscriptions auto-renew unless `cancelAtPeriodEnd` is true
- Trial subscriptions don't auto-renew by default
- Agency `isFeatured` status is automatically managed by the subscription system
- Featured agencies rotate monthly via `adRotationOrder` field

## Support

For issues or questions, contact the development team.
