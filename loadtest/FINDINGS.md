# Scaling review — what breaks first under load

A read of the hot paths (listing search, property detail, real-time updates,
auth) looking for things that behave differently at 10,000 users than at 10.

Everything below is a code-level finding with a file reference. None of it has
been measured against a running system yet — the tools in this directory are
how you confirm each one, and each finding names the command that proves or
disproves it. Ranked by expected impact.

---

## 1. The listing query asks for a collation that no index has

`backend/src/controllers/propertyController.ts:380`

```ts
Property.find(filter)
  .collation({ locale: 'en', strength: 2 })   // case-insensitive city/country
  .sort(sort)
```

All 18 indexes on the collection (`backend/src/models/Property.ts:649-700`) are
created with the default *simple* collation. MongoDB will not use an index to
satisfy a string comparison under a different collation — and every predicate in
this query that matters (`status`, `city`, `country`, `propertyType`,
`listingType`) is a string.

The likely consequence: **every `/api/properties` request is a full collection
scan plus an in-memory sort**, no matter how many indexes exist. At 100k
listings that is ~100k documents examined to return 20, and above 100 MB of sort
data MongoDB fails the query outright instead of returning slowly.

**Confirm:** `node loadtest/explain-queries.mjs` — it runs the identical query
with and without the collation and prints documents examined for each.

**Fix, if confirmed:** either drop `.collation()` and normalise city/country
casing on write (a `cityLower` field, or lowercase on save), or recreate the
indexes with `{ collation: { locale: 'en', strength: 2 } }`. Normalising on
write is the faster path — collated indexes are larger and slower to maintain.

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

1. Clamp `limit` (#2) — one line, removes a trivial way to kill the process.
2. Run `explain-queries.mjs` against production-scale data (#1). If it confirms
   collection scans, that single fix is worth more than everything else here.
3. Fix the cursor bug (#5) — small, and deep pagination stops being O(n).
4. Move view counting off the request path (#3).
5. Room-scope the socket broadcasts and stop invalidating whole lists (#4).
6. Add Redis for rate limits and Socket.IO *before* running a second instance (#6).
