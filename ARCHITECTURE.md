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

---

## Property Map — "Full Map" Destination

The cinematic property map ends in a **Full Map** button. Which full map that
is depends on the listing, not on the button:

```
src/shared/map/mapDestination.ts
  ├── resolveMapDestination({ propertyType, listingType })
  │     luxury-villa → /villas   (gold accent,    "Villas Map")
  │     rent         → /rent     (blue accent,    "Rentals Map")
  │     sale         → /search   (emerald accent, "For-Sale Map")
  │     unknown      → /search   (neutral,        "Full Map")
  └── buildMapFocusTarget(property) → validated { lat, lng, address } | null
        │
        ├── PropertyMapLink  → Map3DBuildings → Map3DControls  (label + colour)
        └── PropertyDetailsPage.handleNavigateToMap            (navigation)
```

Key decisions:
- **One record drives both label and navigation.** The button's text, its
  accent colour and the route it opens all come from the same frozen
  `MAP_DESTINATIONS` entry, so a button can never promise one map and open
  another.
- **Luxury villas win over the listing type.** They are a curated market
  carrying both rentals and sales (`useVillaSearch`), so a villa *for sale*
  still belongs on the villas map — sending it to `/search` dropped the
  visitor into a list that no longer contained the property they came from.
- **Routed, not dispatched.** `handleNavigateToMap` calls
  `navigate(destination.path)` instead of dispatching `SET_ACTIVE_VIEW`, so
  the address bar and the back button follow the visitor onto the map. The
  route handler clears the selected property itself.
- **Untrusted input.** `propertyType` / `listingType` are normalised (not
  trusted to be domain literals) and an unrecognised market falls back to the
  neutral buy map. `buildMapFocusTarget` runs `validateCoordinates` and
  returns `null` rather than a partial payload, so a listing with a missing or
  out-of-range coordinate navigates *without* a fly-to instead of flying the
  destination map to (0, 0). The address is sanitised and length-capped before
  it enters map state.

### One villa mark everywhere

`LuxuryVillaIcon` (`constants/icons.ts`) is a villa under a crown — the same
figure the map pins carry (`src/shared/map/villaMarker.ts`). It is used by the
sidebar's Luxury Villas tab and by `PropertyInfo`'s property-type card, which
previously fell through to the generic `CubeTransparentIcon` because
`luxury-villa` was missing from its icon list. The card's type name reads from
`map.propertyTypes` — the app's one translated list of type names — instead of
a card-only key set that had no entries and rendered the raw `Luxury-Villa`
slug.

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

## Listing Query — Built for 100k Listings

The listing endpoint is the hottest path in the app: it serves the search page,
every city page and every filter change. At 120k listings it was measured
examining **120,000 documents per request** (a full collection scan plus a
blocking in-memory sort, 162 ms on an idle database). Two independent causes,
both fixed:

```
GET /api/properties
  └── filter: status (+ listingType / propertyType / cityKey / price …)
        └── sort: lastRenewed desc          ← equality fields first, sort last
              └── index { status, cityKey, lastRenewed }   (and siblings)
                    └── 22 documents examined, ~1 ms
```

Key decisions:

- **No `status` in the sort.** The query used to prepend `status: -1` before the
  user's ordering. No index can produce `{ status: -1, lastRenewed: -1 }` — an
  index read backwards gives `status ↓, lastRenewed ↑` — so every request paid
  for a blocking sort. Promotion order and highlighting are applied by
  `sortPropertiesWithHighlighting` in Node over the fetched page anyway.
  *Behaviour note:* recently-sold listings are no longer pinned above active
  ones; they appear in normal recency order. Pinning them back while staying
  index-served needs a numeric `statusRank` field, not a sort on `status`.
- **`cityKey` / `countryKey` instead of `.collation()`.** Case-insensitive
  location matching used a collation that no index shares (they are all built
  with the simple collation), which by itself disqualifies every index for a
  string predicate. The model maintains lower-cased keys on every write path —
  `save`, `findOneAndUpdate` / `updateOne` / `updateMany` (the ingest upserts)
  and `insertMany` — and `initDatabase` backfills any document written before
  the field existed. Never set these by hand.
- **Index shape is equality → sort.** Every listing index puts the equality
  fields first and `lastRenewed` last, so one index serves both the match and
  the order.
- **Pagination is clamped.** `limit` is capped (`MAX_PAGE_SIZE`) and NaN-guarded;
  it used to be passed to Mongo verbatim, so `?limit=100000` fetched 100,020
  documents, populated a seller for each and serialised the lot.
- **Cursor pagination is only offered for the default ordering.** The cursor
  compares `createdAt`/`_id`; a price-sorted list paged by it would skip and
  repeat rows, so custom sorts keep offset pagination and get no cursor.

## Load Shedding on the Read Path

Three mechanisms keep a burst of users from multiplying into a burst of queries:

```
socket event ─┬─ setQueryData(detail)         ← immediate, no request
              └─ createBurstCoalescer         ← one jittered list refresh
                    └── GET /api/properties
                          └── apiCache single-flight  ← N concurrent misses = 1 query
```

- **Coalescing + jitter** (`shared/utils/burstCoalescer.ts`): listing events are
  broadcast to *every* connected client, so an unguarded `invalidateQueries` per
  event meant one refetch per open tab within the same millisecond. Bursts now
  collapse into one refresh, delayed by a random fraction of a second so the
  herd spreads out.
- **Single-flight** (`middleware/cache.ts`): on a cache miss the first request
  runs the query and the rest wait for its result. Under load, throughput used
  to sawtooth between 2 and 246 req/s as the cache entry expired and every
  client missed at once.
- **Buffered view counting** (`utils/viewCounter.ts`): a property detail request
  used to perform two awaited writes (`views` on the property, `stats.totalViews`
  on the seller). Counts are now accumulated in memory and flushed in bulk every
  10 s, and on shutdown — a popular listing costs one increment per flush instead
  of one per viewer. Counts are eventually consistent by design; the response
  still reports the incremented value.

Sitemaps follow the same rule: `/sitemap.xml` is a sitemap *index* over chunks
of 25,000 URLs (`/sitemap-properties.xml?page=N`), because a single sitemap is
invalid above 50,000 URLs and building one from every listing meant a full
collection scan per crawler hit.

The `loadtest/` directory holds the tools these numbers come from —
`seed-scale.mjs` to reach 100k listings, `explain-queries.mjs` to check the
query plans and index drift, `run.mjs` for HTTP load.

---

## Security Notes
- All API mutations use CSRF cookie (`credentials: 'include'`)
- JWT stored in httpOnly cookies (not localStorage)
- Input sanitisation on the Express layer
- Image uploads validated by Cloudinary (type + size limits on the backend)
