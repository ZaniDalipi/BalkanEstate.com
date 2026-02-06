# Payment Testing Guide

Payment provider integration is currently pending. See `PAYMENT_OPTIONS_2026.md` for the evaluation of available providers.

## Quick Start

```bash
# 1. Start the server
npm run dev

# 2. Run automated tests
npm test -- --testPathPattern=payments

# 3. Run manual API tests
chmod +x test-payments.sh
./test-payments.sh
```

---

## API Test Endpoints

### 1. Get Supported Countries

```bash
curl http://localhost:5001/api/payments/supported-countries
```

### 2. Get Provider for Country

```bash
curl http://localhost:5001/api/payments/providers/RS
curl http://localhost:5001/api/payments/providers/GR
```

### 3. Check Subscription Status (Authenticated)

```bash
curl http://localhost:5001/api/payments/subscription-status \
  -H "Authorization: Bearer $TOKEN"
```

---

## Country Routing Reference

All countries currently route to `web` provider (pending new payment provider integration).

| Country | Code | EU | SEPA |
|---------|------|----|------|
| Greece | GR | Yes | Yes |
| Croatia | HR | Yes | Yes |
| Bulgaria | BG | Yes | Yes |
| Romania | RO | Yes | Yes |
| Slovenia | SI | Yes | Yes |
| Serbia | RS | No | Yes |
| Albania | AL | No | Yes |
| Bosnia | BA | No | No |
| N. Macedonia | MK | No | Yes |
| Montenegro | ME | No | Yes |
| Kosovo | XK | No | No |

---

## Testing Checklist

### Provider Routing
- [ ] All 11 countries route to `web`
- [ ] Unknown country defaults to `web`

### Subscription Management
- [ ] Subscription status reflects correctly
- [ ] Free subscription (agency coupon) works
- [ ] User isSubscribed flag updated
- [ ] Cancel subscription works

### Error Handling
- [ ] Invalid country handled gracefully
- [ ] Missing auth token returns 401
- [ ] Invalid payment data returns 400
