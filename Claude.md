# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (root)
```bash
npm run dev          # Vite dev server on :3000
npm run build        # Production build
npm test             # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
npm run test:coverage
```

### Backend (`/backend`)
```bash
npm run dev          # Express server on :5001
npm test             # Jest + mongodb-memory-server
```

### Single test
```bash
npx vitest run src/path/to/file.test.ts
npx jest --testPathPattern=path/to/file.test.ts  # backend
```

---

## Architecture

### State Management
Three layers — pick the right one:

| Layer | Tool | Use for |
|-------|------|---------|
| Server state | TanStack Query v5 | API data (properties, agents, listings) |
| Client state | Zustand | `filterStore` (persisted) · `uiStore` (modals, selections) |
| Local state | `useState` | Component-only ephemeral state |

### Feature-Sliced Design
Each feature owns its slice: `src/features/[feature]/{api,components,hooks,types}`.
Shared UI goes in `src/components/`, shared utilities in `src/shared/`.

Query keys are centralised in `src/shared/query/queryKeys.ts` — always use that file instead of inline strings.

### HTTP Client
All API calls go through `src/shared/api/httpClient.ts`. It handles:
- Access token injection (in-memory only — never localStorage)
- Automatic 401 → refresh token rotation (httpOnly cookie)
- CSRF double-submit cookie (`X-CSRF-Token` header on mutations)
- Response payload encryption for sensitive endpoints (auth, profile)
- Emits a `session-expired` custom DOM event when refresh fails — listen for this to redirect to login

---

## Error & Validation Handling

### Three-tier error boundary stack
```
ErrorBoundary          ← catches React render errors; reports to Sentry
  └── QueryErrorBoundary  ← catches TanStack Query fetch errors
        └── component logic  ← httpClient-level (401 refresh, session-expired event)
```

`src/app/components/ErrorBoundary.tsx` — wrap page-level trees here.
`src/app/components/QueryErrorBoundary.tsx` — wrap any tree that runs queries.

### Validation pattern
All client-side validation lives in `src/shared/utils/validation.ts`. Every function returns `{ isValid: boolean; error?: string }`.

```ts
import { validateEmail, validatePhone, validatePassword, validatePrice,
         validateCoordinates, validatePropertyTitle,
         validatePropertyDescription, sanitizeText,
         validateSearchQuery } from '@/shared/utils/validation';

const result = validateEmail(input);
if (!result.isValid) {
  setError(result.error);   // show inline field error
  return;
}
// proceed
```

Rules:
- Validate at system boundaries only (form submit, API response ingestion).
- Use `sanitizeText` (DOMPurify) before rendering any user-generated string as HTML.
- Never duplicate validation logic in components — add to `validation.ts` and import.

### CSRF
Mutations (POST/PUT/PATCH/DELETE) automatically receive the `X-CSRF-Token` header via `httpClient`. Call `ensureCsrfToken()` before the first mutation if the user hasn't made a GET request yet (e.g., deep-link straight to a form).

---

## PWA / Mobile Layout

- `@media (display-mode: standalone)` block in `src/index.css` adds status-bar safe area padding.
- CSS custom property `--floating-search-top-pad` switches between browser (8px) and PWA (`max(safe-area-inset-top + 8px, 44px)`) values — use it for any overlay that must clear the notch.
- Viewport meta uses `viewport-fit=cover` so `env(safe-area-inset-*)` variables work correctly.

---

## i18n

Locales: `src/i18n/locales/{lang}/{namespace}.json` for 10 languages (en, sq, bs, bg, hr, el, mk, me, ro, sr).
Every new translation key must be added to all 10 locale files simultaneously.

---

## Images

Always use `optimizeCloudinaryUrl(url, { width, quality })` and `cloudinarySrcSet()` — never raw Cloudinary URLs.
LQIP uses `width: 40, quality: 'auto:eco'`.

---

## Google AdSense

Feature slice: `src/features/ads/`

### Environment variable
```
VITE_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXXXXX
```
Without this variable, **all ad components render nothing** — safe for local dev and test.

### Ad gating rule
Ads are shown **only** to unauthenticated visitors and users whose `subscription.tier === 'free'`.
Paid tiers (`buyer`, `pro`, `agency_agent`, `agency_owner`) never see ads.

### Usage
```tsx
import { AdBanner, AdInFeed, AdSidebar, AdInArticle } from '@/features/ads';

// Between hero and property grid
<AdBanner placement="home-leaderboard" />

// Between property cards (every Nth card in the grid)
<AdInFeed />

// Property detail sidebar
<AdSidebar />

// Between description sections
<AdInArticle />
```

### Adding a new slot
1. Add an entry to `AD_SLOTS` in `src/features/ads/types/index.ts` — slotId comes from AdSense dashboard.
2. Export a named component from `src/features/ads/index.ts` if it needs a custom wrapper.
3. Never inline slot IDs in page components — always reference `AD_SLOTS`.

### Script loading
`useAdSense` loads the AdSense `<script>` lazily and exactly once (module singleton). It only triggers the load when a component eligible to show ads mounts, so paid users never incur the network request.
