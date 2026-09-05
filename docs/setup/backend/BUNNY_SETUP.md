# Bunny.net Image Hosting

Images live in a Bunny **Edge Storage** zone and are served through **Pull
Zones** with **Bunny Optimizer** enabled. This replaced Cloudinary, whose
bandwidth and per-transformation pricing had become the dominant media cost.

The code handles the storage layout, compression, and URL building. What this
document covers is the part code cannot set — the dashboard configuration, and
the settings that decide what you actually pay.

---

## 1. Storage Zone

Dashboard → **Storage** → Add Storage Zone.

| Setting | Value | Why |
| --- | --- | --- |
| Name | e.g. `balkanestate` | Becomes `BUNNY_STORAGE_ZONE` |
| Main region | One close to your users (Falkenstein/DE for the Balkans) | Becomes `BUNNY_STORAGE_REGION` (leave the env var empty for Falkenstein) |
| Replication regions | **None** | Each replicated region multiplies the storage bill. The CDN already caches globally; replication only shortens origin pulls, which are the rare case. |
| Tier | Standard (HDD) | SSD costs roughly double and buys latency that edge caching already hides |

Copy the zone's **FTP & API password** → `BUNNY_STORAGE_PASSWORD`.

> This password can delete everything in the zone. Backend only — it must never
> reach the browser bundle.

---

## 2. Public Pull Zone

Dashboard → **CDN** → Add Pull Zone, origin = the storage zone above.

| Setting | Value | Why |
| --- | --- | --- |
| Origin | The storage zone | — |
| Pricing zones | Enable only the regions you serve | Asia/South America/Oceania cost several times EU/NA per GB. Disabling unused ones caps a surprise bill; visitors there are served from an enabled region instead. |
| **Optimizer** | **On** | Flat monthly fee, unlimited transformations. Without it `?width=…` is ignored and every visitor downloads the full master. |
| Optimizer → automatic WebP/AVIF | On | Serves modern formats to browsers that advertise them |
| Cache expiration | Respect origin, or 1 year | Objects are immutable — a new upload gets a new path |

The hostname (`something.b-cdn.net`, or a custom domain) goes into **both**:

- `BUNNY_PULL_ZONE_HOST` (backend)
- `VITE_CDN_HOST` (frontend build, and the `VITE_CDN_HOST` repo secret used by
  `.github/workflows/deploy.yml`)

They must match. A mismatch renders every image on the site as a 404, and
because the CSP allowlist is built from the backend value, a stray host fails
silently as a blank frame.

---

## 3. Private Pull Zone (agent licenses and credentials)

Add a **second** pull zone over the *same* storage zone, then Security →
**Token Authentication** → On.

This has to be a separate zone: Bunny applies token authentication to a whole
pull zone, so enabling it on the hostname above would make every listing photo
require a signature for logged-out visitors.

- Hostname → `BUNNY_PRIVATE_PULL_ZONE_HOST`
- Token Authentication Key → `BUNNY_TOKEN_AUTH_KEY`

Leave both blank if no documents are uploaded. Signing fails loudly when the
key is missing rather than handing out a publicly readable URL.

---

## 4. Environment variables

```bash
# Backend
BUNNY_STORAGE_ZONE=balkanestate
BUNNY_STORAGE_PASSWORD=...
BUNNY_STORAGE_REGION=              # empty = Falkenstein (DE)
BUNNY_PULL_ZONE_HOST=balkanestate.b-cdn.net
BUNNY_PRIVATE_PULL_ZONE_HOST=balkanestate-docs.b-cdn.net
BUNNY_TOKEN_AUTH_KEY=...

# Frontend build
VITE_CDN_HOST=balkanestate.b-cdn.net
```

`BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD` and `BUNNY_PULL_ZONE_HOST` are
required in production — the server refuses to start without them
(`middleware/security.ts`).

---

## 5. Migrating from Cloudinary

`npm run migrate:images` copies every asset the database references and
rewrites the stored URLs. It is driven by the database rather than Cloudinary's
asset list, so nothing renderable is missed and orphaned derivatives are not
paid to move.

```bash
cd backend
npm run migrate:images:dry      # report only, writes nothing
npm run migrate:images          # the real run
npm run migrate:images:dry      # verify: should report nothing to migrate
```

It needs the Cloudinary credentials (to read) alongside the Bunny ones (to
write). Idempotent and resumable — every field is checked for whether it still
points at Cloudinary, so a run that dies halfway resumes by starting again.

**Do not close the Cloudinary account until a dry run reports zero remaining.**
Afterwards, remove the `CLOUDINARY_*` variables and the `cloudinary`
devDependency, which nothing but this script uses.

---

## 6. What actually drives the bill

Roughly: **storage + egress + $9.50/mo Optimizer**. Egress dominates once there
is any traffic, which is why the code is arranged the way it is:

- **One master per image, no derivatives.** Cloudinary pre-generated eager
  transforms on every property upload — renders nobody had asked for. Bunny
  renders a size on first request and caches it.
- **WebP masters, always resized to the cap.** Roughly 25–30% smaller than the
  JPEG equivalent, and the old code only shrank images more than 1.5× oversized,
  so a 2800×1800 upload used to be stored whole.
- **Delivery quality below master quality.** See `QUALITY_PRESETS` and
  `MASTER_QUALITY` in `backend/src/utils/bunnyUrl.ts`. Asking the edge for a
  higher quality than the stored master holds cannot recover detail — it only
  spends bytes reproducing the first encode's artifacts, on every request.
  A test pins the relationship; keep it that way.

If the bill still surprises you, check in this order: pricing zones left
enabled for regions you do not serve; a `sizes` attribute that makes browsers
pick a candidate far larger than the rendered box; and video, which is served
from the same zone and is far heavier per view than any photo.
