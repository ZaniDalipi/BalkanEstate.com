# Subscription System Integration Guide

This guide explains how to integrate the subscription management system into your React frontend and mobile apps.

## Table of Contents

1. [Overview](#overview)
2. [Backend Setup](#backend-setup)
3. [React Integration Examples](#react-integration-examples)
4. [Mobile Integration](#mobile-integration)
5. [API Reference](#api-reference)
6. [Webhooks Setup](#webhooks-setup)

---

## Overview

The subscription system supports:
- **Google Play** subscriptions (Android)
- **App Store** subscriptions (iOS)
- **Web/Stripe** subscriptions (Web)
- Automatic renewal tracking
- Grace period handling
- Payment reconciliation
- Bank export for accounting

---

## Backend Setup

### 1. Environment Variables

Create a `.env` file in the backend directory:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/balkan-estate

# JWT
JWT_SECRET=your-jwt-secret-here

# Google Play (Optional)
GOOGLE_PLAY_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PLAY_PACKAGE_NAME=com.balkanestate.app

# App Store (Optional)
APP_STORE_ISSUER_ID=your-issuer-id
APP_STORE_KEY_ID=your-key-id
APP_STORE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APP_STORE_BUNDLE_ID=com.balkanestate.app
APP_STORE_ENVIRONMENT=sandbox  # or 'production'

# Reconciliation Worker
ENABLE_RECONCILIATION=true

# Server
PORT=5001
NODE_ENV=development
```

### 2. Initialize Products

Create products in your database:

```javascript
// Example: Initialize products
const products = [
  {
    productId: 'buyer_pro_monthly',
    name: 'Buyer Pro Monthly',
    description: 'Monthly subscription for buyers',
    price: 1.50,
    currency: 'EUR',
    billingPeriod: 'monthly',
    trialPeriodDays: 7,
    gracePeriodDays: 16,
    googlePlayProductId: 'buyer_pro_monthly',
    appStoreProductId: 'buyer_pro_monthly',
    stripeProductId: 'prod_buyer_pro_monthly',
    features: [
      'Instant notifications',
      'Save unlimited searches',
      'Early access to listings',
      'Advanced insights'
    ],
    isActive: true,
  },
  // Add more products...
];
```

---

## React Integration Examples

### 1. Product Catalog Component

```typescript
// components/SubscriptionPlans.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Product {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
}

const SubscriptionPlans: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/products?active=true');
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (productId: string) => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await axios.post(
        'http://localhost:5001/api/subscriptions',
        {
          productId,
          store: 'web',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('Subscription activated successfully!');
      console.log('Subscription:', response.data.subscription);
    } catch (error: any) {
      alert('Error creating subscription: ' + error.response?.data?.message);
    }
  };

  if (loading) return <div>Loading plans...</div>;

  return (
    <div className="subscription-plans">
      <h2>Choose Your Plan</h2>
      <div className="plans-grid">
        {products.map((product) => (
          <div key={product.id} className="plan-card">
            <h3>{product.name}</h3>
            <p className="description">{product.description}</p>
            <div className="price">
              {product.currency} {product.price.toFixed(2)}
              <span className="period">/{product.billingPeriod}</span>
            </div>
            <ul className="features">
              {product.features.map((feature, idx) => (
                <li key={idx}>{feature}</li>
              ))}
            </ul>
            <button onClick={() => handleSubscribe(product.productId)}>
              Subscribe Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
```

### 2. Subscription Status Component

```typescript
// components/SubscriptionStatus.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Subscription {
  id: string;
  productId: string;
  status: string;
  startDate: string;
  expirationDate: string;
  autoRenewing: boolean;
  isActive: boolean;
  isPremium: boolean;
}

const SubscriptionStatus: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:5001/api/subscriptions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSubscriptions(response.data.subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:5001/api/subscriptions/${subscriptionId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message);
      fetchSubscriptions(); // Refresh list
    } catch (error: any) {
      alert('Error canceling subscription: ' + error.response?.data?.message);
    }
  };

  const handleRestoreSubscription = async (subscriptionId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:5001/api/subscriptions/${subscriptionId}/restore`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message);
      fetchSubscriptions(); // Refresh list
    } catch (error: any) {
      alert('Error restoring subscription: ' + error.response?.data?.message);
    }
  };

  if (loading) return <div>Loading subscriptions...</div>;

  return (
    <div className="subscription-status">
      <h2>Your Subscriptions</h2>
      {subscriptions.length === 0 ? (
        <p>You don't have any active subscriptions.</p>
      ) : (
        <div className="subscriptions-list">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="subscription-card">
              <h3>{sub.productId}</h3>
              <div className="status">
                Status: <span className={`badge ${sub.status}`}>{sub.status}</span>
              </div>
              <div className="details">
                <p>Started: {new Date(sub.startDate).toLocaleDateString()}</p>
                <p>Expires: {new Date(sub.expirationDate).toLocaleDateString()}</p>
                <p>Auto-renewing: {sub.autoRenewing ? 'Yes' : 'No'}</p>
                <p>Active: {sub.isActive ? 'Yes' : 'No'}</p>
              </div>
              <div className="actions">
                {sub.status === 'active' && (
                  <button onClick={() => handleCancelSubscription(sub.id)}>
                    Cancel Subscription
                  </button>
                )}
                {sub.status === 'pending_cancellation' && (
                  <button onClick={() => handleRestoreSubscription(sub.id)}>
                    Restore Subscription
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus;
```

### 3. Subscription Verification Hook

```typescript
// hooks/useSubscription.ts
import { useEffect, useState } from 'react';
import axios from 'axios';

interface SubscriptionInfo {
  isSubscribed: boolean;
  isPremium: boolean;
  expiresAt: Date | null;
  loading: boolean;
}

export const useSubscription = () => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    isSubscribed: false,
    isPremium: false,
    expiresAt: null,
    loading: true,
  });

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setSubscriptionInfo({
          isSubscribed: false,
          isPremium: false,
          expiresAt: null,
          loading: false,
        });
        return;
      }

      const response = await axios.get('http://localhost:5001/api/subscriptions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const activeSub = response.data.subscriptions.find(
        (sub: any) => sub.isActive && sub.isPremium
      );

      setSubscriptionInfo({
        isSubscribed: !!activeSub,
        isPremium: activeSub?.isPremium || false,
        expiresAt: activeSub?.expirationDate ? new Date(activeSub.expirationDate) : null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setSubscriptionInfo({
        isSubscribed: false,
        isPremium: false,
        expiresAt: null,
        loading: false,
      });
    }
  };

  return {
    ...subscriptionInfo,
    refresh: checkSubscriptionStatus,
  };
};
```

---

## Mobile Integration

### Android (Google Play)

```kotlin
// Example: Validate purchase with backend
fun validatePurchase(purchase: Purchase) {
    val token = purchase.purchaseToken
    val productId = purchase.products[0]

    // Send to backend
    api.createSubscription(
        productId = productId,
        store = "google",
        purchaseToken = token
    ).enqueue(object : Callback<SubscriptionResponse> {
        override fun onResponse(call: Call<SubscriptionResponse>, response: Response<SubscriptionResponse>) {
            if (response.isSuccessful) {
                // Subscription validated and created
                val subscription = response.body()?.subscription
                // Update UI
            }
        }

        override fun onFailure(call: Call<SubscriptionResponse>, t: Throwable) {
            // Handle error
        }
    })
}
```

### iOS (App Store)

```swift
// Example: Validate purchase with backend
func validatePurchase(transaction: Transaction) async {
    let transactionId = String(transaction.id)

    do {
        let response = try await api.createSubscription(
            productId: transaction.productID,
            store: "apple",
            transactionId: transactionId
        )

        // Subscription validated and created
        // Update UI
    } catch {
        // Handle error
        print("Error validating purchase: \(error)")
    }
}
```

---

## API Reference

### Products

#### GET /api/products
Get all available products
- **Query params**: `store` (google/apple/web), `active` (true/false)
- **Response**: Array of products

#### GET /api/products/:id
Get a specific product
- **Response**: Product details

### Subscriptions

#### POST /api/subscriptions
Create a new subscription
- **Body**: `{ productId, store, purchaseToken?, transactionId? }`
- **Auth**: Required
- **Response**: Created subscription

#### GET /api/subscriptions
Get user's subscriptions
- **Auth**: Required
- **Response**: Array of subscriptions

#### GET /api/subscriptions/:id
Get specific subscription
- **Auth**: Required
- **Response**: Subscription details

#### POST /api/subscriptions/:id/cancel
Cancel a subscription
- **Auth**: Required
- **Response**: Updated subscription

#### POST /api/subscriptions/:id/restore
Restore a canceled subscription
- **Auth**: Required
- **Response**: Updated subscription

#### POST /api/subscriptions/:id/verify
Verify subscription with store
- **Auth**: Required
- **Response**: Updated subscription status

#### GET /api/subscriptions/:id/events
Get subscription event history
- **Auth**: Required
- **Response**: Array of events

#### GET /api/subscriptions/:id/payments
Get payment records for subscription
- **Auth**: Required
- **Response**: Array of payments

---

## Webhooks Setup

### Google Play Real-Time Developer Notifications

1. Set up Cloud Pub/Sub topic
2. Configure webhook endpoint: `https://yourdomain.com/api/webhooks/google-play`
3. Verify webhook in Google Play Console

### App Store Server Notifications v2

1. Configure webhook endpoint: `https://yourdomain.com/api/webhooks/app-store`
2. Set up in App Store Connect

---

## Testing

### Test Web Subscription

```bash
# Get products
curl http://localhost:5001/api/products?active=true

# Create subscription (with auth token)
curl -X POST http://localhost:5001/api/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "buyer_pro_monthly",
    "store": "web"
  }'

# Get subscriptions
curl http://localhost:5001/api/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Reconciliation

```bash
# Trigger manual reconciliation
node -e "require('./dist/workers/reconciliationWorker').runReconciliation()"
```

---

## Bank Export (Admin Only)

```typescript
// Example: Create bank export
const createExport = async () => {
  const token = localStorage.getItem('adminToken');

  const response = await axios.post(
    'http://localhost:5001/api/bank-exports',
    {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      format: 'csv',
      stores: ['google', 'apple', 'web']
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Download the file
  const fileContent = response.data.fileContent;
  const fileName = response.data.export.fileName;

  // Create download link
  const blob = new Blob([fileContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
};
```

---

## Notes

- All subscription dates are in UTC
- Subscriptions are automatically reconciled every 24 hours
- Payment records are created for all transactions
- Grace periods are handled automatically (16 days for App Store)
- Refunds create negative payment records
- Export only includes unexported payment records

---

For more information, see the source code in:
- `/backend/src/models/` - Database schemas
- `/backend/src/services/` - Store integrations
- `/backend/src/controllers/` - API endpoints
- `/backend/src/workers/` - Background jobs
