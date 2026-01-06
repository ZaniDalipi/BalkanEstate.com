# BalkanEstate Subscription Logic - Single Source of Truth

This document defines the official subscription rules and business logic for all user types in the BalkanEstate platform.

---

## Table of Contents

1. [User Types Overview](#user-types-overview)
2. [Subscription Tiers](#subscription-tiers)
3. [Private Seller Rules](#1-private-seller)
4. [Agent Rules](#2-agent)
5. [Independent Agent Rules](#3-independent-agent)
6. [Agency Agent Rules](#4-agency-agent)
7. [Agency Owner Rules](#5-agency-owner)
8. [Promotion System](#promotion-system)
9. [Registration Flows](#registration-flows)
10. [Data Sources](#data-sources)

---

## User Types Overview

| User Type | Subscription Required | Can Post As | Listing Source |
|-----------|----------------------|-------------|----------------|
| Private Seller (Free) | None | Private Seller | Personal (3 max) |
| Private Seller (Pro) | Pro Monthly/Yearly | Private Seller | Personal (25 max) |
| Independent Agent | Pro Monthly/Yearly | Private Seller + Agent | Personal (25 shared) |
| Agency Agent | Agency Coupon | Agent only | Agency Pool |
| Agency Owner | Enterprise | Private Seller + Agent | Personal + Agency Pool |

---

## Subscription Tiers

### Free Tier
- **Price**: Free
- **Listings**: 3 active listings
- **Promotion Coupons**: 0
- **Available to**: Private Sellers only

### Pro Monthly
- **Price**: €9.99/month
- **Listings**: 25 active listings
- **Promotion Coupons**: 2 monthly (1 Highlighted + 1 Featured, each 7 days)
- **Available to**: Private Sellers, Independent Agents

### Pro Yearly
- **Price**: €99.99/year (€8.33/month)
- **Listings**: 25 active listings
- **Promotion Coupons**: 2 monthly (1 Highlighted + 1 Featured, each 14 days)
- **Available to**: Private Sellers, Independent Agents

### Enterprise (Agency)
- **Price**: €999/year
- **Listings**: 100 total (distributed among agents)
- **Promotion Coupons**: 15 monthly (shared pool for all agency agents)
- **Agent Recruitment Coupons**: 5 (one-time, gives agent 1-year Pro access)
- **Agency Page Promotions**: 5 monthly (for agency visibility)
- **Available to**: Agency Owners only

---

## 1. Private Seller

### Free Private Seller
A user who sells their own property without a subscription.

**Capabilities:**
- Can post up to **3 active listings**
- Standard listing visibility only
- No promotion coupons
- Cannot act as an agent

**Restrictions:**
- Cannot post as agent
- No access to promotion features
- Limited to basic analytics

### Pro Private Seller
A private seller with Pro Monthly or Pro Yearly subscription.

**Capabilities:**
- Can post up to **25 active listings per month**
- Receives **2 promotion coupons monthly**:
  - 1x Highlighted listing (7 days for monthly, 14 days for yearly)
  - 1x Featured listing (7 days for monthly, 14 days for yearly)
- Access to enhanced analytics
- Priority placement in search results

**Restrictions:**
- Cannot post as agent (unless they upgrade to agent status)
- Promotion coupons expire monthly (no rollover)

---

## 2. Agent

### Agent Requirements
**To become an agent, a user MUST:**
1. Have an active **Pro subscription** (Monthly or Yearly)
2. Complete agent verification (if required)

### Registration Flow
When a user selects "I am an agent" during registration:
1. Show payment modal for Pro subscription
2. Only after successful payment, grant agent role
3. User receives both `private_seller` and `agent` in their `availableRoles`

### Agent Types
There are two types of agents:
- **Independent Agent**: Works independently with their own Pro subscription
- **Agency Agent**: Works under an agency using an agency coupon

---

## 3. Independent Agent

An agent who works independently with their own Pro subscription.

### Subscription: Pro Monthly/Yearly Required

**Capabilities:**
- Can post as **Private Seller OR Agent** (user chooses per listing)
- **25 shared listings** across both roles
  - Example: 11 as private seller + 14 as agent = 25 total
- Receives **2 promotion coupons monthly**:
  - 1x Highlighted listing (14 days)
  - 1x Featured listing (14 days)
- Can apply promotions to any listing (private or agent)
- Full access to agent analytics and tools

**Posting Rules:**
- When posting as Private Seller: Listing appears under personal profile
- When posting as Agent: Listing appears under agent profile
- Both count toward the **same 25 listing limit**

**Restrictions:**
- Cannot use agency promotion pool
- Must maintain active Pro subscription to keep agent status

---

## 4. Agency Agent

An agent who works under an agency using an agency-provided coupon.

### How to Become an Agency Agent
1. Receive a coupon code from an agency owner
2. Redeem the coupon during registration or in settings
3. Coupon grants 1-year Pro-equivalent access

**Capabilities:**
- Can **only post as Agent** (not as private seller)
- **25 active listings** (from personal allocation)
- Listings appear on:
  - Agent's personal profile page
  - Agency's main page (as part of agency portfolio)
- Access to agency's shared promotion coupon pool
- Agency statistics and reporting

**Restrictions:**
- **Cannot post as Private Seller** - must post as agent
- **No personal promotion coupons** - uses agency pool
- Listings contribute to agency's total portfolio
- If coupon expires and not renewed, loses agent status

### Agency Coupon Details
- Valid for **1 year** from activation
- Provides **25 listings** allocation
- Access to agency's **15 monthly promotion coupons** (shared)
- Coupon can be renewed by agency owner

---

## 5. Agency Owner

A user who owns and manages a real estate agency.

### Requirements to Create an Agency
1. **Must already be an Agent** (have active Pro subscription)
2. **Must subscribe to Enterprise plan** (€999/year)
3. Complete agency registration form with:
   - Agency name and legal information
   - Business license/registration number
   - Office address and contact details
   - Business hours
   - Supported languages

### What Agency Owner Gets

**Upon Enterprise Subscription:**
1. **100 total listings** to distribute among agents
2. **15 promotion coupons monthly** (shared pool for agency):
   - Can be: Highlighted, Featured, or Premium
   - Agency owner decides allocation
3. **5 Agent Recruitment Coupons** (one-time):
   - Each gives an agent 1-year Pro access
   - Agent joins agency automatically
4. **5 Agency Page Promotions monthly**:
   - For promoting the agency itself
   - Increases agency visibility
5. **Full Statistics Dashboard**:
   - Agency performance metrics
   - Individual agent statistics
   - Listing analytics (views, inquiries, sales)
   - Sales history and reporting
   - Lead tracking

**Personal Capabilities (as an agent):**
- Can still post as **Private Seller** or **Agent**
- Personal **25 listings** (separate from agency pool)
- Personal **2 promotion coupons** (from Pro subscription)

### Agency Management
- Generate/revoke agent coupons
- Manage agent roster (add/remove agents)
- Allocate listings to agents
- Monitor agent performance
- Access agency-wide analytics

---

## Promotion System

### Promotion Types

| Type | Duration | Effect | Price (Pay-per-use) |
|------|----------|--------|---------------------|
| **Featured** | 7-14 days | 2x display size, 3-image carousel, priority +40 | €1.99-13.99 |
| **Highlighted** | 7-14 days | 2.5x display, colored border, auto-refresh, priority +70 | €3.99-27.99 |
| **Premium** | 7-14 days | 3x display, top of search, homepage banner, social promotion | €7.99-55.99 |
| **Urgent** | Add-on | Red urgent badge, +25% views | €0.99 |

### Promotion Coupon Allocation by Tier

| Tier | Monthly Coupons | Coupon Types | Duration |
|------|-----------------|--------------|----------|
| Free | 0 | N/A | N/A |
| Pro Monthly | 2 | 1 Featured + 1 Highlighted | 7 days each |
| Pro Yearly | 2 | 1 Featured + 1 Highlighted | 14 days each |
| Enterprise | 15 (shared) | Any type | 14 days each |
| Agency Page | 5 | Agency visibility promotions | 14 days each |

### Coupon Rules
- Coupons refresh on the 1st of each month
- **No rollover** - unused coupons expire
- Agency coupons are **shared pool** - first come, first served
- One coupon = one promotion on one listing

---

## Registration Flows

### Flow 1: Standard Registration (Private Seller)
```
1. User signs up
2. Default role: private_seller (free)
3. Listing limit: 3
4. Promotion coupons: 0
```

### Flow 2: Agent Registration
```
1. User signs up and selects "I am an agent"
2. Payment modal appears → Must purchase Pro subscription
3. On successful payment:
   - Role: agent + private_seller
   - Listing limit: 25 (shared)
   - Promotion coupons: 2/month
4. On payment cancel/failure:
   - Registration continues as free private_seller
   - Can upgrade later in settings
```

### Flow 3: Agency Agent Registration (With Coupon)
```
1. User has agency coupon code
2. User signs up and enters coupon
3. Coupon validation:
   - Valid? → Continue
   - Invalid/Expired? → Error, try again or register as regular user
4. On valid coupon:
   - Role: agent (agency_agent tier)
   - Listing limit: 25
   - Agency: Automatically joined
   - Promotion coupons: 0 personal (uses agency pool)
```

### Flow 4: Agency Creation
```
1. User must already be an agent (Pro subscription active)
2. User clicks "Create Agency"
3. If not agent: Show error "You must be an agent to create an agency"
4. If agent: Show Enterprise subscription payment
5. On successful payment:
   - Create agency record
   - User becomes agency_owner
   - Agency gets:
     - 100 listing pool
     - 15 promotion coupons/month
     - 5 agent recruitment coupons
     - 5 agency page promotions/month
   - User keeps personal Pro benefits
```

---

## Data Sources

### Single Source of Truth: `user.subscription`

All subscription data should be read from and written to the `subscription` field on the User document:

```typescript
interface UserSubscription {
  // Core subscription info
  tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer';
  status: 'active' | 'canceled' | 'expired' | 'trial';

  // Listing management
  listingsLimit: number;           // 3, 25, or 100
  activeListingsCount: number;     // Current active listings
  privateSellerCount: number;      // Listings posted as private seller
  agentCount: number;              // Listings posted as agent

  // Promotion coupons
  promotionCoupons: {
    monthly: number;              // Monthly allocation (0, 2, 15)
    available: number;            // Currently available
    used: number;                 // Used this month
    featured: number;             // Featured coupons available
    highlighted: number;          // Highlighted coupons available
    lastRefresh: Date;            // Last monthly refresh date
  };

  // Dates
  startedAt: Date;
  expiresAt: Date;

  // Agency reference (for agency_agent)
  agencyId?: ObjectId;
}
```

### Derived Data (Computed from subscription)

The following should be **computed** from the subscription, not stored separately:

- `canPostAsAgent`: `tier === 'pro' || tier === 'agency_owner' || tier === 'agency_agent'`
- `canPostAsPrivateSeller`: `tier !== 'agency_agent'`
- `remainingListings`: `listingsLimit - activeListingsCount`
- `isAgencyMember`: `agencyId !== undefined`

### Legacy Field Migration

The following legacy fields should be **deprecated**:
- `isSubscribed` → Use `subscription.status === 'active'`
- `subscriptionPlan` → Use `subscription.tier`
- `proSubscription` → Migrate to `subscription`

---

## Implementation Checklist

### Immediate Changes Needed

1. [ ] Update agent registration to require Pro subscription payment
2. [ ] Update agency creation to verify user is already an agent
3. [ ] Enforce agency_agent can only post as agent (not private seller)
4. [ ] Update promotion coupons to separate Featured vs Highlighted
5. [ ] Create subscription helper functions for consistent data access
6. [ ] Update all UI components to use single `subscription` data source
7. [ ] Add monthly coupon refresh job (1st of each month)

### Validation Rules to Implement

```typescript
// Can user post a listing?
function canPostListing(user: User, asRole: 'private_seller' | 'agent'): boolean {
  const { subscription } = user;

  // Check if posting as agent is allowed
  if (asRole === 'agent' && subscription.tier === 'free') {
    return false; // Free users cannot post as agent
  }

  // Agency agents can only post as agent
  if (subscription.tier === 'agency_agent' && asRole === 'private_seller') {
    return false;
  }

  // Check listing limit
  return subscription.activeListingsCount < subscription.listingsLimit;
}

// Can user become an agent?
function canBecomeAgent(user: User): boolean {
  return user.subscription.tier === 'pro' ||
         user.subscription.tier === 'agency_owner' ||
         user.subscription.tier === 'agency_agent';
}

// Can user create an agency?
function canCreateAgency(user: User): boolean {
  // Must be an active agent first
  const isAgent = user.availableRoles?.includes('agent') &&
                  user.subscription.status === 'active' &&
                  (user.subscription.tier === 'pro' || user.subscription.tier === 'agency_owner');

  // Must not already own an agency
  const ownsAgency = user.subscription.tier === 'agency_owner';

  return isAgent && !ownsAgency;
}
```

---

## Summary Table

| User Type | Subscription | Listings | Post As | Promotions/Month |
|-----------|--------------|----------|---------|------------------|
| Free Seller | None | 3 | Private Seller | 0 |
| Pro Seller | Pro | 25 | Private Seller | 2 (1F + 1H) |
| Independent Agent | Pro | 25 shared | Private + Agent | 2 (1F + 1H) |
| Agency Agent | Coupon | 25 | Agent only | Agency pool (15) |
| Agency Owner | Enterprise | 25 + 100 pool | Private + Agent | 2 personal + 15 agency |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: BalkanEstate Development Team*
