# Payment Options Exploration - February 2026

## Situation

- **Business:** BalkanEstate.com - Real estate SaaS platform
- **Registered in:** North Macedonia (HQ)
- **Supported countries:** GR, HR, BG, RO, SI, RS, AL, BA, MK, ME, XK (11 Balkan countries)
- **Currency:** EUR
- **Plans:** Subscriptions (€3-€1000/year) + one-time purchases (listing promotions)
- **Payout preference:** Wise account (EUR IBAN / USD ACH)

## Rejections

| Provider | Type | Status |
|----------|------|--------|
| Paddle | MoR | REJECTED |
| LemonSqueezy | MoR | REJECTED |
| Stripe | PSP | Not available in MK |
| PayPal | PSP | Cannot receive payments in MK |
| Revolut Business | PSP | Not available in MK |
| Wise Business | PSP | Not available in MK |

## Key Development: North Macedonia Joined SEPA (October 2025)

EUR cross-border transfers to/from MK are now treated like domestic SEPA transactions. This opens doors for providers that previously had limitations and makes local MK bank accounts viable for receiving EUR payouts.

---

## Provider Support by Country (All 11 Countries)

### Merchant of Record (handle VAT/tax/chargebacks)

| Provider | GR | HR | BG | RO | SI | RS | AL | BA | MK | ME | XK | Fees |
|----------|----|----|----|----|----|----|----|----|----|----|-----|------|
| **Paddle** | YES | YES | YES | YES | YES | ? | ? | ? | REJECTED | ? | ? | 5% + $0.50 |
| **LemonSqueezy** | YES | YES | YES | YES | YES | NO | NO | NO | REJECTED | NO | NO | ~6.5% |
| **2Checkout** | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | ? | 4.5% + $0.45 |
| **Dodo Payments** | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | 4% + $0.40 |
| **FastSpring** | YES | YES | YES | YES | YES | ? | ? | ? | ? | ? | ? | ~5.9-8.9% |
| **Gumroad** | YES | YES | YES | YES | YES | YES | YES | YES | YES | NO | NO | 10% |

### PSP (you handle tax/compliance)

| Provider | GR | HR | BG | RO | SI | RS | AL | BA | MK | ME | XK | Fees |
|----------|----|----|----|----|----|----|----|----|----|----|-----|------|
| **Stripe** | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO | NO | 2.9% + $0.30 |
| **PayPal Biz** | YES | YES | YES | YES | YES | LTD | LTD | LTD | LTD | LTD | NO | 2.9% + fixed |
| **Adyen** | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO | NO | Interchange++ |
| **Mollie** | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO | NO | 1.8% + €0.25 |
| **Rapyd/PayU** | YES | YES | YES | YES | YES | YES | ? | YES | YES | YES | ? | Custom |
| **Paysera** | YES | YES | YES | YES | YES | YES | YES | YES | ? | ? | YES | ~1-2.5% |
| **Novalnet** | YES | YES | YES | YES | YES | YES | YES | ? | YES | YES | ? | Custom + €19/mo |
| **Monri/Payten** | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | Custom |

### Key Takeaway

**Registering in an EU Balkan country (GR, HR, BG, RO, SI) unlocks ALL providers.**
Romania and Bulgaria are the cheapest for company registration.

---

## Remaining Viable Options (from North Macedonia)

### Tier 1: Merchant of Record

#### 1. 2Checkout (Verifone) - 2Subscribe Plan
- **Website:** https://www.2checkout.com
- **Fees:** 4.5% + $0.45 per transaction
- **MK support:** YES (not on restricted list)
- **Subscriptions:** YES - full lifecycle, dunning, retention tools
- **Payment methods:** 45+ methods, 100+ currencies, 200+ countries
- **Tax handling:** Full global VAT/sales tax compliance
- **Wise compatibility:** UNCERTAIN - manual Financial Department review
- **Maturity:** Very High (20,000+ merchants)

#### 2. Dodo Payments
- **Website:** https://dodopayments.com
- **Fees:** 4% + $0.40 per transaction
- **MK support:** YES (explicitly listed)
- **Subscriptions:** YES - subscriptions, add-ons, metered plans, trials
- **Payment methods:** 30+ methods including PayPal and BNPL
- **Tax handling:** Full MoR compliance
- **Wise compatibility:** Likely yes
- **Maturity:** Low (founded 2023, $1.1M pre-seed)

#### 3. FastSpring
- **Website:** https://fastspring.com
- **Fees:** ~5.9-8.9% (custom pricing)
- **MK support:** YES (MoR sells to customers globally)
- **Subscriptions:** YES
- **Payment methods:** Cards, PayPal, Amazon Pay, wire transfer
- **Tax handling:** Full MoR compliance
- **Wise compatibility:** YES (well-documented USD ACH setup)
- **Maturity:** High

#### 4. Gumroad
- **Website:** https://gumroad.com
- **Fees:** 10% flat
- **MK support:** YES
- **Subscriptions:** YES
- **Wise compatibility:** Yes
- **Maturity:** Medium
- **Note:** Expensive. Last resort.

### Tier 2: PSP (you handle tax/compliance)

#### 5. Rapyd (now with PayU)
- **Website:** https://www.rapyd.net
- **Fees:** Custom (Interchange++ model)
- **MK support:** YES (explicitly listed)
- **Payment methods:** 900+ methods across 190+ countries
- **Subscriptions:** YES

#### 6. Novalnet
- **Website:** https://www.novalnet.com
- **Fees:** Custom + €19/month
- **MK support:** YES (dedicated MK page)
- **Subscriptions:** YES
- **Payment methods:** Cards, SEPA, PayPal, Apple/Google Pay

#### 7. Monri / Payten (Regional leader)
- **Website:** https://monri.com / https://www.payten.com
- **Fees:** Custom
- **Coverage:** All 11 Balkan countries (offices in HR, RS, BA, ME, MK, AL, XK)
- **Subscriptions:** YES
- **Payment methods:** Cards, local bank methods

#### 8. Paysera
- **Website:** https://www.paysera.com
- **Fees:** ~1-2.5% + €0.29
- **Coverage:** Strong in Balkans (recently expanded to AL, XK)
- **Subscriptions:** Limited (needs custom implementation)

### Tier 3: US LLC Workaround

#### 9. Stripe via US LLC
- **Setup cost:** ~$500-800 one-time (via Doola, Firstbase, or Stripe Atlas)
- **Annual cost:** ~$200-500/yr
- **Stripe fees:** 2.9% + $0.30
- **Wise compatibility:** YES (officially supported, USD ACH)
- **Breakeven vs MoR:** Makes sense at ~€500+/mo revenue

### Tier 4: Crypto (supplementary)

#### 10. NOWPayments
- **Website:** https://nowpayments.io
- **Fees:** 0.5-1%
- **Subscriptions:** YES
- **300+ cryptocurrencies**

#### 11. BitPay
- **Website:** https://bitpay.com
- **Fees:** 1-2%
- **Subscriptions:** YES
- **Direct EUR bank settlement**

---

## Fee Comparison (on €25/mo Pro Plan)

| Provider | Type | Fee per txn | You keep | Tax handling |
|----------|------|-------------|----------|--------------|
| Dodo Payments | MoR | ~€1.40 | ~€23.60 | Included |
| 2Checkout | MoR | ~€1.57 | ~€23.43 | Included |
| Stripe (US LLC) | PSP | ~€1.27 | ~€23.73 | You handle |
| FastSpring | MoR | ~€1.48-2.23 | ~€22.77-23.52 | Included |
| Gumroad | MoR | €2.50 | €22.50 | Included |
| Rapyd | PSP | Custom | Custom | You handle |
| Novalnet | PSP | Custom + €19/mo | Custom | You handle |

---

## Outreach Emails

### Sent to:
1. 2Checkout (Verifone) - sales@2checkout.com / https://www.2checkout.com/contact
2. Dodo Payments - support@dodopayments.com
3. FastSpring - https://fastspring.com/contact
4. Rapyd - https://www.rapyd.net/contact-us
5. Novalnet - https://www.novalnet.com/contact
6. Monri/Payten - https://monri.com/contact
7. Paysera - https://www.paysera.com/contact

---

## Strategy

### Option A: Stay in North Macedonia
1. Apply to **2Checkout** and **Dodo Payments** first (cheapest MoR)
2. If rejected, try **FastSpring** (higher fees but proven)
3. Add **Monri/Payten** as regional PSP fallback
4. Long-term: form US LLC for Stripe access

### Option B: Register EU entity (recommended if possible)
1. Register company in **Romania** or **Bulgaria** (cheapest EU options)
2. Unlock **Stripe**, **Paddle**, **Adyen**, **Mollie** -- everything
3. Use Stripe (2.9%) or Paddle (5% MoR) as primary
4. Massive cost savings and no rejections

---

---

## Cost-Saving Analysis: Which Platform Saves You The Most Money?

### Your Revenue Scenarios (Annual Projections)

Based on your pricing tiers (€3 buyer monthly, €25 Pro monthly, €200 Pro yearly, €1000 Enterprise yearly), here are fee comparisons at different revenue levels.

### Scenario 1: Early Stage — €500/month revenue (~20 Pro subscribers)

| Provider | Type | Monthly Fees | Annual Cost | You Keep/Year |
|----------|------|-------------|-------------|---------------|
| **Paysera** | PSP | ~€14 | ~€168 | **€5,832** |
| **Monri/Payten** | PSP | ~€36 (min) | ~€432 + €380 annual = **€812** | **€5,188** |
| **Stripe (US LLC)** | PSP | ~€25 | ~€300 + ~€400 LLC costs = **€700** | **€5,300** |
| **Dodo Payments** | MoR | ~€28 | ~€336 | **€5,664** |
| **2Checkout** | MoR | ~€31 | ~€372 | **€5,628** |
| **FastSpring** | MoR | ~€37 | ~€444 | **€5,556** |
| **Gumroad** | MoR | ~€50 | ~€600 | **€5,400** |

**Winner at €500/mo:** Paysera (~€168/year in fees) — but you handle tax/compliance yourself.
**Best MoR at €500/mo:** Dodo Payments (~€336/year) — tax/VAT handled for you.

### Scenario 2: Growth Stage — €2,000/month revenue (~80 subscribers)

| Provider | Type | Monthly Fees | Annual Cost | You Keep/Year |
|----------|------|-------------|-------------|---------------|
| **Paysera** | PSP | ~€55 | ~€660 | **€23,340** |
| **Stripe (US LLC)** | PSP | ~€100 | ~€1,200 + ~€400 LLC = **€1,600** | **€22,400** |
| **Monri/Payten** | PSP | ~€100 | ~€1,200 + €380 = **€1,580** | **€22,420** |
| **Dodo Payments** | MoR | ~€112 | ~€1,344 | **€22,656** |
| **2Checkout** | MoR | ~€126 | ~€1,512 | **€22,488** |
| **FastSpring** | MoR | ~€148 | ~€1,776 | **€22,224** |
| **Gumroad** | MoR | ~€200 | ~€2,400 | **€21,600** |

**Winner at €2k/mo:** Paysera (~€660/year).
**Best MoR at €2k/mo:** Dodo Payments (~€1,344/year).

### Scenario 3: Scale Stage — €10,000/month revenue (~400 subscribers)

| Provider | Type | Monthly Fees | Annual Cost | You Keep/Year |
|----------|------|-------------|-------------|---------------|
| **Paysera** | PSP | ~€275 | ~€3,300 | **€116,700** |
| **Stripe (US LLC)** | PSP | ~€500 | ~€6,000 + ~€400 LLC = **€6,400** | **€113,600** |
| **Monri/Payten** | PSP | ~€500 | ~€6,000 + €380 = **€6,380** | **€113,620** |
| **Dodo Payments** | MoR | ~€560 | ~€6,720 | **€113,280** |
| **2Checkout** | MoR | ~€630 | ~€7,560 | **€112,440** |
| **2Checkout + cross-border** | MoR | ~€830 | ~€9,960 | **€110,040** |
| **FastSpring** | MoR | ~€740 | ~€8,880 | **€111,120** |
| **Gumroad** | MoR | ~€1,000 | ~€12,000 | **€108,000** |

**Winner at €10k/mo:** Paysera (~€3,300/year).
**Best MoR at €10k/mo:** Dodo Payments (~€6,720/year).

> **Important:** 2Checkout charges an extra **2% cross-border fee** on transactions where the buyer's country differs from the merchant's (MK). Since your buyers are across 11 countries, most transactions will incur this. This makes 2Checkout significantly more expensive than Dodo at scale.

---

## Top 3 Recommendations (Ranked by Savings)

### 1. Dodo Payments — BEST VALUE MoR (Recommended to start)
- **Fees:** 4% + $0.40/txn — **lowest MoR rate available to you**
- **Saves vs 2Checkout:** ~€840/year at €10k/mo (no cross-border surcharge)
- **Saves vs FastSpring:** ~€2,160/year at €10k/mo
- **Saves vs Gumroad:** ~€5,280/year at €10k/mo
- **Why it's good:** Full MoR (handles VAT, tax, chargebacks), supports all 11 Balkan countries, subscriptions built-in, no monthly minimums
- **Risk:** Young company (founded 2023) — but they explicitly support MK and have growing traction
- **Action:** Apply at https://dodopayments.com

### 2. Paysera — CHEAPEST OVERALL (if you handle tax compliance)
- **Fees:** ~1-2.5% + €0.29/txn — **lowest fees of any option**
- **Saves vs Dodo:** ~€3,420/year at €10k/mo revenue
- **Why it's good:** Expanding in Balkans (AL, XK launched), SEPA-native, extremely low fees, no monthly minimums
- **Risk:** You must handle VAT/tax compliance yourself across 11 countries, subscription billing needs custom implementation
- **Best for:** If you have accounting/tax expertise or use a separate tax service
- **Action:** Apply at https://www.paysera.com

### 3. Stripe via US LLC — BEST LONG-TERM (if revenue justifies setup cost)
- **Fees:** 2.9% + $0.30/txn + ~€400/year LLC maintenance
- **Why it's good:** Industry-leading developer tools, best-in-class subscription billing (Stripe Billing), massive ecosystem, Wise-compatible
- **Breakeven:** Makes financial sense once revenue exceeds ~€500/month
- **Risk:** US LLC setup complexity, ongoing compliance (annual report, registered agent)
- **Best for:** Once you have predictable recurring revenue and want the gold standard
- **Action:** Register US LLC via Stripe Atlas ($500) or Doola (~$300)

---

## Hidden Costs to Watch Out For

| Cost | Dodo | 2Checkout | Paysera | Stripe (US LLC) |
|------|------|-----------|---------|-----------------|
| Monthly fee | None | None | None | None |
| Cross-border fee | None | **+2%** | None | +1.5% intl cards |
| Currency conversion | Customer pays | +2-3% | Varies | +1% |
| Chargeback fee | Included | Included | ~€15 | $15 |
| Refund fee | Included | Included | Varies | Fee not returned |
| VAT/Tax handling | **Included** | **Included** | **You handle** | **You handle** |
| Payout fee | Free | Free/varies | Free (SEPA) | Free to Wise |

---

## Decision Matrix: Quick Guide

```
START HERE
  │
  ├─ "I want to launch ASAP with zero tax headaches"
  │   └─→ Dodo Payments (MoR, 4% + $0.40)
  │
  ├─ "I want the absolute lowest fees and can handle taxes"
  │   └─→ Paysera (PSP, ~1-2.5%)
  │
  ├─ "I want the best developer tools and plan to scale"
  │   └─→ Stripe via US LLC (2.9% + $0.30 + LLC costs)
  │
  ├─ "I want a proven regional partner who knows the Balkans"
  │   └─→ Monri/Payten (custom pricing, offices in all 11 countries)
  │
  └─ "I want maximum safety with an established global player"
      └─→ 2Checkout (MoR, 4.5% + $0.45, but watch cross-border fees)
```

---

## Immediate Next Steps

1. **Apply to Dodo Payments today** — lowest MoR fees, explicit MK support, fast onboarding
2. **Apply to Paysera as backup** — if you're comfortable handling tax compliance
3. **Get quotes from Monri/Payten** — regional player, may offer competitive custom rates
4. **Plan for Stripe via US LLC** as a mid-term upgrade once revenue is steady

---

### Sources

- [2Checkout Pricing](https://www.2checkout.com/pricing/)
- [Dodo Payments Pricing](https://dodopayments.com/pricing)
- [Paysera Fees](https://www.paysera.com/v2/en/fees)
- [Monri Payments](https://monri.com/products/online-payments/)
- [Stripe Pricing](https://stripe.com/pricing)
- [FastSpring](https://fastspring.com)
- [NerdWallet Cheapest Payment Gateways 2026](https://www.nerdwallet.com/business/software/best/cheapest-payment-gateways)
- [GoCardless Stripe Alternatives 2026](https://gocardless.com/guides/posts/top-5-stripe-alternatives/)
- [PayFirmly Top European Gateways 2026](https://www.payfirmly.com/blogs/top-payment-gateways-in-europe)

*Document created: February 2026*
*Last updated: February 12, 2026*
