# Subscription Counter Tests

This document describes the test suite for the subscription counter functionality.

## Overview

The test suite covers:
1. **Backend Logic** - Subscription initialization, counter increments/decrements
2. **Frontend Components** - RoleSelector display logic
3. **Integration Tests** - End-to-end property creation/deletion flows

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run subscription counter tests
npm run test:counters

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode (auto-rerun on changes)
npm run test:watch
```

### Frontend Tests

```bash
# From project root
npm test

# Run specific test file
npm test RoleSelector.test

# With coverage
npm test -- --coverage
```

## Test Structure

### 1. Backend Unit Tests (`subscriptionCounters.test.ts`)

Tests core subscription logic:

- **Subscription Initialization**
  - Initialize from proSubscription (Pro users)
  - Initialize as free tier (new users)
  - Count existing properties on initialization

- **Counter Updates**
  - Increment activeListingsCount on property creation
  - Increment role-specific counters (privateSellerCount/agentCount)
  - Prevent creation when limit reached
  - Decrement counters on property deletion
  - Prevent counters from going below zero

- **Subscription Sync**
  - Recount all properties accurately
  - Exclude sold properties from active count
  - Update all role-specific counters

**Key Test Cases:**
```typescript
// Test: Pro user subscription initialization
it('should initialize subscription from proSubscription for Pro users')

// Test: Counter increments
it('should increment activeListingsCount when creating property')

// Test: Limit enforcement
it('should prevent creating property when limit reached')

// Test: Sync accuracy
it('should correctly recount all properties during sync')
```

### 2. Frontend Component Tests (`RoleSelector.test.tsx`)

Tests UI display logic:

- **New Subscription System**
  - Display Pro tier with 20 listings
  - Display Free tier with 3 listings
  - Show correct role-specific counts

- **Legacy Fallback**
  - Fall back to proSubscription when new subscription missing
  - Fall back to freeSubscription when no data

- **Limit Warnings**
  - Show warning when limit reached
  - Display available listings count

- **Agency Tiers**
  - Display Agency Owner badge
  - Display Agency Agent badge

**Key Test Cases:**
```typescript
// Test: Pro subscription display
it('should display Pro subscription with correct limits from new subscription object')

// Test: Role-specific counts
it('should show correct role-specific counts')

// Test: Limit warning
it('should show warning when limit reached')
```

### 3. Integration Tests (`propertyCounterIntegration.test.ts`)

Tests end-to-end API flows:

- **Property Creation API**
  - Returns updatedSubscription in response
  - Increments counters correctly
  - Rejects when limit reached
  - Handles multiple properties

- **Property Deletion API**
  - Decrements counters correctly
  - Never goes below zero

- **Sync Stats API**
  - Recounts all properties
  - Updates subscription in database

- **Auto Migration**
  - Initializes subscription on first getMe call
  - Counts existing properties

**Key Test Cases:**
```typescript
// Test: Create property flow
it('should increment counters when creating property as private_seller')

// Test: Delete property flow
it('should decrement counters when deleting property')

// Test: Sync flow
it('should correctly recount all properties')

// Test: Auto migration
it('should initialize subscription from proSubscription on first getMe call')
```

## Test Coverage Goals

- **Backend Logic**: >90% coverage
- **Frontend Components**: >80% coverage
- **Integration Tests**: All critical flows covered

## Running Tests in CI/CD

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm install
      - run: cd backend && npm test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
```

## Manual Testing Checklist

After running automated tests, verify manually:

1. **Subscription Management Page**
   - [ ] Shows correct "X of 20 listings used" for Pro users
   - [ ] Shows correct "X of 3 listings used" for Free users
   - [ ] Refresh button updates counters accurately

2. **Create Listing Page**
   - [ ] RoleSelector shows correct tier badge (Pro/Free)
   - [ ] RoleSelector shows correct limits (20 for Pro, 3 for Free)
   - [ ] RoleSelector shows correct usage counts
   - [ ] Creating listing increments counter immediately
   - [ ] Shows warning when limit reached

3. **My Listings Page**
   - [ ] Statistics show correct active listings count
   - [ ] Deleting listing decrements counter immediately

4. **Migration**
   - [ ] Refresh page → subscription initializes correctly
   - [ ] Click Refresh button → counters sync correctly
   - [ ] Run migration script → all counters accurate

## Debugging Failed Tests

If tests fail:

1. **Check MongoDB Connection**
   ```bash
   # Tests use in-memory MongoDB
   npm install --save-dev mongodb-memory-server
   ```

2. **Check Environment Variables**
   ```bash
   # Ensure .env.test exists with test config
   MONGO_URI=mongodb://localhost:27017/test
   JWT_SECRET=test_secret
   ```

3. **Run Single Test with Debug**
   ```bash
   npm test -- --testNamePattern="should increment activeListingsCount"
   ```

4. **Check Console Logs**
   Tests include debug logging - check test output for:
   ```
   🔍 RoleSelector Debug: { ... }
   📊 Found X existing properties
   ✅ Subscription initialized
   ```

## Adding New Tests

When adding features:

1. **Add unit test** in appropriate test file
2. **Add integration test** for API changes
3. **Update this document** with new test cases
4. **Run full test suite** before committing

Example:
```typescript
// New feature: Promotion coupon usage
it('should decrement promotion coupons when used', async () => {
  const user = await User.create({ /* ... */ });

  user.subscription.promotionCoupons.available -= 1;
  user.subscription.promotionCoupons.used += 1;
  await user.save();

  expect(user.subscription.promotionCoupons.available).toBe(2);
  expect(user.subscription.promotionCoupons.used).toBe(1);
});
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Vitest](https://vitest.dev/)
- [Supertest](https://github.com/visionmedia/supertest)
