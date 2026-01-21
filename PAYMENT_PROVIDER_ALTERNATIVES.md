# Payment Provider Alternatives for BalkanEstate.com

## Overview

Since Paddle rejected your application, here are alternative payment solutions that work across the Balkans (Greece, Macedonia, Albania, etc.) with varying fee structures and integration complexity.

---

## 🏆 Recommended Options (Ranked)

### 1. **Stripe** (Best Overall - If Available)
**Availability:** Greece ✅ | North Macedonia ✅ (SEPA member as of March 2025) | Albania ✅ (SEPA member as of November 2024)

| Feature | Details |
|---------|---------|
| Transaction Fee | 1.4% + €0.25 (EEA cards) / 2.9% + €0.25 (non-EEA) |
| Monthly Fee | None |
| Setup Fee | None |
| Payout to Bank | Free (SEPA) |
| Currencies | 135+ currencies |

**Pros:**
- Industry standard, most integrations available
- North Macedonia and Albania joined SEPA in 2024-2025, improving availability
- Excellent developer documentation
- Handles tax compliance (Stripe Tax add-on)

**Cons:**
- May require verification/documentation for Balkan countries
- Some features may be limited in newer SEPA countries

**Recommendation:** Apply directly at stripe.com - with SEPA membership, Macedonia should now be supported.

---

### 2. **Wise Business** (Best for Low Fees + Bank Transfers)
**Availability:** All Balkans ✅

| Feature | Details |
|---------|---------|
| Receiving Money | **FREE** (local SEPA/bank transfers) |
| Currency Conversion | Starting from 0.33% |
| International (SWIFT) | Small fee applies |
| Setup Fee | €50 one-time |
| Monthly Fee | None |

**Pros:**
- Get EUR IBAN to receive payments like a local European bank
- 60% of transfers are instant, 95% within 24 hours
- Lowest fees for bank-to-bank transfers
- Works perfectly with your Macedonian operations
- Can receive from 23+ countries as a "local"

**Cons:**
- Not a full payment gateway (no checkout/card processing)
- Best suited for invoice-based payments or bank transfers
- Need separate solution for card payments

**Best Use Case:** Receiving property deposits, agent commissions, B2B payments

---

### 3. **Revolut Business** (Best All-in-One Solution)
**Availability:** All Balkans ✅

| Feature | Details |
|---------|---------|
| Online Card Payments | 1% + €0.20 per transaction |
| In-Person Payments | 0.8% + €0.02 |
| Revolut Pay | 0.5% + €0.02 (lowest!) |
| Monthly Fee | €10 (Basic) / €30 (Grow) |
| Setup Fee | None |
| Refunds | Free |
| Chargeback Support | Free |

**Pros:**
- Accept cards + bank transfers + Revolut Pay
- Multi-currency accounts (25+ currencies)
- Instant transfers between Revolut accounts (free)
- Payment links for easy invoicing
- Physical card readers available
- You already know Revolut!

**Cons:**
- Monthly subscription required
- Higher fees than pure bank transfer solutions

**Best Use Case:** Full payment acceptance (cards + transfers) with simple setup

---

### 4. **PayPal Business** (Widest Recognition)
**Availability:** All Balkans ✅

| Feature | Details |
|---------|---------|
| Domestic EEA | 1.9% + fixed fee (~€0.35) |
| Cross-Border | +1.5% additional |
| Currency Conversion | 3% above exchange rate |
| Monthly Fee | None |
| Chargeback Fee | €16 |

**Pros:**
- Customers trust PayPal globally
- Easy integration
- Buyer/seller protection
- Works everywhere in Balkans

**Cons:**
- Higher fees for international transactions
- Currency conversion is expensive (3%)
- Account freezes can happen
- Disputes favor buyers

**Best Use Case:** Offering as additional payment option alongside primary provider

---

### 5. **LemonSqueezy** (Merchant of Record - No Tax Worries)
**Availability:** Payouts to Macedonia ✅ (79 countries via bank)

| Feature | Details |
|---------|---------|
| Base Fee | 5% + $0.50 per transaction |
| International | +1.5% for non-US transactions |
| Tax Handling | Included (they handle VAT) |
| Monthly Fee | None |
| Payouts | 1st and 15th of month |

**Pros:**
- They handle ALL tax compliance (VAT, etc.)
- No need to register for VAT in multiple countries
- Accept payments from 135+ countries
- Bank payouts to Macedonia supported
- Owned by Stripe (reliable)

**Cons:**
- Higher total fees (~6.5%+ for international)
- Bi-monthly payouts only
- Best for digital products/subscriptions

**Best Use Case:** If you want zero tax/compliance headaches

---

### 6. **GoCardless** (Best for Recurring/Subscriptions)
**Availability:** All SEPA countries ✅

| Feature | Details |
|---------|---------|
| Transaction Fee | 1% + €0.20 (capped at €4) |
| Failed Payment | Free retry |
| Monthly Fee | None (pay-as-you-go) |

**Pros:**
- Direct debit from bank accounts
- Much lower fees than cards
- Great for recurring payments (subscriptions, rent collection)
- 75,000+ businesses use it

**Cons:**
- Only bank-to-bank (no cards)
- Customer needs to authorize mandate

**Best Use Case:** Monthly subscription services, recurring property management fees

---

## 📊 Quick Comparison Table

| Provider | Card Payments | Bank Transfers | Setup | Monthly | Best For |
|----------|--------------|----------------|-------|---------|----------|
| Stripe | 1.4-2.9% + €0.25 | Free (SEPA) | Free | Free | Full solution |
| Wise | ❌ | **FREE** | €50 | Free | Receiving transfers |
| Revolut | 1% + €0.20 | Free | Free | €10-30 | All-in-one |
| PayPal | 1.9% + €0.35 | N/A | Free | Free | Recognition |
| LemonSqueezy | 5% + $0.50 | Via payout | Free | Free | Tax handling |
| GoCardless | ❌ | 1% (max €4) | Free | Free | Subscriptions |

---

## 💡 My Recommendations for BalkanEstate.com

### Option A: Simple & Low Cost
**Primary:** Wise Business (for receiving deposits/payments via bank transfer)
**Secondary:** Revolut Business (for card payments when needed)

**Total effective cost:** 0-1% for bank transfers, 1% for cards

### Option B: Professional Full Solution
**Primary:** Stripe (if approved for Macedonia)
**Fallback:** Revolut Business if Stripe unavailable

**Total effective cost:** 1.4-2.9% depending on card origin

### Option C: Zero Compliance Worries
**Use:** LemonSqueezy as Merchant of Record
**They handle:** VAT, taxes, compliance, refunds, chargebacks

**Total effective cost:** ~6.5% but zero admin overhead

---

## 🔧 Integration Considerations

For your real estate platform, you likely need:

1. **Property listing fees** (one-time) → Stripe/Revolut/PayPal
2. **Premium subscriptions** (recurring) → Stripe/GoCardless
3. **Deposit collection** (large amounts) → Wise (lowest fees)
4. **International buyers** → PayPal as backup option

---

## 📋 Next Steps

1. **Apply for Stripe** - With Macedonia's SEPA membership, worth trying
2. **Set up Wise Business** - Immediate, low-cost bank transfer receiving
3. **Consider Revolut Business** - You likely already have personal Revolut
4. **Keep PayPal as backup** - Universal recognition

---

## 🔗 Useful Links

- Stripe: https://stripe.com/global
- Wise Business: https://wise.com/business/
- Revolut Business: https://www.revolut.com/business/
- PayPal Business: https://www.paypal.com/business/
- LemonSqueezy: https://www.lemonsqueezy.com/
- GoCardless: https://gocardless.com/

---

*Document created: January 2025*
*Note: Fees may change. Always verify current rates on provider websites.*
