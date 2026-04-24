# BalkanEstate.com — Claude Code Guidelines

## Project Overview
Full-stack real estate platform for the Balkans region (10 countries, 10 languages). Buyers browse/save properties; sellers/agents list and manage them; built-in messaging, scheduling, mortgage calculator, and neighborhood insights.

**Stack**: React 18 + TypeScript + Vite · Tailwind CSS · Framer Motion · react-i18next · Express/Node.js · MongoDB/Mongoose · Cloudinary CDN

---

## Architecture Principles

### Directory Layout
```
src/
├── components/property/   # Shared property UI components (Gallery, Info, Contact, Photos, Map)
├── features/              # Feature-sliced modules
│   ├── property-details/  # PropertyDetailsPage orchestrator + sub-components
│   ├── properties/        # Hooks (useProperty, useRealtimeProperties)
│   ├── rental/            # Rental-specific UI (ScheduleViewingModal, etc.)
│   ├── messaging/         # Inbox + ConversationView
│   └── ...
├── i18n/locales/          # Translation JSON files (en/bg/bs/el/hr/me/mk/ro/sq/sr)
├── context/               # AppContext (global state via useReducer)
├── hooks/                 # Shared hooks (useSwipeGesture, useLocalizedNavigation, …)
├── services/              # API service (apiService.ts)
├── config/                # Cloudinary config, constants
└── types/                 # Shared TypeScript types (Property, Agency, User, …)
constants/
└── icons.ts               # All SVG icon components (stroke-based, 24×24)
```

### Key Patterns
- **Feature-sliced**: page-level orchestration in `features/`, reusable UI in `components/`
- **Controlled/uncontrolled gallery**: `PropertyGallery` supports both modes via optional controlled props (`activeCategory`, `currentImageIndex`, callbacks)
- **i18n**: always use `t('namespace:key', 'fallback')`. All labels live in `src/i18n/locales/{lang}/property.json` (and other namespace files). Never hard-code user-visible strings.
- **Icons**: defined in `constants/icons.ts` as `React.createElement` (`.ts` file, not `.tsx`). Use the `Icon` base (stroke) or `SolidIcon` base (fill).
- **Images**: always route through `optimizeCloudinaryUrl(url, { width, quality })` and `cloudinarySrcSet`. Never use raw Cloudinary URLs directly.
- **Translations namespace**: `property` namespace is the primary one for `PropertyInfo`, `PropertyContact`, `PropertyGallery`, `PropertyDetailsPage`.

---

## Translation Rules
- Keys live in `src/i18n/locales/{lang}/property.json` (and other namespace JSONs).
- Correct keys for property stats: `features.bedrooms`, `features.bathrooms`, `features.livingRooms`, `features.area`
- **Do not** use `features.beds` or `features.baths` — those are legacy aliases.
- When adding a new key, add it to **all 10 locales** (en bg bs el hr me mk ro sq sr). If a translation is unknown, copy the English value temporarily — never leave a key missing.
- Montenegrin (`me`) is similar to Serbian (`sr`) / Bosnian (`bs`) — use those as reference.

---

## Styling Conventions
- Tailwind only. No inline styles unless strictly needed for dynamic values or CSS env() functions.
- Safe-area padding for sticky bars: `style={{ paddingBottom: 'calc(Xrem + env(safe-area-inset-bottom, 0px))' }}`
- Mobile-first: design for `< 640px` first, then `sm:` / `lg:` breakpoints.
- **Sticky bottom bar** is `lg:hidden` — desktop has the PropertyContact sidebar instead.
- Z-index ladder: gallery overlays `z-[1]`, gallery frame `z-[2000]`, modals `z-[9999]`, image viewer `z-[6000]`.

---

## Property Gallery (`PropertyGallery.tsx`)
- Container height is **dynamic** — set via `aspectRatio` inline style derived from each image's `naturalWidth / naturalHeight` captured in `onLoad` and cached in `imageRatiosRef` (a `useRef<Record<string, number>>`).
- Default aspect ratio before load: `16/9`. Max height: `90vh`.
- Images use `object-contain` so the full image is always visible; a blurred LQIP fills any letterbox bars.
- Swipe gesture handled by Framer Motion `drag="x"` on `motion.button`; keyboard handled by `useEffect` + `window.addEventListener`.
- Preloads adjacent images eagerly so swipe feels instant.

---

## Sticky Bottom Bar (`PropertyDetailsPage.tsx`)
- Mobile-only (`lg:hidden`), fixed to bottom with safe-area inset.
- Shows: agent avatar (with `onError` fallback to initials) + ripple-ring pulse animation + green online dot + Call button + Schedule Tour button.
- Hidden for property owners (`isOwner`) and sold properties.
- Opens its own `ScheduleViewingModal` instance (separate from the one inside `PropertyContact`).
- Avatar error state (`sellerAvatarError`) is reset via `useEffect` when `property.seller?.avatarUrl` changes.

---

## Schedule Viewing Modal (`ScheduleViewingModal.tsx`)
- 3-step flow: datetime → contact details → confirm.
- Fetches availability from `/viewings/availability/{propertyId}` on open; falls back to `property.visitAvailability` if API unavailable.
- Times displayed in **12-hour AM/PM** format (`formatTime12h` helper). Time slots are a horizontally scrollable pill row (snap-x, overflow-x-auto).
- Dates shown as a grid (day name + short date). Booked slots are visually disabled with strikethrough.

---

## Code Style
- No comments unless the WHY is non-obvious.
- No `console.log` in committed code.
- TypeScript strict — no `any`. Use `unknown` at boundaries.
- `useCallback` / `useMemo` only when there's a real re-render cost — not by default.
- Prefer editing existing files over creating new ones.
- When changing a shared icon, verify no other consumer is broken.
