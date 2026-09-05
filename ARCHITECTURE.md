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
                                └── Bunny.net (Edge Storage + image CDN)
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
  fetch) and the gallery's own CDN delivery request (`crop: 'limit'`)
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

### One photo per city — resolution across three collections

The same place can be curated three times over: as a city (`CityMarketData`,
Explore Cities), as a gallery panel (`CityShowcase`, the home page) and as a
villa destination (`VillaDestination`, the villas corridor). Each had its own
upload, so the same photo of Tirana was being sourced and stored three times,
and none of them was what Explore Cities actually drew.

`backend/src/services/cityPhotoService.ts` resolves them in one documented
order, keyed on a normalised (city, country) pair — `placeKey` is NFD,
accent-stripped, lowercased and punctuation-collapsed, so "Prishtinë",
"PRISHTINA " and "prishtina" are one place:

```
1. manual            — an admin set it on the city itself; always wins
2. city-gallery      — the active CityShowcase panel for this city
3. villa-destination — an active VillaDestination for the same place
4. auto              — whatever cityImageService's Wikipedia seeder stored
```

- **Batched, not per-city.** The Explore Cities list asks for ~90 cities at
  once, so resolution is exactly three queries (one per collection) regardless
  of how many cities are being resolved — `loadCityPhotoCandidates(pairs)`.
- **Each collection is independently fault-tolerant.** One lookup throwing is
  logged and skipped rather than failing the resolution: a gallery outage must
  degrade to the city's own photo, not blank every card on the page.
- **Villa destinations match on either name.** A destination names its place in
  `name`, and separately records which seeded city photo it borrowed
  (`imageCity`/`imageCountry`) — either identifies the city.
- **`https` only, everywhere.** A stored value that isn't an `http(s)` URL is
  dropped on both sides (`usableUrl` in the service, `validateCityPhoto` and
  `cityImageSources` on the client). These URLs land in an `<img src>` served
  to every visitor.

The resolved photo is attached by `withResolvedPhotos` in
`cityMarketDataService` (`getFeaturedCities`, `getCitiesByCountry`,
`getCityMarketData`), which returns `CityMarketDataResponse` — the wire type,
distinct from the stored row because `imageSource` widens from the stored
`'manual' | 'auto'` to the resolved four-value `CityPhotoSource`.

**The client reads it through `cityImageSources`**
(`src/features/cities/utils/cityImage.ts`), which returns an *ordered* list
rather than one URL:

```
[ city.imageUrl (resized if on our CDN) , convention path `city-{country}-{city}` ]
   → then Wikipedia (card / hero only) → then a generated gradient
```

Both are returned because whether an image loads is only known in the browser:
the convention id 404s for any city without that asset, and a curated URL can
point at a photo since deleted. `CityMarketCard` walks the list by index in
state; `CityDashboard`'s hero and its "other cities" thumbnails walk it via
`dataset.sourceIndex` in `onError`. Before this the UI derived every city
picture from the convention id alone, which is why the stored `imageUrl` was
written by the backend and read by nobody — an admin edit changed a row and
nothing else.

**Admin:** `AdminSidebar → City Photos` (`/admin/city-photos`),
`CityPhotosManager` + `CityPhotoRow` + `useCityPhotosManager`.

- Shows what wins today with a badge naming its source, and offers the photos
  curated elsewhere for the same place as one-press **adopt** buttons.
- **Adopting copies the URL** and pins it as `manual` rather than pointing at
  the other collection. Deliberate: whoever curates villas can deactivate or
  replace a destination, and a city whose picture silently changed for that
  reason would be impossible to explain.
- Setting a photo marks it `imageSource: 'manual'`, which also makes
  `cityImageService.refreshCityImage` and `seedMissingCityImages` leave that
  city alone — an override the next automatic refresh would overwrite is not
  an override.
- **Clear override** unsets the fields and hands the city back to the chain;
  the stored asset is left in place, since another city or gallery panel
  may be using the same upload.
- Mutations invalidate `cityPhotoKeys`, `cityShowcaseKeys` and `['cities']`,
  and the routes call `invalidateCache('/api/cities')` — the photo is read by
  three surfaces, so an edit that only refreshed this screen would leave the
  public pages serving the previous picture until it went stale.

---

## Explore Cities — Market Update Digest

`/explore-cities` shows the *current* market figures. The digest answers the
question that page cannot: **what changed, and where did it change most?**

```
CityMarketData                         ← current figures (refresh job: 1st & 15th, 03:00)
  └── captureCityMarketSnapshots()     ← writes CityMarketSnapshot ONLY when the
        │                                 upstream fingerprint changed
        └── computeCityMarketChanges({ since })
              │   pairs each city's newest snapshot with its baseline at `since`
              │   → CityMarketChange (price delta, trend relabel, magnitude)
              └── runCityMarketDigest({ reason })
                    ├── cadence guard      (CityMarketDigestRun — newest attempt)
                    ├── window             (CityMarketDigestRun — newest `sent` run)
                    ├── recipients         (verified · emailPreferences.cityMarketUpdates)
                    ├── rankChangesForFocus(saved searches + home country)
                    └── emailService.sendCityMarketUpdateDigest()
```

Two triggers and two audiences:

| Reason | When | Gate | Audience |
|--------|------|------|----------|
| `source-update` | right after each market-data refresh | ≥ 7 days since the last **delivered** digest | everyone if a city moved ≥ `significantPriceChangePct` (5%); otherwise only the followers of the cities that moved |
| `monthly` | cron `0 9 2 * *` | ≥ 25 days since the last **delivered** whole-audience digest | everyone |
| `manual` | `POST /api/cities/market-digest/run` (admin) | none — but an empty digest is still never sent | everyone |

### Saved places — following a city

```
/explore-cities  ─ tab: All cities ─ CityMarketCard ─ SaveCityButton
                 └ tab: Saved places ─ SavedCitiesPanel
                        │
                        └── useSavedCities (React Query)
                              └── POST /api/saved-cities/toggle
                                    └── SavedCity { userId, cityKey }
                                          └── digest audience + ranking
```

Key decisions:
- **A follow is a subscription, not a bookmark.** `SavedCity` is what decides
  who gets an out-of-cycle email and which city leads it. That is why the panel
  states "we email you when the market in these cities moves" next to the list,
  with a link to the email settings.
- **The server decides what can be followed.** A save is rejected unless the
  city exists in `CityMarketData`, so the list is always joinable against real
  market data and stores the directory's spelling rather than the client's.
  `cityKey` ("tirana|albania") carries the unique index, so casing and
  whitespace can't produce duplicates and a concurrent double-save is resolved
  by the index rather than by a read-then-write race.
- **Following changes the audience, not just the order.** In a `saved-cities`
  run the email contains *only* the reader's followed cities; in an `all` run
  the followed cities lead and regional movers fill the remaining slots.
- **A follower-only send must not silence the monthly.** Cadence counts only
  *delivered* runs (a skipped run emailed nobody, so it cannot block the next
  one), and only an `all` run advances the comparison window — the rest of the
  audience is still owed those changes.
- **Per-reader watermark.** `User.cityMarketDigestSentAt` filters out changes a
  reader has already been emailed, so a follower who got an out-of-cycle alert
  does not see the same move again in the monthly roundup.
- **The saved tab reuses the market data the page already has.** The endpoint
  returns follow identities only; cards come from the loaded city list, so
  there is one source for every market number. A followed city with no market
  row still gets a row (with an unfollow control) rather than vanishing.

Key decisions:
- **A snapshot means "the sources published something".** The fingerprint hashes
  only upstream figures (price, growth, yield, scores, trend) and deliberately
  excludes platform-derived counts (`listingsCount`, `averageDaysOnMarket`),
  which change on every listing edit. Without that exclusion every capture would
  look like fresh source data and the email would fire on our own noise.
- **Two triggers, not two pipelines.** "Every month" and "whenever the sources
  update" are the same job with different gates, so there is one place where the
  audience, the ranking and the copy are decided.
- **The run collection owns cadence *and* the window.** The newest run of any
  status says how recently we tried (that is what prevents a double send); the
  newest `sent` run's `windowEnd` is where the next diff starts (that is what
  prevents reporting the same move twice). A skipped or dry run advances neither,
  so changes accumulated in its window are still owed to the reader.
- **No fabricated percentages.** A delta is `null` — never a number — when the
  baseline is zero, a reading is missing/non-finite, or the change exceeds
  `maxCredibleChangePct` (corrupt feed, not a market that doubled overnight). A
  city with no baseline snapshot is skipped rather than reported as a jump from
  nothing, and a city whose figures are incomplete never enters a snapshot.
- **A re-labelled market is news at any size.** A sub-threshold price move is
  still reported when `marketTrend` flipped — "Belgrade is now declining" is
  exactly what a percentage cannot convey.
- **Personalised order, shared content.** Every reader gets the region's biggest
  movers; cities from their saved searches sort first (and carry a ★), their
  country next. Ranking is a pure function (`rankChangesForFocus`) over a focus
  set, so it is testable without users.
- **Charts drawn with table cells.** Bar widths are `<td width="N%">` — the only
  chart primitive every mail client renders identically. No images to block, no
  CSS gradients to strip.
- **Its own unsubscribe.** `emailPreferences.cityMarketUpdates` is switchable on
  its own: the footer's first link carries `type=cityMarketUpdates`, so turning
  the digest off leaves property alerts, price drops and messages untouched.
  Transactional mail is never switched off, by any link.
- **Thresholds are config, not literals.** `config/cityMarketDigest.ts` reads
  env overrides through a validator — a malformed value falls back to the
  documented default instead of poisoning the job, and `significant` is clamped
  so it can never be looser than `material`.

Files — backend: `services/cityMarketChangeService.ts` (capture + diff),
`services/cityMarketDigestService.ts` (audience + orchestration),
`services/savedCityService.ts` (follows), `jobs/cityMarketDigestJob.ts`
(cron/admin entry points), `models/CityMarketSnapshot.ts`,
`models/CityMarketDigestRun.ts`, `models/SavedCity.ts`,
`config/cityMarketDigest.ts`, `emailService.sendCityMarketUpdateDigest`.
Frontend: `features/cities/components/{CityMarketCard,ExploreCitiesTabs,
SavedCitiesPanel,SaveCityButton}.tsx`, `hooks/useSavedCities.ts`,
`api/savedCitiesApi.ts`.

Endpoints: `GET/POST /api/saved-cities` (follow list and toggle, per reader);
admin `GET /api/cities/market-digest/preview` inspects the pending changes and
`POST /api/cities/market-digest/run` (`{ dryRun?, force? }`) sends on demand.

---

## Neighbourhood Map — shapes, basemap, freshness

The Explore-Neighborhoods map draws one partition of the city and says which
kind it is drawing:

```
GET /api/cities/geodata/:city/:country
  └── geoDataService.getCityGeoData()
        ├── Nominatim  → city area id
        ├── Overpass   → admin relations (level 7–10)
        │                + place areas (neighbourhood/suburb/quarter/…),
        │                  as relations AND closed ways
        ├── selectBoundarySet()   ← ONE coherent set, never a mix
        │     admin at 3–60 features  → source: 'admin'
        │     else ≥3 place areas     → source: 'place'
        └── cached 90 days with its fetch time

CitySuburbMap
  ├── real boundaries → GeoJSON from OSM            ("📍 OSM boundaries")
  └── none available  → tessellateDistricts(centres) ("◇ Approx. districts")
```

Key decisions:
- **Neighbourhoods are usually not administrative units.** Tirana's Blloku is
  `place=neighbourhood` on a closed way, so a query restricted to
  `boundary=administrative` relations returned nothing and every such city fell
  back to drawn circles. The query now also asks for place areas, and ways as
  well as relations, because that is how neighbourhoods are actually mapped.
- **One partition, never two.** Administrative districts and place areas cover
  the same ground; drawing both would overlay two different truths.
  `selectBoundarySet` picks admin when it exists at a readable granularity
  (coarser level first: level 9 districts beat level 10 blocks), else places.
- **An unnamed area is dropped.** Every polygon carries a permanent name label,
  so a shape with no `name` tag was previously labelled "Region 123456".
- **Circles → a nearest-centre partition.** Where OSM has no polygon, the
  fallback is a Voronoi tessellation of the neighbourhood centres
  (`utils/districtTessellation.ts`): contiguous, non-overlapping districts that
  read as a map, instead of overlapping bubbles that hid each other and their
  labels. It is an approximation of *where a neighbourhood is nearest*, not a
  claim about borders, and the badge says so. Pure and dependency-free
  (half-plane clipping), with the invariants tested: every centre falls inside
  its own district and inside no one else's.
- **Basemap keys are resolved centrally.** CARTO and Stadia now watermark
  keyless tiles with "API KEY REQUIRED" — which is what covered the map.
  `config/mapStyles.ts` substitutes a keyless provider unless a key is set:
  - `VITE_CARTO_API_KEY` / `VITE_STADIA_API_KEY` → use those providers, key appended
  - no key → OpenStreetMap (`VITE_MAP_KEYLESS_PROVIDER=esri` switches every map
    to Esri's light/dark grey canvas, which is closer to the CARTO look)

  The var is supplied to the production build in `.github/workflows/deploy.yml`
  (overridable by a repo secret), to CI, and to the dev compose file, and is
  documented in `.env.example`. OSM's Tile Usage Policy asks heavy/commercial
  users to move to their own or a commercial provider — setting a CARTO key is
  that exit, with no code change.
  Attribution travels with the resolved layer, so a substituted basemap is
  never credited to CARTO. Every tile host must also be in the backend CSP
  (`imgSrc` in `middleware/security.ts`) — a missing host fails as blank tiles.
- **Estimated prices are stacked, not justified.** In a ~140px tile a
  right-aligned price collided with the wrapped label ("1-Bedroom€174,000").
  The tiles now read label → price → size, with `tabular-nums` so the four
  figures align across the grid. `utils/priceEstimates.ts` does the arithmetic
  behind the shared `validatePrice`/`validateArea` guards: an unusable €/m²
  (zero, missing, non-finite, absurd) yields *no* estimates and the section
  hides, rather than rendering a grid of confident "€0"; one bad size drops its
  own tile, not the grid.
- **The reader is told when the data was fetched.** `DataFreshness` renders the
  age ("Data fetched 3 days ago") with the exact timestamp in the tooltip and a
  screen-reader `<time>`; it renders *nothing* without a usable timestamp rather
  than implying freshness. Shown for the suburb figures and, separately, for the
  OSM shapes on the city dashboard, and for the newest row in the set on
  `/explore-cities`. A future timestamp (clock skew) reads as "just now".

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

## Map Clusters — opening a bubble

A cluster bubble is a promise: "there are N listings here". Tapping it has to
keep that promise, so the interaction is driven by the cluster's *own* markers
rather than a fixed zoom step.

```
MarkerClusterer.onClusterClick
  └── createClusterActivation()            src/features/map/utils/clusterZoom.ts
        ├── bubble press + ripple          (skipped under prefers-reduced-motion)
        ├── boundsOfPositions(members)  ─┐
        ├── cameraForBounds(...)         ├─ src/features/map/utils/clusterCamera.ts
        ├── createFlightPath(from, to)  ─┘  (Van Wijk & Nuij optimal path)
        │     └── rAF → map.moveCamera(...) each frame
        └── on map idle
              ├── bloomMarkers()   — revealed pins pop in, nearest anchor first
              └── spiderfy()       — only when no zoom could separate them
```

Key decisions:
- **Fit the cluster, don't guess a zoom.** The old handler panned to the click
  point and stepped `+4` zoom levels on a `setInterval`, which overshot small
  clusters and left big ones still clustered. The camera now targets
  `cameraForBounds` of the member markers, so the listings the bubble stood for
  are on screen when it lands. When those bounds already fill the viewport the
  target is nudged to `currentZoom + 1`, so a tap always visibly breaks the
  cluster up instead of looking inert.
- **One movement, not three.** `createFlightPath` is the Van Wijk & Nuij (2003)
  smooth-and-efficient zoom interpolation — the curve behind Mapbox's `flyTo`.
  It arcs the camera out mid-journey and eases it down onto the target in a
  single rAF-driven move, instead of pan → wait → step the zoom.
- **Fractional zoom only where it renders.** Vector maps get the continuous
  path; raster maps quantise each frame and aim at an integer zoom from the
  start, so the final frame never snaps sideways.
- **The visitor can always take over.** A drag or wheel during the flight
  cancels it where it stands (and cancels the reveal with it).
- **Spiderfy is the safety net, not the mechanism.** `cameraForBounds` reports
  the zoom the bounds *actually* need; only when that exceeds the map's own
  `MAP_MAX_ZOOM` — i.e. no zoom level could ever separate the pins — do the
  members fan out on leader lines. Collapse restores every original position
  and hands visibility back to the clusterer, so its model is never left
  mutated. A property refresh mid-flight `collapse()`s a spider but must not
  `reset()` the camera.
- **The maths is separate from the map.** `clusterCamera.ts` is pure geometry
  over Google's 256px Web Mercator world with no Google or DOM dependency,
  covered by `src/tests/clusterCamera.test.ts`; `clusterZoom.ts` is the
  Google Maps and DOM half.
- **The bubble is a control.** It carries `role="button"`, a tab stop, an
  `aria-label` from `search:map.cluster.zoomIn` (pluralised per locale), and
  Enter/Space activation — previously it was a bare `div` with a click handler,
  invisible to keyboard and assistive tech.

---

## Under Construction — a promise, not a fact

A listing that is still going up carries a *promise* ("finished in 2028") where
a finished one carries a *fact* ("built in 2019"). Rendering the first in the
"Year Built" cell states a completion nobody can stand behind, so the two are
kept apart end to end.

```
src/shared/property/construction.ts          ← read side (pure, no imports)
  ├── normalizeConstructionStatus(value)     unknown → 'ready'
  ├── resolveConstruction(record)            → { status: 'ready' }
  │                                          | { status: 'under-construction',
  │                                              expectedYear: number | null }
  └── buildConstructionFields(input)         → the persisted trio
        │
        ├── validation.ts   validateCompletionYear · validateConstruction  (write side)
        ├── ListingFormHelpers.validateListing   ← form-submit boundary
        ├── apiService / propertyApi transformers ← API ingestion boundary
        ├── PropertyCard badge · PropertyInfo details row
        └── backend/src/utils/constructionStatus.ts (mirror) → Property pre('validate')
```

Key decisions:
- **Two fields, one meaning, checked together.** `constructionStatus` and
  `expectedCompletionYear` are each individually valid whatever the other says;
  only the *pair* can be wrong. `validateConstruction` is therefore the unit
  both boundaries call.
- **The year is optional, and it is the seller's to choose.** "Under
  construction, handover not announced" is an ordinary listing, and a date
  that is years out — or one that has already slipped — is the seller's own
  estimate to stand behind. So the guard asks only *is this a year at all*
  (a whole number in `MIN_COMPLETION_YEAR` .. `currentYear +
  COMPLETION_YEAR_HORIZON`, deliberately wide). Anything narrower overrules
  someone who knows their project better than we do; the one thing rejected is
  a value that would render as a badge with unreadable text on it.
- **Unknown reads as ready.** Every listing written before this feature has
  neither field, and that is exactly what they are. `normalizeConstructionStatus`
  gives the same answer for a legacy row, a typo and a hostile payload, so no
  caller has to special-case the absent case.
- **No year means no year shown.** `resolveConstruction` returns
  `expectedYear: null` — never a partial or guessed value — when none was given
  or the stored value is not a usable year. The badge and the details row then
  say "Under construction" without a date, instead of printing whatever the
  field happened to hold. Same rule as `DataFreshness`: render nothing rather
  than imply something untrue.
- **`yearBuilt` mirrors the completion year.** It is schema-required and it is
  what every year sort and year filter reads; left at "this year" a 2029
  handover would file under 2026. The mirrored value is never *displayed* as a
  year built, because the UI asks `resolveConstruction` first. With no year
  given, `yearBuilt` keeps what the seller entered.
- **A missing year never downgrades the status.** `buildConstructionFields`
  and the server hook both keep `under-construction` when the date is absent
  or unusable. Falling back to 'ready' there would quietly republish an
  unfinished building as a finished one — the opposite of what the flag is
  for.
- **The server is the last word.** `backend/src/utils/constructionStatus.ts` is
  a deliberate mirror rather than a shared import (the backend compiles from
  its own `rootDir`, and the importer and other API clients never run the
  client's copy). `Property.pre('validate')` applies it on every write path —
  create, update, import, admin edit — so the rule cannot be skipped by
  reaching a different controller. It coerces what it safely can and rejects
  only a completion year that is not a year.
- **A rejected pair is a 400, not a 500.** `respondIfValidationError`
  (`middleware/propertyValidation.ts`) turns a Mongoose `ValidationError` into
  the same `{ field, message }[]` shape `handleValidationErrors` produces.
  Before it, a schema rejection fell through the controller's catch-all and
  came back as "Error updating property" with nothing naming the bad field.

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

## Image Pipeline (Bunny.net)

```
Upload → sharp (rotate, resize to cap, WebP q84, EXIF stripped) → Edge Storage
Stored URL → optimizeImageUrl(url, { width, quality }) → <img src>
                                                       → imageSrcSet([480,768,1200,1920])
```

One WebP master is stored per image; every displayed size is rendered from it
by Bunny Optimizer at the edge, from query parameters. Nothing is
pre-generated — a size is rendered on first request and cached thereafter.

- LQIP (Low-Quality Image Placeholder): `width: 20, quality: 10, blur: 80`, loaded immediately
- Full image: `width: 1200, quality: 'auto'` with srcSet for responsive delivery
- Avatar thumbnails: `width: 80-96, quality: 'auto', crop: 'fill'`
- Never use raw CDN URLs — always go through the helper, which replaces any
  transforms already on the URL instead of stacking on them.
- Private documents (agent licenses, credentials) are served only from a
  second, token-authenticated pull zone. Bunny applies token auth per pull
  zone, so it cannot be enabled on the hostname serving public listing photos.

See `docs/setup/backend/BUNNY_SETUP.md` for the dashboard settings that
determine the bill.

---

## Security Notes
- All API mutations use CSRF cookie (`credentials: 'include'`)
- JWT stored in httpOnly cookies (not localStorage)
- Input sanitisation on the Express layer
- Image uploads validated and re-encoded by sharp on the backend (type + size limits), which also strips EXIF — including the GPS tag phone photos carry
