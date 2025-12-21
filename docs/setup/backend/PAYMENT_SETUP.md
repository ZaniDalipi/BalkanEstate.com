# Payment & Subscription Security Documentation

This document explains how the payment and subscription security system works to ensure data integrity and prevent unauthorized access.

## 🔐 Security Features

### 1. **Atomic Transactions**
All payment operations use MongoDB transactions to ensure atomicity:
- If payment processing fails, no records are created
- If subscription creation fails, payment is rolled back
- User updates only happen if everything succeeds

### 2. **Triple-Layer Tracking**
Every subscription is tracked in THREE places:

```
Payment → Subscription → User
   ↓          ↓          ↓
PaymentRecord → Subscription → User.activeSubscriptionId
```

#### **PaymentRecord** (`paymentrecords` collection)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,               // Link to user
  subscriptionId: ObjectId,       // Link to subscription
  storeTransactionId: String,     // Unique transaction ID
  amount: Number,                 // Payment amount
  currency: String,
  status: 'completed',            // Payment status
  transactionDate: Date,
  productId: String,
  description: String,
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

#### **Subscription** (`subscriptions` collection)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,               // Link to user
  productId: String,
  status: 'active',               // active, expired, canceled, etc.
  startDate: Date,
  expirationDate: Date,          // When subscription expires
  renewalDate: Date,
  price: Number,
  currency: String,
  autoRenewing: Boolean,
  store: String,                 // google, apple, web
  // Store-specific fields
  purchaseToken: String,         // Google Play
  transactionId: String,         // Apple
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

#### **User** (`users` collection)
```javascript
{
  _id: ObjectId,
  email: String,
  // ... other user fields ...

  // SUBSCRIPTION SECURITY FIELDS
  isSubscribed: Boolean,                    // Quick check flag
  subscriptionPlan: String,                 // Plan name
  subscriptionExpiresAt: Date,              // Expiration date (INDEXED)
  subscriptionStartedAt: Date,              // When subscription started
  activeSubscriptionId: ObjectId,           // Link to Subscription doc (INDEXED)
  lastPaymentDate: Date,                    // Last payment timestamp
  lastPaymentAmount: Number,                // Last payment value
  totalPaid: Number,                        // Lifetime payment total
  subscriptionStatus: String,               // active, expired, trial, grace, canceled

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### 3. **Database Indexes**
Critical indexes for performance and security:

```javascript
// User indexes
{ isSubscribed: 1 }                        // Fast subscription checks
{ subscriptionExpiresAt: 1 }               // Expiration queries
{ activeSubscriptionId: 1 }                // Subscription lookups
{ subscriptionExpiresAt: 1, isSubscribed: 1 }  // Combined expiration check

// Subscription indexes
{ userId: 1, status: 1 }                   // User subscription queries
{ expirationDate: 1, status: 1 }           // Expiration checks
{ store: 1, purchaseToken: 1 }             // Unique constraint
{ store: 1, transactionId: 1 }             // Unique constraint

// PaymentRecord indexes
{ userId: 1, transactionDate: -1 }         // User payment history
{ subscriptionId: 1 }                      // Subscription payments
{ status: 1, exported: 1 }                 // Export queries
```

### 4. **User Methods for Security**

```typescript
// Check if subscription is currently active
user.hasActiveSubscription()
// Returns: boolean (true if expiresAt > now)

// Check if user can access premium features (includes grace period)
user.canAccessPremiumFeatures()
// Returns: boolean (true if active OR in grace period)
```

### 5. **Middleware Protection**

```typescript
// Require active subscription (strict)
app.get('/api/premium-feature',
  protect,                          // Authentication required
  requireActiveSubscription,        // Active subscription required
  handler
);

// Require premium access (includes grace period)
app.get('/api/premium-feature',
  protect,
  requirePremiumAccess,            // Premium or grace period
  handler
);

// Add subscription info without enforcing
app.get('/api/some-feature',
  protect,
  addSubscriptionInfo,             // Adds req.subscription
  handler
);
```

## 💳 Payment Processing Flow

### When a user pays:

```typescript
import { processSubscriptionPayment } from './services/subscriptionPaymentService';

const result = await processSubscriptionPayment({
  userId: user._id,
  productId: 'buyer_pro_monthly',
  store: 'web',
  amount: 1.50,
  currency: 'EUR',
});

// Automatically creates/updates:
// 1. PaymentRecord (with transaction ID)
// 2. Subscription (with expiration date)
// 3. User (with subscription fields)
// 4. SubscriptionEvent (for audit trail)
// ALL IN ONE ATOMIC TRANSACTION
```

## ⏰ Expiration System

### Automatic Expiration Checking

The system runs **every 6 hours** to check for expired subscriptions:

```javascript
// Worker runs automatically
scheduleExpirationWorker();

// Checks:
1. Find subscriptions where expirationDate < now
2. Update subscription.status = 'expired'
3. Update user.isSubscribed = false
4. Update user.subscriptionStatus = 'expired'
5. Create expiration event
```

### Grace Period

Users get **7 days** grace period after expiration:
- Can still access premium features
- User.subscriptionStatus = 'grace'
- After 7 days, access is completely blocked

## 🛡️ Security Validations

### Payment Integrity Check

```typescript
import { verifyPaymentIntegrity } from './services/subscriptionPaymentService';

const { valid, issues } = await verifyPaymentIntegrity(userId);

// Checks:
// - User.isSubscribed matches active subscription
// - Subscription expiration date matches user record
// - At least one payment exists for the subscription
// - Subscription status is actually 'active'

if (!valid) {
  console.log('Issues found:', issues);
}
```

### Cancellation Security

```typescript
import { cancelSubscriptionSecurely } from './services/subscriptionPaymentService';

await cancelSubscriptionSecurely(
  subscriptionId,
  userId,
  'User requested cancellation'
);

// Atomically updates:
// 1. Subscription.status = 'pending_cancellation'
// 2. Subscription.willCancelAt = expirationDate
// 3. User.subscriptionStatus = 'canceled'
// 4. Creates cancellation event
```

## 📊 Data Consistency Guarantees

### Transaction Rollback
If ANY step fails during payment processing:
```
✅ Payment created
✅ Subscription created
❌ User update failed
→ ALL CHANGES ROLLED BACK
```

### Referential Integrity
```javascript
// User always links to valid subscription
User.activeSubscriptionId → Subscription._id

// Subscription always links to valid user
Subscription.userId → User._id

// Payment always links to both
PaymentRecord.userId → User._id
PaymentRecord.subscriptionId → Subscription._id
```

## 🔍 Monitoring & Auditing

### SubscriptionEvent Tracking
Every action creates an audit log:

```javascript
{
  subscriptionId: ObjectId,
  userId: ObjectId,
  eventType: 'subscription_purchased',  // or renewed, canceled, expired, etc.
  store: 'web',
  hasFinancialImpact: true,
  amount: 1.50,
  currency: 'EUR',
  metadata: {
    paymentRecordId: ObjectId,
    expirationDate: Date,
    // ... additional context
  },
  createdAt: Date
}
```

### Available Event Types:
- `subscription_purchased` - New subscription
- `subscription_renewed` - Auto-renewal
- `subscription_canceled` - User canceled
- `subscription_expired` - Subscription ended
- `subscription_refunded` - Payment refunded
- `subscription_reactivated` - Restored after cancellation
- 20+ more event types

## 🚨 Common Security Scenarios

### Scenario 1: User tries to access premium feature
```typescript
// In your route handler
if (!req.user.hasActiveSubscription()) {
  return res.status(403).json({
    message: 'Premium subscription required',
    subscriptionRequired: true,
    expiresAt: req.user.subscriptionExpiresAt
  });
}
```

### Scenario 2: Payment succeeds but user update fails
```typescript
// Automatic rollback - no partial data
// User won't be charged without getting subscription
```

### Scenario 3: Subscription expires while user is active
```typescript
// Expiration worker runs every 6 hours
// Updates all expired subscriptions
// Next API call will deny access
```

### Scenario 4: User pays twice for same subscription
```typescript
// processSubscriptionPayment checks for existing active subscription
// Extends expiration date instead of creating duplicate
```

## 📈 Best Practices

### 1. **Always Use the Service**
```typescript
// ✅ CORRECT
import { processSubscriptionPayment } from './services/subscriptionPaymentService';
await processSubscriptionPayment(params);

// ❌ WRONG - Don't manually create records
await Subscription.create({ ... });  // No atomicity!
await User.update({ ... });           // Can fail independently!
```

### 2. **Use Middleware for Protection**
```typescript
// ✅ CORRECT
router.get('/premium', protect, requireActiveSubscription, handler);

// ❌ WRONG - Manual checks are error-prone
router.get('/premium', protect, async (req, res) => {
  if (req.user.isSubscribed) { ... }  // Doesn't check expiration!
});
```

### 3. **Check Integrity Regularly**
```typescript
// Run integrity check on suspicious activity
const { valid, issues } = await verifyPaymentIntegrity(userId);
if (!valid) {
  // Alert admin, log issues, etc.
}
```

## 🔧 Configuration

### Enable Workers
```bash
# .env
ENABLE_RECONCILIATION=true  # Enable store reconciliation (optional)
# Expiration worker is ALWAYS enabled for security
```

### MongoDB Transactions
Requires MongoDB replica set:
```bash
# For development (local single instance)
mongod --replSet rs0

# Initialize replica set (first time only)
mongosh
rs.initiate()
```

## ✅ Security Checklist

- [x] Atomic transactions for all payment operations
- [x] Triple-layer tracking (Payment, Subscription, User)
- [x] Database indexes for performance
- [x] Automatic expiration checking (every 6 hours)
- [x] Grace period support (7 days)
- [x] Payment integrity verification
- [x] Middleware for access control
- [x] Complete audit trail (SubscriptionEvent)
- [x] Referential integrity between collections
- [x] Transaction rollback on failures
- [x] Secure cancellation process
- [x] Duplicate payment prevention

## 📞 Support

For issues or questions:
1. Check MongoDB transaction support (requires replica set)
2. Verify all indexes are created (`db.collection.getIndexes()`)
3. Monitor SubscriptionEvent for audit trail
4. Run integrity checks if data seems inconsistent
