# Interactive Residence, Building & Apartment Explorer

The explorer extends the existing Residences/Developments feature (see
[DEVELOPMENTS_SYSTEM.md](./DEVELOPMENTS_SYSTEM.md)). It is modelled on East Gate
Living B2: a full-bleed building rendering, apartment polygons coloured by
availability, a hover preview, a details drawer, and arrows to switch camera views.

Navigation: **Residence → Building → Building view (camera) → Apartment polygon →
Apartment drawer → existing listing** (when the unit has one).

| Public explorer | Apartment drawer | Phone bottom sheet |
| --- | --- | --- |
| ![Building facade](./images/residence-explorer/02-building-front.png) | ![Drawer](./images/residence-explorer/05-drawer.png) | ![Mobile](./images/residence-explorer/10-mobile-sheet.png) |

| Inventory | Unit editor | Region editor |
| --- | --- | --- |
| ![Inventory](./images/residence-explorer/12-inventory.png) | ![Unit edit](./images/residence-explorer/13-unit-edit.png) | ![Editor](./images/residence-explorer/15-editor-new-region.png) |

| Residence picture: building hover | Apartment hover card | Building without its own picture |
| --- | --- | --- |
| ![Building hover](./images/residence-explorer/21-residence-building-hover.png) | ![Apartment card](./images/residence-explorer/24-apartment-card.png) | ![Floor plan grid](./images/residence-explorer/22-stacking-plan.png) |

**How regions look.** By default (East Gate style) regions are invisible so the
rendering reads as a photo. The hovered or focused region lights up with a
translucent fill and a thin light outline: apartments in their availability
colour (available = teal), buildings in the brand teal. Units matching active
filters get a soft tint. The legend's **Show availability** switch colours every
apartment at once (with the colour-blind patterns); the choice is remembered per
browser. The styling lives in `components/public/explorer/regionPaint.ts`.

**Hover card.** Anchored to the region's top centre with an arrow, it lists:

- apartments: floor-plan preview, number, floor, area, bedrooms, price, status, **View apartment**
- buildings: available of total, floors, price from, **Explore building**

The pointer can move onto the card and press its button. On touch, the first tap
shows it.

**Residence picture.** Building regions on the residence (site plan) picture get
a name tag (the building's code, else its name) and open that building. A
building that has no picture of its own opens as a floor-by-floor grid of its
apartments, so every building can be opened. Entering a building adds a browser
history step, so Back returns to the residence.

**Zoom.** In the public explorer and the editor, Ctrl/⌘ + wheel or a pinch zooms.
When zoomed, the wheel or a two-finger swipe moves the picture in any direction
(Shift + wheel moves sideways), and dragging moves it too. In the editor, drag
on empty picture with the select tool; a drag that starts on a region still
edits that region.

Screenshots come from Playwright runs against the real app (Vite + Express +
MongoDB) with the demo seed. The sandbox could not reach picsum.photos, so the
building images are local placeholder drawings.

---

## 0. Concepts in one minute

| Thing | What it is | Where you manage it |
| --- | --- | --- |
| **Residence** (development) | The whole project, e.g. "East Gate Living" | Dashboard → My Developments |
| **Building** | One block of the residence | Inventory → Add buildings |
| **Floor** | A level of a building | Inventory → Add floors |
| **Unit** | One apartment of your inventory: number, floor, m², rooms, price, status | Inventory table / Edit unit |
| **Listing** | A marketplace ad on BalkanEstate (photos, description, contact) | Your normal listings |
| **View** (picture) | A picture of the residence, a building or a floor | Interactive explorer |
| **Region** | A shape drawn on a picture that links to one of the above | Interactive explorer |

A unit can have a listing **attached** (Linked listings tab): the apartment stays
in your inventory with its live status, and buyers can also open the listing.
Link a region to a **Listing** directly only for a listing that is not one of
this residence's apartments.

**Worked example (demo seed).** `cd backend && npm run seed:developments` (set
`DEV_SEED_EMAIL=` to choose the owner) creates "East Gate Living (Demo)":

| Where | Region | Links to | What a buyer sees |
| --- | --- | --- | --- |
| Residence picture | one per building (tags S1, S2, P, G) | Building | building card, then opens the building |
| Residence picture | "Example: standalone listing" | Listing | listing card: photo, price, m², floor, rooms |
| Seaside Tower 1 (front and back views) | one per apartment | Unit | apartment card; 3 apartments have a `[Demo]` listing attached |
| Park Residence (front) | one band per floor | Floor | floor card, then opens the floor plan |
| Park Residence, Floor 1 (plan) | one per apartment | Unit | apartment card |
| Seaside Tower 2 | (no picture) | n/a | opens as a floor-by-floor list |

Demo listings are titled `[Demo] …` and are replaced on every run. The seed (and `migrate:development-views`) connect with `MONGODB_URI`, the same variable as the server, falling back to `MONGO_URI` and then `mongodb://localhost:27017/balkan-estate`; the log line shows which one was used (password hidden). The
Interactive explorer tab also has a **How it works** panel, and the region
editor explains each link type under **Links to**.

| Listing region card | Building → floors | In-editor guide |
| --- | --- | --- |
| ![Listing card](./images/residence-explorer/30-listing-card.png) | ![Floors](./images/residence-explorer/31-park-floors.png) | ![Guide](./images/residence-explorer/33-editor-guide.png) |

## 1. Architecture

**Data.** A *view* is a `DevelopmentScene`: one camera perspective of a target,
which is the development (site plan), a building or a floor. A target can have many
views, keyed by `viewKey`. Each view stores the image, its pixel size, a **draft**
and a **published** snapshot of hotspots, and a version counter.

A hotspot is a polygon or rectangle in normalised 0–1 image coordinates. It links
to a unit, building, floor, entrance or listing.

**Availability.** The listing status is the source of truth. Effective
availability is the *most restrictive* of the unit's declared state and its
non-draft linked listings:

- active → available
- pending → reserved
- sold → sold
- rented → rented

Draft listings are ignored. The rule lives in
`backend/src/services/developments/unitAvailability.ts`. The explorer, the public
API, the dashboard and the CSV export all use it.

**Geometry.** Polygon validation is implemented twice, once on each side, and both
copies are tested against the same fixture
(`src/features/developments/utils/__fixtures__/polygon-cases.json`):

- client: `utils/polygonGeometry.ts`
- server: `services/developments/hotspotGeometry.ts`

The server **rejects** invalid shapes and never clamps them. It rejects:

- more than 20,000 points across one view (checked first, keeping each save bounded)
- non-finite numbers
- points out of bounds
- fewer than 3 or more than 200 points
- duplicate points
- self-intersecting shapes
- zero-area shapes

**Backend layers.** Controllers are thin; logic lives in
`services/developments/`:

| Service | Responsibility |
| --- | --- |
| `developmentSceneService` | views, draft/publish/unpublish, link validation, public views |
| `unitAdminService` | dashboard list, PATCH with field-level authz, delete, bulk, CSV, floorplan, building/floor edits |
| `developmentPublicService` | public projections (strip internals, hide hidden units, price-on-request, effective availability) |
| `unitInquiryService` | inquiries for units without a listing |
| `developmentAudit` | `recordDevelopmentAudit` + `diffFields` for every mutation |

**Frontend.** All of it lives in `src/features/developments/`:

| Area | Location |
| --- | --- |
| Public explorer | `components/public/explorer/` (stage, canvas, tooltip, legend, view switcher, building chips) |
| Apartment drawer | `components/public/explorer/drawer/` |
| Budget helper | `components/public/explorer/budget/` (button, teaser, panel, form, cards), `useFlyToUnit.ts` + `useFlyFocus.ts` (the guided trip), `utils/budgetMatch.ts`, `hooks/useLocationPrice.ts` |
| Region editor | `components/scene/editor/` with `hooks/usePolygonEditor.ts` (reducer, undo/redo) and `hooks/useEditorViewport.ts` |
| Dashboard | `components/dashboard/` (tabbed manage page, inventory table, unit edit dialog, linked listings, settings) |
| URL / pan-zoom hooks | `hooks/usePanZoom.ts`, `hooks/useExplorerUrlState.ts`, `hooks/useUnitDrawer.ts` |

**Platform reuse.** The drawer reuses the platform's existing components rather
than copying them:

- `PropertyInquiryModal` and `ScheduleViewingModal`
- favourites (`toggleSavedHome`) and compare (`ADD_TO_COMPARISON`)
- `SocialShare`, `ImageViewerModal`, `FloorPlanViewerModal`
- `useProperty` for the unit's primary listing

Only a unit **without** a listing uses the new unit inquiry form.

## 2. Database changes (all additive)

| Collection | Change |
| --- | --- |
| `developmentscenes` | `viewKey`, `viewName` (≤80), `viewDirection`, `sortOrder`. Unique index `scene_per_target_view_unique` on (developmentId, targetType, targetId, viewKey) with partial filter `{deletedAt: null}`. |
| `developmentunits` | `visibility` (public/hidden), `priceVisibility` (public/on_request), `livingRooms`, `externalArea`, `terraceArea`, `description`, `floorplan{url,publicId,width,height}`, `gallery[]` (≤30), `features[]`, plus an index on `{developmentId, visibility}`. |
| `developments` | `allowUnitInquiries` (default `true`). |
| `inquiries` | type `'development'` plus optional `developmentId` / `unitId` refs and an index. Existing inquiry flows are unchanged. |
| `developmentauditlogs` | new actions: `unit.update/delete/bulk_update`, `price.change`, `floor.create/update`, `building.update`, `scene.upload/update/draft/publish/unpublish/delete`. |

**Migration.** Run `cd backend && npm run migrate:development-views` (supports
`DRY_RUN=true`). It:

- backfills `viewKey=main`, `viewDirection=front` and `sortOrder=0`
- drops the legacy `scene_per_target_unique` index
- reports duplicates
- creates the new indexes

It is idempotent: a second run changes nothing. It uses `createIndexes`, not
`syncIndexes`, so it never drops indexes it doesn't know about.

**Rollback.** Every new field is optional, and the old `/:slug/scene` endpoint
still works.

## 3. Endpoints

**Public** (`/api/developments`, no auth). The development must be published, or
the endpoint returns 404.

| Method & path | Notes |
| --- | --- |
| `GET /:slug` | Public projection. No `ownerId`, `agencyId` or media publicIds. Buildings include `stats{units, available}`. |
| `GET /:slug/units` | Visible units only, with effective availability. `priceOnRequest` hides price and price/m². Only non-draft listing ids, encoded. |
| `GET /:slug/units/:unitId` | Unit + development + sanitised listings. 404 for a hidden unit. |
| `GET /:slug/views?targetType&targetId` | Published views only. Hotspots are filtered to visible units, live buildings and floors, and non-draft listings. |
| `GET /:slug/scene` | Legacy: the `main` (or lowest `sortOrder`) published view. |
| `POST /:slug/units/:unitId/inquiries` | `{name, email, phone?, message}`, rate limited to 30/h. Returns 403 `inquiries_disabled` when the development turned inquiries off. |
| `GET/POST/DELETE /:slug/follow` | Published developments only. |

**Dashboard** (`/api/dashboard/developments/:developmentId`, auth +
`developmentAuth`). Every id is resolved inside this development, encoded ids
included; anything else returns 404.

| Method & path | Permission |
| --- | --- |
| `GET /units?search&buildingId&floorId&availability&visibility&hasListing&ids&sort&limit≤200&skip` | member |
| `PATCH /units/:unitId` | field-level: price fields → `price.change`, `availability` → `availability.change`, everything else → `unit.manage` |
| `DELETE /units/:unitId` (soft) | `unit.manage` |
| `POST /units/:unitId/gallery` (multipart `images`, ≤10 per upload, ≤30 per unit) | `media.upload` |
| `DELETE /units/:unitId/gallery/:index`, `DELETE /units/:unitId/floorplan` | `unit.manage` |
| `GET /audit?limit≤100&skip&action` (exact action or family prefix such as `price`) | `team.manage` |
| `POST /units/bulk {unitIds≤500, availability?, visibility?}` | `availability.change` / `unit.manage` |
| `GET /units/export.csv` | member |
| `POST /units/:unitId/floorplan` (multipart `floorplan`) | `unit.manage` |
| `PATCH /buildings/:id`, `PATCH /floors/:id` | `building.manage` / `floor.manage` |
| `POST /scenes` (multipart `image` + target + view fields) | `scene.edit` (+ `media.upload`, checked in the service) |
| `PATCH /scenes/:id` (name, direction, order) | `scene.edit` |
| `PATCH /scenes/:id/draft {hotspots, baseVersion}` | `scene.edit`. Returns 409 `version_conflict` and 400 `errors: HotspotIssue[]` when they apply. |
| `POST /scenes/:id/publish`, `/unpublish` | `publish` (rate limited) |
| `DELETE /scenes/:id` | `scene.edit` |

**Rate limiting.** Mutations use `mutationRateLimiter` and uploads use
`uploadRateLimiter`.

**Uploads.** Accepted types are jpeg, png, webp and avif, up to 10 MB. SVG is
refused.

## 4. Permissions

The role matrix is in `backend/src/config/developments.ts` (`ROLE_PERMISSIONS`).
The frontend has a copy in
`components/dashboard/inventory/permissions.ts`, used **only** to disable controls;
the server always decides.

| Role | Can do |
| --- | --- |
| owner | everything |
| manager | everything except `ownership.transfer` |
| sales_manager | units, prices, availability, listings |
| sales_agent | availability and listings |
| editor | project fields, units, scenes |
| viewer | read-only |

## 5. How to

**Create the demo:** sign up in the app, then run:

```bash
cd backend && npm run seed:developments
```

The seed uses the most recent user; set `DEV_SEED_EMAIL=` to pick another. It
creates 4 buildings and 118 units, a site plan view, and a front and back view for
Seaside Tower 1.

**A demo with real renders — Plaza Tirana:**

```bash
cd backend && npm run seed:plaza
```

It creates "Plaza Tirana (Demo)" from the renders in `public/demo/plaza/`:

| Picture | Regions link to |
| --- | --- |
| Residence: *Square* and *From the east* aerials | Plaza Tower, Plaza Podium |
| Plaza Tower: *Front* | each apartment (84; duplexes cover two floors, penthouses two columns) |
| Plaza Tower: *Floors* | each floor (22 bands) |
| Plaza Podium | no picture: the floor-by-floor list of 6 shops and 8 offices |

Units are deterministic (same data every run): studios to 4-bedroom penthouses,
with areas, orientation, view, features, prices per m², availability that sells
lower floors first, a floor plan on the duplexes, and four `[Demo Plaza]`
listings (three apartments for sale, one office for rent). The outlines live in
`backend/src/scripts/demo/plazaGeometry.ts` (pixels of each render) and the units
in `plazaUnits.ts`; both seeds share `demo/seedSupport.ts`. Pictures are served by
the web app, so set `PUBLIC_WEB_URL` if it does not run on `http://localhost:3000`.

| Residence picture | Plaza Tower front |
| --- | --- |
| ![Plaza residence](./images/residence-explorer/34-plaza-residence.jpg) | ![Plaza tower](./images/residence-explorer/35-plaza-tower.jpg) |

**Add a building view:**

1. Dashboard → residence → **Interactive explorer**.
2. Pick the building, then **Add view**.
3. Upload the image, name it and choose a direction.

The view key is derived from the name. If you replace an image with a different
aspect ratio, you'll be offered **Clear regions**.

**Draw apartments:**

1. Choose **Polygon** (or **Rectangle**).
2. Click points; close the shape by clicking the first point, pressing **Enter**,
   or using **Finish**.
3. Pick the unit under **Target**, then **Save draft** → **Publish**.

| Action | How |
| --- | --- |
| Undo / redo | Ctrl/Cmd+Z, Shift+Ctrl+Z |
| Delete point or region | Delete |
| Nudge | Arrow keys (Shift ×10) |
| Duplicate | D |
| Add a point | Double-click an edge dot |
| Zoom / pan | Wheel; Space+drag |

New regions start unlinked. Saving and publishing are blocked until every region
is valid and linked.

**Fill a unit from one of your listings:** Inventory → **Edit unit** (or the
*Add units* form) → **Fill from one of your listings**. Pick a listing and its
type, rooms, areas, price (sale listings only — a monthly rent is not copied),
orientation, view, description and features fill the form, and its floor is
chosen when the building has that level. Review, then save; **Undo** restores
the form. Tick *Also link this listing to the unit* and it is attached on save
(the same conflict checks as Linked listings). Only listings you control can be
read (`GET …/listings/:listingId/unit-prefill`, `unitPrefillService.ts`).

**Dropdowns show real data:** buildings read "Plaza Tower · 22 floors · 84
units", floors "Floor 20 · 4 units" (only the chosen building's floors, in level
order), and the status filters carry live counts ("Available (44)"). The counts
come from one aggregation (`GET …/units/facets`, `unitFacetsService.ts`) and
refresh after every unit change; option labels are built in one place
(`useStructureOptions`). In *Add units*, **Fill from one of your listings** sits
at the top and lists what will be copied before you click **Add unit**.

**Fixed choices and euros:** unit type, orientation (8 directions, the same as
listings) and view are dropdowns; the server accepts only those orientation and
view values (`unitRules.ts`, used by edit, create and import). All residence
prices are in euros: there is no currency field, new and imported units are
stored in EUR, and any other currency is rejected with a clear message.

**Hide a unit or its price:** Inventory → **Edit unit** → *Visibility* or *Price
shown to buyers*.

**Edit the residence (name, location, amenities, contact):** **Details &
settings** tab → *Residence details*. Country and city use the same dropdowns as
the create form; picking a city fills the coordinates, and the map below them
(the listing form's location picker) lets you drag or click the pin. Coordinates
are shown with 6 decimals, prices as `136.000 €` and areas as `82 m²`, the same
as on listing pages (`utils/format.ts`). The phone uses the app's phone input
(dial code preselected from the country). Only changed fields are sent, and the
server re-validates them (website must be http(s); contact email must be valid;
at most 40 amenities of 60 characters each). Owners and admins (`project.edit`)
can save; others see the form read-only.

**Completed residences:** set the stage to *Completed* and the form asks for
the **Year built** instead of an expected completion date. The server keeps
only the one that fits the stage (`timelineFor`), and the public page shows
"Year built 2019" / "Built 2019" instead of "Expected completion".

**Attach a listing while creating or editing it:** after the listing is saved,
the location step shows nearby residences. **Choose apartment** puts the listing
on an apartment (it then shows on that apartment in the explorer); **Link to the
residence only** links it without an apartment. The panel shows where the
listing is attached today ("On apartment T1203 · Plaza Tower"), also after a
reload. If you can't manage the residence, **Request access** asks its owner.

**"Part of <residence>" on listing pages:** a listing attached to a published
residence shows a banner linking to its apartment in the explorer
(`GET /api/developments/for-listing/:listingId`; nothing for drafts, hidden
apartments or unpublished residences).

**Import a whole building from a spreadsheet:** Inventory → **Import from
spreadsheet**. Drop an Excel workbook (.xlsx; pick the worksheet if it has
several) or a CSV (any separator; Excel's `;` works), or start from **Download
template** — one row per apartment. Old binary .xls files are explained (save
as .xlsx). Excel is read in the browser by `read-excel-file`, loaded only when
an .xlsx is chosen. Columns can be in any order
and in English, Albanian or BCMS ("Zgrada / Objekti", "Sprat / Kati", "Stan /
Banesa", "Kvadratura / Sipërfaqja", "Cijena / Çmimi", "Status"…); you can change
what each column is used for. Values are read as people write them: floors
"Prizemlje", "Përdhese", "B1", "Kati 3"; numbers "45.000 €", "64,5"; availability
"Slobodno", "e lirë", "Prodato"; types "Garsonjera", "Lokal"; features "Terasa,
Parking". Without a floor column, floors come from unit numbers (401 → 4);
without a building column, all rows go to the building you name. Before
anything is written, the server's dry run shows new buildings, floors and units,
updates, and every row that will be skipped and why. Missing buildings and
floors are created; existing units are updated with only the columns the file
has (or left alone, if you untick it). Same permissions as manual edits; at most
2,000 rows per import; recorded in Activity. Our own **Export CSV** imports back
unchanged. Code: `utils/csvImport/` (reading and mapping),
`services/developments/unitImportService.ts` (`POST …/units/import`).

**Add floors and units quickly:** Inventory → *Add buildings, floors and units*.
The level starts at the next free one for the building and moves on after each
add; leave the label empty and the floor is named for you ("Floor 4", "Ground
floor" for 0, "Basement 1" for -1). Fill *To level* to add a whole range at once
(existing levels are skipped). Unit numbers are suggested per floor ("401,
402…", or continuing the floor's own pattern such as "T1205") and *How many*
adds several in one go. The rules live in `utils/inventoryNaming.ts`.

**Turn off inquiries for units without a listing:** **Details & settings** tab.

**Add apartment photos or remove a floor plan:** Inventory → **Edit unit** →
*Photos* / *Floorplan*. Changes save immediately.

**See who changed what:** **Activity** tab (owners and managers), filterable by
units, prices, explorer, listings and structure.

| Activity | Unit photos |
| --- | --- |
| ![Activity](./images/residence-explorer/17-activity.png) | ![Photos](./images/residence-explorer/18-unit-photos.png) |

## 6. Storage configuration

Images go through `backend/src/services/mediaService.ts` to Cloudflare R2. Set
these variables:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL` (plus `R2_ENDPOINT` / `R2_PRIVATE_BUCKET` if used)

Without them, scene, cover and floorplan uploads return a clear "Image storage is
not configured" error. Floorplans use the existing `development-scene` media kind.

## 7. Tests (actually run, on this branch)

| Suite | Command | Result |
| --- | --- | --- |
| Backend developments (real `mongod` via MongoMemoryServer system binary) | `cd backend && NODE_OPTIONS=--max-old-space-size=8192 MONGOMS_SYSTEM_BINARY=/usr/local/bin/mongod npx jest --runInBand --testPathPattern developments` | 20 suites, **193 passed** |
| Frontend developments + i18n keys | `npx vitest run src/features/developments src/tests/i18n-keys.test.ts` | 24 files, **168 passed** |
| E2E (Playwright, real backend + Vite + seeded MongoDB) | `CHROME_PATH=… E2E_DEV_EMAIL=… E2E_DEV_PASSWORD=… npx playwright test e2e/residence-explorer.spec.ts` | **6 passed**, 6 skipped by design (each flow runs on either desktop or mobile) |
| Backend typecheck | `cd backend && npx tsc --noEmit` | clean |
| Frontend typecheck | `npx tsc --noEmit -p .` | 0 errors in `src/features/developments`; the repo has unrelated existing errors elsewhere |
| Production build | `npx vite build --mode production` | success |

**Backend jest** covers:

- field-level authz
- cross-development ids → 404
- encoded ids
- hidden units and price-on-request in the public API
- draft listing ids never exposed
- follow on a draft development → 404
- cross-tenant detach
- CSV formula injection
- unit inquiry (happy path, disabled, hidden unit, validation)
- multiple views per building and `viewKey` conflicts
- hotspot geometry and link rejection
- version conflicts, including 5 concurrent saves → exactly one wins
- publish re-validation and unpublish
- the legacy scene endpoint

`security-review-fixes.test.ts` pins the findings of an adversarial review of
these endpoints, each fixed on this branch:

- `/nearby` used to return owner ids and storage keys
- public stats counted hidden units
- follower price filters matched on-request prices
- `request-attachment` revealed draft developments
- creating a unit could set price/availability without `price.change` / `availability.change`
- `agencyId` on create wasn't checked against the caller
- a draft had no total vertex cap; publish had no rate limit
- CSV cells could carry formulas after a `;` separator
- negative `limit`/`skip` on the public list
- `javascript:` websites were accepted
- email template values expanded `$`-patterns

The attach preview also now hides other people's listing details.

**E2E** covers:

- residence → building drill-in, view switching, hover preview
- drawer open via `?unit=`, closed with browser Back
- a real unit inquiry (201)
- URL-synced legend filter
- the phone tap-preview → bottom sheet
- inventory edit to price-on-request, checked against the public API
- a polygon drawn in the editor saved at the drawn coordinates

### Budget helper ("What's your budget?")

A **Your budget** button sits on the explorer bar. A few seconds after the
page opens, a one-time bubble (once per browser session) points out the
biggest **bargain**, or says what homes start at. The panel asks for a budget
(`150.000`, `150k` or `1,2m`; between 10.000 € and 50.000.000 €, with the
reason shown when it's invalid). It suggests up to three homes on sale at or
under it: bargains first, then the most home for the money. It adds one home
at most 10% over budget when few fit, and the most affordable home when none
fit.

- **A bargain** is at least 8% below the reference price per m². The
  reference is the city's average for-sale price (the Explore Cities figure,
  `GET /api/cities/market-data/:city/:country`), and this residence's own
  average when the city has no data and at least four homes are priced. Homes
  with the price on request are never suggested.
- **Take me there** glides the picture to the apartment if it is drawn
  there, else to its floor, else to its building. It pulses, drills in and
  repeats, then opens the apartment drawer. Pictures with nothing to glide to
  are skipped, so the trip always ends at the apartment. Any click or crumb by
  the buyer stops it. With reduced motion there is no glide or fade, just the
  highlight.

## 7b. Residence Pass (pay per residence)

Creating and setting up a residence is free for any signed-in user. The first
publish starts a **15-day free trial**: the residence is public straight away.
When the trial ends it drops out of every public page (detail, list, nearby
suggestions, follow alerts, the listing "part of residence" badge) until a
**Residence Pass** is bought. Nothing is deleted. The owner keeps editing, and
paying brings it back at once.

| | |
|---|---|
| Trial | 15 days from the *first* publish; unpublishing does not restart it |
| Residence Pass | 12 months public, 5 buildings included; renewing early adds to the end date |
| Agencies | 1 free residence per subscription year, public while subscribed (see below) |
| Extra building | Per building, for the rest of the pass (or plan) period |
| Premium plans | Pro includes 1 published residence (oldest publish first); more passes 30% off |
| Abuse guard | One residence on trial at a time per owner, 3 trials ever (deleted residences count) |
| Prices | `Product` documents `residence_pass_yearly` (€149) and `residence_extra_building_yearly` (€29), editable in the admin PricingManager |

The numbers an admin changes live on the `Product` documents and are edited in
Admin › Pricing: the pass length (`durationDays`), `includedBuildings` on
`residence_pass_yearly`, and `residencesPerYear` on `agency_yearly`. They are read
through `residenceTerms()` (cached 60 s, cleared when a product is saved), with
fallbacks in `backend/src/config/residenceBilling.ts`. Feature texts use the
placeholders `{durationMonths}`, `{includedBuildings}` and `{residencesPerYear}`,
so one number changes both the rule and the text. On startup,
`migrateResidenceProducts()` fills these fields on existing products and swaps the
two seeded feature strings for placeholders.

**Agencies**

- The agency owner and agency admins create residences *for the agency*
  (`ownerType: 'agency'`). Agents, and owners who pick `personal`, follow the
  normal rules.
- While the agency subscription is active, its first publish in each
  subscription year is free (state `agency`, no trial). Years are counted from
  `subscription.startDate`. The slot is claimed atomically in
  `AgencyResidenceYear`, so two publishes at once can't both get it.
- Every residence that ever took a free slot stays public while the agency is
  subscribed. When the subscription ends (or an admin cancels it), they stay
  public for 15 more days, counted from `Agency.residenceEndedAt`, and then go
  offline until it renews. The agency gets a notice for the grace period and one
  when they go offline.
- More residences in the same year follow the normal trial and pass. Trials are
  counted per agency.
- Agency subscription changes trigger `recomputeAgencyResidences` from the
  `Agency` save hook; the daily job does the same.

**Admin › Residences** (`/admin/residences`, `features/admin/components/residences/`)

- Lists every residence with its plan, public-until date and buildings
  used/limit. Search and filter by plan. Cards on phones and tablets, a table on
  very wide screens.
- **Building limit:** `PATCH /api/admin/residences/:id/building-limit` with
  `{ limit }` (1–200, never below what it has; `null` goes back to the standard
  limit). This overrides the included + bought buildings.
- **Give pass:** `POST /api/admin/residences/:id/grant` with `{ months, note }`.
- **Agency free residences:** `GET|POST /api/admin/agencies/:agencyId/residence-allowance`
  shows this year's used/allowed and adds extras (`{ extra, note }`, 1–20). It is
  also shown on the agency's admin page.
- Every action is written to the audit log.

**Notifications** carry `data.actionUrl`. A "new home available" alert opens the
unit's listing when it has an active one, otherwise the residence with the unit
open (`?unit=`). Trial, offline and agency notices open the residence's manage
page. `notificationTarget()` on the frontend also opens notifications stored
before this change, from `developmentSlug`/`unitId`/`developmentId`.

**How it is built**

- **Rules:** `services/developments/billing/residencePlan.ts`, as pure
  functions. They cover state (`none | trial | active | included | agency | expired`),
  visibility, the publish/trial decision, pass stacking, the building limit,
  prices and reminders.
- **State:** `Development.billing` and `visibleUntil` are recomputed from the
  `ResidencePurchase` ledger and the owner's plan (`residenceBillingService`).
- **Public queries:** every one of them uses
  `publicResidenceFilter()` (`status: published` and `visibleUntil > now`).
- **Building limit:** checked in `createBuilding`. The CSV import checks it
  before writing anything, and its dry run returns `buildingLimit` for the
  preview.
- **Endpoints:**
  - `GET /api/dashboard/developments/:id/billing`
  - `POST …/:id/billing/checkout` takes `{ kind: 'pass' | 'extra_building',
    quantity, couponCode }` and is owner only.
  - `POST …/:id/billing/grant` is platform admin only.
  - The public `GET /api/developments/pricing`.
  - Refusals are 402 with a `code`: `PASS_REQUIRED`, `TRIAL_IN_PROGRESS`,
    `TRIAL_LIMIT`, `BUILDING_LIMIT`. `PAYMENT_NOT_CONFIGURED` is a 503 and
    `COUPON_INVALID` a 400. Details are under `details`.
- **Online payment is off for now.** A purchase completes with a
  `DiscountCode` that covers the full price and lists a residence product in
  `applicablePlans`; general subscription codes do not apply. An admin grant
  also works. To switch real payment on, Paysera checkout calls `applyPurchase`
  from the webhook for `productId` values starting with `residence_`.
- **Daily job:** `runResidenceBillingJob` (cron 08:07) sends the day-10 and
  day-14 reminders and the offline notice, in-app and by email, once each. It
  also recomputes plan coverage. On startup, residences published before
  billing existed start a fresh trial instead of disappearing.
- **Dashboard:** `components/dashboard/billing/` holds the plan card, trial
  banner, buy dialog and unlock-building notice. `PublishSection` handles the
  publish button. The pricing page shows `ResidencePricingSection`.

## 7b-2. Units sold together (parking spots, storage rooms)

A parking spot or storage room is a unit of its own (`unitType: 'parking' |
'storage'`), with its own region on a picture, price, area, availability and
details. An apartment lists the ones it **comes with** in
`DevelopmentUnit.linkedUnitIds`; the other direction ("sold with Apt A12") is
derived.

- **Rules** (`services/developments/unitLinks.ts`): only parking and storage
  units can be added; same residence; not itself; at most 10; a parking spot
  can't come with anything; a spot comes with one unit at most. The last rule
  is also a unique index (`linked_unit_once`), so two editors saving at once
  can't both take a spot (409). Errors carry `details.field` for the editor.
  Deleting a unit (or its floor/building) removes it from every apartment and
  clears its own links.
- **Dashboard**: the unit editor's "Comes with" section lists the residence's
  parking spots and storage rooms (`GET …/units?unitType=parking,storage`);
  a spot that comes with another unit (`soldWith`) is shown but locked.
- **Public**: every unit carries `linkedUnitIds` and `soldWithUnitIds` (only
  between visible units); the unit detail has `companions`.
- **Explorer**: hovering or tapping an apartment lights up its parking spot /
  storage room on the same picture with a dashed outline, and the other way
  round (`linkedHotspotIds`). The hover card says "Comes with Parking P-01" or
  "Sold with Apt T804", the details panel lists them (each opens its own
  details), and so do the unit cards and the floor-by-floor tiles.
- **Selling**: changing an apartment's status never changes its parking spots
  by itself. The unit editor then lists each spot it comes with ("Also mark
  Parking P-01 as Sold", unticked) and sends the ticked ones as
  `alsoLinkedUnitIds`; the server gives them the same status with the usual
  audit, stats and follower alerts (`linkedAvailability.ts`). The bulk bar has
  one "Also update their parking spots and storage rooms" box
  (`includeLinked`).
- **Demo**: Plaza Tirana has four street parking bays on the tower's Front
  picture (Plaza Podium · Parking −1), each sold with a tower apartment
  (T804, T901, T1001, T1002).

## 7b-4. Repeating a region across a facade

In the map editor, **Repeat on other floors** (under the selected region) copies
one outline down, up or along a row: *Direction*, *Number of copies* (1–40) and
the *Distance between copies* as a percentage of the picture's height or width.
The suggested distance is the region's own size plus a little for the slab.

- The copies keep the shape and the kind of link but not the apartment or the
  label, so each one is linked afterwards (the editor flags them "Missing link").
- Copies that would leave the picture are not made (nothing is squashed against
  the edge); the panel says how many were.
- All copies are one Undo step. The geometry is `utils/regionRepeat.ts`, the
  action is `REPEAT` in `usePolygonEditor`, the panel is `RepeatRegion.tsx`.

## 7b-5. Carrying a structure to another view of the building

A building can have several pictures (front, back, left, right, aerial,
courtyard, custom). **Copy from another view** (map editor, below the regions)
brings the *saved* regions of another view of the same building into the one
being edited:

- *Copy the regions of*: only other views of this building that have saved
  regions are offered, with a thumbnail of the picture.
- *Keep what the regions link to* (on by default): both pictures show the same
  building, so apartment and floor links still fit. Off, every copy is linked again.
- *Mirror left ↔ right* is for the opposite side of a symmetrical building.
- *Size* (10–300 %, about the centre of the whole group) and *Right* / *Down*
  (−100…100 %) fit the copy onto the other picture. A copy that would leave the
  picture is refused, not squashed against the edge.
- All copied regions are one Undo step. The pictures have different
  perspectives, so the copy is a head start to move and resize, not exact.
  Geometry: `utils/regionTransfer.ts`; action `ADD_MANY`; panel `CopyFromView.tsx`.

## 7b-6. The phone apartment sheet

On phones the apartment details are a bottom sheet that follows the finger, like
the Zillow sheet:

- It slides up to **half height** (the building stays in view above it).
- **Drag the handle** (or swipe the details) and the sheet moves with the finger;
  the picture behind dims and clears in step. On release it settles on **full**,
  **half** or **closed** with a spring; a quick flick counts, a long pull down
  from half closes it (and drops `?unit=`).
- At half height the details do not scroll, so a swipe up on them grows the
  sheet; at full height they scroll, and only a pull *down* from their very top
  takes the sheet down. A sideways swipe (the photo gallery) never moves it.
- Tapping the handle still toggles half / full, and Esc / the close button work
  as before. With "reduce motion" the sheet jumps instead of sliding.
- The sheet is always as tall as "full" and is moved with a transform
  (`useSheetMotion`); the rules (snap points, flick, who owns the gesture) are
  pure functions in `utils/sheetSnap.ts`. Desktop keeps the side drawer.

## 7b-7. 360° virtual tours

- **Own tour:** the unit editor has a *360° virtual tour* link (Matterport, Kuula,
  Z360, …). Only plain http(s) links are accepted, on both sides
  (`isUsableTourUrl` / `services/developments/unitTour.tourUrlProblem`):
  no `javascript:`/`data:`, no user name or password, at most 2000 characters.
  A refusal shows under the field (`URL_INVALID`).
- **From the listing:** a unit without its own tour shows the tour of its public
  listing (`virtualTour360Url`; the primary listing first, never a draft). The
  editor says so ("Buyers see the 360° tour of the linked listing").
- **Buyers see it:**
  - a *360°* badge on the apartment's hover card and in its sheet, and on its
    cell in the floor-by-floor plan;
  - the building chip ("36 available · 360° ×2") and the building's hover card
    count the homes with a tour (`stats.withTour`);
  - a floor's hover card says how many of its homes have one;
  - a region linked straight to a listing says "360° tour: on the listing"
    (`listing.hasTour`, a flag only);
  - the sheet's **Open the 360° tour** button opens it in a new tab
    (`rel="noopener noreferrer"`), noting when it comes from the listing.
- Public responses carry `virtualTourUrl` (the effective one) and `tourSource`
  (`unit` | `listing`).

## 7b-8. The builder

The company building the residence, shown to buyers as a professional profile.

- **Where it is edited:** *Details & settings → The builder*
  (`components/dashboard/builder/`). Owners and editors can change it; viewers
  see it read-only.
- **Fields** (`Development.builder`), checked the same way on both sides
  (`validation/builderValidation.ts` ⇄ `services/developments/builderProfile.ts`):

  | Field | Rule |
  |-------|------|
  | name | required once anything else is filled in · ≤120 |
  | tagline | ≤160 |
  | about | ≤3000 |
  | foundedYear | 1800 – this year |
  | completedProjects | 0 – 10000 |
  | licenseNumber | ≤60 |
  | website | http(s) only · ≤300 |
  | email | ≤254 |
  | phone | digits, spaces, `+ ( ) . -` · 6–15 digits |
  | address | ≤200 |
  | socials.facebook / instagram / linkedin / youtube | a link on that network's site · ≤300 |

  Clearing every field removes the builder (`builder: null`).
- **Errors:** `FIELD_REQUIRED`, `FIELD_TOO_LONG {max}`, `FIELD_RANGE {min,max}`,
  `FIELD_INVALID`, `URL_INVALID`, `EMAIL_INVALID`, `PHONE_INVALID` and
  `SOCIAL_HOST {network}`. Each comes with `field: "builder.<name>"`, and the
  form shows it under that field (`role="alert"`).
- **Logo and banner:**
  - `POST /api/dashboard/developments/:id/builder/logo|banner` (`image` field,
    JPG/PNG/WebP/AVIF, ≤10 MB) and `DELETE …/builder/logo|banner`.
  - Each upload is stored in R2 as `development-builder-logo` (600×600) or
    `development-builder-banner` (1920×720), and the old file is deleted.
  - Without storage the server answers 503 `STORAGE_NOT_CONFIGURED`, and the form
    explains that uploads are not available.
  - Saving the text again keeps the images.
- **Buyers see:**
  - **under the title:** a *Built by [logo] Name* line that jumps to the section;
  - **the `#builder` section** (also in the section nav):
    - the banner, or a dark gradient when there is none, with the logo;
    - name and tagline;
    - founded year with years active, completed projects, licence and office;
    - the company's description;
    - website, call, email and social links (only safe http(s) links,
      opened with `rel="noopener noreferrer"`).
- **Public projection:** `publicBuilder()` returns nothing without a name, and
  strips storage ids, `_id` and empty socials.
- **Tests:** `__tests__/developments/builder-profile.test.ts`,
  `builderValidation.test.ts`, `builderLinks.test.ts`,
  `BuilderSection.test.tsx` and `BuilderShowcase.test.tsx`.

## 7b-3. Errors in the reader's language

- **Contract:** every refusal is `{ message, code, details: { field?, params? } }`.
  The English `message` is never shown.
  - Codes are listed, with their English text, in
    `src/features/developments/utils/apiErrorText.ts`.
  - Coupon refusals add `details.reason`: `unknown`, `inactive`, `notYetValid`,
    `expired`, `usedUp`, `alreadyUsed`, `minimum` (+ `min`), `otherPlan` or
    `notResidence`.
  - Import rows carry `code`, `field` and `params` the same way.
- **Where it shows:**
  - The unit editor puts the text next to the named field. For example,
    `UNIT_NUMBER_TAKEN` goes on Unit number, `LINKS_TAKEN` on "Comes with", and
    `ALSO_LINKED_*` on the "Its parking and storage" choice. The same text also
    shows above the buttons.
  - Admin number dialogs put it under the number.
  - Everything else (uploads, bulk, import, scene editor, attach, publish,
    checkout) shows it as the form or toast message.
- **No code:** the text comes from the HTTP status (400, 403, 404, 409, 413,
  429, 5xx), or "No connection" when fetch failed.
- **Notifications:** trial reminders, offline / agency notices and "New home
  available" are translated in the bell from `data.textKey`. Older
  notifications keep their stored English. Emails are English.

## 7c. Sharing, Back and sign-in

**Share link and preview card**

- The residence page's **Share** button shares `/<lang>/developments/<slug>`. On a
  phone it opens the system share sheet; elsewhere a window shows the preview
  card with WhatsApp, Facebook, LinkedIn, X, Telegram, email and copy-link.
- The preview card is `GET /api/og/residence/:slug/image.jpg?lang=` (1200×630
  JPEG). It is the residence's main published explorer view (else its cover)
  with every building outlined and labelled with its availability, plus the
  name, place, "N of M homes available" and the starting price. The layout is
  pure (`services/developments/share/shareCardLayout.ts`), the wording is in
  all 10 languages (`shareCardText.ts`), and the photo comes through the image
  proxy (SSRF-guarded). It is cached in memory and refreshed at least hourly.
- Link previews: on Cloudflare Pages, `functions/[lang]/developments/[slug].ts`
  (and the unprefixed one) give crawlers the title, summary and this card. In
  deployments where nginx serves the SPA, `GET /api/og/residence/:slug` does the
  same for bots and redirects people to the page.
- The functions only reach production if the deploy job has the repo checked out
  next to `dist/` (`wrangler pages deploy` uploads `./functions` when it finds it);
  `deployWorkflow.test.ts` guards that. Facebook and LinkedIn keep the first card
  they saw for a link, so after a fix re-scrape it: Facebook Sharing Debugger →
  "Scrape again", LinkedIn Post Inspector → "Inspect".

**Back**

- Moving between residence, building and floor pushes history entries, and
  opening an apartment pushes one too, so the browser Back button steps out one
  level at a time.
- Opened from a shared link there is nothing behind the page. The phone top
  bar's Back then steps *up* instead (`residenceUpPath`): apartment → floor →
  building → residence → residences list. The explorer follows router
  navigations (`onRouteChange`), not only the browser's Back button.
- "Back to residences" always goes to the list.

**Follow while signed out**

"Sign in to follow" opens the sign-in window over the residence and remembers
the page and the request (`src/shared/auth/authReturn.ts`, 30 minutes,
same-site paths only). After email or Google/Apple sign-in the user is back on
the same residence (same building/floor), and the follow is completed once the
follow status has loaded, so an existing follow is never overwritten. Closing
the window without signing in drops both.

## 8. Known limitations

**Data and storage**
- The jest suites run against a standalone `mongod`, so they exercise the
  no-transaction fallback of `withOptionalTransaction`. The transactional path is
  used on replica sets.
- Hard-deleted listings are detached from units automatically (Property
  `deleteOne` / `findOneAndDelete` / `deleteMany` hooks). Raw driver writes that
  bypass Mongoose would skip this; reads still ignore missing listings.

**Platform and security**
- Platform `GET /api/properties/:id` serves draft listings to anyone with the id.
  This is outside the explorer (which never exposes draft listing ids); fixing it
  needs the seller's edit flow to load drafts with authentication, so it is left
  as a separate task.
- The dashboard `GET /:developmentId` still returns the full document, including
  `ownerId`, to authorised members.
- Residence emails (trial reminders, offline and agency notices) are sent in
  English: users have no stored language yet. The in-app notifications are
  translated.

**Editor and dashboard**
- Hotspots linked to a unit that was later hidden are kept in the draft and
  filtered out of the public views, so hiding a unit never blocks the editor.
- Server-side unit search matches the unit number only.

**Public explorer**
- Images are plain 2D renders. A Google Earth fly-in or 3D models are not part of
  this build.
