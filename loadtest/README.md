# Load & stress testing

Three tools, no new dependencies. They answer different questions:

| Tool | Question it answers |
|------|--------------------|
| `run.mjs` | How many concurrent users can the API serve, and what breaks first? |
| `explain-queries.mjs` | *Why* is the listing query slow — which index does MongoDB actually use? |
| `socket-fanout.mjs` | How many WebSocket clients can connect, and what does one listing edit cost? |

Findings from the first pass over this codebase are in [`FINDINGS.md`](./FINDINGS.md).

---

## 1. HTTP load test

```bash
# Backend running locally on :5001
node loadtest/run.mjs --target http://localhost:5001 --vus 50 --duration 60
```

Ramps to `--vus` concurrent virtual users, each looping through realistic
journeys (listings → filters → property detail → directory pages), and reports
per-step throughput, latency percentiles, failures and response sizes.

### Flags

| Flag | Default | Meaning |
|------|---------|---------|
| `--target <url>` | `http://localhost:5001` | API base URL |
| `--vus <n>` | `50` | Concurrent virtual users |
| `--duration <s>` | `60` | Test length in seconds |
| `--ramp <s>` | `10` | Time to ramp from 0 to full load |
| `--think <ms>` | `300` | Pause between a user's steps (jittered ±50%) |
| `--scenario <name>` | `mix` | `browse`, `search`, `directory`, `hotListing`, `auth`, `abuse`, `mix`, `all` |
| `--email` / `--password` | — | Log in once, then run the authenticated scenario |
| `--token <jwt>` | — | Use an existing access token instead of logging in |
| `--vary-ip` | off | Unique `X-Forwarded-For` per virtual user |
| `--abort-error-rate <f>` | `0.5` | Stop early once failures exceed this fraction |
| `--out <file.json>` | — | Write the full result set as JSON |
| `--allow-prod` | off | Required to target a non-local, non-staging host |

### Scenarios

- **browse** — anonymous visitor: listings page 1, city showcase, promotion
  plans, then a property detail picked from the real response.
- **search** — random filter combinations. Every combination is a distinct
  cache key and a distinct database query, so this is what real search traffic
  costs; a fixed query would only measure the response cache.
- **directory** — agents, agencies, testimonials, articles.
- **hotListing** — every user hitting the *same* property. Each detail view
  writes (`$inc views` on the property **and** on the seller's user document),
  so this is a write hotspot on two documents, not a read test.
- **auth** — signed-in session: `/auth/me`, favorites, conversations,
  notifications. Skipped unless credentials are given.
- **abuse** — hostile-but-legal input (`limit=100000`, `page=500`, malformed
  cursor). Not in the default mix; run it explicitly to check that one client
  cannot amplify its own cost.

### Reading the output

- **429s are the rate limiter, not capacity.** The API allows 1000 requests per
  15 minutes per IP, and a single load generator is a single IP — you will hit
  the limiter long before the app struggles. Add `--vary-ip` to measure the
  application itself. (It works because the server sets `trust proxy`, so the
  header it receives is treated as the client IP. Only meaningful against your
  own test environment.)
- **5xx and transport errors are bugs**, not saturation: something threw, or the
  server stopped completing connections.
- **p95/p99, not the average.** The average hides the tail that users actually
  complain about.
- **AVG SIZE** is the mean response body. A step that grows here under load is
  returning more data than it should.

### Suggested progression

```bash
# 1. Baseline — is anything slow with no contention?
node loadtest/run.mjs --vus 1 --duration 30 --think 0

# 2. Normal traffic
node loadtest/run.mjs --vus 50 --duration 120 --vary-ip

# 3. Find the knee — repeat, doubling until p95 degrades or errors appear
node loadtest/run.mjs --vus 200 --duration 120 --vary-ip
node loadtest/run.mjs --vus 500 --duration 120 --vary-ip

# 4. Soak — memory growth and leaks show up over time, not in a 60s burst
node loadtest/run.mjs --vus 100 --duration 1800 --vary-ip --out soak.json

# 5. Input amplification
node loadtest/run.mjs --scenario abuse --vus 10 --duration 60
```

Watch the API process's RSS during the soak (`top -p $(pgrep -f 'node.*server')`).
Memory that climbs and never comes back down is a leak, not caching.

---

## 2. Query plan diagnostic

```bash
MONGODB_URI="mongodb://localhost:27017/balkan-estate" node loadtest/explain-queries.mjs
```

Runs MongoDB's `explain("executionStats")` on the exact filter, sort and
collation `getProperties` builds, against your real data and indexes. Reports
which index each query uses (or `COLLSCAN` for none), documents examined per
document returned, whether the sort is done in memory, and how long
`countDocuments` takes on the active-listings filter.

Read-only — it runs `explain()` and `count()` and never writes. Needs
`npm install` in `./backend` (it borrows mongoose from there).

Run it against a database with production-scale data. On a few hundred
documents every plan looks fine; the difference between an index scan and a
collection scan only shows up at scale. To generate scale locally:

```bash
cd backend && npx jest --testPathPattern="large-dataset-performance" --forceExit
```

---

## 3. WebSocket fan-out test

```bash
node loadtest/socket-fanout.mjs --target http://localhost:5001 --token <jwt> --clients 200 --duration 60
```

Opens N authenticated Socket.IO connections and measures handshake latency,
how many connections survive, and how many frames/bytes each client receives.
Create or edit a listing while it runs — the report then extrapolates what one
edit costs at a larger connection count.

A JWT is required: the handshake rejects unauthenticated clients. Get one from
`POST /api/auth/login`, or from `localStorage`/devtools on a logged-in session.

---

## Safety

A stress test is a deliberate denial-of-service against your own server. Run it
against localhost or staging. `run.mjs` refuses non-local, non-staging targets
unless you pass `--allow-prod`, and even then: it will affect real users, it
writes real view counts (`hotListing` increments `views` on a real listing), and
your host may treat the traffic as an attack.

Run the generator on a *different* machine from the API when you can — otherwise
the load generator and the server compete for the same CPU and you measure your
laptop, not the app.
