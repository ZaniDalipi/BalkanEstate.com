# Payment Options Exploration - February 2026

## Situation

- **Business:** BalkanEstate.com - Real estate SaaS platform
- **Registered in:** North Macedonia (HQ)
- **Supported countries:** GR, HR, BG, RO, SI, RS, AL, BA, MK, ME, XK (11 Balkan countries)
- **Currency:** EUR
- **Plans:** Subscriptions (€3-€1000/year) + one-time purchases (listing promotions)
- **Payout preference:** Wise account (EUR IBAN / USD ACH)
- **Current system:** Manual coupon codes to activate user sessions (no live payments)
- **Codebase:** Paysera service already partially integrated (`payseraService.ts`, `payseraWebhookController.ts`)

## Rejections

| Provider | Type | Status | Notes |
|----------|------|--------|-------|
| Paddle | MoR | REJECTED | Lists AL/XK/MK as supported sellers — worth re-applying |
| LemonSqueezy | MoR | REJECTED | Acquired by Stripe (July 2024) — may explain rejection |
| Stripe | PSP | Not available in MK | Available via US LLC ($500+) or EU entity |
| PayPal | PSP | Cannot receive payments in MK | MK/AL send-only at best; XK completely unavailable |
| Revolut Business | PSP | Not available in MK | |
| Wise Business | PSP | Not available in MK | |

## Key Developments (2025-2026)

### SEPA Expansion Across the Balkans
- **North Macedonia** joined SEPA: full implementation October 2025
- **Albania** joined SEPA: full implementation October 2025
- **Montenegro** joined SEPA: operational readiness October 2025
- **Serbia** joined SEPA: May 2025 (full bank implementation expected May 2026)
- **Kosovo** has NOT joined SEPA yet (only potential EU candidate without it)
- **Bosnia and Herzegovina** has NOT joined SEPA yet

**Impact:** EUR cross-border transfers to/from MK, AL, ME, RS are now treated like
domestic SEPA transactions. This massively reduces transfer costs and opens doors
for providers that previously couldn't serve these countries.

### LemonSqueezy Acquired by Stripe
Stripe acquired LemonSqueezy in July 2024. Stripe is also developing its own
Merchant of Record solution (private beta 2026, +3.5% fee on top of standard rates).

### Paddle Re-evaluation
Paddle's developer docs list Albania, Kosovo, Bosnia and Herzegovina, and Montenegro
as supported seller countries. The previous rejection may have been circumstantial —
worth re-applying now that MK has SEPA.

---

## Provider Support by Country (All 11 Countries)

### Merchant of Record (handle VAT/tax/chargebacks)

| Provider | GR | HR | BG | RO | SI | RS | AL | BA | MK | ME | XK | Fees |
|----------|----|----|----|----|----|----|----|----|----|----|-----|------|
| **Paddle** | YES | YES | YES | YES | YES | YES | YES | YES | REJECTED* | YES | YES | 5% + $0.50 |
| **LemonSqueezy** | YES | YES | YES | YES | YES | NO | NO | NO | REJECTED | NO | NO | ~6.5% |
| **2Checkout** | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | ? | 4.5% + $0.45 |
| **Dodo Payments** | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | 4% + $0.40 |
| **FastSpring** | YES | YES | YES | YES | YES | ? | ? | ? | ? | ? | ? | ~5.9-8.9% |
| **Gumroad** | YES | YES | YES | YES | YES | YES | YES | YES | YES | NO | NO | 10% |

*Paddle lists MK sellers as supported — re-apply.

### PSP (you handle tax/compliance)

| Provider | GR | HR | BG | RO | SI | RS | AL | BA | MK | ME | XK | Fees |
|----------|----|----|----|----|----|----|----|----|----|----|-----|------|
| **Stripe** | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO | NO | 2.9% + $0.30 |
| **PayPal Biz** | YES | YES | YES | YES | YES | LTD | LTD | LTD | LTD | LTD | NO | 2.9% + fixed |
| **Adyen** | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO | NO | Interchange++ |
| **Mollie** | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO | NO | 1.8% + €0.25 |
| **Rapyd/PayU** | YES | YES | YES | YES | YES | YES | ? | YES | YES | YES | ? | Custom |
| **Paysera** | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | ~1-2.5% + €0.29 |
| **Novalnet** | YES | YES | YES | YES | YES | YES | YES | ? | YES | YES | ? | Custom + €19/mo |
| **Monri/Payten** | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | YES | ~0.5% or €36/mo min |

### Key Takeaway

Only **3 providers cover ALL 11 countries from MK**: Paysera, Monri/Payten, and Dodo Payments.
**Registering in an EU Balkan country (GR, HR, BG, RO, SI) unlocks ALL providers.**
Romania and Bulgaria are the cheapest for company registration.

---

## Deep Dive: Top Viable Providers (from North Macedonia)

### TIER 1: READY NOW (code exists or quick integration)

#### 1. Paysera — STRONGEST OPTION (already integrated in codebase)
- **Website:** https://www.paysera.com
- **Fees:** ~1-2.5% + €0.29 per card transaction (lowest of all options)
- **Monthly fee:** €0 for BG, RO, XK, AL merchants; €5 for others
- **Coverage:** 184 countries, 30+ currencies, ALL 11 Balkan countries
- **MK support:** YES — North Macedonia is in SEPA now
- **AL support:** YES — Paysera has an EMI license from the Central Bank of Albania
- **XK support:** YES — supports NLB Prishtina, ProCredit, Raiffeisen, Banka Ekonomike, etc. (1% fixed bank link fee)
- **Payment methods:** Visa, Mastercard, Maestro, Apple Pay, Google Pay, bank links, SEPA transfers
- **SEPA transfers:** FREE between Paysera users and within SEPA
- **Subscriptions:** Manual (you manage recurring logic — codebase already has this)
- **Wise compatibility:** YES — SEPA transfers to Wise EUR IBAN are free/near-free
- **App:** Available in 17 languages including Albanian
- **Maturity:** High — Lithuanian fintech, EMI licenses across Europe
- **Codebase status:** `payseraService.ts` and `payseraWebhookController.ts` already exist

**WHY THIS IS #1:** Lowest fees, already integrated, covers every single country you target,
and since MK joined SEPA, payouts to your Wise account are essentially free. The only
downside is you handle subscription management yourself — but the codebase already has
subscription logic, coupon system, and the payment factory pattern.

#### 2. Monri / Payten — REGIONAL CARD PROCESSING LEADER
- **Website:** https://monri.com / https://www.payten.com
- **Fees:** ~0.5% per transaction or €36/month minimum; €380/year
- **Coverage:** All 11 Balkan countries — local subsidiary **Payten dooel** in MK
- **MK support:** YES — described as "leading online payment gateway" in MK
- **Payment methods:** Visa, Mastercard, Maestro, Diners — PCI DSS Level 1 certified
- **Integration:** Components (stay on your page), Redirect, Mobile SDKs, WooCommerce plugin
- **API:** REST JSON API at `ipg.monri.com`
- **Currencies:** EUR, USD, BAM, HRK
- **Subscriptions:** Authorization + capture model; authorize lasts 28 days, refund within 180 days
- **Maturity:** Very High — founded 2003, Asseco SEE group (publicly traded)

**WHY THIS IS #2:** Local presence in MK, lowest card processing fees in the region,
PCI DSS Level 1. Ideal complement to Paysera for direct card processing with
lower fees than any MoR. Contact Payten dooel in Skopje directly.

### TIER 2: MERCHANT OF RECORD (if you want hands-off tax/compliance)

#### 3. 2Checkout (Verifone) - 2Subscribe Plan
- **Website:** https://www.2checkout.com
- **Fees:** 4.5% + $0.45 per transaction
- **MK support:** YES (not on restricted list)
- **Subscriptions:** YES - full lifecycle, dunning, retention tools
- **Payment methods:** 45+ methods, 100+ currencies, 200+ countries
- **Tax handling:** Full global VAT/sales tax compliance
- **Wise compatibility:** UNCERTAIN - manual Financial Department review
- **Maturity:** Very High (20,000+ merchants)

#### 4. Dodo Payments
- **Website:** https://dodopayments.com
- **Fees:** 4% + $0.40 per transaction
- **MK support:** YES (explicitly listed)
- **Subscriptions:** YES - subscriptions, add-ons, metered plans, trials
- **Payment methods:** 30+ methods including PayPal and BNPL
- **Tax handling:** Full MoR compliance
- **Wise compatibility:** Likely yes
- **Maturity:** Low (founded 2023, $1.1M pre-seed) — RISK

#### 5. FastSpring
- **Website:** https://fastspring.com
- **Fees:** ~5.9-8.9% (custom pricing)
- **MK support:** YES (MoR sells to customers globally)
- **Subscriptions:** YES
- **Payment methods:** Cards, PayPal, Amazon Pay, wire transfer
- **Tax handling:** Full MoR compliance
- **Wise compatibility:** YES (well-documented USD ACH setup)
- **Maturity:** High

#### 6. Gumroad
- **Website:** https://gumroad.com
- **Fees:** 10% flat
- **MK support:** YES
- **Note:** Too expensive. Last resort only.

### TIER 3: LONG-TERM / WORKAROUND OPTIONS

#### 7. Paddle (RE-APPLY)
- **Website:** https://www.paddle.com
- **Fees:** 5% + $0.50 per transaction (+3% non-domestic currency)
- **Coverage:** 200+ countries for buyers, AL/XK/BA/ME listed as supported sellers
- **Subscriptions:** YES — industry-leading subscription management
- **Tax handling:** Full MoR with 200+ country tax compliance
- **Action:** Re-apply now that MK has SEPA. Reference their own supported countries list.

#### 8. Stripe via US LLC
- **Setup cost:** ~$500-800 one-time (via Doola, Firstbase, or Stripe Atlas)
- **Annual cost:** ~$200-500/yr (registered agent, state filing)
- **Stripe fees:** 2.9% + $0.30
- **Wise compatibility:** YES (officially supported, USD ACH)
- **Breakeven vs MoR:** Makes sense at ~€500+/mo revenue
- **Additional:** Unlocks Stripe Billing for full subscription management

#### 9. Register EU Entity (Romania or Bulgaria)
- **Setup cost:** ~€200-500 one-time
- **Annual cost:** ~€300-1000/yr (accounting, compliance)
- **Unlocks:** Stripe, Paddle, Adyen, Mollie, PayPal — literally everything
- **Recommendation:** Romania (cheapest, EUR-native since Jan 2024) or Bulgaria

### TIER 4: SUPPLEMENTARY (crypto)

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

| Provider | Type | Fee per txn | You keep | Tax handling | Subscription mgmt |
|----------|------|-------------|----------|--------------|-------------------|
| **Paysera** | PSP | ~€0.63-0.92 | ~€24.08-24.37 | You handle | You build (exists) |
| **Monri/Payten** | PSP | ~€0.13 (0.5%) | ~€24.87 | You handle | You build (exists) |
| Stripe (US LLC) | PSP | ~€1.27 | ~€23.73 | You handle | Stripe Billing |
| Dodo Payments | MoR | ~€1.40 | ~€23.60 | Included | Included |
| 2Checkout | MoR | ~€1.57 | ~€23.43 | Included | Included |
| FastSpring | MoR | ~€1.48-2.23 | ~€22.77-23.52 | Included | Included |
| Paddle | MoR | ~€1.75 | ~€23.25 | Included | Included |
| Gumroad | MoR | €2.50 | €22.50 | Included | Included |

**Per €25 transaction, Paysera saves €0.48-1.87 vs MoR providers.**
**Monri saves even more at ~€0.13 per transaction for card processing.**
At 1000 transactions/month, that's €480-1,870/month saved vs MoR solutions.

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

### Should also contact:
8. **Paddle** — RE-APPLY citing their own supported countries list (AL, XK, BA, ME, MK via SEPA)
9. **Payten dooel Skopje** — Direct local subsidiary for MK-specific pricing

---

## RECOMMENDED STRATEGY

### Phase 1: Get Payments Live NOW (Paysera)
**Action:** Finish the Paysera integration that's already in the codebase.

1. Complete `payseraService.ts` integration (sandbox is at `sandbox.paysera.com`)
2. Wire up the `paymentProviderFactory.ts` to use Paysera for all 11 countries
3. Paysera handles: card payments (Visa/MC), Apple Pay, Google Pay, bank links
4. Your existing subscription logic handles: recurring billing, plan management, coupons
5. SEPA payouts to your Wise EUR IBAN are free
6. **Estimated fees:** ~1-2.5% per transaction — cheapest option available

**This replaces the coupon system immediately.**

### Phase 2: Add Monri/Payten for Lower Card Fees (parallel)
1. Contact Payten dooel in Skopje for MK-specific pricing
2. Monri's 0.5% card processing fee is significantly cheaper than Paysera for card-only
3. Route card payments through Monri, bank transfers through Paysera
4. The `paymentProviderFactory.ts` already supports this split-provider pattern

### Phase 3: Re-apply to Paddle (medium-term)
1. Re-apply to Paddle citing SEPA membership and their own supported countries list
2. If accepted: use Paddle for subscription management + tax compliance
3. Higher fees (5%) but zero tax/compliance burden
4. Could use as primary for EU customers, Paysera for Balkan-specific bank methods

### Phase 4: EU Entity or US LLC (long-term, if revenue justifies)
1. **Romania entity** (~€200 setup) unlocks Stripe, Paddle, Adyen, Mollie — everything
2. **US LLC** (~$500 via Stripe Atlas) unlocks Stripe with best API/tooling
3. Makes financial sense once revenue exceeds ~€500/month
4. At that point: Stripe (2.9%) as primary, Paysera as regional fallback

### Split Provider Architecture (already supported by codebase)

```
Customer Payment Flow:
                                    ┌─────────────────┐
                                    │ paymentProvider   │
                                    │ Factory.ts        │
                                    └────────┬──────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                   ┌─────▼─────┐      ┌──────▼──────┐    ┌──────▼──────┐
                   │  Paysera  │      │ Monri/Payten│    │  Paddle or  │
                   │  (bank +  │      │  (cards,    │    │  Stripe     │
                   │  e-wallet)│      │  low fees)  │    │  (future)   │
                   └───────────┘      └─────────────┘    └─────────────┘
                         │                   │                   │
                   All 11 countries    All 11 countries    EU countries
                   Bank links          Card processing     Full MoR
                   ~1-2.5%             ~0.5%               ~2.9-5%
```

---

## Research Sources

- [Stripe Global Availability](https://stripe.com/global)
- [Paddle Supported Countries](https://developer.paddle.com/concepts/sell/supported-countries-locales)
- [Paysera Fees](https://www.paysera.com/v2/en/fees)
- [Paysera Payment Gateway Fees](https://www.paysera.com/v2/en/fees/payment-gateway-fees)
- [Paysera Albania EMI License](https://www.paysera.com/v2/en/blog/paysera-albania-emi)
- [Monri Payments](https://monri.com/)
- [Payten Gateway](https://www.payten.com/en/offers/for-merchants/e-commerce/webpay-payment-gateway-monri/)
- [Monri WebPay API Docs](https://ipg.monri.com/en/documentation)
- [SEPA Expansion to Western Balkans](https://europeanwesternbalkans.com/2025/10/08/albania-moldova-montenegro-and-north-macedonia-start-to-fully-implement-sepa/)
- [World Bank Western Balkans Payments](https://www.worldbank.org/en/region/eca/brief/advancing-the-modernization-and-integration-of-payment-systems-in-the-western-balkans)
- [Western Balkans Payment Methods](https://norbr.com/library/payworldtour/payment-methods-in-western-balkans/)
- [2Checkout](https://www.2checkout.com)
- [Dodo Payments](https://dodopayments.com)
- [FastSpring](https://fastspring.com)
- [Stripe Alternatives for SaaS 2026](https://affonso.io/blog/stripe-alternatives-for-saas)
- [Paddle vs Stripe Alternatives](https://www.paddle.com/alternatives/stripe)
- [PayPal Kosovo Unavailability](https://telegrafi.com/en/why-paypal-and-applepay-still-do-not-accept-kosovo-governor-ismaili-speaks/)
- [PayPal Countries List](https://www.cs-cart.com/blog/paypal-countries-availability/)

---

*Document created: February 2026*
*Last updated: February 20, 2026 — comprehensive research update with SEPA developments and actionable strategy*
