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

- LQIP (Low-Quality Image Placeholder): `width: 40, quality: 'auto:eco', blur: 400` loaded immediately
- Full image: `width: 1200, quality: 'auto'` with srcSet for responsive delivery
- Avatar thumbnails: `width: 80-96, quality: 'auto', crop: 'fill'`
- Never use raw Cloudinary URLs — always go through the helper.

---

## Image Loading — What a Phone Downloads

Two separate problems, solved in two places: what a frame shows *while* a photo
loads, and how many photos are allowed on the wire at once.

### The frame: `ProgressiveImage`

```
src/components/ui/ProgressiveImage.tsx
  shimmer skeleton   ← immediately; the frame is never a blank rectangle
    └── blurred LQIP ← ~1KB, one round trip, the photo's real colours
          └── photo  ← fades in over the blur once decoded
```

`PropertyImage` paints the same three stages for property photos. Key decisions:

- **Cached photos are the failure mode worth guarding.** A callback ref checks
  `complete` on attach: an image already in the cache can finish before React
  attaches `onLoad`, and without the check that photo sits at `opacity-0`
  forever. An invisible image is worse than a slow one, and only reproduces on
  a warm cache.
- **State is stored as the URL it belongs to**, not as a boolean, so a changed
  `src` re-enters the loading state in the same render rather than needing an
  effect to repair it a frame later.
- **The `src` is validated before it reaches the DOM** (`validateImageSrc`):
  scheme plus the control characters the WHATWG URL parser silently strips. A
  value that fails renders the fallback.
- **The blur is the CDN's** (`e_blur`), baked into the cached file, rather than
  a filter the phone re-applies while it is busy decoding the real photo.

### The wire: `sizes` by state, and a bounded queue

```
Home-page city gallery (ElasticGallery)
  ├── expanded panel  → sizes "(min-width: 768px) 50vw, 100vw"   → ~1280w on a 3x phone
  ├── collapsed panel → sizes "(min-width: 768px) 15vw, 30vw"    → ~480w
  └── first panel     → priority (eager + fetchpriority=high), the rest lazy

Destinations corridor (useDestinationImages)
  ├── first 10 photos → straight away
  └── the tail        → 4 workers, each starting the next when its own settles
                        (fetchPriority 'low'; 'lite' halves both numbers)
```

Key decisions:

- **A sliver is not a full-width photo.** Five of six gallery panels start
  collapsed as ~44px strips; letting each claim the viewport width had a phone
  pull six full-size photos before the visitor had seen one. Changing `sizes`
  on expand makes the browser re-pick from the same `srcSet`, and it keeps
  painting the small file until the larger one has decoded — the upgrade is
  never a gap.
- **The corridor's tail is a queue, not a batch.** It is backed by a couple of
  hundred destinations at full-height portrait size; releasing "the rest" on a
  timer meant every one of them hit the wire 1.2s into the page, competing with
  the hero and the gallery the visitor is actually looking at. Workers advance
  on completion *and* on failure, so an unseeded photo cannot park one.
- **`useImageBudget()`** (`src/shared/hooks/useImageBudget.ts`) reports `lite`
  for a saver-mode or 2G/3G connection, lowering widths and quality. Read once
  per mount: re-reading it mid-visit would rewrite the `src` of photos already
  on screen and fetch every one of them again — paying more bytes to honour a
  request to spend fewer. An unknown connection is always `full`, since the API
  ships only in Chromium.

---

## Security Notes
- All API mutations use CSRF cookie (`credentials: 'include'`)
- JWT stored in httpOnly cookies (not localStorage)
- Input sanitisation on the Express layer
- Image uploads validated by Cloudinary (type + size limits on the backend)
