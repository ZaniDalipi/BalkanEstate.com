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

Screenshots come from Playwright runs against the real app (Vite + Express +
MongoDB) with the demo seed. The sandbox could not reach picsum.photos, so the
building images are local placeholder drawings.

---

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
| `GET /units?search&buildingId&floorId&availability&visibility&sort&limit≤200&skip` | member |
| `PATCH /units/:unitId` | field-level: price fields → `price.change`, `availability` → `availability.change`, everything else → `unit.manage` |
| `DELETE /units/:unitId` (soft) | `unit.manage` |
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

**Hide a unit or its price:** Inventory → **Edit unit** → *Visibility* or *Price
shown to buyers*.

**Turn off inquiries for units without a listing:** **Settings** tab.

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
| Backend developments (real `mongod` via MongoMemoryServer system binary) | `cd backend && NODE_OPTIONS=--max-old-space-size=8192 MONGOMS_SYSTEM_BINARY=/usr/local/bin/mongod npx jest --runInBand --testPathPattern developments` | 19 suites, **184 passed** |
| Frontend developments + i18n keys | `npx vitest run src/features/developments src/tests/i18n-keys.test.ts` | 19 files, **149 passed** |
| E2E (Playwright, real backend + Vite + seeded MongoDB) | `CHROME_PATH=… E2E_DEV_EMAIL=… E2E_DEV_PASSWORD=… npx playwright test e2e/residence-explorer.spec.ts` | **5 passed**, 5 skipped by design (each flow runs on either desktop or mobile) |
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

## 8. Known limitations

**Data and storage**
- When a Property is deleted, its id is not removed from `DevelopmentUnit.listingIds`.
  Reads ignore missing listings, so nothing leaks or breaks. A clean fix is a
  post-delete hook in `models/Property.ts`.
- The jest suites run against a standalone `mongod`, so they exercise the
  no-transaction fallback of `withOptionalTransaction`. The transactional path is
  used on replica sets.

**Platform and security**
- Platform `GET /api/properties/:id` was not audited for a draft guard. The
  explorer itself never exposes draft listing ids.
- The dashboard `GET /:developmentId` still returns the full document, including
  `ownerId`, to authorised members.

**Editor and dashboard**
- Hotspots linked to a unit that was later hidden are kept in the draft and
  filtered out of the public views, so hiding a unit never blocks the editor.
- The editor's link picker loads at most 200 units per view target.
- The editor preview shows availability fills but not the colour-blind patterns
  the public explorer draws.
- The Linked listings tab lists all units, paged. There is no server-side
  "has listing" filter yet.

**Public explorer**
- Pressing Esc inside a platform modal opened from the drawer (inquiry, viewing,
  gallery) does not also close the drawer.
- Images are plain 2D renders. A Google Earth fly-in or 3D models are not part of
  this build.
