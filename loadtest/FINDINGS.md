# Scaling review — what breaks first under load

A read of the hot paths (listing search, property detail, real-time updates,
auth) looking for things that behave differently at 10,000 users than at 10.

Everything below is a code-level finding with a file reference, and the tools in
this directory are how you confirm each one. Ranked by expected impact.

---

## Status — what has been fixed

| # | Finding | Status |
|---|---------|--------|
| 1a | `status` in the sort defeats every index | **Fixed** — sort is `lastRenewed` alone |
| 1b | `.collation()` disqualifies every index | **Fixed** — matches `cityKey`/`countryKey` |
| 0 | Declared indexes missing from the database | **Mitigated** — per-index creation + per-index logging; the drift itself is per-database, so re-check production |
| 2 | Unbounded `limit` | **Fixed** — clamped and NaN-guarded |
| 3 | Two writes per property view | **Fixed** — buffered, flushed in bulk |
| 4 | Broadcast → refetch storm | **Mitigated** — coalesced and jittered on the client; the broadcast is still global |
| 5 | Cursor pagination broken | **Fixed** — built pre-sanitise, validated, offered only for the default ordering |
| 7 | Cache stampede | **Fixed** — single-flight |
| 9 | Client retry amplification | **Fixed** — one retry on 5xx, jittered backoff |
| — | Polling every 10s per client | **Fixed** — 2 min, sockets carry real-time |
| — | `/sitemap.xml` invalid above 50k URLs | **Fixed** — sitemap index over 25k-URL chunks |
| — | `getMyListings` unpaginated and hydrated | **Fixed** — paginated, projected, `.lean()` |
| 6 | Per-instance rate limits / cache / socket rooms | Open — needs Redis before a second instance |
| 8 | `countDocuments` per filtered page | Open — cheaper now that it is index-served |
| 10 | Uploads buffered in memory | Open |

Re-run `explain-queries.mjs` and `run.mjs` after deploying to confirm on your
own data. Two things to know about the fixes:

- **The database work is not done until the indexes exist.** The new listing
  indexes are created at startup like the rest; if the index-sync warning is
  still in your boot log, the query plans will not improve.
- **One visible behaviour changed.** Recently-sold listings are no longer pinned
  above active ones (that was what the `status` sort key did) — they now appear
  in normal recency order. Pinning them back while keeping the query
  index-served needs a numeric `statusRank` field rather than a sort on the
  status string.

---

## Measured — 120,000 listings, 100 concurrent users

First run against a real database (120k properties / 102k active, ~2 KB average
document, local backend and MongoDB on one machine).

**Query plans** (`explain-queries.mjs`, idle database):

| Variant | Docs examined | Time | Sort |
|---------|---------------|------|------|
| As shipped | 120,000 (COLLSCAN) | 162 ms | in memory |
| Without `.collation()` | 102,313 | 81 ms | in memory |
| Without the `status` sort key | 120,000 (COLLSCAN) | 62 ms | in memory |
| **Without both** | **22** | **1 ms** | **from index** |

162 ms → 1 ms, and 120,000 documents examined → 22, for two deletions in
`getProperties`. Neither change alone is enough: drop only the collation and it
still sorts 102k documents in memory; drop only the sort key and it still scans
the collection. Both, together, are the fix.

**Under load** (100 VUs, 2 minutes, mixed scenarios):

- 134 req/s sustained, **zero errors**
- overall p50 11 ms, p95 1.75 s, p99 5.08 s, max 12.7 s
- listing page 1: p95 **5.16 s**, p99 8.28 s
- `/api/testimonials`, which returns an empty 19-byte array: p50 **451 ms**

That last line is the real story. An endpoint that does nothing takes half a
second at p50 because it is queued behind listing queries competing for the same
connection pool and event loop. One unindexed query degrades every endpoint in
the app, not just its own.

Throughput oscillated between 2 and 246 req/s in a sawtooth — the cache
stampede in #7, visible: the `/api/properties` cache entry expires, every user
misses at once, all of them run the 162 ms collection scan concurrently, the
database saturates and throughput collapses until the queue drains.

**Corrections to earlier predictions in this document:**

- The blocking sort does *not* fail at 100k. MongoDB uses a bounded top-K sort
  when the query has a limit, so only `limit + skip` documents are held — the
  100 MB cap isn't reached on page 1. The cost is CPU (a full scan per request),
  not an error. Deep pages raise k and make it worse, but it still doesn't
  error. The finding stands; the failure mode I predicted doesn't.
- The collection has **35 indexes**, not 18 — the schema's field-level
  `index: true` declarations add many single-field indexes on top of the
  explicit compound ones.

---

## 0. The database is missing 11 of the 18 indexes the schema declares

Found by `explain-queries.mjs` on the first real run. Present: 35 indexes,
mostly the field-level `index: true` ones. Absent, though declared in
`models/Property.ts`:

```
{ propertyType, villaApprovalStatus, status }   { status, createdAt, _id }
{ listingType, status }                         { city, price, status }
{ listingType, propertyType, city, status }     { country, price, status }
{ status, lastRenewed }                         { listingType, price, status }
{ sellerId, status, createdAt }                 { source, sourceListingId }
{ title, city, address, description } ← text index
```

Two consequences:

**Keyword search is broken, not slow.** `?query=…` builds a `$text` filter
(`propertyController.ts:282`). MongoDB rejects `$text` with error 27 when no
text index exists, so that request returns 500 every time.

**The fix for #1 depends on one of the missing ones.** Removing the `status`
sort key works because `{ status: 1, lastRenewed: -1 }` can then serve the
query — and that index isn't there. The 1 ms result measured above came from
the single-field `lastRenewed_1` index instead, which is why it examined 22
documents rather than exactly 20.

`syncAllIndexes` (`utils/initDatabase.ts:126`) is meant to create these at
startup. It runs `syncIndexes()` per model inside a try/catch and logs one
`⚠️ Index sync had N warning(s)` line, so a sync that throws partway leaves the
rest uncreated with no other trace. **The backend's boot log has the actual
error** — that's the first place to look, because recreating the indexes without
knowing why the sync failed will just fail again (a likely candidate: the
`{ source, sourceListingId }` index is unique, and it can't be built while
duplicate source listings exist).

Check production before assuming this is a local-only problem — index drift is a
property of a database, not of a codebase:

```bash
node loadtest/explain-queries.mjs --uri "<production read-only URI>"
```

`explain-queries.mjs` now prints this drift report with ready-to-run
`createIndexes` commands on every run.

---

## What changes at 100,000 listings

Most of the findings below are about *concurrent users*. These are the ones that
depend on the **size of the listings collection**, and they behave differently
in kind — not just in degree — once the collection is large.

To reproduce any of this locally:

```bash
node loadtest/seed-scale.mjs --uri mongodb://localhost:27017/balkan-estate --count 100000
node loadtest/explain-queries.mjs --uri mongodb://localhost:27017/balkan-estate
node loadtest/run.mjs --vus 100 --duration 120 --vary-ip
node loadtest/seed-scale.mjs --uri ... --cleanup
```

**Every listing request reads the whole collection.** Measured: 120,000
documents examined and 162 ms on an *idle* database, per request, because of #1.
That's survivable alone — it's fatal under concurrency, where 100 users produced
a 5.16 s p95 and dragged unrelated endpoints to half a second. The sort itself
stays bounded (top-K), so this shows up as CPU and saturation, not as errors.

**`/sitemap.xml` breaks twice over.** `backend/src/routes/sitemapRoutes.ts:20`
loads *every* active listing and concatenates one `<url>` block each into a
single string. At 100k that's roughly a 20 MB response built in memory, with no
caching (`/sitemap.xml` isn't in `cacheConfig`), on a full collection scan, every
time a crawler asks. And search engines cap a single sitemap at **50,000 URLs**
— above that Google rejects the file outright, so past ~50k listings the site
silently loses sitemap coverage. Needs a sitemap *index* pointing at paginated
`sitemap-1.xml`, `sitemap-2.xml`, each ≤ 50k URLs, cached.

**Filters that can't use an index scan all 100k rows.** The price-per-m² and
price-change filters build `$expr` with `$divide` / field-to-field comparison
(`propertyController.ts:228-262`). `$expr` cannot use an index under any
circumstances, so each of those requests reads the entire collection. Store
`pricePerSqm` as a real indexed field on write, and a boolean/derived field for
"reduced".

**Deep pages get linear in page number.** `skip((page-1)*limit)` walks every
skipped document, and the cursor alternative doesn't work (#5). Page 500 at 100k
listings walks 10,000 documents before returning 20. Whether users go that deep
matters less than crawlers do — they will.

**"My listings" has no pagination.** `getMyListings`
(`propertyController.ts:1671`) returns *every* listing a seller owns, as
hydrated Mongoose documents with a populated seller and no `.lean()`. That's
fine for a private seller with 3 listings; an agency account with 5,000 gets a
~10 MB response and 5,000 document hydrations per dashboard load. Same shape in
`viewStatsController.ts:914` and `utils/statsUpdater.ts:183`.

**Background jobs iterate the whole collection.** `weeklyStatsJob` runs
`Property.find({ sellerId })` per Pro member, sequentially, loading full
documents; `cityMarketDataService.calculateMarketDataFromProperties` loads every
active listing for a city with no projection or limit. These get slower in
proportion to the collection and run on a schedule — they'll show up as periodic
latency spikes for everyone else, since they compete for the same connection
pool.

**Writes cost 18 index updates each.** Every insert and update maintains all 18
indexes on `properties` (`models/Property.ts:649-700`), including a 4-field text
index. That's the ceiling on bulk ingest from listing sources —
`seed-scale.mjs` prints the achieved docs/s, which is a direct measure of it.

**Sizing.** `seed-scale.mjs --stats` prints data size, storage size and total
index size. Index size plus the hot document set is what MongoDB wants resident
in RAM; once the working set exceeds it, every query pages from disk and p95
climbs by an order of magnitude. Check that number against your database
instance's RAM before assuming the app tier is the bottleneck.

**What does *not* change with listing count:** the WebSocket fan-out (#4), the
per-view writes (#3) and the rate-limit/cache behaviour (#6, #7) scale with
*users*, not listings. 100k listings with 50 concurrent users is a database
problem; 100k listings with 5,000 concurrent users is both.

---

## 1. The listing query cannot use an index — for two independent reasons

Both live in `getProperties`, and either one alone forces MongoDB to read the
whole matching set.

### 1a. The sort always leads with `status`

`backend/src/controllers/propertyController.ts:317`

```ts
let sort: any = {};
sort.status = -1;              // always prepended
...
sort.lastRenewed = -1;         // default user ordering
```

So the real sort is `{ status: -1, lastRenewed: -1 }`. The closest index is
`{ status: 1, lastRenewed: -1 }` (`models/Property.ts:689`), which MongoDB can
walk forwards as `(status ↑, lastRenewed ↓)` or backwards as
`(status ↓, lastRenewed ↑)` — **neither is `(status ↓, lastRenewed ↓)`**. No
index in the collection can produce that order, so every listing request adds a
blocking in-memory SORT of every matching document.

Measured cost at 120k documents: a full collection scan, 120,000 documents
examined per request, 162 ms idle. (The sort stays bounded — MongoDB uses a
top-K sort when a limit is present — so this costs CPU on every request rather
than failing outright.)

And the sort key is redundant: `sortPropertiesWithHighlighting` (line 398)
re-orders the page in Node immediately afterwards.

**Fix:** delete `sort.status = -1`. The filter is already on `status`, so
`{ lastRenewed: -1 }` alone lets the `{ status: 1, lastRenewed: -1 }` index
provide both the match and the order.

### 1b. The collation matches no index

`backend/src/controllers/propertyController.ts:380`

```ts
Property.find(filter)
  .collation({ locale: 'en', strength: 2 })   // case-insensitive city/country
```

All 18 indexes (`models/Property.ts:649-700`) use the default *simple*
collation. MongoDB won't use an index for a string comparison under a different
collation — and every predicate that matters here (`status`, `city`, `country`,
`propertyType`, `listingType`) is a string.

**Fix:** drop `.collation()` and normalise city/country casing on write (store a
lowercased field and query that), or recreate the indexes with
`{ collation: { locale: 'en', strength: 2 } }`. Normalising on write is the
cheaper path — collated indexes are larger and slower to maintain.

**Confirm both:** `node loadtest/explain-queries.mjs` runs the shipped query and
three variants (no collation / no status sort / neither) side by side and prints
documents examined and whether the sort came from an index.

---

## 2. `limit` is unbounded — one request can pull the whole collection

`backend/src/controllers/propertyController.ts:334`

```ts
const limitNum = Number(limit);            // no clamp, no NaN guard
const fetchLimit = Math.min(limitNum + 20, limitNum * 2);
```

`GET /api/properties?limit=100000` fetches 100,020 documents, populates a seller
for each, sorts them in Node, and serialises the lot. One request, hundreds of
megabytes of heap. A handful in parallel takes the process down — and it needs
no authentication.

`Number('abc')` is `NaN`, which flows into `.limit(NaN)` and `.skip(NaN)` too.

**Confirm:** `node loadtest/run.mjs --scenario abuse --vus 10 --duration 60`
and watch the `AVG SIZE` column and the API process's memory.

**Fix:** clamp it — `const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);`
and the same for `page`.

---

## 3. Every property view performs two writes

`backend/src/controllers/propertyController.ts:557-561`

```ts
await Property.updateOne({ _id: property._id }, { $inc: { views: 1 } });
await incrementViewCount(String(property.sellerId._id ?? property.sellerId));
```

A read endpoint that writes twice, sequentially, to two documents. When a
listing goes viral, every viewer contends for a write lock on the *same*
property document, and every viewer of any listing by that seller contends for
the *same* user document. The four awaits in this handler (find → update →
update → agency lookup) are also serial, so each detail view costs four database
round trips.

**Confirm:** `node loadtest/run.mjs --scenario hotListing --vus 200 --duration 120 --vary-ip`
and compare p95 against the `browse` scenario, where views are spread out.

**Fix:** buffer view counts in memory and flush them periodically (a
`Map<propertyId, count>` flushed every 10s with one bulk write), or move the
increment off the request path entirely. Fire the agency lookup with
`Promise.all` alongside the property fetch rather than after it.

---

## 4. Listing edits are broadcast to every connected client, and every client refetches

`backend/src/sockets/propertySocket.ts:156-291` uses `ioInstance.emit(...)` —
a broadcast to *all* sockets, not a room:

```ts
ioInstance.emit('property:updated', { propertyId, property, timestamp });
```

And on the client, `src/features/properties/hooks/useRealtimeProperties.ts`
invalidates the property list on receipt:

```ts
queryClient.invalidateQueries({ queryKey: propertyKeys.lists(), refetchType: 'active' });
```

So one listing edit sends a frame carrying the full property to every open tab,
and each of those tabs immediately refetches `/api/properties`. At 10,000
connected users that is 10,000 WebSocket frames (~12 MB at a typical payload)
**plus 10,000 simultaneous listing queries** — the expensive query from finding
#1. The 10-second response cache absorbs some of it, but only for users whose
filters match exactly.

`backend/src/controllers/agencyController.ts:1201` and friends do the same with
per-entity event names (`io.emit('agency-update-<id>')`), which broadcasts to
everyone so that one recipient can act on it.

**Confirm:** `node loadtest/socket-fanout.mjs --token <jwt> --clients 500 --duration 60`,
editing a listing while it runs; the report extrapolates the cost.

**Fix:** emit into rooms (`io.to('property:' + id)`, `io.to('agency:' + id)`)
and have clients join only what they're viewing. On the client, patch the
affected item into the cache with `setQueryData` instead of invalidating the
whole list, and debounce.

---

## 5. Cursor pagination is dead code — deep pages fall back to `skip()`

`backend/src/controllers/propertyController.ts:452`

```ts
const lastItem = sanitizedProperties[sanitizedProperties.length - 1];
const nextCursor = lastItem ? { id: String(lastItem._id), createdAt: lastItem.createdAt } : null;
```

`sanitizeProperty` has already deleted `_id` and replaced it with an obfuscated
`id` (`backend/src/utils/responseSanitizer.ts:42-51`), so `String(undefined)`
makes every response advertise the cursor `"undefined"`. Nothing in the frontend
reads `nextCursor` either — so the cursor path added to make deep pagination
cheap has never run. Every page beyond the first uses `skip((page-1)*limit)`,
which walks every skipped document.

If a client *does* send that cursor back, `new ObjectId('undefined')` throws and
the endpoint returns 500.

**Confirm:** the `ABUSE malformed cursor` and `ABUSE deep page=500` steps in the
abuse scenario; and `explain-queries.mjs` prints documents examined for page 100.

**Fix:** build the cursor from the pre-sanitised document (`rawProperties`), and
validate `cursor` with `mongoose.Types.ObjectId.isValid()` before constructing it.

---

## 6. Per-instance state means a second server changes behaviour

Four pieces of state live in process memory:

| State | Location |
|-------|----------|
| Auth rate limits | `backend/src/middleware/rateLimiter.ts:22-23` |
| General API rate limit | `backend/src/middleware/security.ts:315` (express-rate-limit default MemoryStore) |
| API response cache | `backend/src/middleware/cache.ts:34` (unless `REDIS_URL` is set) |
| Socket rooms / user→socket map | `backend/src/sockets/chatSocket.ts:24` (no Socket.IO adapter) |

Run two instances behind a load balancer and: rate limits double per instance,
cache hit rate halves, cache invalidation only clears the instance that handled
the write (so the others serve stale data for their whole TTL), and a message
sent through instance A never reaches a recipient connected to instance B.

The cache already supports Redis via `REDIS_URL`. The rate limiters and
Socket.IO do not — they need `rate-limit-redis` and `@socket.io/redis-adapter`
before a second instance is safe.

**Fix before scaling out**, not after — this class of bug looks like "messages
sometimes don't arrive" in production.

---

## 7. Nothing collapses duplicate concurrent requests

`backend/src/middleware/cache.ts:359` — a cache miss calls `next()` immediately.
When 500 users request the same listing page at the same moment (which is
exactly what finding #4 causes), all 500 miss and all 500 run the query. Every
10 seconds, when the `/api/properties` entry expires, it happens again.

**Fix:** single-flight — keep a `Map<cacheKey, Promise>` of in-flight requests
and have arrivals await the existing promise instead of starting their own.

---

## 8. `countDocuments` runs alongside every filtered page

`backend/src/controllers/propertyController.ts:391`. The fast
`estimatedDocumentCount` path only applies to an unfiltered page 1; any filter
falls through to a full `countDocuments(filter)`, which under finding #1 is a
second collection scan per request.

**Fix:** return `hasMore` instead of an exact total (the UI rarely needs the
precise number), or cache counts per filter signature for a minute.

---

## 9. Client retry policy amplifies a struggling server

`src/app/config/queryClient.ts:33` retries server errors up to **3 times** with
`staleTime: 30s`, `refetchOnWindowFocus: true` and `refetchOnReconnect: true`.

When the API starts returning 500s, every client triples its request rate —
a partial outage becomes a full one. And when the API restarts, every client
reconnects and refetches at the same instant.

**Fix:** don't retry 500s more than once, add jitter to `retryDelay`
(`Math.random()` on the base), and consider `refetchOnWindowFocus: 'always'`
only for the queries that truly need it.

---

## 10. Image upload holds everything in memory

`backend/src/utils/upload.ts:19` uses `multer.memoryStorage()` with a 5 MB file
cap and `upload.array('images', 30)` — up to **150 MB of heap per upload
request**. Ten agents uploading at once is 1.5 GB. Node's default heap is
smaller than that.

**Fix:** stream to disk (`diskStorage` + temp cleanup) or straight to Cloudinary,
and lower the per-request file count.

---

## 11. Smaller items

- **18 indexes on `properties`** (`models/Property.ts:649-700`) — every insert
  and update maintains all of them. The bulk listing-source ingest pays this on
  every document; consider dropping the indexes that overlap
  (`{price,status}` is a prefix-subset of several others).
- **No connection pool tuning** (`backend/src/config/database.ts:35`) — the
  driver default is 100 connections per instance with no `maxPoolSize`,
  `socketTimeoutMS`, or `maxIdleTimeMS`. Worth setting explicitly once you know
  the concurrency you're targeting.
- **Cache key ignores user identity** (`backend/src/middleware/cache.ts:233`) —
  it distinguishes only `auth` from `public`, so every authenticated user shares
  one cache entry. Fine for the currently-cached endpoints (none are
  personalised), but it will silently leak one user's data to another the day a
  personalised route is added to `cacheConfig` without also being added to
  `cacheBlacklist`.
- **In-memory cache eviction is O(n log n)** (`cache.ts:41-48`) — once the store
  holds 1000 entries, every subsequent write sorts the whole map. Search traffic
  creates a new key per filter combination, so it stays permanently full.

---

## Suggested order of work

1. Check whether production has the same missing indexes (#0), and read the boot
   log for the index-sync warning. Keyword search returns 500s wherever the text
   index is absent.
2. Drop `sort.status = -1` and the `.collation()`, and clamp `limit`
   (#1, #2). Measured on 120k listings: 162 ms and a full collection scan
   become 1 ms and 22 documents examined. Re-run `explain-queries.mjs` after,
   to confirm on your data.
3. Paginate the sitemap into a sitemap index before you pass 50k active
   listings — otherwise search engines quietly stop reading it.
4. Fix the cursor bug (#5) — small, and deep pagination stops being O(n).
5. Paginate `getMyListings`, and project instead of hydrating full documents.
6. Move view counting off the request path (#3).
7. Room-scope the socket broadcasts and stop invalidating whole lists (#4).
8. Add Redis for rate limits and Socket.IO *before* running a second instance (#6).
