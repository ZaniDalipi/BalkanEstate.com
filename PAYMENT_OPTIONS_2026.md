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

*Document created: February 2026*
*Last updated: February 2026*
