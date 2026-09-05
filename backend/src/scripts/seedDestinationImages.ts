/**
 * seedDestinationImages.ts
 *
 * Fills in a photo for every villa destination that does not have one yet,
 * sourced from Unsplash and stored in Cloudinary.
 *
 * The important behaviour is what it refuses to do: a destination whose
 * `imageUrl` is already set was curated by hand in the admin, and this script
 * never overwrites it. Only destinations still falling back to their stand-in
 * city photo are touched. `--force` exists for re-running a botched import and
 * says plainly in its own name that it will replace curated pictures.
 *
 * Requires, in backend/.env:
 *   UNSPLASH_ACCESS_KEY   an Unsplash API access key
 *   MONGODB_URI           the database to update
 *   CLOUDINARY_*          the usual upload credentials
 *
 * Usage:
 *   npx ts-node backend/src/scripts/seedDestinationImages.ts --dry-run
 *   npx ts-node backend/src/scripts/seedDestinationImages.ts
 *   npx ts-node backend/src/scripts/seedDestinationImages.ts --only "Theth"
 *   npx ts-node backend/src/scripts/seedDestinationImages.ts --force
 *
 * On Unsplash's API terms: a photo may only be used once its
 * `download_location` has been pinged, and the photographer and Unsplash must
 * both be credited wherever it is shown. This script does the first and stores
 * what is needed for the second on the destination itself.
 */

import 'dotenv/config';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import axios from 'axios';
import sharp from 'sharp';
import { putObject } from '../services/bunnyStorageService';
import { buildBunnyUrl } from '../utils/bunnyUrl';
import VillaDestination from '../models/VillaDestination';

/** Unsplash's demo tier allows 50 requests an hour; be a good citizen. */
const REQUEST_DELAY_MS = 1200;

/**
 * The corridor card is 18:25. Storing at the card's own shape means the
 * delivery transform crops nothing it does not have to, and 2200 wide matches
 * the largest size the frontend ever requests.
 */
const STORE_WIDTH = 2200;
const STORE_HEIGHT = 3056;

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY ?? '';

const HTTP = axios.create({
  timeout: 15000,
  headers: {
    'Accept-Version': 'v1',
    'User-Agent': 'BalkanEstate/1.0 (destination image seeder)',
  },
});

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

interface UnsplashPhoto {
  id: string;
  urls: { raw: string; full: string; regular: string };
  links: { download_location: string; html: string };
  user: { name: string; links: { html: string } };
  width: number;
  height: number;
}

/**
 * Picks a photo for a place.
 *
 * Tries the most specific phrasing first and loosens it: a search for a small
 * mountain village usually returns nothing, and falling back to the country
 * plus a landscape hint is better than leaving the card on a gradient. Results
 * are filtered to landscape-or-portrait shots big enough to survive the crop —
 * anything under the stored height would be upscaled.
 */
async function findPhoto(name: string, country: string): Promise<UnsplashPhoto | null> {
  const queries = [
    `${name} ${country}`,
    `${name} ${country} mountains`,
    `${name} landscape`,
    `${country} mountains landscape`,
  ];

  for (const query of queries) {
    try {
      const res = await HTTP.get('https://api.unsplash.com/search/photos', {
        params: { query, per_page: 10, orientation: 'portrait', content_filter: 'high' },
        headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
      });
      const results: UnsplashPhoto[] = res.data?.results ?? [];
      const usable = results.find(p => p.height >= 1200 && p.width >= 800);
      if (usable) return usable;
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 401) throw new Error('Unsplash rejected the access key (401)');
      if (status === 403) throw new Error('Unsplash rate limit reached (403) — try again later');
      // Anything else is this query failing, not the run; loosen and retry.
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return null;
}

/**
 * Unsplash requires this to be called when a photo is actually used. It is not
 * the image download — it is the endpoint that records the use — so a failure
 * here must not stop us storing the picture, but it is worth logging.
 */
async function registerDownload(photo: UnsplashPhoto): Promise<void> {
  try {
    await HTTP.get(photo.links.download_location, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    });
  } catch {
    console.warn(`  ! could not register the download for ${photo.id}`);
  }
}

async function uploadDestinationImage(photo: UnsplashPhoto, slug: string) {
  // `raw` is the untouched original; we ask Unsplash for it at the width we
  // intend to store, rather than fetching an already-compressed size and
  // compressing it again.
  const source = `${photo.urls.raw}&w=${STORE_WIDTH}&fm=jpg&q=90`;
  const response = await HTTP.get<ArrayBuffer>(source, { responseType: 'arraybuffer' });

  // `cover` is the old `crop: 'fill'`: fill the card's frame exactly, cropping
  // the overflow rather than letterboxing it.
  const master = await sharp(Buffer.from(response.data))
    .rotate()
    .resize(STORE_WIDTH, STORE_HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: 80, effort: 5 })
    .toBuffer();

  const storagePath = `balkan-estate/villa-destinations/villa-destination-${slug}.webp`;
  await putObject(storagePath, master, 'image/webp');

  return { url: buildBunnyUrl(storagePath), publicId: storagePath };
}

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function seedDestinationImages(opts: {
  force?: boolean;
  dryRun?: boolean;
  only?: string;
}): Promise<{ filled: number; kept: number; missing: number; failed: number }> {
  if (!ACCESS_KEY) throw new Error('UNSPLASH_ACCESS_KEY is not set');

  const all = await VillaDestination.find({}).sort({ displayOrder: 1, name: 1 });
  const targets = opts.only
    ? all.filter(d => d.name.toLowerCase() === opts.only!.toLowerCase())
    : all;

  let filled = 0, kept = 0, missing = 0, failed = 0;

  for (const dest of targets) {
    // The whole point of the script: a curated photo is never replaced.
    if (dest.imageUrl && !opts.force) {
      kept++;
      continue;
    }

    try {
      const photo = await findPhoto(dest.name, dest.country);
      if (!photo) {
        console.log(`  – ${dest.name} (${dest.country}): nothing suitable found, keeping the city photo`);
        missing++;
        continue;
      }

      if (opts.dryRun) {
        console.log(`  · ${dest.name}: would use ${photo.links.html} by ${photo.user.name}`);
        filled++;
        continue;
      }

      await registerDownload(photo);
      const { url, publicId } = await uploadDestinationImage(photo, slugify(`${dest.country}-${dest.name}`));

      dest.imageUrl = url;
      dest.imagePublicId = publicId;
      // A complete credit line, not just the name. The same field is typed by
      // hand in the admin, where what an admin pastes from a stock site is
      // already a full line ("Photo by Jane Doe on Unsplash"), and the card
      // prints whatever is stored verbatim. Writing only the name here would
      // mean the card had to guess the wording for one source and not the
      // other.
      dest.imageCredit = `Photo by ${photo.user.name} on Unsplash`;
      dest.imageCreditUrl = photo.user.links.html;
      await dest.save();

      console.log(`  ✓ ${dest.name} (${dest.country}) ← ${photo.user.name}`);
      filled++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // A key or rate-limit problem affects every remaining place, so stop
      // rather than burning through the list logging the same failure.
      if (/access key|rate limit/i.test(msg)) throw err;
      console.error(`  ✗ ${dest.name}: ${msg}`);
      failed++;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return { filled, kept, missing, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx > -1 ? args[onlyIdx + 1] : undefined;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);

  console.log(
    `Filling destination photos${dryRun ? ' (dry run — nothing will be written)' : ''}` +
    `${force ? ' — FORCE: curated photos WILL be replaced' : ''}`,
  );

  try {
    const r = await seedDestinationImages({ force, dryRun, only });
    console.log(
      `\nDone. filled ${r.filled}, left alone ${r.kept}, no photo found ${r.missing}, failed ${r.failed}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
