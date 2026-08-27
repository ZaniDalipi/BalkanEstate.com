# Scaling review — what breaks first under load

A read of the hot paths (listing search, property detail, real-time updates,
auth) looking for things that behave differently at 10,000 users than at 10.

Everything below is a code-level finding with a file reference. None of it has
been measured against a running system yet — the tools in this directory are
how you confirm each one, and each finding names the command that proves or
disproves it. Ranked by expected impact.

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

**The listing query stops being a "slow query" and becomes a failing one.**
Because of #1 it sorts the whole matching set in memory. MongoDB's blocking-sort
limit is 100 MB, and it errors (code 292 `QueryExceededMemoryLimitNoDiskUseAllowed`)
rather than spilling, unless disk use is enabled. Whether 100k listings crosses
that line depends on your average document size after the list projection — if
it's around 1 KB, it does. Past the line `/api/properties` doesn't get slower,
it returns 500s. Both fixes in #1 remove the blocking sort entirely;
`seed-scale.mjs --stats` gives you the real document size to judge the margin.

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

That matters more than it sounds: MongoDB caps a blocking sort at 100 MB and
*fails the query* (error 292) above that rather than slowing down. With ~85k
active listings this sits right at the edge — the listing page doesn't degrade,
it starts erroring.

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

1. Drop `sort.status = -1` and clamp `limit` (#1a, #2) — two small edits that
   remove the blocking sort and a trivial way to kill the process.
2. Run `explain-queries.mjs` against production-scale data to see what's left
   (#1). Whatever it still reports is worth more than everything below.
3. Paginate the sitemap into a sitemap index before you pass 50k active
   listings — otherwise search engines quietly stop reading it.
4. Fix the cursor bug (#5) — small, and deep pagination stops being O(n).
5. Paginate `getMyListings`, and project instead of hydrating full documents.
6. Move view counting off the request path (#3).
7. Room-scope the socket broadcasts and stop invalidating whole lists (#4).
8. Add Redis for rate limits and Socket.IO *before* running a second instance (#6).
