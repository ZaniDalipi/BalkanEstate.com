# Agency property feeds (Property Imports)

Agencies can connect the XML feed their website or CRM already produces. BalkanEstateAI imports the listings and
photos, refreshes them every 24 hours, applies changes, and soft-deactivates listings removed from a complete feed.

- **Agencies:** [Connecting a feed](#connecting-a-feed) · [Canonical format](#canonical-xml-format-v10) ·
  [Mapping another format](#mapping-another-xml-format) · [What the sync changes](#what-a-sync-changes) ·
  [Plans and limits](#plans-and-listing-limits) · [Validation messages](#validation-messages)
- **Operators:** [Architecture](#architecture) · [Setup and deployment](#setup-and-deployment) ·
  [Operations runbook](#operations-runbook) · [Security controls](#security-controls) · [Tests](#tests)

A complete, fictional example feed is in [`sample-feed.xml`](./sample-feed.xml).

---

## Connecting a feed

Only the **agency owner** and **agency admins** can manage imports. Member agents see a notice in this section and
cannot view or change feeds.

1. **Agency Dashboard → Property Imports → Connect a feed.**
2. Enter a name and the **feed URL**. It must be a public `http://` or `https://` address on the standard port
   (80/443). Internal, private-network and cloud-metadata addresses are refused.
3. Choose the **format**:
   - *BalkanEstateAI XML* if your feed follows the [canonical format](#canonical-xml-format-v10) — no mapping needed.
   - *Other XML format* to [map your own elements](#mapping-another-xml-format).
4. Choose **feed contents**:
   - *Complete listing (snapshot)* — the feed always contains every listing you want published. Listings that
     disappear from a complete, valid feed are deactivated.
   - *Changes only (delta)* — the feed contains only new or changed listings. Nothing is deactivated for being
     absent; send `<status>removed</status>` to take a listing down.
5. Choose **Publish listings as**: the agency member the listings belong to. New listings count towards that
   member's plan allowance. Default: the agency owner.
6. If the feed is protected, choose **Username and password** (HTTP Basic) or **API key header** (e.g.
   `X-Api-Key`). Credentials require an `https://` URL, are stored encrypted, and are never shown again — leave the
   field blank when editing to keep the saved value.
7. **Save**, then **Test connection & preview.** BalkanEstateAI downloads the feed, validates every listing, and
   shows sample listings, every problem found, how many new listings your plan can take, and how many listings
   an import would deactivate. Nothing is published by a preview.
8. Fix any reported problems in your feed or mapping and preview again.
9. Tick the confirmation that the agency **owns or is authorized to publish** the listings, descriptions and photos,
   and **Activate**. The first import starts immediately; after that the feed syncs every 24 hours.

From then on you can **Sync now**, **Pause / Resume daily sync**, and open any run in **Import history** to see
counts of created, updated, unchanged, rejected and deactivated listings plus all validation messages.

Changing the URL, format, mapping, feed type or credentials sends the feed back to *Not activated*: preview and
activate again so a new configuration never publishes unreviewed listings.

**Disconnect feed** stops synchronization. Listings already imported stay on BalkanEstateAI as they are.

---

## Canonical XML format (v1.0)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<balkanestate-feed version="1.0" total="2" next-page="https://agency.example/feed.xml?page=2">
  <listing>
    <id>ADR-1001</id>
    <status>active</status>
    <url>https://agency.example/listings/ADR-1001</url>
    <title><![CDATA[Sea-view apartment]]></title>
    <description><![CDATA[<p>HTML is allowed here; it is converted to plain text.</p>]]></description>
    <transaction>sale</transaction>
    <type>apartment</type>
    <price currency="EUR">285000</price>
    <location visibility="exact">
      <country>Croatia</country><city>Split</city><district>Bačvice</district>
      <address>Ulica Primjera 12</address>
      <latitude>43.5025</latitude><longitude>16.4480</longitude>
    </location>
    <area unit="m2">74</area>
    <bedrooms>2</bedrooms>
    <bathrooms>1</bathrooms>
    <images><image url="https://agency.example/media/1.jpg"/></images>
  </listing>
</balkanestate-feed>
```

The root element name is free; listings are the `<listing>` elements. Namespaces and prefixes are ignored
(`<re:listing xmlns:re="…">` works). Any encoding declared in the XML header is honoured (UTF-8, windows-1250, …).

| Element | Required | Notes |
|---|---|---|
| `id` | **yes** | Your own listing ID. Letters, digits and `. _ - : / #`, max 100. Must be unique in the feed and stable over time — it is how a listing is recognised on every sync. |
| `status` | no | `active` (default), `reserved`, `sold`, `rented`, `removed`. `removed` deactivates the listing; then only `id` is needed. |
| `url` | no | Listing page on your site. |
| `title` | **yes** | Plain text or HTML; max 200 characters are kept. |
| `description` | **yes** | Plain text or HTML (CDATA recommended); converted to plain text, max 10 000 characters. |
| `transaction` | **yes** | `sale` or `rent` (common local words are understood: `prodaja`, `najam`, `shitje`, `qira`, …). |
| `rent-period` | no | `monthly`, `weekly`, `daily` (rentals only). |
| `type` | **yes** | `apartment`, `house`, `villa`, `luxury-villa`, `commercial`, `parking`, `land`, `other` (common local words are understood). |
| `price` | **yes** | Number; `185000`, `185.000` and `185,000.00` all work. Attribute `currency="EUR"` is **required** — only EUR is supported. For "price on request" send `<price on-request="true"/>`. |
| `location/country`, `location/city` | **yes** | |
| `location/district` | no | Shown instead of the street when the address is private. |
| `location/address` | recommended | Street address. |
| `location/@visibility` | no | `exact` (default) or `private`. **Private**: the street address is never stored or shown — only district and city — and coordinates are rounded to about 1 km. |
| `location/latitude`, `location/longitude` | recommended | Decimal degrees. Without them the address is geocoded; if that fails the listing is rejected. |
| `area` | **yes**\* | Floor area; `unit="m2"` (default). \*Not required for parking, or for land that has `land-area`. |
| `land-area` | no | Plot size. |
| `bedrooms`, `bathrooms` | **yes** for apartment, house, villa | `0` is valid (studio). |
| `living-rooms`, `floor`, `total-floors`, `year-built` | no | |
| `energy-rating` | no | `A+`, `A`–`G`. |
| `amenities/amenity` | no | Repeated; up to 40. |
| `images/image` | **yes** (≥1) | Repeated, in display order; first is the cover. URL in `url`/`src`/`href` attribute or as text. Up to 50. |
| `floorplans/floorplan` | no | Repeated; optional `label` attribute. Up to 10. |
| `updated` | no | ISO date of the last change. |

Feed-level attributes on the root element:

- `total` — total number of listings across all pages. If present and the number received differs, the feed is
  treated as **incomplete** (nothing is deactivated).
- `next-page` — URL (absolute or relative) of the next page. Pages are followed until there is none (max 50).

Details the feed does not state are left empty — BalkanEstateAI never invents bedrooms, years or addresses.

---

## Mapping another XML format

Choose *Other XML format* and fill in the field mapping. The form starts from the canonical mapping.

- **Listing element** — the local name of the element that wraps one listing, e.g. `property`.
- **Paths** are element names relative to that element, separated by `/`, optionally ending in `@attribute`:

| Path | Reads |
|---|---|
| `headline` | `<property><headline>…</headline>` |
| `location/town` | `<property><location><town>…` |
| `cost/@cur` | the `cur` attribute of `<cost>` |
| `@ref` | the `ref` attribute of `<property>` itself |
| `photos/photo/@src` | every `<photo src="…">` (repeated fields: amenities, images, floor plans) |

- **Value maps** translate your values, one per line: `prodaja = sale`, `stan = apartment`, `prodano = sold`. Your
  entries take precedence over the built-in synonyms.
- **Country / currency if not stated** — use only if every listing in the feed shares them.
- **Area unit** — `m²` or `sq ft` (converted).
- **Total count path / next page path** — evaluated on the feed's root element, e.g. `@total`, `meta/next`.

Example: for

```xml
<export>
  <property ref="X-1">
    <headline>Stan u centru</headline><body>…</body><offer>Prodaja</offer><kind>stan</kind>
    <cost cur="EUR"><amount>120.000</amount></cost>
    <place country="Serbia"><town>Beograd</town><street>Knez Mihailova 1</street></place>
    <size>54</size><rooms beds="2" baths="1"/>
    <photos><photo src="https://agency.example/1.jpg"/></photos>
  </property>
</export>
```

use listing element `property` and paths `externalId=@ref`, `title=headline`, `description=body`,
`listingType=offer`, `propertyType=kind`, `price=cost/amount`, `currency=cost/@cur`, `country=place/@country`,
`city=place/town`, `address=place/street`, `area=size`, `bedrooms=rooms/@beds`, `bathrooms=rooms/@baths`,
`images=photos/photo/@src`, with value maps `prodaja = sale` and `stan = apartment`.

---

## What a sync changes

Each imported listing is identified by **agency + feed + your listing ID** (enforced by a unique database index), so
repeating or retrying an import never creates duplicates.

| The feed… | BalkanEstateAI… |
|---|---|
| has a new ID | creates the listing (if the plan allows — see below) |
| has a known ID with changed content | updates the source-managed fields |
| has a known ID with identical content | leaves it untouched (no rewrite, no photo download) |
| marks an ID `removed` | moves it to draft (soft deactivation) |
| no longer contains an ID (**snapshot** feed, complete and valid) | moves it to draft |
| contains a previously deactivated ID again | reactivates it |

**Source-managed fields** (updated from the feed): title, description, sale/rent, rent period, property type, price,
status, country, city, address and coordinates, floor area, land area, bedrooms, bathrooms, living rooms, floor,
total floors, year built, energy rating, amenities, photos, floor plans, listing URL.

**Local-only fields** (never read or written by a sync): promotions and badges, videos and virtual tours, viewing
availability, special features and materials, furnishing / heating / condition / view, rental terms and tenant
details, your internal property ID, and statistics.

**Local edits are never silently overwritten.** If someone edits a source-managed field on BalkanEstateAI, the
next sync keeps the local value and lists it under "local edits kept" in the run results. Fields can also be locked
per listing (`PUT /api/agency-dashboard/:agencyId/feeds/:feedId/listings/:propertyId/locks`). A locked status is
never changed by a sync, including deactivation.

Listings you created by hand are never touched. Nothing is ever deleted.

### When nothing is deactivated

A listing is only deactivated for being absent after a **complete, validated snapshot**. Nothing is deactivated
when:

- the download failed, timed out or returned an error page;
- the XML was invalid or cut off;
- pagination could not be finished, or the declared `total` was not met;
- the feed was empty;
- the feed is a delta feed;
- the listing is still in the feed but its record has errors or a duplicated ID (a broken record is not a removal).

**Suspicious drops are held for review.** If more than the configured share of imported listings (default 30%,
and more than 5 listings) would be deactivated at once — or the feed shrank by more than that share since the last
complete import — the run ends as *Needs review*. New and changed listings are still applied; deactivations wait
until a manager chooses **Deactivate N listings** or **Keep them active**. A newer import supersedes the review.

---

## Plans and listing limits

Imports use the same rules as listings created by hand — no new pricing, and nothing is ever charged:

- Pro and agency plans: the monthly creation allowance of the member listings are published as
  (`subscription.listingsLimit`, else the product's allowance). Each **new** listing uses one; updates and
  reactivations are free.
- Free tier: at most 3 active listings.
- An agency-wide limit, if set on the agency's subscription, also applies.
- The agency's subscription must be active or in trial; otherwise imports are paused.

The preview shows how many new listings the plan can take. If the feed has more, activation asks you to confirm
importing only up to the allowance and lists the listings that would be left out. Those listings are **not
published**, existing inventory is not touched, and they are imported automatically on a later sync once there is
room (next month's allowance or a plan upgrade).

---

## Photos

- Photos and floor plans are downloaded once per URL and reused on every later sync; identical images behind
  different URLs are stored once. Use a new URL when a photo changes.
- Each file is checked by its actual content: JPEG, PNG, WebP, GIF, AVIF, HEIF or TIFF; at least 200×150 px; at most
  15 MB and 50 megapixels. SVG and HTML are refused.
- A photo that fails is skipped and reported; the listing keeps its other photos (and keeps its previous photos on
  an update). Failed URLs are retried after 6 hours, then daily. A new listing whose photos all fail is not created
  and is retried on the next sync.
- Order is preserved; the first photo is the cover.

---

## Validation messages

Errors (listing not imported): `missing_external_id`, `invalid_external_id`, `duplicate_external_id`,
`missing_title`, `missing_description`, `invalid_listing_type`, `invalid_property_type`, `invalid_price`,
`missing_currency`, `unsupported_currency`, `missing_country`, `missing_city`, `missing_area`, `missing_bedrooms`,
`missing_bathrooms`, `missing_images`, `missing_coordinates`, `no_usable_images`, `unknown_status`.

Warnings (imported, with a note): `title_truncated`, `description_truncated`, `missing_address`,
`invalid_coordinates`, `invalid_area`, `invalid_number`, `unknown_energy_rating`, `unknown_rent_period`,
`invalid_media_url`, `too_many_media`, `image_failed`, `images_kept`, `geocode_failed`, `local_edit_kept`,
`listing_limit`, `deactivation_held`.

Whole-feed failures (nothing applied): `unsafe_url`, `dns_failed`, `network_error`, `timeout`, `auth_failed`,
`not_found`, `rate_limited`, `server_error`, `not_xml`, `too_large`, `too_many_records`, `invalid_xml`,
`doctype_forbidden`, `truncated`, `too_deep`, `record_too_large`, `text_too_long`, `subscription_inactive`,
`agent_not_member`.

---

## Architecture

```
Dashboard (React)  ──►  /api/agency-dashboard/:agencyId/feeds  (protect → agencyDashboardAuth → manager-only)
                              │ creates AgencyFeedRun + AgencyFeedJob (one active job per feed)
                              ▼
                   MongoDB: AgencyFeed · AgencyFeedJob · AgencyFeedRun · AgencyFeedStagedRecord
                            AgencyFeedAsset · AgencyFeedAuditLog · Property.feedSync
                              ▲
Feed worker process ──────────┘  scheduler (every minute: queue due feeds)
  (agencyFeedWorkerMain)         job lanes (claim with lease → executeRun)
```

`backend/src/services/agencyFeeds/`:

| Module | Role |
|---|---|
| `feedFetcher.ts` | SSRF-guarded streaming download, redirects, pagination, completeness |
| `xmlRecordReader.ts` | bounded sax reader: no DOCTYPE, local names, CDATA, caps, truncation detection |
| `fieldMapper.ts`, `canonicalFormat.ts` | path language, canonical and custom mappings |
| `listingNormalizer.ts`, `contentSanitizer.ts` | strict validation and plain-text sanitizing |
| `syncPlanner.ts` | pure create/update/skip/deactivate decisions and safeguards |
| `syncService.ts` | fetch → stage → plan → apply → finalize; resumable |
| `listingWriter.ts`, `managedFields.ts` | listing writes, local-edit protection, soft deactivation |
| `imageImporter.ts` | download, validation, dedupe, storage, cleanup |
| `listingAllowance.ts` | plan limits mirroring `createProperty` |
| `feedJobQueue.ts` | Mongo job queue, leases, backoff, scheduler |
| `feedManagementService.ts`, `feedCredentials.ts`, `feedAudit.ts` | dashboard use cases, encryption, audit |

**Staging and recovery.** The whole document is downloaded, parsed and validated into `AgencyFeedStagedRecord`
before any listing changes. Records are marked applied one by one, so a run interrupted by a crash or deploy
resumes where it stopped when its job lease expires; already-created listings are recognised and never created or
charged twice. Staged records expire after 30 days.

**Scheduling.** `AgencyFeed.nextSyncAt` is the source of truth. The scheduler moves it forward atomically before
queueing, so several workers never double-queue a feed. `AgencyFeedJob.activeKey` (unique) guarantees at most one
queued or running job per feed — previews, syncs and approvals alike. Retries back off 2 → 8 → 32 minutes (4
attempts for syncs); a run that still fails is recorded as failed and the feed shows the error.

---

## Setup and deployment

No new paid service is required. The worker uses the existing MongoDB, and photos go through the existing Cloudinary
pipeline (`uploadImage`: sharp compression, per-listing folders, tags, registered delivery presets). Set
`AGENCY_FEED_IMAGE_MODE=reference` to avoid Cloudinary storage entirely; photos are then validated but served from
the agency's URLs through the existing `/api/image-proxy`.

### Environment variables (backend and worker)

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | — | Required by the worker (same database as the API). |
| `FIELD_ENCRYPTION_KEY` (or `ENCRYPTION_KEY`) | — | Encrypts feed credentials. **Must be identical for API and worker.** ≥ 32 characters. |
| `AGENCY_FEED_WORKER_MODE` | unset | `embedded` runs the worker inside the API process. Unset in production when the separate worker runs. |
| `AGENCY_FEED_IMAGE_MODE` | `rehost` | `rehost` (Cloudinary) or `reference` (agency URLs via image proxy). |
| `AGENCY_FEED_SYNC_INTERVAL_HOURS` | `24` | Time between scheduled syncs. |
| `AGENCY_FEED_MAX_MB` | `50` | Maximum feed download size. |
| `AGENCY_FEED_MAX_LISTINGS` | `10000` | Maximum listings per feed. |
| `AGENCY_FEED_MAX_PAGES` | `50` | Maximum pages followed. |
| `AGENCY_FEED_FETCH_TIMEOUT_MS` | `120000` | Total download time for all pages. |
| `AGENCY_FEED_WORKER_CONCURRENCY` | `2` | Jobs processed in parallel per worker process (1–8). |
| `AGENCY_FEED_POLL_INTERVAL_MS` | `5000` | How often an idle worker checks the queue. |
| `CLOUDINARY_*`, `SENTRY_DSN` | existing | Reused as is. |

### Deploying

1. Deploy the backend as usual (`npm run build`). New collections and indexes are created by Mongoose on startup,
   including the unique `agency_feed_listing_unique` index on `properties`; no migration is needed because no
   existing listing has `feedSync`.
2. Start the worker next to the API, from the same build and environment:
   - **Docker Compose:** `docker compose -f docker-compose.prod.yml up -d --build feed-worker` (service included).
   - **Railway / Render:** add a *background worker* service from the `backend` directory with start command
     `npm run start:worker:feeds` (`node dist/workers/agencyFeedWorkerMain.js`) and the API's environment variables.
   - **Single container only:** set `AGENCY_FEED_WORKER_MODE=embedded` on the API instead.
3. Check the worker log for `agency feed worker started`.
4. Smoke-test with the sample feed on a staging agency: host `sample-feed.xml` at a public URL, connect it,
   preview, activate, and check the import history. Do not connect real agency inventory from a development
   environment.

Local development: `docker-compose.yml` sets `AGENCY_FEED_WORKER_MODE=embedded`; outside Docker run
`npm run worker:feeds` in `backend/` next to `npm run dev`.

---

## Operations runbook

- **Structured logs** use the `AgencyFeed` namespace: `job started/finished/will retry/failed permanently`,
  `feed staged`, and one `audit` line per action, each with `feedId`, `runId`, `jobId`. Credentials and token-like URL
  parameters are redacted.
- **Import history** (`AgencyFeedRun`) holds counts, completeness, limit and deactivation decisions, and up to 500
  validation messages for every run.
- **Audit trail** (`AgencyFeedAuditLog`): configuration changes, credential changes, authorization confirmations,
  activation/pause/resume, previews and syncs requested, completions, failures, held and approved deactivations.
- **Failures** set `AgencyFeed.lastError` and `consecutiveFailures` (shown on the dashboard), write an `ActivityLog`
  entry (`agency_feed_sync_failed`), and report to Sentry after 3 consecutive failures.

Useful queries:

```js
// Jobs waiting or running
db.agencyfeedjobs.find({ activeKey: { $exists: true } })
// Feeds failing repeatedly
db.agencyfeeds.find({ consecutiveFailures: { $gte: 3 } }, { name: 1, url: 1, lastError: 1 })
// Runs waiting for a manager's review
db.agencyfeedruns.find({ status: 'awaiting_review', 'deactivation.resolution': { $exists: false } })
```

- **Stuck job:** a job whose worker died is reclaimed automatically when its lease (5 min) expires. To cancel one,
  set `status: 'failed'` and unset `activeKey`.
- **Pause everything:** stop the worker; queued jobs and due feeds wait in MongoDB and resume when it restarts.

---

## Security controls

- Manager-only, agency-scoped endpoints; a feed is always loaded by `(feedId, agencyId)`. Agency subscription must
  be active or in trial.
- Authorization confirmation recorded per activation (who, when, statement).
- SSRF: http(s) only, ports 80/443, no URL credentials, every resolved address must be public (blocks loopback,
  private ranges, link-local/metadata `169.254.169.254`, CGNAT, IPv4-mapped IPv6), connections pinned to the vetted
  address (DNS rebinding), every redirect hop and page re-validated, environment proxies bypassed. Photo downloads
  use the same guard.
- XML: DOCTYPE refused (no XXE, no entity expansion), strict parser, caps on bytes, records, depth, elements per
  listing and text length; truncated documents rejected.
- Credentials: AES-256-GCM at rest, https only, sent only to the configured origin, never returned or logged.
- Content: HTML stripped to plain text, scripts and control characters removed, URLs restricted to http(s).
- Fetch-triggering endpoints are rate limited per user, and the queue allows one job per feed.

---

## Tests

```bash
cd backend
npm run test:feeds        # all agency-feed suites
```

| Suite | Covers |
|---|---|
| `agency-feed-parsing` | sample feed, CDATA/HTML, repeated images, private address, XXE/billion laughs, truncation, limits, namespaces, encodings, custom mapping, strict normalization |
| `agency-feed-fetch-and-plan` | SSRF (private IPs, metadata, ports, schemes, redirects, DNS rebinding), credentials scope, HTTP failures, pagination/completeness, planner safeguards, duplicates, limits |
| `agency-feed-sync` | initial import, repeat without duplicates, price change, local edits, removal and reactivation, failed/invalid/empty/truncated/suspicious feeds, delta mode, duplicate IDs, plan limits, partial image failure, crash recovery, overlap prevention, scheduler, lapsed subscription |
| `agency-feed-api` | agency isolation, manager-only access, unsafe URLs, credential redaction, preview/authorization/limit gates |
| `agency-feed-images` | content validation, reuse and dedupe, concurrency, safe cleanup |

The database suites use `mongodb-memory-server`. Where its binary download is blocked, point it at a local `mongod`:
`MONGOMS_SYSTEM_BINARY=/path/to/mongod npm run test:feeds`. Frontend: `npx vitest run src/tests/property-imports-*`.
