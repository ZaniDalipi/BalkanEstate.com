# Media storage (Cloudflare R2)

Photos are stored the way Zillow stores them. Each upload is processed **once**, on our server with sharp, into a fixed set of sizes. All of those files go into one folder in a Cloudflare R2 bucket. Visitors get the files straight from Cloudflare's CDN. Nothing is resized when a page asks for an image, so there are no per-transformation charges. R2 also charges nothing for bandwidth.

Cloudinary is still supported while the move happens:

- uploads go to R2 as soon as `R2_*` is set;
- deletes find a photo's owner in MongoDB first and send anything unknown to Cloudinary;
- old `res.cloudinary.com` URLs keep displaying until they're migrated.

## Bucket layout: one folder per user, per listing

Folders are named by **id**, never by name, so renaming a user or retitling a listing never moves a file. Names live in MongoDB.

```
users/{userId}/
├── avatar/{photoId}/
├── documents/license/{photoId}/                    (private bucket)
├── documents/credentials/{credentialId}/{photoId}/ (private bucket)
└── listings/
    ├── drafts/photos|floorplans/{photoId}/          uploaded before the listing was saved
    ├── {listingX}/photos/{photoId}/
    ├── {listingX}/floorplans/{photoId}/
    ├── {listingY}/photos/{photoId}/
    └── …
agencies/{agencyId}/logo|cover/{photoId}/
businesses/{businessId}/logo|banner/{photoId}/
messages/{conversationId}/{photoId}/
cities/{country}/{city}/{photoId}/
cities/convention/city-{country}-{city}/            city photos the frontend finds by name
site/logo|email-logo|ad-banners|content/{photoId}/
news/{photoId}/
external/{source}/{listingId}/{photoId}/
legacy/{cloudinary public id}/                      migrated, owner unknown
```

Photo ids start with the upload time, so a folder lists photos in the order they were uploaded.

### Files inside each photo folder

Defined in `backend/src/config/mediaVariants.ts`, which both frontend and backend import.

| File | What it is |
|---|---|
| `original.jpg` | Master, ≤1920px. This URL is the one stored in the database, and the fallback when another size fails |
| `w160…w1920.webp` | The whole photo at 160/320/640/960/1280/1920px wide, never enlarged |
| `c160…c1920.webp` | A 4:3 crop of the photo, aimed at its most interesting area, for cards and thumbnails |
| `lqip.webp` | Blurred 32px placeholder |
| `og.jpg` | 1200×630 JPEG share card |

That's 15 files, about 1–1.5 MB per listing photo. Private documents (licences, credentials) store only `original.jpg`.

The frontend (`optimizeCloudinaryUrl`, `cloudinarySrcSet`, and the other helpers in `config/cloudinaryConfig.ts`) chooses the file for each request:

- a width request gets the next `w` size up;
- a box (width × height) gets a `c` crop wide enough that `object-fit: cover` never has to stretch it.

## MongoDB: `MediaAsset`

R2 can't search or tag files, so every stored photo has a `MediaAsset` document (`backend/src/models/MediaAsset.ts`):

| Field | |
|---|---|
| `key` | The photo folder. It is also the `publicId` the rest of the app stores |
| `bucket` | `public` / `private` |
| `kind` | `property`, `floorplan`, `avatar`, `license`, `credential`, `agency-logo`, … |
| `status` | `draft` (listing-form upload, listing not saved yet) / `active` |
| `ownerId`, `propertyId`, `agencyId`, `businessListingId`, `conversationId`, `credentialId` | Who the photo belongs to |
| `files`, `width`, `height`, `bytes`, `totalBytes`, `contentHash` | What is stored |
| `source.cloudinaryPublicId` / `source.url` | Where it came from (migration, external feed) |

Useful queries:

```js
db.mediaassets.find({ ownerId: ObjectId('…') })                       // everything a user has
db.mediaassets.find({ propertyId: ObjectId('…') }).sort({ key: 1 })   // one listing's photos
db.mediaassets.aggregate([{ $group: { _id: '$ownerId', photos: { $sum: 1 }, bytes: { $sum: '$totalBytes' } } }])
db.mediaassets.find({ status: 'draft' })                              // not attached to a listing yet
```

`FileRecord` still controls who may open which file. It is updated alongside `MediaAsset`.

## How each kind of image is handled

| Case | Flow |
|---|---|
| Listing photos / floor plans | The form uploads them before the listing exists, so they are stored under `listings/drafts/` with status `draft`. When the listing is created, `organizeListingMedia` moves them to `listings/{id}/photos|floorplans/` (R2 server-side copy) and marks them `active`. Watermarks are applied before storing |
| Drafts the seller abandoned | The `cleanupOrphanedTempImages` cron deletes drafts older than 48h that no listing references |
| Listing deleted / sold-retention purge | Deletes every `MediaAsset` with that `propertyId`, plus anything else in the listing folder. The archive thumbnail is kept |
| Avatar, agency logo/cover, business logo/banner, ad banners, site logos | Stored with owner ids. The old file is deleted when it's replaced |
| Licences, credentials | Go to the **private** bucket. The stored URL is `/api/files/open/{key}`. The app gets a 1-hour presigned link through `/api/files/signed-url/{key}`, only for the owner or an admin |
| Chat images | `messages/{conversationId}/`. Deleted with the conversation |
| City photos (Wikipedia refresh) | `cities/{country}/{city}/`. The previous photo is deleted after a refresh |
| External feed images | Never stored unless re-hosting is enabled. When it is, they go to `external/{source}/{listing}/` and are de-duplicated by source URL |
| Account closed | Avatar and documents are deleted. Listing media goes with the listings |

## Setup

1. **Create the buckets** in Cloudflare → R2: `balkanestate-media` (public) and `balkanestate-media-private` (never public).
2. **Connect a custom domain to the public bucket**, e.g. `media.balkanestateai.com` (bucket → Settings → Custom Domains). The files already carry `Cache-Control: public, max-age=31536000, immutable`.
3. **Create an R2 API token** with Object Read & Write on both buckets.
4. **Set the backend env** (`backend/.env.example`):
   ```
   R2_ACCOUNT_ID=…
   R2_ACCESS_KEY_ID=…
   R2_SECRET_ACCESS_KEY=…
   R2_BUCKET=balkanestate-media
   R2_PRIVATE_BUCKET=balkanestate-media-private
   R2_PUBLIC_URL=https://media.balkanestateai.com
   ```
   Keep the `CLOUDINARY_*` variables until the migration is done.
5. **Set the frontend env**: add the GitHub secret `VITE_MEDIA_CDN_URL=https://media.balkanestateai.com`, the same value as `R2_PUBLIC_URL`. The deploy workflow passes it into the build.
6. **Deploy.** New uploads now go to R2. The CSP and photo-URL allowlists include the media host automatically.

## Migrating existing Cloudinary images

```bash
cd backend
npm run media:migrate                 # dry run: lists every image and the folder it would go to
npm run media:migrate:apply           # migrate + rewrite the database
npm run media:migrate:apply -- --collections=properties,users   # part of the DB at a time
```

For each Cloudinary image URL in any collection (including URLs inside HTML/text) the script:

1. works out whose it is from the document that references it, e.g. a Property photo goes to `users/{sellerId}/listings/{propertyId}/photos/…`;
2. downloads the original, generates every size, uploads to R2 and records a `MediaAsset`;
3. rewrites the URL to the R2 master, and every `…publicId` field (including `FileRecord`) to the new key.

Some details:

- Convention city photos (`city-*`) go to `cities/convention/`.
- Images Cloudinary served privately stay private.
- Images nobody references are **not** copied.
- The run can be resumed and is safe to repeat. Already-migrated images are skipped.
- It writes a `media-migration-report-*.json` that lists any failures.

When the run reports `Failed: 0` and the site looks right:

```bash
npm run media:migrate:apply -- --purge-cloudinary   # deletes the migrated originals from Cloudinary
```

Then remove the `CLOUDINARY_*` variables.

## Costs (approximate)

| | R2 |
|---|---|
| Storage | ~$0.015 / GB-month (first 10 GB free) |
| Bandwidth to visitors | free |
| Writes (15 per photo) | ~$4.50 per million |
| Reads | ~$0.36 per million (cached by the CDN, so most never reach R2) |

At 10,000 listings × 20 photos × ~1.3 MB that's about 260 GB, roughly **$4 a month**.

## Not covered

- `scripts/seedCityImages.ts` and `scripts/seedDestinationImages.ts` still upload to Cloudinary. Re-run them against R2 if they're needed again.
- Generated listing videos were already removed (videos are YouTube links only).
- Pages Functions share cards (`functions/_og-utils.ts`) don't see `VITE_MEDIA_CDN_URL`. For R2 photos they advertise the JPEG master instead of the 1200×630 card. The backend OG middleware does use `og.jpg`.
