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

## Remaining Viable Options

### Tier 1: Merchant of Record (handle VAT/tax/chargebacks for you)

#### 1. 2Checkout (Verifone) - 2Subscribe Plan
- **Website:** https://www.2checkout.com
- **Fees:** 4.5% + $0.45 per transaction
- **MK support:** YES (not on restricted list)
- **Subscriptions:** YES - full lifecycle, dunning, retention tools
- **Payment methods:** 45+ methods, 100+ currencies, 200+ countries
- **Tax handling:** Full global VAT/sales tax compliance
- **Wise compatibility:** UNCERTAIN - manual Financial Department review of bank details
- **Maturity:** Very High (20,000+ merchants)
- **Contact:** https://www.2checkout.com/contact

#### 2. Dodo Payments
- **Website:** https://dodopayments.com
- **Fees:** 4% + $0.40 per transaction
- **MK support:** YES (explicitly listed)
- **Subscriptions:** YES - subscriptions, add-ons, metered plans, trials
- **Payment methods:** 30+ methods including PayPal and BNPL
- **Tax handling:** Full MoR compliance
- **Wise compatibility:** Likely yes
- **Maturity:** Low (founded 2023, $1.1M pre-seed)
- **Contact:** support@dodopayments.com

#### 3. FastSpring
- **Website:** https://fastspring.com
- **Fees:** ~5.9-8.9% (custom pricing)
- **MK support:** YES (MoR sells to customers globally)
- **Subscriptions:** YES
- **Payment methods:** Cards, PayPal, Amazon Pay, wire transfer
- **Tax handling:** Full MoR compliance
- **Wise compatibility:** YES (well-documented USD ACH setup)
- **Maturity:** High
- **Contact:** https://fastspring.com/contact

#### 4. Gumroad
- **Website:** https://gumroad.com
- **Fees:** 10% flat
- **MK support:** YES
- **Subscriptions:** YES
- **Wise compatibility:** Yes
- **Maturity:** Medium
- **Note:** Expensive. Last resort.

### Tier 2: PSP with US LLC workaround

#### 5. Stripe via US LLC
- **Setup cost:** ~$500-800 one-time (via Doola, Firstbase, or Stripe Atlas)
- **Annual cost:** ~$200-500/yr (Delaware franchise tax, registered agent, annual report)
- **Stripe fees:** 2.9% + $0.30 (+1% international cards, +1% currency conversion)
- **Subscriptions:** YES - Stripe Billing is best-in-class
- **Payment methods:** Everything (cards, SEPA, Apple/Google Pay, Klarna, etc.)
- **Wise compatibility:** YES (officially supported, USD ACH)
- **Maturity:** Highest
- **Breakeven vs MoR:** Makes sense at ~€500+/mo revenue
- **Setup time:** 2-4 weeks

### Tier 3: Regional / Supplementary

#### 6. Rapyd (now with PayU)
- **Website:** https://www.rapyd.net
- **Fees:** Custom (Interchange++ model)
- **MK support:** YES (explicitly listed)
- **Payment methods:** 900+ methods across 190+ countries
- **Subscriptions:** YES
- **Best for:** When you scale and need enterprise pricing
- **Contact:** https://www.rapyd.net/contact-us

#### 7. Novalnet
- **Website:** https://www.novalnet.com
- **Fees:** Custom + €19/month
- **MK support:** YES (dedicated MK page)
- **Subscriptions:** YES
- **Payment methods:** Cards, SEPA, PayPal, Apple/Google Pay
- **Contact:** https://www.novalnet.com/contact

#### 8. CaSys / cPay (Local MK processor)
- **Website:** https://casys.com.mk / https://www.cpay.com.mk
- **Fees:** ~2.4% per transaction
- **MK support:** YES (domestic processor)
- **Subscriptions:** YES (card-on-file recurring)
- **Payment methods:** Visa, Mastercard via MK acquiring banks
- **Limitation:** Domestic focus, not ideal for 11-country coverage

### Tier 4: Crypto (supplementary)

#### 9. NOWPayments
- **Website:** https://nowpayments.io
- **Fees:** 0.5-1%
- **Subscriptions:** YES
- **300+ cryptocurrencies**
- **Fiat off-ramp:** Guardarian -> SEPA -> Wise EUR IBAN

#### 10. BitPay
- **Website:** https://bitpay.com
- **Fees:** 1-2%
- **Subscriptions:** YES
- **Direct EUR bank settlement** (if MK qualifies post-SEPA)

---

## Comparison (MoR options only)

| Provider | Fees | On €25/mo plan you keep | MK Support | Wise | Maturity |
|----------|------|------------------------|------------|------|----------|
| Dodo Payments | 4% + $0.40 | ~€23.60 | YES | Likely | Low |
| 2Checkout | 4.5% + $0.45 | ~€23.43 | YES | Uncertain | Very High |
| FastSpring | ~5.9% | ~€22.53 | YES | YES | High |
| Gumroad | 10% | €22.50 | YES | Yes | Medium |

## Comparison (PSP option)

| Provider | Fees | On €25/mo plan you keep | Setup Cost | Wise |
|----------|------|------------------------|------------|------|
| Stripe (US LLC) | ~3.9% + $0.30 | ~€23.73 | $500-800 + $200-500/yr | YES |

---

## Recommendation

1. **Apply to 2Checkout and Dodo Payments first** - cheapest MoR options that support MK
2. **If both reject** - go FastSpring (higher fees but proven)
3. **Long-term** - form US LLC for Stripe access when revenue justifies the overhead
4. **Supplementary** - add NOWPayments for crypto (0.5% fee, differentiator in Balkans)

---

*Document created: February 2026*
*Last updated: February 2026*
