# Residences & Developments System — Architecture & Implementation Plan

> The interactive residence / building / apartment explorer built on top of this
> system is documented in [RESIDENCE_EXPLORER.md](./RESIDENCE_EXPLORER.md).

> Status: **Phases 1–3 (design, data foundation, dev CRUD + attachment API) and Phase 4/5 (frontend slice: dashboard + public pages + attach UI) complete.**
>
> **Billing decision (confirmed by owner):** creating a development requires an
> active subscription plan. The create route is gated by
> `requireActiveSubscription` (`user.hasActiveSubscription()`). Development/unit
> creation does **not** consume the monthly listing allowance
> (`listingLimitService` is untouched); that can be revisited later.
> This document is the single source of truth for the Developments / Residences
> feature. It is written against the **existing** BalkanEstateAI codebase and
> deliberately reuses its conventions. Nothing here changes billing, subscription,
> or any existing public behaviour without being called out explicitly.

---

## 1. Existing architecture summary (audit findings)

**Frontend** (`/`, Vite + React 18 + TS strict)
- Feature-Sliced Design: `src/features/<feature>/{api,components,hooks,types}`; shared UI in `src/components/`, shared logic in `src/shared/`.
- Routing: React Router 7, **URL is the only source of page state**. Every path is built in `src/app/router/paths.ts`; routes declared in `src/app/router/routes.tsx` (+ `routeElements.tsx`, lazy via `lazyWithRetry`). Navigate with `navigate(paths.x())` / `goBack()` from `src/app/router/navigation.ts`.
- Server state: **TanStack Query v5**, query keys centralised in `src/shared/query/queryKeys.ts`. Client state: **Zustand** (`filterStore` persisted, `uiStore`). Never fetch in `useEffect`.
- HTTP: everything through `src/shared/api/httpClient.ts` (in-memory access token, 401→refresh rotation, CSRF double-submit `X-CSRF-Token`, payload encryption for sensitive endpoints, `session-expired` DOM event).
- Error handling: `ErrorBoundary` → `QueryErrorBoundary` → component. Validation centralised in `src/shared/utils/validation.ts` (`{ isValid, error? }`). `sanitizeText` (DOMPurify) before rendering user HTML.
- i18n: `src/i18n/locales/{lang}/{namespace}.json`, **10 languages** (en, sq, bs, bg, hr, el, mk, me, ro, sr). Every key must land in all 10.
- Maps: Leaflet + MapLibre GL + Google Maps already present. `earcut` (polygon triangulation) **already a dependency** — usable for hotspot geometry. `framer-motion`/`gsap`/`motion` for animation. `react-window` for virtualization. **No Konva/SVG-editor library yet** — the visual editor will be built on inline SVG + pointer events (no new heavy dependency).
- Images: Cloudflare R2. Always `optimizeImageUrl(url,{width})` + `imageSrcSet()` from `config/mediaConfig.ts`. Variants minted once at upload (`backend/src/config/mediaVariants.ts`).

**Backend** (`/backend`, Express + Mongoose + TS)
- `server.ts` mounts feature routers under `/api/<feature>`. Layering: routes → controllers → services (business logic in services). Jest + `mongodb-memory-server`.
- Auth: `middleware/auth.ts` — `protect` (JWT, attaches `req.user`), `restrictTo(...roles)`. Resource-scoped pattern already exists: `middleware/agencyDashboardAuth.ts` loads an agency, checks owner/admin/agent, checks subscription, attaches `req.agency`. **This is the template for `developmentAuth`.**
- Subscription/billing: `services/listingLimitService.ts` (monthly allowance per `Product.listingsLimit`), `middleware/checkSubscription.ts`. **Not modified by this feature.**
- Media: `services/mediaService.ts` (`uploadImage`/`uploadMedia`), indexed in `MediaAsset` collection. Storage access policy in `services/storageAccessPolicy.ts` + `routes/fileRoutes.ts`.
- Property model (`models/Property.ts`): rich, ~60 fields, many compound indexes, `pre('validate')` hooks that normalise type-attributes/area/construction. Owner = `sellerId` (ref User); agency attribution via `createdByAgencyId`. Statuses: `active|pending|sold|rented|draft`. Already has `floorNumber`, `totalFloors`, `floorplans[]`, `virtualTour360Url`, `constructionStatus`, `expectedCompletionYear`.
- User roles: `availableRoles`/`primaryRole`/`activeRole` ∈ `buyer|private_seller|agent|admin|super_admin` (legacy `role` deprecated). Agency membership on `Agency` (`ownerId`, `admins[]`, `agents[]`, `slug = country/name`, slug generated in `pre('save')`).
- Related existing systems to integrate (not duplicate): `Inquiry`, `Viewing`, `Favorite`, `SavedSearch`, `Notification`, `PropertyStats`/`PageView`/`Analytics`, `ActivityLog`, `MediaAsset`, AI (`aiController`), valuation, sitemap/SEO (`sitemapRoutes`, `ogRoutes`, `components/seo`).

## 2. Gaps & integration risks

1. **No concept of a physical unit** today — a Property is both the marketing listing and the implied physical thing. The feature introduces a canonical `DevelopmentUnit` that a Property may *reference*. Risk: double-counting inventory. Mitigation: unit is the availability source of truth; listings are marketing views of it (§5).
2. **Property has no development fields.** We add **optional** refs (`developmentId`, `buildingId`, `entranceId`, `floorId`, `unitId`) — fully backward compatible; a property with none is a normal standalone listing.
3. **Ownership disputes**: owning one apartment must not grant control of a building. Mitigation: resource-scoped `DevelopmentMembership` + claims workflow; attaching your listing to someone else's development requires an authorized membership or an approved claim (§4).
4. **Scale**: a development may have thousands of units — never embed units in the development doc. Separate `development_units` collection, paginated/virtualized everywhere.
5. **Visual-editor coordinate drift** across responsive layouts: store **normalized** polygon coords (0–1 of intrinsic image size); transform at render. `earcut` already available for hit-testing if needed.
6. **No new heavy deps**: SVG-based editor; reuse Leaflet/MapLibre for geo, existing media pipeline for uploads.
7. **Billing untouched**: creating developments/units is not gated by `listingLimitService` in the MVP. Whether developments consume listing allowance is a **product/billing decision deferred to the owner** — flagged, not implemented.

## 3. Database design (new collections)

All `timestamps: true`, soft-delete via `deletedAt` where destructive, optimistic concurrency via Mongoose `__v` + guarded `findOneAndUpdate`. IDs are ObjectId; public URLs use slugs.

- **developments** — project root. `{ ownerId, ownerType('user'|'agency'), agencyId?, name, slug(unique), description, country, city, municipality?, address, lat, lng, category, constructionStatus, expectedCompletionDate?, amenities[], website?, contact{}, coverMediaId?, status('draft'|'published'|'archived'), publishedAt?, stats{buildings,units,available}, deletedAt? }`. Index: `{slug}` unique, `{ownerId,status}`, `{agencyId,status}`, `{country,city,status}`, geo `{lat,lng}`.
- **development_buildings** — `{ developmentId, name, code?, slug, description?, phase?, totalFloors?, basementLevels?, lat?, lng?, coverMediaId?, order, deletedAt? }`. Index `{developmentId,order}`, unique `{developmentId,slug}`.
- **development_entrances** — optional sections/entrances within a building. `{ developmentId, buildingId, name, code?, order, deletedAt? }`. Index `{buildingId,order}`.
- **development_floors** — `{ developmentId, buildingId, entranceId?, label, level(Number), kind('basement'|'ground'|'mezzanine'|'standard'|'penthouse'|'custom'), floorplanMediaId?, order, deletedAt? }`. Index `{buildingId,entranceId,order}`. **No assumption floors start at 0.**
- **development_units** — canonical physical unit (availability source of truth). `{ developmentId, buildingId, entranceId?, floorId, unitNumber, unitType, totalArea?, netArea?, grossArea?, beds?, baths?, balconies?, terraces?, orientation?, viewType?, price?, currency?, pricePerSqm?, availability('available'|'reserved'|'sold'|'rented'|'not_released'|'unavailable'), floorplanMediaId?, mediaIds[], tour360Url?, parkingRefs[], storageRefs[], listingIds[](ref Property), primaryListingId?, deletedAt? }`. **Unique `{buildingId, (entranceId), unitNumber}`** (entrance-scoped when present, else building-scoped — enforced in service + partial indexes). Index `{developmentId,availability}`, `{floorId}`.
- **development_memberships** — resource-scoped roles. `{ developmentId, userId, role('owner'|'manager'|'sales_manager'|'sales_agent'|'editor'|'viewer'), invitedBy?, status('active'|'invited'|'revoked'), createdAt }`. Unique `{developmentId,userId}`. Index `{userId,status}`.
- **development_claims** — ownership/dispute workflow. `{ developmentId, claimantId, reason, evidenceMediaIds[], status('pending'|'approved'|'rejected'), reviewedBy?, reviewedAt?, note? }`. Index `{developmentId,status}`, `{claimantId}`.
- **development_scenes** — visual-editor scenes (draft + published). `{ developmentId, targetType('development'|'building'|'floor'), targetId, imageMediaId, imageWidth, imageHeight, draft{hotspots[]}, published{hotspots[],publishedAt}?, version, deletedAt? }`. Index `{developmentId,targetType,targetId}`.
- **development_hotspots** — embedded in scene (not a separate collection unless count demands it): `{ id, shape('polygon'|'rect'), points[[x,y]] normalized 0–1, label?, linkType('building'|'entrance'|'floor'|'unit'|'listing'), linkId, z }`.
- **development_leads** / reuse: prefer extending existing `Inquiry`/`Viewing` with optional `developmentId`/`unitId` rather than a new leads collection. A thin `development_leads` view is a query over `Inquiry`.
- **development_audit_logs** — reuse existing `ActivityLog` where possible; add `development`-scoped events (attach/detach/availability/price/publish/claim).

**Property extension** (`models/Property.ts`, additive, all optional, indexed):
`developmentId?, buildingId?, entranceId?, floorId?, unitId?` (+ compound index `{developmentId,status}`, `{unitId}`). A pre-validate guard ensures refs are internally consistent only when present.

## 4. Existing-listing attachment design (highest priority)

**Invariant:** attaching never creates/duplicates a Property, never resets analytics/leads/SEO/ownership. It only sets the 5 optional refs on the existing Property and appends its id to `unit.listingIds`.

- **Attach** (service `attachListingToUnit`, transactional): verify (a) caller controls the listing (`sellerId`/agency) **and** (b) caller has an authorized `DevelopmentMembership` (or approved claim) on the target development with `≥ sales_agent` + attach permission. Resolve/create target unit (never silently). Set refs, push to `listingIds`, set `primaryListingId` if first. Write audit event. Idempotent via idempotency key.
- **Multiple listings / one unit** (§3.4): `unit.listingIds[]` holds all authorized marketing listings; `primaryListingId` is the authoritative availability/price source. Public explorer shows **one** unit card (not N apartments); listing offers shown as alternatives. Price differences surfaced, never silently overwritten.
- **Detach** (`detachListingFromUnit`): remove refs from Property, pull from `listingIds`, re-elect `primaryListingId`, keep Property + history + media + the unit. Audit. Authorized users only.
- **Conflicts** (§3.6): already-attached listing, unit already linked, building/floor mismatch, different owners, duplicate units, archived/sold, disputed ownership → **never override**; return a structured conflict payload and route to a review/resolution UI.
- **From property editor** (§3.2): optional "Residence / Development" section; property stays valid standalone when empty; "request access" opens a claim/membership-invite flow when the development is owned by another account.

## 5. Permissions & ownership model

- Global roles unchanged (`protect`/`restrictTo`). **Resource-scoped** authorization via `DevelopmentMembership` enforced by new `middleware/developmentAuth.ts` (mirrors `agencyDashboardAuth`): validates `:developmentId`, loads development, resolves caller's effective role (owner > membership role; platform admin override), attaches `req.development` + `req.developmentRole`, exposes a `requireDevelopmentPermission(permission)` guard.
- Permission matrix (owner/manager/sales_manager/sales_agent/editor/viewer) drives: project edit, building/floor/unit CRUD, attach/detach, availability, price, media, scene edit, publish, invitations, lead access, ownership transfer. Defined in `backend/src/config/developments.ts` so FE and BE share the enum set.
- **Anti-capture rule:** owning a single Property that references a unit grants **no** development role. Development membership is granted only by an existing owner/manager or an approved claim.

## 6. API specification (versioned under existing `/api`)

Mounted `app.use('/api/developments', developmentRoutes)` and `'/api/dashboard/developments', developmentDashboardRoutes'` (dashboard = authored, `protect`+`developmentAuth`). All list endpoints paginated (cursor, mirroring Property), filtered, sorted; mutations validated, idempotent where sensitive, rate-limited, audit-logged.

Public (read): `GET /developments` (search/filter), `GET /developments/:slug`, `GET /developments/:slug/buildings/:buildingSlug`, `GET /developments/:slug/units/:unitSlug`, `GET /developments/:slug/scene/:targetType/:targetId` (published only).

Dashboard (authored): Development CRUD; Building/Entrance/Floor/Unit CRUD; `PATCH …/units/:id/availability`; `POST …/units/:id/listings` (attach), `DELETE …/units/:id/listings/:listingId` (detach), `POST …/listings/bulk-attach`; `POST …/units/import`; Scene CRUD + `POST …/scenes/:id/publish`; team (`GET/POST/DELETE memberships`); claims (`POST /developments/:id/claims`, admin review); leads (query over Inquiry/Viewing); analytics; `POST …/publish`.

## 7. Frontend component structure

New feature slice `src/features/developments/{api,components,hooks,types}`:
- `api/` thin httpClient wrappers; `hooks/` TanStack Query hooks; keys added to `queryKeys.ts`.
- Public: `DevelopmentsListPage`, `DevelopmentDetailPage` (interactive explorer host), `BuildingPage`, `UnitPage` (reuses property-details components where practical).
- Explorer (§ East Gate): `ResidenceExplorer` (pan/zoom aerial + building hotspots), `BuildingFacade` (floor selection), `InteractiveFloorPlan` (unit regions), `UnitDetailPanel`. **Every interactive view has a list/table fallback** (accessibility + mobile + SEO). Color + text for availability, never color alone.
- Dashboard: `DevelopmentsDashboard` + wizard (`DevelopmentWizard` steps 1–6), inventory managers (buildings/floors/units, virtualized with `react-window`), `ListingAttachPanel`, `VisualEditor`, media, team, leads, analytics, settings. Reuse `src/components/ui` + agency-dashboard patterns.
- Paths added to `paths.ts`; routes to `routes.tsx` (lazy). Deep links + breadcrumbs + shareable URLs; never `window.history` directly.

## 8. Interactive visual editor architecture

- Inline **SVG** overlay on the intrinsic-size image inside a pan/zoom viewport (CSS transform matrix). Coordinates stored **normalized** (0–1); render transform = `norm × intrinsic × fitScale`. Pointer events for polygon/rect draw, vertex drag, move, undo/redo (command stack in a local store), delete/duplicate, z-order, labels, live preview, draft save.
- Draft vs published: edits mutate `scene.draft`; `publish` snapshots draft→`scene.published` with a version bump + broken-reference validation; visitors always read `published` (previous version keeps serving until publish completes). Revision history + rollback via versioned published snapshots.
- No new dependency; `earcut` (already present) available for point-in-polygon hit testing if SVG hit-testing is insufficient on touch.

## 9. Exact files to create / modify

**Phase 2 (this change) — backend foundation (all additive):**
- NEW `backend/src/config/developments.ts` — enums (categories, construction statuses, availability states, floor kinds, membership roles, permission matrix) shared as the source of truth.
- NEW models: `Development.ts`, `DevelopmentBuilding.ts`, `DevelopmentEntrance.ts`, `DevelopmentFloor.ts`, `DevelopmentUnit.ts`, `DevelopmentMembership.ts`, `DevelopmentClaim.ts`, `DevelopmentScene.ts` in `backend/src/models/`.
- MODIFY `backend/src/models/Property.ts` — add optional development refs + indexes + consistency guard (no behaviour change when absent).
- NEW `backend/src/middleware/developmentAuth.ts` — resource-scoped auth + permission guard.
- NEW `backend/src/migrations/addDevelopmentRefsToProperty.ts` — no-op/backfill-safe (fields optional; migration only ensures indexes and is idempotent).
- NEW tests under `backend/src/__tests__/developments/`.

**Later phases:** controllers/services/routes (§6), FE slice (§7), i18n keys ×10, e2e.

## 10. Step-by-step implementation plan (phased, testable)

- **Phase 1 — Audit + design** ✅ (this doc).
- **Phase 2 — Core data + permissions** (in progress): models, Property extension, `developmentAuth`, migration, model/permission unit tests. No routes wired yet → zero runtime impact.
- **Phase 3 — Listing integration** ✅: development CRUD (+ owner-membership bootstrap, subscription-plan gate), inventory (buildings/floors/units + availability), attach/detach/bulk/conflict services, public + dashboard routes wired into `server.ts`, audit log. Tests: pure conflict-detection + schema/permission (green now) and DB-backed attach/detach integration (CI).
- **Phase 4/5 — Frontend slice** ✅: `src/features/developments` (types, api client + query keys, query/mutation hooks, i18n-key validation). Dashboard: list, plan-gated create form (surfaces subscription-required → pricing), manage page with inventory quick-add (building/floor/unit), units table, and the attach panel (preview → confirm; conflicts shown; `force` only for non-blocking). Public: discovery grid + detail page with accessible list-based building/floor navigation. Routes in `routes.tsx`/`paths.ts` (public open; dashboard behind `SignedInRoute`). i18n `developments` namespace in all 10 locales. Backend added `GET …/:id/structure`. Verified: feature tsc-clean, validation vitest green. **Remaining here:** interactive explorer (East Gate), detach/availability UI controls, bulk-attach UI, team/leads/analytics pages, unit detail pages, SEO/structured data.
- **Phase 6 — Visual builder**: SVG editor, hotspots, preview, publish.
- **Phase 7 — Integrations**: map, floor plans, tours, saved/viewings, analytics.
- **Phase 8 — QA/launch**: security, regression, perf, a11y, i18n ×10, migrations, rollback.

## 11. Test strategy

- Backend: Jest + `mongodb-memory-server` for models (validation, uniqueness, soft-delete, concurrency), permissions matrix, attach/detach (incl. multi-listing + conflicts + unauthorized), bulk import, availability atomicity, scene coordinate round-trip, backward-compat (Property without refs still valid). Run full suite to prove no regressions.
- Frontend: Vitest + Testing Library for hooks/components, coordinate transforms, list fallbacks, i18n presence. Playwright e2e for owner (create→attach→publish) and buyer (browse→unit→inquiry) journeys.

## 12. Migration & rollback

- **Forward:** additive only. Property gains optional fields (no backfill required; absent = standalone). New collections created lazily. Migration script is idempotent and ensures indexes. Deploy backend models first (no routes), then enable endpoints, then FE.
- **Rollback:** because every change is additive and gated behind new routes/UI, rollback = revert the deploy; existing Property docs are untouched and remain valid (new fields simply unused). No destructive data transforms are performed in Phase 2.
