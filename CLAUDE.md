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
| Page | React Router | which page, ids, tabs — never duplicated in state |
| Local state | `useState` | Component-only ephemeral state |

### Feature-Sliced Design
Each feature owns its slice: `src/features/[feature]/{api,components,hooks,types}`.
Shared UI goes in `src/components/`, shared utilities in `src/shared/`.

Query keys are centralised in `src/shared/query/queryKeys.ts` — always use that file instead of inline strings.

### Routing
React Router 7; the URL alone decides the page. See `src/app/router/` and
ARCHITECTURE.md → Routing.

```ts
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';

navigate(paths.agent(agentId));                              // add the language prefix, push
navigate(paths.property(id), { state: { property } });       // hand over data the page can show at once
navigate(paths.search({ city }), { replace: true, direction: 'back' });
goBack(paths.agencies());                                    // history back, or this page when there is none
```

- Never `window.history.pushState`, never `dispatch` a view: there is no view state.
- Read ids and tabs with `useParams()`; read "which page is showing" with `useRouteView()`.
- New page → builder in `paths.ts` + route in `routes.tsx`.

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
- Phones held sideways get the desktop layout with ~400px of height: tighten with the `landscape:` variant
  (JS: `useShortLandscape()`), size beside the sidebar with `--sidebar-rail-w`, and give centred dialogs
  `.dialog-fit`. See ARCHITECTURE.md → Responsive Layout.

---

## i18n

Locales: `src/i18n/locales/{lang}/{namespace}.json` for 10 languages (en, sq, bs, bg, hr, el, mk, me, ro, sr).
Every new translation key must be added to all 10 locale files simultaneously.

---

## Images

Images are stored in Cloudflare R2 — there is no Cloudinary. Always use `optimizeImageUrl(url, { width })`
(add `height` for a box) and `imageSrcSet()` from `config/mediaConfig.ts` — never raw image URLs and never
hand-built size file names. Each photo's sizes are made once at upload (`w160…w1920.webp`, `lqip.webp`,
`original.jpg`, see `backend/src/config/mediaVariants.ts`); the helper picks one and never asks for a size the
photo doesn't have. External feed images go through the resizing `/api/image-proxy`. Placeholders:
`{ width: 40, blur: 400 }`. Backend uploads go through `uploadImage`/`uploadMedia` in
`backend/src/services/mediaService.ts` (indexed in the `MediaAsset` collection) — see docs/MEDIA_STORAGE.md.


# BalkanEstate — working rules

These rules apply to the whole repository (frontend and backend). The full
architecture is in [`ARCHITECTURE.md`](ARCHITECTURE.md); `backend/CLAUDE.md`
holds the detailed React/TypeScript guidance.

## Small files, one job each

- **One concern per file.** A component renders, a hook holds state and
  effects, a util computes. If a file does two of these, split it.
- **Components stay under ~150 lines.** Past that, pull out a sub-component (a
  bar, an overlay, a card) or a hook (derived data, a flow). Don't squeeze
  lines to fit; split along a real seam.
- **Logic lives in pure functions** (`utils/`), so it can be unit-tested
  without rendering. Components and hooks stay thin wrappers over it.
- **Group a feature's pieces in a folder** once it has more than two files
  (e.g. `explorer/budget/`: the component, its panel, form, cards, hooks).
- **Share, don't copy.** Reuse an existing type, helper or style constant
  before adding a near-duplicate (e.g. `Bounds` from `polygonGeometry`,
  `unitArea` from `unitFilters`, `EXPLORER_PILL`).
- **Name files after what they export**; hooks start with `use`.

## Frameworks, the way they are meant to be used

- **React 18:** function components and hooks. `useEffect` only for real side
  effects (timers, listeners, animations), never to fetch data. Keep the
  dependency arrays honest, clean up timers and listeners, and keep the latest
  callbacks in refs instead of re-running effects.
- **TanStack Query** for all server data: a hook per query with a stable
  `queryKey`, `retry: false` when "not found" is a valid answer.
- **TypeScript strict:** no `any`. Use discriminated unions for results
  (`{ ok: true; value } | { ok: false; error }`) and narrow with
  `=== false`.
- **Tailwind** for styling, light theme only. **framer-motion** for
  enter/exit animation, always respecting `useReducedMotion()`.
- **Express + Mongoose:** thin controllers, logic in services; validate input
  on the server even when the client already did.

## Every change

- **Validation and error handling on both sides.** Show the reason next to the
  field (`role="alert"`). Never leave the user at a dead end; offer the next
  best thing.
- **Translate every new text into all 10 locales** (en, sq, bs, hr, me, sr,
  mk, bg, el, ro) in the same change, and keep an English `defaultValue` in
  code.
- **Accessibility:** buttons have names, dialogs have labels, Esc closes the
  top layer (`useEscapeLayer`), touch targets are at least 44px.
- **Tests:** unit-test the pure logic, and add a component test for the user
  flow. Don't delete or weaken a test to make it pass. Update it only when the
  behaviour was meant to change, and say so.
- **Never claim something was tested or verified if it wasn't.**
