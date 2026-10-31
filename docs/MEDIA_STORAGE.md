# Media storage (Cloudflare R2)

Every **new** upload is stored in Cloudflare R2 and served from Cloudflare's CDN. Nothing is uploaded to Cloudinary any more.

**Images uploaded before the move stay on Cloudinary, untouched.** They are shown from Cloudinary exactly as before, through the named transformations already registered on the account (`t_be_w480`, `t_be_r4x3_w320`, `t_be_lqip`, `t_be_og`), by `config/legacyCloudinary.ts`. The app no longer talks to the Cloudinary API, so:
- the Cloudinary account has to stay open while these images are in use;
- deleting a listing, or replacing an avatar or logo, doesn't delete the old Cloudinary file;
- curated city photos are looked up on Cloudinary first (`city-{country}-{city}`), then in R2 (`cities/convention/…`, where `seedCityImages` now writes).

Moving them to R2 later is optional; see [Moving existing images from Cloudinary](#moving-existing-images-from-cloudinary-optional).

Each upload is resized **once**, on our server with sharp, into only the sizes that photo needs. Those files go into one folder per photo. Nothing is resized when a page asks for an image, so there are no transformation charges, and R2 charges nothing for bandwidth.

## Bucket layout: per user, per listing

Folders are named `{name}_{id}`, so you can browse the bucket by person and listing. The name comes first, so folders sort alphabetically. The ID keeps each folder unique:

```
users/
└── zani-dalipi_69a95232b8503c30a91e6842/
    ├── avatar/{photoId}_w640/
    ├── documents/license/{photoId}/                            (private bucket)
    ├── documents/credentials/{credentialId}/{photoId}/         (private bucket)
    └── listings/
        ├── drafts/photos|floorplans/{photoId}/                 uploaded before the listing was saved
        ├── house-in-split-ab-123_6a65fc9e711eab833395ac47/     {title}-{your listing reference}_{id}
        │   ├── photos/{photoId}/
        │   └── floorplans/{photoId}/
        └── …
agencies/kranje-agency_69a45be5…/logo|cover/{photoId}/
businesses/{name}_{id}/logo|banner/{photoId}/
messages/{conversationId}/{photoId}/
cities/{country}/{city}/{photoId}/                              automatic Wikipedia photos
cities/convention/city-{country}-{city}/                        curated city photos, found by name
destinations/{country}/{destination}/{photoId}/                 villa destinations
site/logo|email-logo|ad-banners|content/{photoId}/
news/{photoId}/
external/{source}/{listingId}/{photoId}/
legacy/{old cloudinary id}/                                     migrated, owner unknown
```

Names are taken when the photo is uploaded. A renamed user or retitled listing keeps its existing folders, since the ID in the name doesn't change. **Nothing in the app finds a photo by its folder name:** deletes and cleanup go by ID through MongoDB.

Photo IDs start with the upload time, so a folder lists photos in upload order.

### Files inside each photo folder

Defined in `backend/src/config/mediaVariants.ts`, which both frontend and backend import.

| File | What it is |
|---|---|
| `original.jpg` | Master, ≤1920px JPEG. It's the URL stored in the database, the image used for link previews, and the fallback if a size fails to load |
| `w160.webp` `w320.webp` `w640.webp` `w1280.webp` `w1920.webp` | The photo at those widths. Only widths below the master's own width are stored, plus one at its full width |
| `lqip.webp` | Blurred 32px placeholder (~150 bytes) |

So **nothing is stored twice**:

| Photo | Files |
|---|---|
| 1920px listing photo | `original.jpg` + `w160 w320 w640 w1280 w1920` + `lqip` = 7 |
| 400px avatar | `original.jpg` + `w160 w320 w640` (the last one is the avatar at its own 400px) + `lqip` = 5, folder `…_w640` |
| Licence / credential | `original.jpg` only (private bucket) |

The `_w640` at the end of a folder name records the largest size stored, so the frontend never asks for one that wasn't made.

Boxes such as cards and thumbnails use these same files, cropped by CSS `object-fit: cover`. For a box, the frontend picks a width wide enough that a 16:9 photo covers it without being stretched.

Quality: WebP sizes are encoded at quality 78. The master is quality 82, or 90 with full colour detail for city and destination photos. Sizes are generated one after another with sharp's cache off, so an upload holds a single decoded image in memory at a time.

The frontend (`optimizeImageUrl`, `imageSrcSet`, `getPropertyImagePlaceholder` in `config/mediaConfig.ts`) picks the file for each request.

## MongoDB: `MediaAsset`

R2 can't search or tag files, so every stored photo has a `MediaAsset` document (`backend/src/models/MediaAsset.ts`):

| Field | |
|---|---|
| `key` | The photo folder. It is also the `publicId` stored on listings, users, etc. |
| `bucket` | `public` / `private` |
| `kind` | `property`, `floorplan`, `avatar`, `license`, `credential`, `agency-logo`, `city`, `destination`, … |
| `status` | `draft` (listing-form upload, listing not saved yet) / `active` |
| `ownerId`, `propertyId`, `agencyId`, `businessListingId`, `conversationId`, `credentialId` | Who the photo belongs to |
| `files`, `width`, `height`, `bytes`, `totalBytes`, `contentHash` | What is stored |
| `source.cloudinaryPublicId` / `source.url` | Where it came from (migration, external feed) |

```js
db.mediaassets.find({ ownerId: ObjectId('…') })                       // everything a user has
db.mediaassets.find({ propertyId: ObjectId('…') }).sort({ key: 1 })   // one listing's photos
db.mediaassets.aggregate([{ $group: { _id: '$ownerId', photos: { $sum: 1 }, bytes: { $sum: '$totalBytes' } } }])
```

`FileRecord` still controls who may open which file.

## How each kind of image is handled

| Case | Flow |
|---|---|
| Listing photos / floor plans | The form uploads them before the listing exists, so they go to `listings/drafts/` as `draft`. When the listing is created, or when photos are added while editing, they move to `listings/{title}-{ref}_{id}/photos|floorplans/` (an R2 server-side copy) and become `active`. Watermarks are applied before storing |
| Abandoned drafts | A cron deletes drafts older than 48h that no listing references |
| Listing deleted / sold-retention purge | Deletes every photo of the listing (by its ID). The archive thumbnail is kept |
| Avatar, agency logo/cover, business logo/banner, ad banners, site logos | Stored under the owner. The old file is deleted when it's replaced |
| Licences, credentials | **Private** bucket. "View document" gets a 1-hour signed link, for the owner or an admin only |
| Chat images | `messages/{conversationId}/`. Deleted with the conversation |
| City photos (Wikipedia refresh) | `cities/{country}/{city}/`. The previous photo is deleted |
| Curated city photos | `seedCityImages.ts` / the admin "seed images" button write `cities/convention/city-{country}-{city}/`. `getCityImageUrl` reads them by name. 1-day cache, because `--force` overwrites them |
| Villa destination photos | `npm run seed:destination-images` writes `destinations/{country}/{name}/` |
| External feed images | Not stored unless re-hosting is enabled. When it is, they go to `external/{source}/{listing}/`, stored once per source URL |
| AI room restyling ("Reimagine") | Offered in the photo viewer for our own photos: R2 (the media domain or the bucket's `*.r2.dev` address) and images still on Cloudinary. The server fetches the photo's full-size original from the same place; any other host is refused |
| Link previews | The photo's `original.jpg` (JPEG). Pages Functions need the `MEDIA_CDN_URL` variable for this |

## Setup

1. **Buckets** (Cloudflare → Storage & Databases → R2 Object Storage → Create bucket):
   - Production: `balkanestate-media` and `balkanestate-media-private`.
   - Local dev: `balkanestate-media-dev` and `balkanestate-media-dev-private`.
2. **Public access:**
   - Production: give `balkanestate-media` a custom domain (Settings → Custom Domains), e.g. `media.balkanestateai.com`.
   - Dev bucket: turn on the "Public Development URL" (`https://pub-….r2.dev`).
   - Never make the private buckets public.
3. **CORS policy** on each public bucket (Settings → CORS Policy). Some images load with `crossOrigin` (gallery, editor, room styler) and fail without it:
   ```json
   [{ "AllowedOrigins": ["https://balkanestateai.com", "https://www.balkanestateai.com"],
      "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```
   For the dev bucket, use `http://localhost:3000` and `http://127.0.0.1:3000` as the origins. Without a policy every gallery photo is blocked by the browser even though R2 answers 200; `npm run media:check` tests this.
4. **API token**: R2 → Manage R2 API Tokens → **Create Account API token**, with Object Read & Write on that environment's two buckets only. Use one token for dev and another for production. Copy the **Access Key ID** and **Secret Access Key**; the secret is shown only once.
5. **Backend env** (`backend/.env` locally, Railway/Render in production):
   ```
   R2_ACCOUNT_ID=…
   R2_ACCESS_KEY_ID=…
   R2_SECRET_ACCESS_KEY=…
   R2_BUCKET=balkanestate-media
   R2_PRIVATE_BUCKET=balkanestate-media-private
   R2_PUBLIC_URL=https://media.balkanestateai.com
   ```
   At startup the server logs `🖼️ Image storage: R2 (bucket …)`.
   If the buckets were created in the **EU jurisdiction**, also set `R2_ENDPOINT=https://<account id>.eu.r2.cloudflarestorage.com`.
6. **Frontend build**: add the GitHub secret `VITE_MEDIA_CDN_URL` with the same value as `R2_PUBLIC_URL`. Locally it goes in the root `.env`.
7. **Link previews**: in Cloudflare → Workers & Pages → balkanestateai → Settings → Variables and Secrets, add `MEDIA_CDN_URL` with the same value, for Production and Preview.

## Moving existing images from Cloudinary (optional)

Not needed: existing images keep working from Cloudinary. Use this only if you decide to close the Cloudinary account.

The migration reads Cloudinary over plain HTTPS, so it needs no Cloudinary SDK and no API key. It needs `R2_*` and `MONGODB_URI`.

```bash
cd backend
npm run media:migrate          # dry run: lists every image and the folder it would go to
npm run media:migrate:apply    # copy into R2 and rewrite the database
npm run media:migrate:local    # same, but leaves imported external-listing photos on Cloudinary (local testing)
npm run media:check            # verify: no Cloudinary links left, every R2 photo loads
```

For each Cloudinary image URL in any collection (including URLs inside HTML), the migration:

1. Works out whose image it is from the document that links to it. For example, a Property photo goes to `users/{seller}/listings/{listing}/photos/…`, using names as above.
2. Downloads the original and stores the sizes it needs in R2.
3. Rewrites the URL to the R2 `original.jpg`, and every `…publicId` field (including `FileRecord`) to the new key.

Some details:
- Curated city photos (`city-*`) go to `cities/convention/`.
- Images that Cloudinary served privately stay private. Each one gets an access record (`FileRecord`) for its owner if it had none — licences from before access records existed would otherwise open for admins only. Set `CLOUDINARY_API_SECRET` only if a private document's stored URL isn't already signed.
- Images that nothing links to are not copied.
- The run can be resumed and is safe to repeat.
- It writes `media-migration-report-*.json`.
- Images Cloudinary no longer has (HTTP 404) are listed as failed and keep their old link; they're already broken today.

### Moving everything from the running server (Railway)

Instead of running the commands yourself, the backend can do it after deploy:

1. Back up the database.
2. On Railway, add `MEDIA_MIGRATE_ON_START=true`, `CLOUDINARY_CLOUD_NAME=dh8tbq8wy`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`, then redeploy. The API key/secret let it fetch originals through the Cloudinary API when public delivery answers 401 (restricted delivery or an account over its limits); it only downloads.
3. About 30 seconds after start, the logs show `[media-migrate] Moving images from Cloudinary to R2…`, a progress line every 100 images, and finally `[media-migrate] Done: …`.
4. Remove `MEDIA_MIGRATE_ON_START` (it would do nothing anyway once done) and run `npm run media:check -- --require-r2`.

It runs once in total: a lock in `mediamigrationstates` keeps a second instance or a restart from running it twice, an interrupted run continues where it stopped on the next start, and once `status` is `done` it never runs again. Photos stay visible from Cloudinary until each link switches, and a listing a user edits meanwhile is never overwritten. It is only marked done when every remaining failure is a 404 (the image is gone from Cloudinary); refused or timed-out downloads are retried on the next start. Failures are listed in that document's `stats.failed`. To run it again, delete the document: `db.mediamigrationstates.deleteOne({ _id: 'cloudinary-to-r2' })`.

### Moving only part of it

`npm run media:migrate:non-listings` moves avatars, logos, cities and villas but leaves every listing photo on Cloudinary. `npm run media:migrate:apply` moves the rest at any time; anything already moved is skipped.

`npm run media:check` scans every document and lists:
- images still on Cloudinary (for information);
- whether the media bucket's CORS policy allows the site;
- any R2 link with no `MediaAsset` record;
- any R2 file that doesn't load (skip this HTTP check with `-- --no-http`);
- which curated city photos are missing.

It exits with an error if something is wrong. Images still on Cloudinary are listed for information; add `-- --require-r2` to count them as errors (after a full migration). Only then delete the media in the Cloudinary dashboard and close the account.

## Costs (approximate)

| | R2 |
|---|---|
| Storage | ~$0.015 / GB-month (first 10 GB free) |
| Bandwidth to visitors | free |
| Writes (7 per listing photo) | ~$4.50 per million |
| Reads | ~$0.36 per million (most are served from the CDN cache) |

A 1920px listing photo is about 0.6–0.9 MB with all its sizes. 200,000 photos come to roughly 150 GB, about **$2.25 a month**.
