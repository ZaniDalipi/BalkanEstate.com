# BalkanEstateAI — Architecture

## System Overview

```
Browser
  └── React SPA (Vite)
        ├── AppContext (useReducer — global state)
        ├── react-i18next (10 languages)
        ├── React Router v6
        └── Feature modules
              └── HTTP / WebSocket
                    └── Express API (Node.js)
                          └── MongoDB (Mongoose)
                                └── Cloudinary (image CDN)
```

---

## Frontend Architecture

### Feature-Sliced Design
Code is organised by **feature**, not by type. Each feature owns its components, hooks, and API calls.

```
src/features/
├── property-details/     # Single property view (orchestrator page)
├── properties/           # List views, search, hooks
├── rental/               # Rent-specific modals and calculators
├── messaging/            # Real-time inbox
├── agents/               # Agent profiles and directory
├── home/                 # Homepage sections
├── calculators/          # Mortgage & affordability
└── ...

src/components/property/  # Shared property UI (used by multiple features)
├── PropertyGallery.tsx   # Image carousel + video + street view
├── PropertyInfo.tsx      # Stats grid + description + amenities
├── PropertyContact.tsx   # Seller sidebar (desktop) + contact actions
├── PropertyPhotos.tsx    # Thumbnail strip
├── PropertyMapLink.tsx
└── NeighborhoodInsights.tsx
```

### Global State
`AppContext` (React Context + `useReducer`) holds:
- `currentUser` / `user`
- `savedHomes`, `comparisonList`
- Active view / selected property / agent / agency
- Alert / notification queue

### Data Fetching
- Custom hooks in `src/features/*/hooks/` (e.g. `useProperty`, `useRealtimeProperties`)
- Direct `apiService.ts` calls for mutations
- WebSocket for real-time property updates

---

## Property Gallery — Dynamic Aspect Ratio

**Problem**: fixed-height containers cause dark letterbox bars or cropped images when the image aspect ratio doesn't match.

**Solution**: the container height is derived from each image's actual pixel dimensions.

```
ImageRatiosRef (useRef<Record<url, ratio>>)
    │
    ├── populated by: img onLoad → naturalWidth / naturalHeight
    ├── populated by: callback ref (handles already-cached images)
    └── read by: container style={{ aspectRatio: ratio ?? '16/9' }}
```

Key decisions:
- **Never reset ratio to null** when navigating — keeps previous ratio until new one loads (avoids flash to 16/9).
- **Cache by URL** — navigating back to a seen image applies ratio instantly.
- **`max-h: 90vh`** prevents portrait images from overflowing the viewport.
- `object-contain` ensures the full image is always visible; LQIP blurred background fills any bars.

---

## Home-Page City Gallery (Elastic Gallery)

Accordion of city panels rendered inside the hero, directly under its Buy /
Rent / List buttons: the active panel expands to 4× the width of its
siblings, the rest collapse into labelled slivers. Every panel offers Buy and
Rent actions, each opening `/search` or `/rent` filtered to that city.

```
CityShowcase (MongoDB)          ← the ONLY source of the gallery's content
  └── GET /api/city-showcase    ← active rows, display order (cached 5 min)
        └── getShowcaseCities() ← drops rows that fail validation
              └── useShowcaseCities()          (React Query, public key)
                    └── CityShowcaseSection    ← picks a random subset, maps to gallery items
                          └── <ElasticGallery> ← presentational, no data access
```

Key decisions:
- **No fallback list.** Nothing is hardcoded and no seeded photo library sits
  behind it, so `imageUrl` is required in the schema, on the wire and in the
  admin form. Empty or failed load → the section does not render.
- **Photo before row.** `POST /admin/city-showcase/upload-image` returns a URL
  the create form puts into its draft — a panel cannot be saved without one.
- **Expand vs. act are separate controls.** Hover, focus, or a tap expands a
  panel; only its Buy/Rent buttons navigate. Splitting these is what lets a
  touchscreen tap reveal a panel without committing to it — no "first tap
  expands, second tap selects" state to track.
- **Random per visit.** `pickShowcaseCities` draws `CITY_SHOWCASE_MAX_PANELS`
  (6) cities from every active one, one per country before any repeats, so the
  gallery reads as "the Balkans" rather than whichever handful was curated
  first. Memoised on the fetched list, so a re-render never reshuffles panels
  under the pointer.
- **Image quality.** Both automatic city-photo pipelines
  (`cityImageService.ts`'s Wikipedia fetch, `seedCityImages.ts`'s Commons
  fetch) and the gallery's own Cloudinary delivery request (`crop: 'limit'`)
  are written to never upscale a source smaller than the frame — upscaling,
  not the source photo, was what actually produced blurry panels.
- **Photo credit.** `imageCredit` (optional, e.g. "Photo by Jane Doe on
  Unsplash") shows as a small caption in the corner of an expanded panel,
  announced to screen readers rather than `aria-hidden` since it's real
  information, not a duplicate of the panel's own label. Admins sourcing
  photos from Unsplash/Pexels/etc. paste the credit line those sites already
  show next to their download button — most such licenses don't strictly
  require attribution, but carrying it costs nothing and is the safer default.

Admin: `AdminSidebar → City Gallery` (`/admin/city-showcase`),
`CityShowcaseManager` + `CityShowcaseForm` + `useCityShowcaseManager` +
`cityShowcaseImportService` (the "Import cities from database" action).

### City directory — typo-proofing the admin form

`CityShowcaseForm` always renders as a modal. Country is a closed `<select>`
sourced from the app's existing canonical `BALKAN_COUNTRIES` (never
free-text, so it can't drift from every other country filter in the app);
city is a free-text field paired with a `<datalist>` of names already known
for the chosen country, built from two sources: `CityMarketData` (via a
lightweight `GET /admin/cities`) and the gallery's own curated rows.

```
useCityShowcaseManager.save()
  └── ensureCityInDirectory({city, country, countryCode})
        └── POST /admin/cities  → upserts a minimal CityMarketData stub
              (all analytics fields zeroed, featured:false, dataSource:'manual')
              idempotent + case-insensitive, so it's safe to call on every save
  └── createCityShowcase / updateCityShowcase   (unchanged)
```

A city typed for a gallery panel is never lost to that panel alone: saving
always ensures it exists in `CityMarketData` too (as an inert stub — no
invented market statistics), so it becomes a selectable suggestion for every
other city picker and a candidate for the "Import cities from database"
action, without requiring a full market-data form.

### Import candidates on a fresh database

`data/balkanShowcaseCities.ts` lists 89 well-known cities across all 10
`BALKAN_COUNTRIES` — one shared list, not a duplicate per file. It feeds two
things that used to each keep their own copy:

- `scripts/seedCityImages.ts` — fetches a Wikipedia/Commons photo for each and
  uploads it to the `city-{country}-{city}` Cloudinary library.
- `cityShowcaseImportService.importCitiesFromMarketData()` — offers these as
  import candidates alongside `CityMarketData` rows, so "Import cities from
  database" still produces real panels on a fresh database with zero market
  data, as long as the Cloudinary library above has been seeded.
  `selectImportCandidates` dedupes the two sources by city+country and keeps
  the `CityMarketData` row when a city appears in both, since only that row
  carries real `featured`/`listingsCount` signal. `resolveCityPhoto` still
  checks the curated Cloudinary library before any row's `imageUrl`, so a
  built-in candidate with no market-data row resolves through the same path a
  market-data city would.

---

## Sticky Bottom Action Bar

Mobile-only companion to the desktop `PropertyContact` sidebar.

```
PropertyDetailsPage (mobile viewport)
  └── Fixed bottom bar [lg:hidden]
        ├── Agent avatar  ← onError fallback to initials + ripple-ring animation
        ├── Call button   ← tel: link
        └── Schedule Tour ← opens own ScheduleViewingModal instance
```

Visibility rules:
- Hidden when `isOwner === true`
- Hidden when `property.status === 'sold'`
- Hidden on `lg:` and above (sidebar takes over)

---

## Internationalisation (i18n)

**Library**: `react-i18next`
**Locales**: `src/i18n/locales/{lang}/{namespace}.json`

| Language | Code |
|----------|------|
| English  | `en` |
| Albanian | `sq` |
| Bosnian  | `bs` |
| Bulgarian | `bg` |
| Croatian | `hr` |
| Greek    | `el` |
| Macedonian | `mk` |
| Montenegrin | `me` |
| Romanian | `ro` |
| Serbian  | `sr` |

### Naming Convention — property stats
| Label | Correct key | Deprecated key |
|-------|-------------|----------------|
| Bedrooms | `features.bedrooms` | ~~`features.beds`~~ |
| Bathrooms | `features.bathrooms` | ~~`features.baths`~~ |
| Living Rooms | `features.livingRooms` | — |
| Area | `features.area` | — |

**Rule**: every new translation key must be added to all 10 locales simultaneously.

---

## Icon System (`constants/icons.ts`)

All icons are stroke-based SVG components built with `React.createElement` (the file uses `.ts` extension, not `.tsx`).

```ts
// Base wrappers
const Icon      // stroke icons  (fill="none", strokeWidth=1.5)
const SolidIcon // filled icons  (fill="currentColor")

// Property stat icons (24×24 viewBox, multiple <path> children)
BedIcon         // bed: headboard post, mattress, pillows, footboard
BathIcon        // bathtub: tub body, faucet pipe, drain legs
LivingRoomIcon  // sofa: backrest, armrests, cushion, divider, legs
SqftIcon        // expand arrows (area/m²)
```

---

## Schedule Viewing Modal

3-step wizard:

```
Step 1: datetime
  ├── Date grid (next 21 days, filtered by seller's allowed days)
  └── Time pills (horizontal scroll, 12h AM/PM format, booked slots disabled)

Step 2: contact details
  └── Name*, Email*, Phone (optional)

Step 3: confirm
  └── Summary + Add to Calendar (.ics download)
```

Availability source priority:
1. `GET /viewings/availability/{propertyId}` (includes booked slots)
2. `property.visitAvailability` (local config, no booked-slot info)
3. Default: Mon–Fri, 09:00–18:00, 30-min slots

---

## Cloudinary Image Pipeline

```
Raw URL → optimizeCloudinaryUrl(url, { width, quality }) → <img src>
                                                          → cloudinarySrcSet([480,768,1200,1920])
```

- LQIP (Low-Quality Image Placeholder): `width: 40, quality: 'auto:eco'` loaded immediately
- Full image: `width: 1200, quality: 'auto'` with srcSet for responsive delivery
- Avatar thumbnails: `width: 80-96, quality: 'auto', crop: 'fill'`
- Never use raw Cloudinary URLs — always go through the helper.

---

## Security Notes
- All API mutations use CSRF cookie (`credentials: 'include'`)
- JWT stored in httpOnly cookies (not localStorage)
- Input sanitisation on the Express layer
- Image uploads validated by Cloudinary (type + size limits on the backend)
